"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import { useMemo, useState } from "react";
import { canUseOutboundWebhooks } from "@/lib/orgPlan";

export default function DashboardIntegrationsPage() {
  const { orgId } = useAuth();
  const now = useTickerNow();
  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const tier = useOrgAccessTier(convexOrg ?? undefined, now) ?? "free";

  const webhooks = useQuery(
    api.orgWebhooks.listForOrg,
    orgId && convexOrg !== undefined && convexOrg !== null && canUseOutboundWebhooks(tier)
      ? { clerkOrgId: orgId }
      : "skip"
  );

  const createHook = useMutation(api.orgWebhooks.createWebhook);
  const updateHook = useMutation(api.orgWebhooks.updateWebhook);
  const deleteHook = useMutation(api.orgWebhooks.deleteWebhook);

  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [creating, setCreating] = useState(false);

  const allowed = convexOrg !== null && canUseOutboundWebhooks(tier);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !url.trim()) return;
    setCreating(true);
    try {
      await createHook({
        clerkOrgId: orgId,
        url: url.trim(),
        signingSecret: secret.trim() || undefined,
        enabled: true,
        eventTypes: ["application.created"],
      });
      setUrl("");
      setSecret("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save webhook.";
      alert(message);
    } finally {
      setCreating(false);
    }
  }

  const rows = useMemo(() => webhooks ?? [], [webhooks]);

  if (convexOrg === undefined || (allowed && webhooks === undefined)) {
    return (
      <div className="animate-pulse text-sm text-muted-foreground py-16 text-center">
        Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-xl mx-auto rounded-xl border border-purple-200 bg-purple-50 p-8 text-center">
        <p className="font-semibold text-foreground mb-2">
          HTTPS webhooks live on Pro
        </p>
        <p className="text-sm text-muted mb-4">
          Send `application.created` payloads to Zapier, Make.com, or your own
          ingestion endpoint — signed with SHA-256 when you provide a secret.
        </p>
        <Link
          href="/employers/pricing"
          className="inline-block text-sm font-semibold text-purple-900 underline"
        >
          Upgrade →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted mt-1">
          Outbound webhooks fire after a candidate applies (HTTPS only).
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-border-strong bg-surface p-6 space-y-4"
      >
        <h2 className="font-semibold text-foreground">Register webhook</h2>
        <div>
          <label className="block text-xs text-muted mb-1">Endpoint URL</label>
          <input
            required
            type="url"
            placeholder="https://hooks.example.com/waks"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">
            Signing secret (optional)
          </label>
          <input
            type="password"
            placeholder="Shared secret → X-Waks-Signature-SHA256"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
          />
        </div>
        <button
          disabled={creating}
          className="rounded-md bg-slate-900 text-white text-sm px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
          type="submit"
        >
          {creating ? "Saving…" : "Add webhook"}
        </button>
      </form>

      <div className="rounded-xl border border-border-strong bg-surface divide-y divide-slate-100">
        {rows.map((hook) => (
          <div
            key={hook._id}
            className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <p className="text-sm font-mono text-foreground break-all">
                {hook.url}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hook.enabled ? "Enabled" : "Paused"} ·{" "}
                {hook.eventTypes.join(", ")}
                {hook.signingSecret ? " · Signed" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-border-strong"
                onClick={() =>
                  updateHook({
                    id: hook._id,
                    clerkOrgId: orgId!,
                    enabled: !hook.enabled,
                  })
                }
              >
                {hook.enabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-100"
                onClick={() =>
                  deleteHook({
                    id: hook._id,
                    clerkOrgId: orgId!,
                  })
                }
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">
            No webhooks configured yet — add your first HTTPS endpoint above.
          </p>
        )}
      </div>
    </div>
  );
}
