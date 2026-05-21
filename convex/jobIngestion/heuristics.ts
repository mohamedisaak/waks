export function inferLocationType(
  text: string
): "onsite" | "remote" | "hybrid" {
  const t = text.toLowerCase();
  if (/\bremote\b|\bwork from home\b|\bwfh\b/.test(t)) {
    if (/\bhybrid\b/.test(t)) return "hybrid";
    return "remote";
  }
  if (/\bhybrid\b/.test(t)) return "hybrid";
  return "onsite";
}

export function inferEmploymentType(
  text: string
): "full-time" | "part-time" | "contract" | "internship" {
  const t = text.toLowerCase();
  if (/\bintern/.test(t)) return "internship";
  if (/\bpart[- ]?time\b/.test(t)) return "part-time";
  if (/\bcontract\b|\bfreelance\b|\bconsultant\b/.test(t)) return "contract";
  return "full-time";
}

export function truncateDescription(text: string, maxLen = 3500): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 3)}...`;
}

/** Truncate structured markdown while keeping `##` section breaks and list lines. */
export function truncateStructuredMarkdown(text: string, maxLen = 6000): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 3)}...`;
}

export function externalIdFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? url;
  } catch {
    return url;
  }
}

export function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}
