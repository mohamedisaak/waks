"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { AdCardFooter, AdFrame } from "@/components/AdFrame";
import { AdSenseUnit } from "@/components/AdSenseUnit";

function utcMs() {
  return Date.now();
}

type SlotKey = "home_hero" | "jobs_rail" | "jobs_inline";

function SponsoredCard({
  placementId,
  title,
  href,
  imageUrl,
  sponsorLabel,
  storageId,
}: {
  placementId: Id<"sponsoredPlacements">;
  title: string;
  href: string;
  imageUrl?: string;
  sponsorLabel?: string;
  storageId?: Id<"_storage">;
}) {
  const resolved = useQuery(
    api.sitePublic.sponsoredImageUrlForClient,
    storageId ? { storageId } : "skip"
  );
  const bumpImp = useMutation(api.sitePublic.bumpPlacementImpression);
  const bumpClick = useMutation(api.sitePublic.bumpPlacementClick);
  const bumped = useRef(false);

  useEffect(() => {
    if (bumped.current) return;
    bumped.current = true;
    bumpImp({ placementId }).catch(() => {
      bumped.current = false;
    });
  }, [bumpImp, placementId]);

  const img = storageId ? (resolved ?? undefined) : imageUrl;
  const ext = /^https?:\/\//i.test(href);
  const brand = sponsorLabel?.trim() || "Partner";

  const cardInner = (
    <>
      {img ?
        <div className="aspect-[16/5] w-full bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic sponsor URLs */}
          <img alt="" src={img} className="h-full w-full object-cover" />
        </div>
      : null}
      <div className="px-4 py-3">
        <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
      </div>
      <AdCardFooter brand={brand} />
    </>
  );

  async function handleClick() {
    await bumpClick({ placementId });
    if (ext) window.open(href, "_blank", "noopener,noreferrer");
  }

  if (ext) {
    return (
      <AdFrame label="sponsored">
        <button
          type="button"
          onClick={() => void handleClick()}
          className="block w-full text-left"
        >
          {cardInner}
        </button>
      </AdFrame>
    );
  }

  return (
    <AdFrame label="sponsored">
      <Link
        href={href}
        prefetch={false}
        onClick={() => bumpClick({ placementId })}
        className="block"
      >
        {cardInner}
      </Link>
    </AdFrame>
  );
}

function SponsoredForSlot({ slotKey }: { slotKey: SlotKey }) {
  const viewerClockMs = useMemo(() => utcMs(), []);
  const sponsored = useQuery(api.sitePublic.sponsoredForSlot, {
    slotKey,
    viewerClockMs,
  });

  if (!sponsored?.length) return null;

  return (
    <>
      {sponsored.map((p) => (
        <SponsoredCard
          key={p._id}
          placementId={p._id}
          title={p.title}
          href={p.href}
          imageUrl={p.imageUrl}
          sponsorLabel={p.sponsorLabel}
          storageId={p.imageStorageId}
        />
      ))}
    </>
  );
}

export function HomepageAdStrip() {
  const settings = useQuery(api.sitePublic.thirdPartyMarketingSettings);
  const showAdsense =
    settings?.homepageAdsEnabled &&
    settings?.adsenseEnabled &&
    !!settings?.adsenseClientSlot;
  const clientSlot = settings?.adsenseClientSlot;

  if (settings === undefined) return null;

  return (
    <div className="w-full space-y-4">
      <SponsoredForSlot slotKey="home_hero" />
      {showAdsense && clientSlot ?
        <AdSenseUnit
          clientSlot={clientSlot}
          className="w-full"
          format="auto"
          placementLabel="Homepage"
        />
      : null}
    </div>
  );
}

export function JobsSidebarAds() {
  const settings = useQuery(api.sitePublic.thirdPartyMarketingSettings);
  const showAdsense =
    settings?.jobsRailAdsEnabled &&
    settings?.adsenseEnabled &&
    !!settings?.adsenseClientSlot;
  const clientSlot = settings?.adsenseClientSlot;

  if (settings === undefined) return null;

  return (
    <div className="space-y-4">
      <SponsoredForSlot slotKey="jobs_rail" />
      {showAdsense && clientSlot ?
        <AdSenseUnit
          clientSlot={clientSlot}
          format="vertical"
          placementLabel="Jobs sidebar"
        />
      : null}
    </div>
  );
}

/** Inline sponsor cards between job listings on `/jobs` (slot `jobs_inline`). */
export function JobsInlineAdStrip() {
  const viewerClockMs = useMemo(() => utcMs(), []);
  const sponsored = useQuery(api.sitePublic.sponsoredForSlot, {
    slotKey: "jobs_inline",
    viewerClockMs,
  });

  if (sponsored === undefined || sponsored.length === 0) return null;

  return (
    <div className="my-6 space-y-4">
      {sponsored.map((p) => (
        <SponsoredCard
          key={p._id}
          placementId={p._id}
          title={p.title}
          href={p.href}
          imageUrl={p.imageUrl}
          sponsorLabel={p.sponsorLabel}
          storageId={p.imageStorageId}
        />
      ))}
    </div>
  );
}
