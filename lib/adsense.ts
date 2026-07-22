/** Google AdSense publisher ID — also loaded globally in `<head>` for site verification. */
export const ADSENSE_PUBLISHER_ID = "ca-pub-7778288288752826";

/** Parsed from admin field `publisherId:slotId` (e.g. `ca-pub-1234567890123456:9876543210`). */
export type ParsedAdsenseClientSlot = {
  clientId: string;
  slotId: string;
};

export function parseAdsenseClientSlot(
  raw: string | undefined | null
): ParsedAdsenseClientSlot | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const colon = trimmed.indexOf(":");
  if (colon <= 0 || colon === trimmed.length - 1) return null;

  const clientId = trimmed.slice(0, colon).trim();
  const slotId = trimmed.slice(colon + 1).trim();

  if (!/^ca-pub-\d+$/i.test(clientId) || !/^\d+$/.test(slotId)) {
    return null;
  }

  return { clientId, slotId };
}
