import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convexServerClient";
import {
  coerceDarajaNumericCode,
  extractMpesaReceiptFromCallbackMetadata,
  pickCheckoutRequestIdFlexible,
  unwrapDarajaStkSection,
  type MpesaCallbackMetadataItem,
} from "@/lib/mpesaDarajaCore";

/**
 * Server-to-secret for Convex fulfillment (not Daraja passkey / STK Password).
 * Set `CONVEX_MPESA_STK_FULFILL_SECRET` identically on Next and Convex. Legacy: `MPESA_STK_CALLBACK_SECRET`.
 */
function getConvexMpesaFulfillSecret(): string | undefined {
  return (
    process.env.CONVEX_MPESA_STK_FULFILL_SECRET ??
    process.env.MPESA_STK_CALLBACK_SECRET
  );
}

export async function POST(req: Request) {
  try {
    const secret = getConvexMpesaFulfillSecret();
    if (!secret) {
      console.error(
        "CONVEX_MPESA_STK_FULFILL_SECRET (or legacy MPESA_STK_CALLBACK_SECRET) is not configured"
      );
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Server misconfiguration" },
        { status: 503 }
      );
    }

    const rawBody = (await req.json()) as Record<string, unknown>;
    const stk = unwrapDarajaStkSection(rawBody);
    let checkoutRequestId = pickCheckoutRequestIdFlexible(stk);
    if (!checkoutRequestId) {
      checkoutRequestId = pickCheckoutRequestIdFlexible(rawBody);
    }
    if (!checkoutRequestId) {
      console.warn(
        "[mpesa/callback] missing CheckoutRequestID",
        JSON.stringify(rawBody).slice(0, 800)
      );
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Missing stk callback" },
        { status: 400 }
      );
    }

    const resultCode = coerceDarajaNumericCode(stk.ResultCode);
    if (resultCode === undefined) {
      console.warn(
        "[mpesa/callback] missing ResultCode",
        JSON.stringify(rawBody).slice(0, 800)
      );
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Missing ResultCode" },
        { status: 400 }
      );
    }

    const client = getConvexHttpClient();

    if (resultCode === 0) {
      const meta = stk.CallbackMetadata;
      let receipt: string | undefined;
      if (meta !== null && typeof meta === "object" && !Array.isArray(meta)) {
        const rawItems = (meta as { Item?: unknown }).Item;
        if (Array.isArray(rawItems)) {
          receipt = extractMpesaReceiptFromCallbackMetadata(rawItems as MpesaCallbackMetadataItem[]);
        }
      }

      await client.mutation(api.mpesaPayments.fulfillStkPaymentFromDarajaCallback, {
        fulfillSecret: secret,
        checkoutRequestId,
        status: "success",
        ...(receipt !== undefined ? { mpesaReceiptNumber: receipt } : {}),
      });
    } else {
      await client.mutation(api.mpesaPayments.fulfillStkPaymentFromDarajaCallback, {
        fulfillSecret: secret,
        checkoutRequestId,
        status: "failed",
      });
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Callback processed successfully",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mpesa/callback]", err);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: message },
      { status: 500 }
    );
  }
}
