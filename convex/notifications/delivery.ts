import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { ApplicationNotificationPayload } from "../lib/notificationTypes";
import {
  buildApplicationEmail,
  buildWhatsAppBody,
} from "./emailTemplates";

const MAX_ATTEMPTS = 4;

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Waks <notifications@waks.com>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return `whatsapp:+254${digits.slice(1)}`;
  }
  if (digits.startsWith("254")) {
    return `whatsapp:+${digits}`;
  }
  if (digits.startsWith("7") && digits.length === 9) {
    return `whatsapp:+254${digits}`;
  }
  if (phone.startsWith("whatsapp:")) return phone;
  return `whatsapp:+${digits}`;
}

async function sendTwilioWhatsApp(params: {
  to: string;
  body: string;
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio WhatsApp is not configured");
  }

  const to = normalizeWhatsAppPhone(params.to);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);

  const form = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: to,
    Body: params.body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twilio error ${res.status}: ${body}`);
  }
}

export const markOutboxStatus = internalMutation({
  args: {
    outboxId: v.id("notificationOutbox"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    lastError: v.optional(v.string()),
    incrementAttempts: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.outboxId);
    if (!row) return null;

    const patch: {
      status: "pending" | "processing" | "sent" | "failed" | "skipped";
      lastError?: string;
      sentAt?: number;
      attempts?: number;
    } = { status: args.status };

    if (args.lastError !== undefined) {
      patch.lastError = args.lastError;
    }
    if (args.status === "sent") {
      patch.sentAt = Date.now();
    }
    if (args.incrementAttempts) {
      patch.attempts = row.attempts + 1;
    }

    await ctx.db.patch(args.outboxId, patch);
    return null;
  },
});

export const deliverOutboxRow = internalAction({
  args: { outboxId: v.id("notificationOutbox") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.runQuery(internal.notifications.context.getOutboxRow, {
      outboxId: args.outboxId,
    });

    if (!row || row.status !== "pending") return null;
    if (row.scheduledFor > Date.now()) return null;

    await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
      outboxId: args.outboxId,
      status: "processing",
    });

    const payload = JSON.parse(row.payload) as ApplicationNotificationPayload;

    try {
      if (row.channel === "email") {
        const targetEmail =
          payload.mentionTargetEmail ?? payload.applicantEmail;

        if (!targetEmail) {
          await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
            outboxId: args.outboxId,
            status: "skipped",
            lastError: "No recipient email",
          });
          return null;
        }

        if (payload.tokenIdentifier && row.eventType !== "note_mention") {
          const prefs = await ctx.runQuery(
            internal.notifications.context.getPreferencesByToken,
            { tokenIdentifier: payload.tokenIdentifier }
          );
          if (
            prefs &&
            (!prefs.emailEnabled || prefs.emailUnsubscribedAt !== undefined)
          ) {
            await ctx.runMutation(
              internal.notifications.delivery.markOutboxStatus,
              {
                outboxId: args.outboxId,
                status: "skipped",
                lastError: "Email disabled by user",
              }
            );
            return null;
          }
        }

        const email = buildApplicationEmail(row.eventType, {
          applicantName: payload.applicantName,
          jobTitle: payload.jobTitle,
          companyName: payload.companyName,
          applicationId: payload.applicationId,
          scheduledInterviewAt: payload.scheduledInterviewAt,
          mentionNoteBody: payload.mentionNoteBody,
          mentionAuthorName: payload.mentionAuthorName,
        });

        await sendResendEmail({
          to: targetEmail,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      } else if (row.channel === "whatsapp") {
        const twilioConfigured =
          process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_WHATSAPP_FROM;

        if (!twilioConfigured) {
          await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
            outboxId: args.outboxId,
            status: "skipped",
            lastError: "WhatsApp not configured",
          });
          return null;
        }

        let phone = payload.phone;
        let optedIn = false;

        if (payload.tokenIdentifier) {
          const prefs = await ctx.runQuery(
            internal.notifications.context.getPreferencesByToken,
            { tokenIdentifier: payload.tokenIdentifier }
          );
          if (prefs?.whatsappOptIn && prefs.whatsappPhone) {
            optedIn = true;
            phone = prefs.whatsappPhone;
          }
        }

        if (!optedIn || !phone) {
          await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
            outboxId: args.outboxId,
            status: "skipped",
            lastError: "WhatsApp not opted in",
          });
          return null;
        }

        const body = buildWhatsAppBody(row.eventType, {
          applicantName: payload.applicantName,
          jobTitle: payload.jobTitle,
          companyName: payload.companyName,
          scheduledInterviewAt: payload.scheduledInterviewAt,
        });

        if (!body) {
          await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
            outboxId: args.outboxId,
            status: "skipped",
            lastError: "No WhatsApp template for event",
          });
          return null;
        }

        await sendTwilioWhatsApp({ to: phone, body });
      } else {
        await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
          outboxId: args.outboxId,
          status: "skipped",
          lastError: "In-app handled at enqueue",
        });
        return null;
      }

      await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
        outboxId: args.outboxId,
        status: "sent",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = row.attempts + 1;

      if (attempts >= MAX_ATTEMPTS) {
        await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
          outboxId: args.outboxId,
          status: "failed",
          lastError: message,
          incrementAttempts: true,
        });
      } else {
        await ctx.runMutation(internal.notifications.delivery.markOutboxStatus, {
          outboxId: args.outboxId,
          status: "pending",
          lastError: message,
          incrementAttempts: true,
        });
      }
    }

    return null;
  },
});

export const processPending = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ids = await ctx.runQuery(
      internal.notifications.context.listPendingOutbox,
      { limit: args.limit ?? 25 }
    );

    for (const outboxId of ids) {
      await ctx.runAction(internal.notifications.delivery.deliverOutboxRow, {
        outboxId,
      });
    }

    return null;
  },
});
