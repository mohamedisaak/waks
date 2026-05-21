#!/usr/bin/env node

/**
 * Reads ngrok’s local inspector API and prints suggested env lines.
 * Loads `.env.local` (same pattern as ngrok-http.mjs).
 */
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const endpoint = process.env.NGROK_LOCAL_API ?? "http://127.0.0.1:4040/api/tunnels";

function printTroubleshooting() {
  console.error(`
Could not reach ngrok’s local API (${endpoint}).

► Ngrok must stay running. Fixes for common failures:

  • ERR_NGROK_4018 / "authentication failed":
    Add to .env.local:  NGROK_AUTHTOKEN=<token>
    Get token: https://dashboard.ngrok.com/get-started/your-authtoken
    Then run: npm run dev:with-ngrok  (scripts load .env.local automatically)

► Start the tunnel:
    npm run dev:ngrok
  (or stack + tunnel):
    npm run dev:with-ngrok

► "Another next dev server is already running":
    Stop every other npm run dev for this folder (⌃C). Only one Next dev per project.

► Port 3000 in use: kill the PID shown in Next’s log.

► Custom ngrok API URL: NGROK_LOCAL_API=…`);
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
    if (raw === null || typeof raw !== "object") {
      console.error("ngrok inspector returned unexpected JSON.");
      printTroubleshooting();
      process.exit(1);
    }
    const tunnels = Array.isArray(raw.tunnels) ? raw.tunnels : [];
    const https = tunnels.find((t) => t.proto === "https");
    const pub =
      https?.public_url ?? tunnels.find((t) => t.proto === "http")?.public_url;
    if (!pub) {
      console.error(
        "No tunnels in ngrok response. Ensure ngrok is running and forwarded to Next’s port.",
      );
      printTroubleshooting();
      process.exit(1);
    }

    console.log("");
    console.log("# Add to .env.local (tunnel URL changes often on ngrok free tier):");
    console.log(`MPESA_TUNNEL_ORIGIN=${pub}`);
    console.log("");
    console.log("# Or set the full webhook explicitly:");
    console.log(`MPESA_CALLBACK_URL=${pub}/api/mpesa/callback`);
    console.log("");
    console.log("Restart the dev stack after saving .env.local.");
  } catch (e) {
    console.error("fetch failed");
    console.error(String(e instanceof Error ? e.message : e));
    printTroubleshooting();
    process.exit(1);
  }
}

main();
