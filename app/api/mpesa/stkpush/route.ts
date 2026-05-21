import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convexServerClient";
import { getMpesaDarajaApiBase } from "@/lib/mpesaDarajaApiBase";
import { mpesaDarajaFetch } from "@/lib/mpesaDarajaFetch";
import {
  isNonPublicMpesaLoopbackCallback,
  resolveMpesaCallbackUrl,
} from "@/lib/resolveMpesaCallbackUrl";
import {
  buildDarajaRequestUrl,
  darajaFetchSignal,
  fetchMpesaOAuthToken,
  pickCheckoutRequestIdFlexible,
  readDarajaJson,
  stringifyOptional,
} from "@/lib/mpesaDarajaCore";
import type { Id } from "@/convex/_generated/dataModel";

/** Daraja traffic uses `@/lib/mpesaDarajaFetch` (Undici HTTP/1.1, long timeouts). Convex fulfillment secret applies after `/api/mpesa/callback`. */

/** STK `processrequest` success uses `ResponseCode` / aliases; declarative rejects often use REST `errorCode`. */
function normalizeStkDarajaOutcomeCode(record: Record<string, unknown>): string {
  const raw =
    record.ResponseCode ??
    record.responseCode ??
    record.ResultCode ??
    record.resultCode ??
    record.errorCode ??
    record.error_code;
  return raw === undefined || raw === null ? "" : String(raw).trim();
}

function pickStkUserFacingDetail(record: Record<string, unknown>): string | undefined {
  const fault = record.fault;
  if (fault !== null && typeof fault === "object" && !Array.isArray(fault)) {
    const o = fault as Record<string, unknown>;
    const fromFault =
      stringifyOptional(o.faultstring) ??
      stringifyOptional(o.FaultString) ??
      stringifyOptional(o.detail);
    if (fromFault) return fromFault;
  }

  return (
    stringifyOptional(record.ResponseDescription) ??
    stringifyOptional(record.responseDescription) ??
    stringifyOptional(record.errorMessage) ??
    stringifyOptional(record.error_description) ??
    stringifyOptional(record.Message) ??
    stringifyOptional(record.message) ??
    stringifyOptional(record.CustomerMessage) ??
    stringifyOptional(record.customerMessage)
  );
}

