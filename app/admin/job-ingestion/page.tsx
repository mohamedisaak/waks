"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import {
  AdminActionButton,
  AdminActionGroup,
} from "@/components/admin/AdminActionButton";
import {
  JOB_SOURCE_SITES,
  SOURCE_DISPLAY_NAMES,
  type JobSourceSite,
} from "@/lib/jobIngestionSources";

const ALL_SOURCES = JOB_SOURCE_SITES;

async function deleteInBatches(
  runBatch: () => Promise<{ deletedCount: number; hasMore: boolean }>
): Promise<number> {
  let total = 0;
  for (;;) {
    const { deletedCount, hasMore } = await runBatch();
    total += deletedCount;
    if (!hasMore || deletedCount === 0) {
      break;
    }
  }
  return total;
}

export default function AdminJobIngestionPage() {
  const runs = useQuery(api.admin.jobIngestion.listRuns, { limit: 15 });
  const counts = useQuery(api.admin.jobIngestion.ingestedJobCounts, {});
  const startRun = useMutation(api.admin.jobIngestion.startRun);
  const hideBySource = useMutation(api.admin.jobIngestion.hideJobsBySource);
  const removeBySource = useMutation(api.admin.jobIngestion.removeJobsBySource);
  const removeAllIngested = useMutation(
    api.admin.jobIngestion.removeAllIngestedJobs
  );
  const clearRunHistory = useMutation(
    api.admin.jobIngestion.clearIngestionRunHistory
  );

  const [selected, setSelected] = useState<JobSourceSite[]>([...ALL_SOURCES]);
  const [maxPages, setMaxPages] = useState(3);
  const [dryRun, setDryRun] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hideBusy, setHideBusy] = useState<JobSourceSite | null>(null);
  const [removeBusy, setRemoveBusy] = useState<
    JobSourceSite | "all" | "history" | null
  >(null);

  function toggleSource(site: JobSourceSite) {
    setSelected((prev) =>
      prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]
    );
  }

  async function handleStart() {
    if (selected.length === 0) {
      alert("Select at least one job board.");
      return;
    }
    setBusy(true);
    try {
      await startRun({
        sources: selected,
        maxPagesPerSource: maxPages,
        dryRun,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start run";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleHideSource(site: JobSourceSite) {
    if (
      !confirm(
        `Hide all aggregated jobs from ${SOURCE_DISPLAY_NAMES[site]} on the public board?`
      )
    ) {
      return;
    }
    setHideBusy(site);
    try {
      const { hiddenCount } = await hideBySource({ sourceSite: site });
      alert(`Hidden ${hiddenCount} listing(s).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to hide jobs";
      alert(msg);
    } finally {
      setHideBusy(null);
    }
  }

  async function handleRemoveSource(site: JobSourceSite) {
    const count = counts?.bySource[site] ?? 0;
    if (
      !confirm(
        `Permanently delete ${count} ingested listing(s) from ${SOURCE_DISPLAY_NAMES[site]}? This cannot be undone.`
      )
    ) {
      return;
    }
    setRemoveBusy(site);
    try {
      const deleted = await deleteInBatches(() =>
        removeBySource({ sourceSite: site })
      );
      alert(`Deleted ${deleted} listing(s).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete jobs";
      alert(msg);
    } finally {
      setRemoveBusy(null);
    }
  }

  async function handleRemoveAll() {
    const count = counts?.total ?? 0;
    if (
      !confirm(
        `Permanently delete all ${count} ingested listing(s)? This cannot be undone.`
      )
    ) {
      return;
    }
    setRemoveBusy("all");
    try {
      const deleted = await deleteInBatches(() => removeAllIngested({}));
      alert(`Deleted ${deleted} listing(s).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete jobs";
      alert(msg);
    } finally {
      setRemoveBusy(null);
    }
  }

  async function handleClearRunHistory() {
    const runCount = runs?.length ?? 0;
    if (
      !confirm(
        `Delete all ingestion run records (${runCount} visible in history)? Job listings are not affected.`
      )
    ) {
      return;
    }
    setRemoveBusy("history");
    try {
      const { deletedCount } = await clearRunHistory({});
      alert(`Deleted ${deletedCount} run record(s).`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to clear run history";
      alert(msg);
    } finally {
      setRemoveBusy(null);
    }
  }

  const hasRunning = runs?.some(
    (r) => r.status === "queued" || r.status === "running"
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Job ingestion</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Import job listings from Kenya job boards. Aggregated jobs appear on
          the public board with an outbound apply link. Respect site terms;
          listings include attribution to the original source.
        </p>
      </div>

      <section className="rounded-xl border border-border-strong bg-surface p-6 space-y-5">
        <h2 className="text-lg font-medium">Run ingestion</h2>

        <div>
          <p className="text-sm font-medium text-foreground-secondary mb-2">
            Job boards
          </p>
          <div className="flex flex-wrap gap-3">
            {ALL_SOURCES.map((site) => (
              <label
                key={site}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(site)}
                  onChange={() => toggleSource(site)}
                />
                {SOURCE_DISPLAY_NAMES[site]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-6 items-end">
          <label className="block text-sm">
            <span className="font-medium text-foreground-secondary">
              Max pages per board
            </span>
            <input
              type="number"
              min={1}
              max={10}
              value={maxPages}
              onChange={(e) =>
                setMaxPages(
                  Math.min(10, Math.max(1, Number(e.target.value) || 1))
                )
              }
              className="mt-1 block w-24 rounded-lg border border-border px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            Dry run (parse only, no database writes)
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={busy || hasRunning}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy || hasRunning ? "Running…" : "Start ingestion"}
        </button>
      </section>

      <section className="rounded-xl border border-border-strong bg-surface p-6 space-y-3">
        <h2 className="text-lg font-medium">Bulk moderation</h2>
        <p className="text-sm text-muted">
          Hide all aggregated listings from a source on the public job board
          (records stay in the database).
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_SOURCES.map((site) => (
            <button
              key={site}
              type="button"
              disabled={hideBusy === site || removeBusy !== null}
              onClick={() => void handleHideSource(site)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-canvas disabled:opacity-50"
            >
              Hide {SOURCE_DISPLAY_NAMES[site]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-danger-border bg-danger-bg/30 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium text-danger-text">
            Remove ingested data
          </h2>
          <p className="mt-1 text-sm text-muted">
            Permanently delete aggregated job postings from the database. Use
            this to clear bad imports or start fresh before a new run.
          </p>
          {counts === undefined ? (
            <p className="mt-2 text-sm text-muted">Loading counts…</p>
          ) : (
            <p className="mt-2 text-sm">
              <span className="font-medium">{counts.total}</span> ingested
              listing(s) total
              {counts.total > 0 && (
                <span className="text-muted">
                  {" "}
                  (
                  {ALL_SOURCES.map((site) => (
                    <span key={site}>
                      {SOURCE_DISPLAY_NAMES[site]}:{" "}
                      {counts.bySource[site] ?? 0}
                      {site !== ALL_SOURCES[ALL_SOURCES.length - 1]
                        ? " · "
                        : ""}
                    </span>
                  ))}
                  )
                </span>
              )}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground-secondary">
            By job board
          </p>
          <AdminActionGroup>
            {ALL_SOURCES.map((site) => (
              <AdminActionButton
                key={site}
                variant="danger"
                disabled={
                  removeBusy !== null ||
                  (counts?.bySource[site] ?? 0) === 0
                }
                onClick={() => void handleRemoveSource(site)}
              >
                {removeBusy === site
                  ? "Deleting…"
                  : `Delete ${SOURCE_DISPLAY_NAMES[site]}`}
              </AdminActionButton>
            ))}
          </AdminActionGroup>
        </div>

        <AdminActionGroup>
          <AdminActionButton
            variant="danger"
            disabled={
              removeBusy !== null || (counts?.total ?? 0) === 0
            }
            onClick={() => void handleRemoveAll()}
          >
            {removeBusy === "all"
              ? "Deleting all…"
              : "Delete all ingested listings"}
          </AdminActionButton>
          <AdminActionButton
            variant="secondary"
            disabled={
              removeBusy !== null ||
              hasRunning ||
              (runs?.length ?? 0) === 0
            }
            onClick={() => void handleClearRunHistory()}
          >
            {removeBusy === "history"
              ? "Clearing…"
              : "Clear run history"}
          </AdminActionButton>
        </AdminActionGroup>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Run history</h2>
        {runs === undefined ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted">No ingestion runs yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-canvas text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sources</th>
                  <th className="px-4 py-3">Stats</th>
                  <th className="px-4 py-3">Log</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run._id} className="border-b border-border align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(run.startedAt).toLocaleString()}
                      {run.dryRun && (
                        <span className="ml-1 text-xs text-amber-600">
                          dry
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          run.status === "failed"
                            ? "text-red-600"
                            : run.status === "completed"
                              ? "text-emerald-700"
                              : ""
                        }
                      >
                        {run.status}
                      </span>
                      {run.errorMessage && (
                        <p className="mt-1 text-xs text-red-600 max-w-xs">
                          {run.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {run.sources
                        .map(
                          (s) =>
                            SOURCE_DISPLAY_NAMES[s as JobSourceSite] ?? s
                        )
                        .join(", ")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      found {run.stats.found} · +{run.stats.inserted} · ↑
                      {run.stats.updated} · skip {run.stats.skipped} · err{" "}
                      {run.stats.errors}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-md">
                      <ul className="list-disc pl-4 space-y-0.5">
                        {run.log.slice(-5).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
