const CALLBACK_PATH = "/api/mpesa/callback";

function normalizeHttpOrigin(raw: string): string | undefined {
  const s = raw.trim().replace(/\/+$/, "");
  if (s === "") return undefined;
  const withScheme =
    s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return undefined;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return undefined;
  }
  if (!u.hostname) return undefined;
  return `${u.protocol}//${u.host}`;
}

/** Safaricom cannot POST to localhost or loopback, even over https://. */
export function isNonPublicMpesaLoopbackCallback(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

function normalizeFullCallback(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error(
      `MPESA_CALLBACK_URL must be a valid absolute URL. Received ${JSON.stringify(raw)}`
    );
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(
      `MPESA_CALLBACK_URL must use http(s). Received ${JSON.stringify(raw)}`
    );
  }
  if (!u.hostname) {
    throw new Error(`MPESA_CALLBACK_URL must include a hostname.`);
  }
  const path = u.pathname.replace(/\/+$/, "") || "/";
  if (path !== CALLBACK_PATH) {
    throw new Error(
      `MPESA_CALLBACK_URL path must be exactly ${CALLBACK_PATH}. Got: ${path}`
    );
  }
  return `${u.origin}${CALLBACK_PATH}`;
}

/**
 * Callback URL shipped to Daraja on STK (must be publicly reachable HTTPS in practice).
 *
 * Precedence:
 * - `MPESA_CALLBACK_URL`: full webhook URL (`…/api/mpesa/callback`).
 * - If it targets loopback localhost and `MPESA_TUNNEL_ORIGIN` / `NGROK_TUNNEL_ORIGIN` is set, the tunnel wins.
 * - If `MPESA_CALLBACK_URL` is unset, build from tunnel origin only.
 */
export function resolveMpesaCallbackUrl(): string {
  const tunnelOrigin =
    normalizeHttpOrigin(process.env.MPESA_TUNNEL_ORIGIN ?? "") ??
    normalizeHttpOrigin(process.env.NGROK_TUNNEL_ORIGIN ?? "");
  const fromTunnel =
    tunnelOrigin !== undefined ? `${tunnelOrigin}${CALLBACK_PATH}` : undefined;

  const explicitRaw =
    typeof process.env.MPESA_CALLBACK_URL === "string"
      ? process.env.MPESA_CALLBACK_URL.trim()
      : "";

  if (explicitRaw !== "") {
    const normalized = normalizeFullCallback(explicitRaw);
    if (
      fromTunnel !== undefined &&
      isNonPublicMpesaLoopbackCallback(normalized)
    ) {
      return fromTunnel;
    }
    if (isNonPublicMpesaLoopbackCallback(normalized)) {
      throw new Error(
        "MPESA_CALLBACK_URL uses localhost, which Daraja cannot reach. Start ngrok (npm run dev:ngrok), run npm run mpesa:ngrok-url, then set MPESA_TUNNEL_ORIGIN in .env.local to the printed https URL (no path) and restart dev."
      );
    }
    return normalized;
  }

  if (fromTunnel !== undefined) return fromTunnel;

  throw new Error(
    "Set MPESA_CALLBACK_URL (HTTPS URL ending with /api/mpesa/callback) or MPESA_TUNNEL_ORIGIN=https://YOUR_TUNNEL_HOST (no path). Run: npm run dev:with-ngrok, then npm run mpesa:ngrok-url → paste MPESA_TUNNEL_ORIGIN."
  );
}
