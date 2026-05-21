"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";

function utcDayStart(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export default function AdminSiteTrafficPage() {
  const [dayMs] = useState(() => utcDayStart(new Date(Date.now())));
  const rows = useQuery(api.admin.siteTraffic.pathsForUtcDay, {
    dayUtcMs: dayMs,
  });

  const total = useMemo(
    () => rows?.reduce((s, r) => s + r.views, 0) ?? 0,
    [rows]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Site traffic</h1>
        <p className="text-sm text-muted mt-1">
          First-party page views keyed by pathname (UTC day{" "}
          <span className="font-mono text-xs">{new Date(dayMs).toISOString().slice(0, 10)}</span>
          ).
        </p>
      </div>

      {rows === undefined ?
        <p className="text-sm text-muted">Loading…</p>
      : <>
          <p className="text-sm text-muted">
            Total tracked views today:{" "}
            <span className="font-semibold">{total}</span>
          </p>
          <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-canvas text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2">Path</th>
                  <th className="px-4 py-2 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 60).map((r) => (
                  <tr key={r.path} className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-xs">{r.path}</td>
                    <td className="px-4 py-2 text-right">{r.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      }
    </div>
  );
}
