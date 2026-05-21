import {
  FETCH_DELAY_MS,
  INGESTION_USER_AGENT,
} from "./constants";

let lastFetchAt = 0;

async function rateLimitPause() {
  const now = Date.now();
  const wait = lastFetchAt + FETCH_DELAY_MS - now;
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastFetchAt = Date.now();
}

const robotsCache = new Map<string, { fetchedAt: number; disallow: string[] }>();
const ROBOTS_TTL_MS = 60 * 60 * 1000;

function pathAllowed(disallow: string[], pathname: string): boolean {
  for (const rule of disallow) {
    if (!rule) continue;
    if (rule === "/") return false;
    if (pathname.startsWith(rule)) return false;
  }
  return true;
}

async function loadRobots(origin: string): Promise<string[]> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_TTL_MS) {
    return cached.disallow;
  }
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": INGESTION_USER_AGENT },
    });
    if (!res.ok) {
      robotsCache.set(origin, { fetchedAt: Date.now(), disallow: [] });
      return [];
    }
    const text = await res.text();
    const disallow: string[] = [];
    let applies = false;
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (/^user-agent:\s*\*/i.test(trimmed)) {
        applies = true;
        continue;
      }
      if (/^user-agent:/i.test(trimmed) && !/\*/i.test(trimmed)) {
        applies = false;
        continue;
      }
      if (applies) {
        const m = trimmed.match(/^disallow:\s*(.*)$/i);
        if (m) disallow.push(m[1].trim());
      }
    }
    robotsCache.set(origin, { fetchedAt: Date.now(), disallow });
    return disallow;
  } catch {
    robotsCache.set(origin, { fetchedAt: Date.now(), disallow: [] });
    return [];
  }
}

export async function fetchHtmlPage(url: string): Promise<string> {
  const parsed = new URL(url);
  const disallow = await loadRobots(parsed.origin);
  if (!pathAllowed(disallow, parsed.pathname)) {
    throw new Error(`robots.txt disallows ${parsed.pathname}`);
  }

  await rateLimitPause();

  const res = await fetch(url, {
    headers: {
      "User-Agent": INGESTION_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  return await res.text();
}

const MAX_REDIRECT_HOPS = 5;

/** Follow redirects and return the final URL (for MyJobMag /apply-now/ links). */
export async function resolveRedirectUrl(
  url: string,
  options?: { skipRobotsCheck?: boolean }
): Promise<string> {
  const parsed = new URL(url);
  if (!options?.skipRobotsCheck) {
    const disallow = await loadRobots(parsed.origin);
    if (!pathAllowed(disallow, parsed.pathname)) {
      throw new Error(`robots.txt disallows ${parsed.pathname}`);
    }
  }

  let current = url;
  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
    await rateLimitPause();
    const res = await fetch(current, {
      method: "HEAD",
      headers: {
        "User-Agent": INGESTION_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return current;
      current = new URL(location, current).href;
      continue;
    }

    if (res.status === 405 || res.status === 501) {
      await rateLimitPause();
      const getRes = await fetch(current, {
        method: "GET",
        headers: {
          "User-Agent": INGESTION_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
      });
      if (getRes.status >= 300 && getRes.status < 400) {
        const location = getRes.headers.get("location");
        if (!location) return current;
        current = new URL(location, current).href;
        continue;
      }
      return getRes.url || current;
    }

    return res.url || current;
  }

  return current;
}
