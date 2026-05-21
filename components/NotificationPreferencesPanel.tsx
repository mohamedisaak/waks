"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

export default function NotificationPreferencesPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const prefs = useQuery(api.notifications.preferences.getMyPreferences);
  const updatePrefs = useMutation(
    api.notifications.preferences.updateMyPreferences
  );

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs === undefined) return;
    setEmailEnabled(prefs.emailEnabled);
    setWhatsappOptIn(prefs.whatsappOptIn);
    setWhatsappPhone(prefs.whatsappPhone ?? "");
  }, [prefs]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updatePrefs({
        emailEnabled,
        whatsappOptIn,
        whatsappPhone: whatsappOptIn ? whatsappPhone : undefined,
      });
      setSaved(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (prefs === undefined) {
    return (
      <p className="text-sm text-muted-foreground animate-pulse">
        Loading notification settings…
      </p>
    );
  }

  const indent = compact ? "pl-7" : "";

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={emailEnabled}
          onChange={(e) => setEmailEnabled(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border-strong text-[#4CAF7D] focus:ring-[#4CAF7D]"
        />
        <span>
          <span className="block text-sm font-medium text-foreground-secondary">
            Email updates
          </span>
          <span className="block text-xs text-muted">
            Application status, interviews, and employer activity
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={whatsappOptIn}
          onChange={(e) => setWhatsappOptIn(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border-strong text-[#4CAF7D] focus:ring-[#4CAF7D]"
        />
        <span>
          <span className="block text-sm font-medium text-foreground-secondary">
            WhatsApp updates
          </span>
          <span className="block text-xs text-muted">
            Shortlisted, hired, and interview reminders (Kenya +254)
          </span>
        </span>
      </label>

      {whatsappOptIn && (
        <div className={indent}>
          <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
            WhatsApp number
          </label>
          <input
            type="tel"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            placeholder="0712345678"
            required
            className="w-full rounded-lg border border-border-strong px-3.5 py-2.5 text-sm text-foreground-secondary focus:border-[#4CAF7D] focus:outline-none focus:ring-2 focus:ring-[#4CAF7D]/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            e.g. 0712345678 or +254712345678
          </p>
        </div>
      )}

      <div className={`flex items-center gap-3 ${indent}`}>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#4CAF7D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3d9a6a] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {saved && (
          <span className="text-xs font-medium text-emerald-600">Saved</span>
        )}
      </div>
    </form>
  );
}
