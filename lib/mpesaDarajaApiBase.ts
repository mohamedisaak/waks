const DEFAULT_MPESA_API_BASE = "https://sandbox.safaricom.co.ke";

/**
 * Daraja OAuth/STK REST base URL: scheme + host (+ optional port), no trailing slash.
 *
 * Note: `.env` often sets `MPESA_API_BASE=` (empty string). Unlike `undefined`, empty string does
 * not trigger `?? default`, which produced relative URLs (`/oauth/v1/...`) and downstream
 * `ERR_INVALID_IP_ADDRESS` / hostname `undefined`.
 */
export function getMpesaDarajaApiBase(): string {
  const raw = process.env.MPESA_API_BASE;
  const trimmed = typeof raw === "string" ? raw.trim() : "";

  const candidate =
    trimmed === ""
      ? DEFAULT_MPESA_API_BASE
      : trimmed.includes("://")
        ? trimmed
        : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      `MPESA_API_BASE must be a valid http(s) URL. Received: ${JSON.stringify(raw)}`
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(
      `MPESA_API_BASE must use http or https. Received: ${JSON.stringify(raw)}`
    );
  }

  const host = parsed.hostname.trim();
  if (host === "") {
    throw new Error(
      `MPESA_API_BASE must include a hostname (e.g. https://sandbox.safaricom.co.ke). Received: ${JSON.stringify(raw)}`
    );
  }

  const origin =
    parsed.port !== ""
      ? `${parsed.protocol}//${parsed.hostname}:${parsed.port}`
      : `${parsed.protocol}//${parsed.hostname}`;
  return origin.replace(/\/$/, "");
}
