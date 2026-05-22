#!/usr/bin/env node
/**
 * Quick SEO health check for https://www.waks.co.ke
 * Run: node scripts/seo-verify.mjs
 */

const SITE = process.env.SEO_SITE_ORIGIN ?? "https://www.waks.co.ke";

async function fetchText(path) {
  const res = await fetch(`${SITE}${path}`, {
    headers: { "User-Agent": "WaksSeoVerify/1.0" },
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

function countSitemapUrls(xml) {
  return (xml.match(/<loc>/g) ?? []).length;
}

function hasJobLinks(html) {
  return /href="\/jobs\/[a-z0-9]+"/i.test(html);
}

console.log(`\nSEO verify — ${SITE}\n`);

const robots = await fetchText("/robots.txt");
console.log(`robots.txt: ${robots.status} ${robots.ok ? "OK" : "FAIL"}`);
if (!robots.text.includes("Sitemap:")) {
  console.warn("  ⚠ Missing Sitemap directive in robots.txt");
}

const sitemap = await fetchText("/sitemap.xml");
const urlCount = countSitemapUrls(sitemap.text);
console.log(`sitemap.xml: ${sitemap.status} — ${urlCount} URLs`);
if (urlCount <= 10) {
  console.warn(
    "  ⚠ Only static pages in sitemap (no employer job URLs). Run job ingestion on production Convex."
  );
}

const home = await fetchText("/");
console.log(`homepage: ${home.status} — title present: ${/<title>/i.test(home.text)}`);

const jobs = await fetchText("/jobs");
const jobLinks = hasJobLinks(jobs.text);
console.log(
  `jobs page: ${jobs.status} — job detail links in HTML: ${jobLinks ? "yes" : "no"}`
);
if (!jobLinks) {
  console.warn(
    "  ⚠ No /jobs/{id} links in server HTML. Populate production jobs or check NEXT_PUBLIC_CONVEX_URL on Vercel."
  );
}

const verify = await fetchText("/googlee93c9acb7c5ed55c.html");
console.log(
  `Google verification file: ${verify.status} ${verify.text.includes("google-site-verification") ? "OK" : "FAIL"}`
);

console.log(`
Google Search Console (manual):
  1. Indexing → Sitemaps → submit ${SITE}/sitemap.xml
  2. URL inspection → Request indexing for:
     - ${SITE}/
     - ${SITE}/jobs
     - ${SITE}/jobs/kenya
  3. In 3–7 days: search Google for site:waks.co.ke

Production job board (Convex):
  npx convex run --prod jobs:getPublicBoardStats '{}'
  npx convex run --prod jobIngestion/schedule:kickoffScheduledIngestion '{"minActiveJobs":1,"maxPagesPerSource":3}'
`);
