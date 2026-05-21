import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convexServerClient";
import { getMpesaDarajaApiBase } from "@/lib/mpesaDarajaApiBase";
import { mpesaDarajaFetch } from "@/lib/mpesaDarajaFetch";
import {
  buildDarajaRequestUrl,
  coerceDarajaNumericCode,
  darajaFetchSignal,
  extractMpesaReceiptFromCallbackMetadata,
  fetchMpesaOAuthToken,
  readDarajaJson,
  stringifyOptional,
  unwrapDarajaStkSection,
  type MpesaCallbackMetadataItem,
} from "@/lib/mpesaDarajaCore";
import type { Id } from "@/convex/_generated/dataModel";

function getConvexMpesaFulfillSecret(): string | undefined {
  return (
    process.env.CONVEX_MPESA_STK_FULFILL_SECRET ??
    process.env.MPESA_STK_CALLBACK_SECRET
  );
}

/**
 * After Daraja confirms the handset prompt exists, stkquery sometimes returns interim non-zero codes
 * while the subscriber is entering a PIN — don't mark failed inside this window.
 * Set MPESA_STK_FAILURE_GRACE_MS=0 to disable (not recommended for production UX).
 */
function getMpesaStkFailureGraceMs(): number {
  const parsed = Number(String(process.env.MPESA_STK_FAILURE_GRACE_MS ?? "").trim());
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return 90_000;
}

/**
 * Polls Safaricom STK Query and mirrors the result into Convex via the same fulfill mutation
 * as `/api/mpesa/callback`. Use when the callback URL is unreachable or delayed (common in dev).
 */
export async function POST(req: Request) {
  try {
    const secret = getConvexMpesaFulfillSecret();
    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CONVEX_MPESA_STK_FULFILL_SECRET (or legacy MPESA_STK_CALLBACK_SECRET) is not configured",
        },
        { status: 503 }
      );
    }

    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const convexJwt = await getToken({ template: "convex" }).catch(() => null);
    if (!convexJwt) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not mint Convex JWT. Ensure Clerk has a JWT template named "convex" for this app.',
        },
        { status: 503 }
      );
    }

    const body = (await req.json()) as { paymentId?: string };
    if (!body.paymentId?.trim()) {
      return NextResponse.json(
        { success: false, error: "paymentId required" },
        { status: 400 }
      );
    }

    const shortcodeRaw = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    if (!shortcodeRaw || !passkey) {
      return NextResponse.json(
        {
          success: false,
          error: "Server missing MPESA_SHORTCODE or MPESA_PASSKEY",
        },
        { status: 503 }
      );
    }

    const businessShortCode = Number.parseInt(String(shortcodeRaw).trim(), 10);
    if (!Number.isFinite(businessShortCode)) {
      return NextResponse.json(
        { success: false, error: "MPESA_SHORTCODE must be numeric" },
        { status: 503 }
      );
    }

    const client = getConvexHttpClient();
    client.setAuth(convexJwt);

    const payment = await client.query(api.mpesaPayments.getMyMpesaPaymentById, {
      paymentId: body.paymentId.trim() as Id<"mpesaPayments">,
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment intent not found" },
        { status: 404 }
      );
    }

    if (payment.status !== "pending" || !payment.checkoutRequestId?.trim()) {
      return NextResponse.json({
        success: true,
        skipped: true,
        status: payment.status,
      });
    }

    const checkoutRequestId = payment.checkoutRequestId.trim();
    const apiBase = getMpesaDarajaApiBase();
    const token = await fetchMpesaOAuthToken(apiBase);

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:Z.]/g, "")
      .slice(0, 14);
    const shortcodeSecret = String(shortcodeRaw).trim();
    const password = Buffer.from(
      `${shortcodeSecret}${passkey}${timestamp}`
    ).toString("base64");

    const queryPayload = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const queryUrl = buildDarajaRequestUrl(
      apiBase,
      "/mpesa/stkpushquery/v1/query"
    );
    const queryRes = await mpesaDarajaFetch(queryUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryPayload),
      signal: darajaFetchSignal(),
    });

    const data = await readDarajaJson("mpesa stkquery", queryRes);
    const apiAccept = coerceDarajaNumericCode(data.ResponseCode);
    if (apiAccept !== undefined && apiAccept !== 0) {
      const desc =
        stringifyOptional(data.ResponseDescription) ??
        stringifyOptional(data.responseDescription) ??
        "Daraja rejected the STK query request";
      console.warn("[mpesa/stkquery] Daraja API-level rejection", {
        ResponseCode: data.ResponseCode,
        desc,
      });
      return NextResponse.json(
        { success: false, error: desc },
        { status: 502 }
      );
    }

    const slice = unwrapDarajaStkSection(data);
    const paymentRc =
      coerceDarajaNumericCode(slice.ResultCode) ??
      coerceDarajaNumericCode(data.ResultCode);

    if (paymentRc === undefined) {
      return NextResponse.json({
        success: true,
        pending: true,
        message:
          "Daraja has not returned a terminal ResultCode yet — keep waiting or approve on your handset.",
      });
    }

    if (paymentRc === 0) {
      const meta = slice.CallbackMetadata;
      let receipt: string | undefined;
      if (meta !== null && typeof meta === "object" && !Array.isArray(meta)) {
        const rawItems = (meta as { Item?: unknown }).Item;
        if (Array.isArray(rawItems)) {
          receipt = extractMpesaReceiptFromCallbackMetadata(
            rawItems as MpesaCallbackMetadataItem[]
          );
        }
      }

      await client.mutation(api.mpesaPayments.fulfillStkPaymentFromDarajaCallback, {
        fulfillSecret: secret,
        checkoutRequestId,
        status: "success",
        ...(receipt !== undefined ? { mpesaReceiptNumber: receipt } : {}),
      });

      return NextResponse.json({
        success: true,
        reconciled: true,
        resultCode: paymentRc,
      });
    }

    const graceMs = getMpesaStkFailureGraceMs();
    const promptAtMs = payment.stkPromptSentAt;
    const withinGrace =
      graceMs > 0 &&
      typeof promptAtMs === "number" &&
      Number.isFinite(promptAtMs) &&
      Date.now() - promptAtMs < graceMs;

    if (withinGrace) {
      return NextResponse.json({
        success: true,
        pending: true,
        graceDeferFailure: true,
        resultCode: paymentRc,
      });
    }

    await client.mutation(api.mpesaPayments.fulfillStkPaymentFromDarajaCallback, {
      fulfillSecret: secret,
      checkoutRequestId,
      status: "failed",
    });

    return NextResponse.json({
      success: true,
      reconciled: true,
      resultCode: paymentRc,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mpesa/stkquery]", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
