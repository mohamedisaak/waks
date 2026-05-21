"use client";

import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { AdminTableFooter } from "@/components/admin/AdminTableFooter";

export default function AdminAccessPage() {
  const admins = useQuery(api.admin.platformAdmins.listRecorded);
  const add = useMutation(api.admin.actions.addPlatformAdminMember);
  const removeAdmin = useMutation(api.admin.actions.removePlatformAdminMember);
  const audit = usePaginatedQuery(
    api.admin.overview.recentAudit,
    {},
    { initialNumItems: 15 },
  );
  const [clerkIdDraft, setClerkIdDraft] = useState("");

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Stored platform admins</h1>
        <p className="text-xs text-muted">
          Convex env PLATFORM_ADMIN_CLERK_USER_IDS still grants bootstrap access;
          this table rotates day-to-day operators.
        </p>
        <div className="flex gap-2">
          <input
            placeholder="Clerk user id"
            className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
            value={clerkIdDraft}
            onChange={(e) => setClerkIdDraft(e.target.value)}
          />
          <AdminActionButton
            variant="success"
            className="rounded-full px-5 py-2 text-sm"
            disabled={!clerkIdDraft.trim()}
            onClick={async () => {
              await add({ clerkUserId: clerkIdDraft.trim() });
              setClerkIdDraft("");
            }}
          >
            Promote
          </AdminActionButton>
        </div>

        {!admins ? (
          <p className="text-sm text-muted">Loading roster…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-canvas text-[10px] uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Clerk user id</th>
                  <th className="px-3 py-2">Added</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {admins.map((row) => (
                  <tr key={row._id} className="border-b">
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {row.clerkUserId}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(row.addedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <AdminActionButton
                        variant="danger"
                        onClick={() =>
                          void removeAdmin({ clerkUserId: row.clerkUserId })
                        }
                      >
                        Remove
                      </AdminActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Audit tail</h2>
        <div className="max-h-[36rem] space-y-2 overflow-y-auto rounded-xl border bg-surface p-3 text-[11px]">
          {audit.results.map((row) => (
            <article
              key={row._id}
              className="rounded-lg border border-border bg-canvas p-3"
            >
              <p className="font-semibold text-foreground">{row.action}</p>
              <p className="text-muted">
                {new Date(row.createdAt).toLocaleString()} ·{" "}
                {row.targetTable ?? "?"}#{row.targetId ?? "?"}
              </p>
              {row.payload ? (
                <pre className="mt-2 max-h-48 overflow-auto text-[10px] text-muted">
                  {row.payload}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
        <AdminTableFooter
          resultsCount={audit.results.length}
          status={audit.status}
          onLoadMore={audit.loadMore}
          pageSize={15}
          loadMoreLabel="Load older events"
          emptyMessage="No audit events yet."
        />
      </section>
    </div>
  );
}
