"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";

export default function AdminMonetizationPage() {
  const settings = useQuery(api.admin.monetization.thirdPartyMarketingSettingsAdmin);
  const {
    results: placements,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.admin.monetization.placementsList,
    {},
    { initialNumItems: 10 },
  );

  const patchSettings = useMutation(
    api.admin.monetization.patchThirdPartyMarketingSettings,
  );
  const removePlacement = useMutation(api.admin.monetization.placementRemove);
  const createPlacement = useMutation(api.admin.monetization.placementInsert);
  const [slot, setSlot] = useState<"home_hero" | "jobs_rail" | "jobs_inline">(
    "jobs_rail",
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Monetization</h1>

      {settings === undefined ? (
        <p className="text-sm text-muted">Loading settings…</p>
      ) : (
        <>
          <section className="space-y-3 rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium">Employer billing</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.employerBillingEnabled}
                onChange={(e) =>
                  void patchSettings({
                    employerBillingEnabled: e.target.checked,
                  })
                }
              />
              Enable employer billing (listing credits + Hiring Pro)
            </label>
            <p className="text-xs text-muted">
              When off, all employers get unlimited job posts and full Hiring Pro
              access (launch mode). When on, normal paywalls and checkout apply.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-border-strong bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium">Third-party display placeholders</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.adsenseEnabled}
              onChange={(e) =>
                void patchSettings({ adsenseEnabled: e.target.checked })
              }
            />
            Master toggle
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.homepageAdsEnabled}
              onChange={(e) =>
                void patchSettings({ homepageAdsEnabled: e.target.checked })
              }
            />
            Homepage placement
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.jobsRailAdsEnabled}
              onChange={(e) =>
                void patchSettings({ jobsRailAdsEnabled: e.target.checked })
              }
            />
            Jobs rail placement
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="adsense-slot"
              key={settings.updatedAt}
              placeholder="publisherId:slotId"
              defaultValue={settings.adsenseClientSlot ?? ""}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                const el = document.getElementById(
                  "adsense-slot",
                ) as HTMLInputElement | null;
                const raw = el?.value?.trim();
                void patchSettings({
                  adsenseClientSlot: raw && raw.length > 0 ? raw : null,
                });
              }}
            >
              Save pairing
            </button>
          </div>
          <p className="text-xs text-muted">
            Pairing format: <span className="font-mono">ca-pub-XXXXXXXXXXXXXXXX:slotId</span>.
            Live units render on the homepage and jobs sidebar when toggles and pairing are enabled.
          </p>
        </section>
        </>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Featured sponsor cards</h2>
        <form
          className="rounded-xl border border-border-strong bg-canvas p-4 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const title = String(fd.get("title") ?? "").trim();
            const href = String(fd.get("href") ?? "").trim();
            const priority = Number(fd.get("priority") ?? "0") || 0;
            await createPlacement({
              slotKey: slot,
              title,
              href,
              priority,
              active: fd.get("active") === "on",
              sponsorLabel:
                String(fd.get("sponsorLabel") ?? "").trim() || undefined,
              imageUrl: String(fd.get("imageUrl") ?? "").trim() || undefined,
            });
            form.reset();
          }}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs uppercase text-muted md:col-span-3">
              Slot
              <select
                className="mt-1 w-full rounded border px-2 py-2"
                value={slot}
                onChange={(ev) =>
                  setSlot(ev.target.value as typeof slot)
                }
              >
                <option value="home_hero">home_hero — marketing homepage</option>
                <option value="jobs_rail">jobs_rail — /jobs sidebar</option>
                <option value="jobs_inline">jobs_inline — between job listings on /jobs</option>
              </select>
            </label>
            <label className="text-xs uppercase text-muted md:col-span-2">
              Title
              <input
                name="title"
                required
                className="mt-1 w-full rounded border px-2 py-2"
              />
            </label>
            <label className="text-xs uppercase text-muted">
              Priority
              <input
                type="number"
                name="priority"
                defaultValue={10}
                className="mt-1 w-full rounded border px-2 py-2"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs uppercase text-muted">
            Link (https… or relative /jobs …)
            <input name="href" required className="mt-1 w-full rounded border px-2 py-2" />
          </label>
          <label className="mt-3 block text-xs uppercase text-muted">
            Optional image URL
            <input name="imageUrl" className="mt-1 w-full rounded border px-2 py-2" />
          </label>
          <label className="mt-3 block text-xs uppercase text-muted">
            Sponsor label
            <input name="sponsorLabel" className="mt-1 w-full rounded border px-2 py-2" />
          </label>
          <label className="mt-3 flex items-center gap-2 text-xs">
            <input type="checkbox" name="active" defaultChecked />
            Active immediately
          </label>
          <button
            type="submit"
            className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
          >
            Add sponsor card
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Creative</th>
                <th className="px-4 py-2">Slot</th>
                <th className="px-4 py-2">Perf</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {placements.map((p) => (
                <tr key={p._id} className="border-b border-border align-top">
                  <td className="px-4 py-2">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground">{p.href}</p>
                  </td>
                  <td className="px-4 py-2 text-xs">{p.slotKey}</td>
                  <td className="px-4 py-2 text-xs">
                    impressions {p.impressionCount} / clicks {p.clickCount}
                  </td>
                  <td className="px-4 py-3">
                    <AdminActionButton
                      variant="danger"
                      onClick={() => void removePlacement({ id: p._id })}
                    >
                      Remove
                    </AdminActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminTableFooter
          resultsCount={placements.length}
          status={status}
          onLoadMore={loadMore}
          pageSize={10}
          loadMoreLabel="Load more placements"
          emptyMessage="No sponsor placements yet."
        />
      </section>
    </div>
  );
}