function mpesaCallbackEnvironmentTip(callbackUrlRaw: string): string | undefined {
  if (isNonPublicMpesaLoopbackCallback(callbackUrlRaw)) {
    return "Safaricom cannot POST to localhost. Run npm run dev:ngrok, then npm run mpesa:ngrok-url, paste MPESA_TUNNEL_ORIGIN into .env.local, restart dev.";
  }
  try {
    const u = new URL(callbackUrlRaw.trim());
    if (u.protocol === "http:") {
      return "Prefer HTTPS for the Daraja CallBackURL; plain http may be declined.";
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function formatStkDarajaFailure(
  stkRes: { status: number; ok: boolean },
  stkData: Record<string, unknown>,
  callbackUrlForTip: string,
): string {
  const outcome = normalizeStkDarajaOutcomeCode(stkData);
  const detail = pickStkUserFacingDetail(stkData);
  const tip = mpesaCallbackEnvironmentTip(callbackUrlForTip);

  console.warn(
    "[mpesa/stkpush] daraja STK rejection body:",
    JSON.stringify(stkData),
    "http",
    stkRes.status,
  );

  let core: string;
  if (detail) {
    core = detail.endsWith(".") ? detail : `${detail}.`;
    if (outcome && !core.includes(outcome)) {
      core += ` (outcome code ${outcome})`;
    }
    if (!stkRes.ok) core += ` [HTTP ${stkRes.status}]`;
  } else {
    core = `Daraja rejected STK (${outcome ? `code=${outcome}; ` : ""}HTTP ${stkRes.status}).`;
  }

  return tip !== undefined ? `${core}\n\nTip: ${tip}` : core;
}

export async function POST(req: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
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
    const transactionType =
      process.env.MPESA_TRANSACTION_TYPE ?? "CustomerPayBillOnline";

    if (!shortcodeRaw || !passkey) {
      return NextResponse.json(
        {
          success: false,
          error: "Server missing MPESA_SHORTCODE or MPESA_PASSKEY",
        },
        { status: 503 }
      );
    }

    let callbackUrl: string;
    try {
      callbackUrl = resolveMpesaCallbackUrl();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: m }, { status: 503 });
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

    const billingSettings = await client.query(
      api.sitePublic.employerBillingSettings
    );
    if (!billingSettings.employerBillingEnabled) {
      return NextResponse.json(
        { success: false, error: "Employer billing is not enabled yet." },
        { status: 403 }
      );
    }

    const payment = await client.query(api.mpesaPayments.getMyMpesaPaymentById, {
      paymentId: body.paymentId as Id<"mpesaPayments">,
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment intent not found" },
        { status: 404 }
      );
    }

    if (payment.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "This payment is no longer pending" },
        { status: 409 }
      );
    }

    if (payment.checkoutRequestId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An STK prompt was already sent for this payment row. Wait for confirmation, or tap Try again / close the modal to reset. Retrying Send without reset causes this.",
        },
        { status: 409 }
      );
    }

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

    const msisdn = Number.parseInt(
      String(payment.phoneNumber).replace(/\D/g, ""),
      10,
    );
    if (!Number.isFinite(msisdn) || !/^254\d{9}$/.test(String(msisdn))) {
      return NextResponse.json(
        { success: false, error: "Invalid phone on stored payment intent." },
        { status: 500 }
      );
    }
    const amountKesRounded = Math.round(Number(payment.amountKes));

    const stkPayload = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: amountKesRounded,
      PartyA: msisdn,
      PartyB: businessShortCode,
      PhoneNumber: msisdn,
      CallBackURL: callbackUrl,
      AccountReference:
        payment.clerkOrgId.length > 20
          ? payment.clerkOrgId.slice(0, 20)
          : payment.clerkOrgId,
      TransactionDesc: "Subscription",
    };

    const stkUrl = buildDarajaRequestUrl(
      apiBase,
      "/mpesa/stkpush/v1/processrequest"
    );
    const stkRes = await mpesaDarajaFetch(stkUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPayload),
      signal: darajaFetchSignal(),
    });

    const stkData = await readDarajaJson("mpesa stkpush", stkRes);
    const outcomeCode = normalizeStkDarajaOutcomeCode(stkData);
    const checkoutId = pickCheckoutRequestIdFlexible(stkData);
    const responseDescription =
      stringifyOptional(stkData.ResponseDescription) ??
      stringifyOptional(stkData.responseDescription);
    const customerMessage =
      stringifyOptional(stkData.CustomerMessage) ??
      stringifyOptional(stkData.customerMessage);

    if (outcomeCode !== "0" || !checkoutId) {
      console.warn("[mpesa/stkpush] daraja stk", {
        httpStatus: stkRes.status,
        outcomeCode,
        checkoutIdPresent: Boolean(checkoutId),
        responseDescription,
      });
    }

    if (outcomeCode === "0" && checkoutId) {
      await client.mutation(api.mpesaPayments.updatePaymentWithCheckoutId, {
        paymentId: body.paymentId as Id<"mpesaPayments">,
        checkoutRequestId: checkoutId,
      });

      return NextResponse.json({
        success: true,
        message:
          customerMessage ??
          responseDescription ??
          "STK Push sent. Approve on your handset to finish payment.",
        checkoutRequestId: checkoutId,
      });
    }

    if (outcomeCode === "0" && !checkoutId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Daraja accepted the request but returned no CheckoutRequestID.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: formatStkDarajaFailure(stkRes, stkData, callbackUrl),
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const lower = rawMsg.toLowerCase();
    const causeCode =
      err instanceof Error && "cause" in err && err.cause instanceof Error
        ? (err.cause as NodeJS.ErrnoException).code
        : undefined;
    const darajaMisconfig =
      lower.includes("mpesa_api_base") ||
      lower.includes("invalid ip address") ||
      causeCode === "ERR_INVALID_IP_ADDRESS";
    const networkFail =
      lower === "fetch failed" ||
      lower.includes("und_err_socket") ||
      lower.includes("econnreset") ||
      lower.includes("etimedout");
    const message = darajaMisconfig
      ? `${rawMsg} Check MPESA_API_BASE in .env (must be absolute, e.g. https://sandbox.safaricom.co.ke). Empty VAR= lines count as blank.`
      : networkFail
        ? "Could not reach Safaricom Daraja from this server (network/socket). Retry, try another connection or VPN-off, or run the app somewhere with stable outbound HTTPS. Technical: "
          + rawMsg
        : rawMsg;
    console.error("[mpesa/stkpush]", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
