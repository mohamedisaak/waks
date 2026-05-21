import { mpesaDarajaFetch } from "@/lib/mpesaDarajaFetch";

export function getMpesaFetchTimeoutMs(): number {
  const parsed = Number(process.env.MPESA_FETCH_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90_000;
}

export function darajaFetchSignal(): AbortSignal {
  return AbortSignal.timeout(getMpesaFetchTimeoutMs());
}

/** Daraja OAuth/STK URLs must stay absolute — empty hostnames surface as TLS `ERR_INVALID_IP_ADDRESS`. */
export function buildDarajaRequestUrl(
  apiBase: string,
  pathAndQuery: string
): string {
  const base = apiBase.replace(/\/$/, "");
  const joined =
    `${base}${pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`}`;
  let u: URL;
  try {
    u = new URL(joined);
  } catch {
    throw new Error(
      `Invalid Daraja URL. Base: ${JSON.stringify(apiBase)}, path: ${JSON.stringify(pathAndQuery)}`
    );
  }
  if (!u.hostname.trim()) {
    throw new Error(
      `Daraja URL has no hostname — check MPESA_API_BASE is set and restart Next. Resolved: ${u.href}`
    );
  }
  return u.href;
}

export function stringifyOptional(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

export async function readDarajaJson(
  label: string,
  res: { status: number; text(): Promise<string> }
): Promise<Record<string, unknown>> {
  const rawText = await res.text();
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(`Expected JSON object`);
    }
    return parsed as Record<string, unknown>;
  } catch {
    const preview =
      rawText.length > 600 ? `${rawText.slice(0, 600)}…` : rawText;
    console.error(`[${label}] HTTP ${res.status}, non-JSON body`, preview);
    throw new Error(
      `${label}: HTTP ${res.status}: ${preview.slice(0, 240)}`
    );
  }
}

/** Daraja often returns `"0"` (string); compare with numeric `0` reliably. */
export function coerceDarajaNumericCode(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : Number(String(raw).trim());
  return Number.isFinite(n) ? n : undefined;
}

function looksLikeSafaricomBlockPage(body: string): boolean {
  return (
    /<html[\s>]|<!DOCTYPE\s+html|<meta\s+name="robots"\s+content="noindex/i.test(
      body
    )
  );
}

/** User-facing OAuth failure explanation when Daraja/WAF returns HTML or 403. */
export function mpesaOAuthFailureHint(
  status: number,
  bodySnippet: string,
  oauthHostname: string
): string {
  const htmlBlocked = looksLikeSafaricomBlockPage(bodySnippet);
  if (status === 403 || status === 401 || htmlBlocked) {
    return (
      `M-Pesa OAuth failed (${status}${htmlBlocked ? ", HTML instead of JSON" : ""}). ` +
      `Endpoint: ${oauthHostname}. ` +
      `Check (1) MPESA_API_BASE — sandbox apps must use https://sandbox.safaricom.co.ke, live apps https://api.safaricom.co.ke; ` +
      `(2) MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET from the same Daraja app/environment; ` +
      `(3) restart Next.js after editing .env; ` +
      `(4) VPN/corporate proxy/firewall blocking Safaricom; try another network without SSL inspection.` +
      ` (5) If payment already progressed, issuing many OAuth token requests quickly can trigger rate limits—we cache one token server-side for STK push and status checks.)`
    );
  }
  return `${bodySnippet.slice(0, 220)}`;
}

/** In-memory OAuth token cache — requesting a new Daraja token on every stkstatus poll triggers 403/HTML from rate limits/WAF. */
type MpesaOAuthCacheEntry = { token: string; expiresAtMs: number };

const mpesaOAuthCache = new Map<string, MpesaOAuthCacheEntry>();
const mpesaOAuthInflight = new Map<string, Promise<string>>();

const OAUTH_EARLY_REFRESH_MS = 120_000;
const OAUTH_DEFAULT_TTL_SEC = 3600;
const OAUTH_MIN_CACHE_MS = 90_000;
const OAUTH_MAX_TTL_SEC = 7100;

function oauthCacheKey(apiBase: string, consumerKey: string): string {
  return `${apiBase.replace(/\/$/, "")}\x00${consumerKey}`;
}

function coerceExpiresInSeconds(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 30) {
    return Math.min(raw, OAUTH_MAX_TTL_SEC);
  }
  const n = Number(String(raw ?? "").trim());
  if (Number.isFinite(n) && n > 30) {
    return Math.min(n, OAUTH_MAX_TTL_SEC);
  }
  return OAUTH_DEFAULT_TTL_SEC;
}

