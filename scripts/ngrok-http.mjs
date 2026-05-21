#!/usr/bin/env node

/**
 * Tunnel to the Next.js dev port. Must match `next dev -p …` in package.json ("dev").
 * Loads `.env.local` so `NGROK_AUTHTOKEN` is available (ngrok v3 requires an authtoken).
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const portRaw = process.env.MPESA_DEV_PORT ?? process.env.PORT ?? "3000";
const port = String(portRaw).trim();
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error(
    `[ngrok] Invalid port "${port}". Set MPESA_DEV_PORT to a numeric 1–65535.`,
  );
  process.exit(1);
}

const hasToken = Boolean(process.env.NGROK_AUTHTOKEN?.trim());
if (!hasToken) {
  console.error(
    `[ngrok] NGROK_AUTHTOKEN is not set in .env.local. ngrok will fail with ERR_NGROK_4018 until you:`,
  );
  console.error(
    `    1) Sign up (free): https://dashboard.ngrok.com/signup`,
  );
  console.error(
    `    2) Copy token:   https://dashboard.ngrok.com/get-started/your-authtoken`,
  );
  console.error(
    `    3) Add to .env.local:  NGROK_AUTHTOKEN=<your_token>`,
  );
  console.error(
    `    (Alternative one-time: npx ngrok config add-authtoken <token>)`,
  );
}

console.error(
  `[ngrok] Forwarding → http://127.0.0.1:${port} (MPESA_DEV_PORT / PORT)`,
);

/** `shell: true` with args triggers NODE_DEP0190; Windows often needs a shell to find `npx`. */
const useShell = process.platform === "win32";

const child = spawn("npx", ["--yes", "ngrok@latest", "http", port], {
  stdio: "inherit",
  shell: useShell,
  env: process.env,
});

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : code ?? 0);
});
