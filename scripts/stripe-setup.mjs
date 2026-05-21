#!/usr/bin/env node

/**
 * Stripe env bootstrap for Waks listing-credit checkout.
 *
 * Requires STRIPE_SECRET_KEY in .env.local (sk_test_... or sk_live_...).
 * Creates one-time USD prices ($8 / $32), optional ngrok webhook endpoint,
 * generates STRIPE_FULFILL_SECRET, updates .env.local, and syncs fulfill secret to Convex.
 *
 * Usage:
 *   npm run stripe:setup
 *   npm run stripe:setup -- --check
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import Stripe from "stripe";

const ROOT = process.cwd();
const ENV_PATH = resolve(ROOT, ".env.local");

loadEnv({ path: ENV_PATH });
loadEnv({ path: resolve(ROOT, ".env") });

const LISTING_PRODUCTS = [
  {
    envKey: "STRIPE_PRICE_LISTING_SINGLE",
    slug: "listing_single",
    name: "Waks listing credit (single)",
    description: "One extra active job listing credit",
    unitAmount: 800,
  },
  {
    envKey: "STRIPE_PRICE_LISTING_PACK_5",
    slug: "listing_pack_5",
    name: "Waks listing credits (pack of 5)",
    description: "Five listing credits (20% pack discount)",
    unitAmount: 3200,
  },
];

function isPlaceholder(value) {
  const v = value?.trim() ?? "";
  if (!v) return true;
  if (v === "8" || v === "32" || v === "$8" || v === "$32") return true;
  if (/^whsec_\.\.\./i.test(v)) return true;
  if (v.startsWith("<")) return true;
  return false;
}

function isValidSecretKey(key) {
  return /^sk_(test|live)_/.test(key?.trim() ?? "");
}

function isValidPriceId(id) {
  return /^price_/.test(id?.trim() ?? "");
}

function isValidWebhookSecret(secret) {
  return /^whsec_/.test(secret?.trim() ?? "");
}

function generateFulfillSecret() {
  return randomBytes(32).toString("hex");
}

async function getNgrokOrigin() {
  const api = process.env.NGROK_LOCAL_API ?? "http://127.0.0.1:4040/api/tunnels";
  try {
    const res = await fetch(api, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const raw = await res.json();
    const tunnels = Array.isArray(raw.tunnels) ? raw.tunnels : [];
    const https = tunnels.find((t) => t.proto === "https");
    const pub =
      https?.public_url ?? tunnels.find((t) => t.proto === "http")?.public_url;
    return pub ? pub.replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

function readEnvFile() {
  try {
    return readFileSync(ENV_PATH, "utf8");
  } catch {
    return "";
  }
}

function upsertEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) {
    return content.replace(re, line);
  }
  const trimmed = content.replace(/\s*$/, "");
  const sep = trimmed.length === 0 ? "" : "\n";
  return `${trimmed}${sep}\n# Stripe (listing credit checkout)\n${line}\n`;
}

function applyEnvUpdates(updates) {
  let content = readEnvFile();
  for (const [key, value] of Object.entries(updates)) {
    content = upsertEnvVar(content, key, value);
  }
  writeFileSync(ENV_PATH, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

async function findOrCreatePrice(stripe, spec) {
  const products = await stripe.products.search({
    query: `metadata['waks_product']:'${spec.slug}'`,
    limit: 1,
  });

  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: spec.name,
      description: spec.description,
      metadata: { waks_product: spec.slug },
    });
    console.log(`  Created product ${product.id} (${spec.slug})`);
  } else {
    console.log(`  Reusing product ${product.id} (${spec.slug})`);
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 20,
  });

  const existing = prices.data.find(
    (p) =>
      p.currency === "usd" &&
      p.unit_amount === spec.unitAmount &&
      p.type === "one_time"
  );

  if (existing) {
    console.log(`  Reusing price ${existing.id} ($${spec.unitAmount / 100})`);
    return existing.id;
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: spec.unitAmount,
    metadata: { waks_product: spec.slug },
  });
  console.log(`  Created price ${price.id} ($${spec.unitAmount / 100})`);
  return price.id;
}

async function findOrCreateWebhook(stripe, webhookUrl) {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((e) => e.url === webhookUrl);

  if (match) {
    console.log(`  Reusing webhook endpoint ${match.id}`);
    if (match.secret) return match.secret;
    console.warn(
      "  Could not read signing secret for existing endpoint.\n" +
        "  Stripe Dashboard → Webhooks → this endpoint → Reveal signing secret → STRIPE_WEBHOOK_SECRET"
    );
    return null;
  }

  const created = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: ["checkout.session.completed"],
    description: "Waks listing credit fulfillment",
  });
  console.log(`  Created webhook endpoint ${created.id}`);
  return created.secret;
}

function syncConvexEnv(key, value) {
  const result = spawnSync("npx", ["convex", "env", "set", key, value], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    console.warn(
      `  Could not set Convex env ${key} automatically.\n` +
        `  Run manually: npx convex env set ${key} '${value}'\n` +
        (result.stderr?.trim() || result.stdout?.trim() || "")
    );
    return false;
  }
  console.log(`  Set Convex env ${key}`);
  return true;
}

function printChecklist(results) {
  console.log("\n--- Stripe setup summary ---\n");
  for (const [key, ok, note] of results) {
    console.log(`${ok ? "✓" : "✗"} ${key}${note ? ` — ${note}` : ""}`);
  }
  console.log("\nRestart dev (`npm run dev:with-ngrok`) after saving .env.local.\n");
}

async function runCheck() {
  const results = [];
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const fulfillSecret = process.env.STRIPE_FULFILL_SECRET?.trim();
  const priceSingle = process.env.STRIPE_PRICE_LISTING_SINGLE?.trim();
  const pricePack = process.env.STRIPE_PRICE_LISTING_PACK_5?.trim();

  results.push([
    "STRIPE_SECRET_KEY",
    isValidSecretKey(secretKey),
    isValidSecretKey(secretKey) ? "set" : "paste sk_test_... from Stripe Dashboard → API keys",
  ]);
  results.push([
    "STRIPE_PRICE_LISTING_SINGLE",
    isValidPriceId(priceSingle),
    isValidPriceId(priceSingle) ? priceSingle : "run npm run stripe:setup",
  ]);
  results.push([
    "STRIPE_PRICE_LISTING_PACK_5",
    isValidPriceId(pricePack),
    isValidPriceId(pricePack) ? pricePack : "run npm run stripe:setup",
  ]);
  results.push([
    "STRIPE_WEBHOOK_SECRET",
    isValidWebhookSecret(webhookSecret),
    isValidWebhookSecret(webhookSecret) ? "set" : "run npm run stripe:setup or stripe listen",
  ]);
  results.push([
    "STRIPE_FULFILL_SECRET",
    Boolean(fulfillSecret) && !isPlaceholder(fulfillSecret),
    fulfillSecret && !isPlaceholder(fulfillSecret) ? "set" : "run npm run stripe:setup",
  ]);

  printChecklist(results);
  const allOk = results.every(([, ok]) => ok);
  process.exit(allOk ? 0 : 1);
}

async function main() {
  const checkOnly = process.argv.includes("--check");

  if (checkOnly) {
    await runCheck();
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!isValidSecretKey(secretKey)) {
    console.error(`
STRIPE_SECRET_KEY is missing or invalid in .env.local.

► If you just pasted the key in Cursor/VS Code, save the file first (Cmd+S / Ctrl+S), then re-run:
    npm run stripe:setup

► Otherwise get the key from https://dashboard.stripe.com/test/apikeys (Secret key, sk_test_...)
   and set:  STRIPE_SECRET_KEY=sk_test_...
`);
    process.exit(1);
  }

  const stripe = new Stripe(secretKey);
  const updates = {};

  let fulfillSecret = process.env.STRIPE_FULFILL_SECRET?.trim();
  if (isPlaceholder(fulfillSecret)) {
    fulfillSecret = generateFulfillSecret();
    updates.STRIPE_FULFILL_SECRET = fulfillSecret;
    console.log("Generated STRIPE_FULFILL_SECRET");
  }

  console.log("\nListing credit prices:");
  for (const spec of LISTING_PRODUCTS) {
    const current = process.env[spec.envKey]?.trim();
    if (isValidPriceId(current)) {
      console.log(`  ${spec.envKey} already set (${current})`);
      continue;
    }
    const priceId = await findOrCreatePrice(stripe, spec);
    updates[spec.envKey] = priceId;
  }

  const ngrokOrigin =
    (await getNgrokOrigin()) ??
    process.env.MPESA_TUNNEL_ORIGIN?.trim()?.replace(/\/$/, "") ??
    null;
  if (ngrokOrigin) {
    const webhookUrl = `${ngrokOrigin}/api/stripe/webhook`;
    const currentWebhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!isValidWebhookSecret(currentWebhook)) {
      console.log(`\nWebhook (${webhookUrl}):`);
      const whsec = await findOrCreateWebhook(stripe, webhookUrl);
      if (whsec) {
        updates.STRIPE_WEBHOOK_SECRET = whsec;
      }
    } else {
      console.log("\nSTRIPE_WEBHOOK_SECRET already set; skipping webhook creation.");
      console.log(`  Register manually if needed: ${webhookUrl}`);
    }
  } else {
    console.log("\nNo ngrok tunnel detected.");
    console.log("  Start: npm run dev:with-ngrok");
    console.log("  Then:  npm run stripe:ngrok-url");
    console.log("  Or:    stripe listen --forward-to localhost:3000/api/stripe/webhook");
  }

  if (Object.keys(updates).length > 0) {
    applyEnvUpdates(updates);
    console.log("\nUpdated .env.local:", Object.keys(updates).join(", "));
    for (const [k, v] of Object.entries(updates)) {
      loadEnv({ path: ENV_PATH, override: true });
      if (k === "STRIPE_FULFILL_SECRET") {
        process.env.STRIPE_FULFILL_SECRET = v;
      }
    }
  }

  const fulfillToSync =
    updates.STRIPE_FULFILL_SECRET ?? process.env.STRIPE_FULFILL_SECRET?.trim();
  if (fulfillToSync && !isPlaceholder(fulfillToSync)) {
    console.log("\nConvex:");
    syncConvexEnv("STRIPE_FULFILL_SECRET", fulfillToSync);
  }

  await runCheck();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
