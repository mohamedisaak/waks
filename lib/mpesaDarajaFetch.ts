import dns from "node:dns";
import { Agent, fetch } from "undici";

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

function timeoutsMs(): { connect: number; headers: number; body: number } {
  const parsed = Number(process.env.MPESA_FETCH_TIMEOUT_MS);
  const ms = Number.isFinite(parsed) && parsed > 0 ? parsed : 90_000;
  return { connect: ms, headers: ms, body: ms };
}

const t = timeoutsMs();

/**
 * Prefer HTTP/1.1 (`allowH2: false`), long timeouts toward Daraja/Imperva.
 * Uses Node’s DNS order (IPv4 first when supported) instead of forcing `dns.lookup(..., family: 4)`, which has
 * caused `ERR_INVALID_IP_ADDRESS` / `Invalid IP address: undefined` with some TLS+Undici versions.
 */
export const darajaUndiciAgent = new Agent({
  connections: 4,
  pipelining: 1,
  allowH2: false,
  connectTimeout: t.connect,
  headersTimeout: t.headers,
  bodyTimeout: t.body,
});

export function mpesaDarajaFetch(
  input: Parameters<typeof fetch>[0],
  init?: Omit<NonNullable<Parameters<typeof fetch>[1]>, "dispatcher">
): ReturnType<typeof fetch> {
  return fetch(input, {
    ...(init ?? {}),
    dispatcher: darajaUndiciAgent,
  });
}