async function refreshMpesaOAuthTokenLocked(
  apiBase: string,
  consumerKey: string,
  consumerSecret: string
): Promise<{ token: string; expiresAtMs: number }> {
  const buffer = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64"
  );

  const oauthUrl = buildDarajaRequestUrl(
    apiBase,
    "/oauth/v1/generate?grant_type=client_credentials"
  );

  let oauthHostname = apiBase.replace(/^https?:\/\//, "").replace(/\/$/, "");
  try {
    oauthHostname = new URL(oauthUrl).hostname;
  } catch {
    // keep fallback hostname from apiBase string
  }

  const res = await mpesaDarajaFetch(oauthUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${buffer}`,
      Accept: "application/json",
      // Some upstream layers treat missing UA as bot traffic and return HTML 403.
      "User-Agent":
        process.env.MPESA_DARAJA_USER_AGENT?.trim() ||
        "Mozilla/5.0 (compatible; Waks/1; +https://waks.app) Daraja-API-Client",
    },
    signal: darajaFetchSignal(),
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(mpesaOAuthFailureHint(res.status, rawText, oauthHostname));
  }

  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("Expected JSON object");
    }
    data = parsed as Record<string, unknown>;
  } catch {
    const preview =
      rawText.length > 400 ? `${rawText.slice(0, 400)}…` : rawText;
    throw new Error(mpesaOAuthFailureHint(res.status, preview, oauthHostname));
  }

  const token = stringifyOptional(data.access_token);

  const errMsg =
    stringifyOptional(data.errorMessage) ??
    stringifyOptional(data.error_description) ??
    stringifyOptional(data.error);

  if (!token) {
    throw new Error(errMsg ?? "M-Pesa OAuth returned no access_token.");
  }

  const ttlMs =
    coerceExpiresInSeconds(data.expires_in) * 1000 - OAUTH_EARLY_REFRESH_MS;
  const expiresAtMs = Math.max(Date.now() + OAUTH_MIN_CACHE_MS, Date.now() + ttlMs);

  return { token, expiresAtMs };
}

export async function fetchMpesaOAuthToken(apiBase: string): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim();
  if (!consumerKey || !consumerSecret) {
    throw new Error("Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET");
  }

  const key = oauthCacheKey(apiBase, consumerKey);
  const now = Date.now();
  const hit = mpesaOAuthCache.get(key);
  if (hit !== undefined && hit.expiresAtMs > now) {
    return hit.token;
  }

  const pending = mpesaOAuthInflight.get(key);
  if (pending !== undefined) {
    return pending;
  }

  const refreshing = (async () => {
    try {
      const { token, expiresAtMs } = await refreshMpesaOAuthTokenLocked(
        apiBase,
        consumerKey,
        consumerSecret
      );
      mpesaOAuthCache.set(key, { token, expiresAtMs });
      return token;
    } finally {
      mpesaOAuthInflight.delete(key);
    }
  })();

  mpesaOAuthInflight.set(key, refreshing);
  return refreshing;
}

/** Visible for tests — clears cached Daraja OAuth tokens after env/credential swaps. */
export function clearMpesaOAuthMemoryCache(): void {
  mpesaOAuthCache.clear();
  mpesaOAuthInflight.clear();
}

export function unwrapDarajaStkSection(
  top: Record<string, unknown>
): Record<string, unknown> {
  const body = top.Body;
  if (body !== undefined && typeof body === "object" && !Array.isArray(body)) {
    const stk = (body as Record<string, unknown>).stkCallback;
    if (
      stk !== undefined &&
      typeof stk === "object" &&
      !Array.isArray(stk)
    ) {
      return stk as Record<string, unknown>;
    }
  }
  return top;
}

export function pickCheckoutRequestIdFlexible(
  record: Record<string, unknown>
): string | undefined {
  const raw =
    record.CheckoutRequestID ??
    record.checkoutRequestID ??
    record.CheckoutRequestId;
  const s =
    typeof raw === "number"
      ? String(raw)
      : typeof raw === "string"
        ? raw
        : "";
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

export type MpesaCallbackMetadataItem = {
  Name?: string;
  Value?: string | number;
};

export function extractMpesaReceiptFromCallbackMetadata(
  items: MpesaCallbackMetadataItem[]
): string | undefined {
  const receiptItem = items.find((item) => item.Name === "MpesaReceiptNumber");
  const v = receiptItem?.Value;
  if (v !== undefined && v !== "") {
    return String(v);
  }
  return undefined;
}
