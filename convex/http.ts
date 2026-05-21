import { httpRouter } from "convex/server";
import { clerkWebhookHandler } from "./webhooks/clerk";
import { mpesaPaymentWebhook } from "./webhooks/mpesa";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: clerkWebhookHandler,
});

http.route({
  path: "/payments/mpesa-webhook",
  method: "POST",
  handler: mpesaPaymentWebhook,
});

export default http;
