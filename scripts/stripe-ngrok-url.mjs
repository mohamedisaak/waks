#!/usr/bin/env node

/**
 * Prints Stripe webhook env lines using the active ngrok HTTPS tunnel.
 * Loads `.env.local` (same pattern as mpesa-ngrok-url.mjs).
 */
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const endpoint = process.env.NGROK_LOCAL_API ?? "http://127.0.0.1:4040/api/tunnels";

function printTroubleshooting() {
  console.error(`
Could not reach ngrok’s local API (${endpoint}).

► Start the tunnel:
    npm run dev:ngrok
  (or stack + tunnel):
    npm run dev:with-ngrok

► Add NGROK_AUTHTOKEN to .env.local — https://dashboard.ngrok.com/get-started/your-authtoken`);
}

async function main() {
  try {
    const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.error(`ngrok inspector returned HTTP ${res.status}.`);
      printTroubleshooting();
      process.exit(1);
    }
    const raw = await res.json();
    const tunnels = Array.isArray(raw.tunnels) ? raw.tunnels : [];
    const https = tunnels.find((t) => t.proto === "https");
    const pub =
      https?.public_url ?? tunnels.find((t) => t.proto === "http")?.public_url;
    if (!pub) {
      console.error("No HTTPS tunnel found. Is ngrok running?");
      printTroubleshooting();
      process.exit(1);
    }

    const webhookUrl = `${pub.replace(/\/$/, "")}/api/stripe/webhook`;

    console.log("");
    console.log("# Stripe Dashboard → Developers → Webhooks → Add endpoint");
    console.log(`# Endpoint URL:\n${webhookUrl}`);
    console.log("");
    console.log("# Events: checkout.session.completed");
    console.log("");
    console.log("# Or run: npm run stripe:setup  (creates endpoint via API when STRIPE_SECRET_KEY is set)");
    console.log("");
  } catch (e) {
    console.error(String(e instanceof Error ? e.message : e));
    printTroubleshooting();
    process.exit(1);
  }
}

main();
