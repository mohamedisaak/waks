"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

const INDUSTRIES = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "E-commerce & Retail",
  "Marketing & Advertising",
  "Legal & Compliance",
  "Real Estate",
  "Manufacturing",
  "Logistics & Supply Chain",
  "Media & Entertainment",
  "Non-profit",
  "Government",
  "Other",
] as const;

const COMPANY_SIZES = [
  "1 – 10 employees",
  "11 – 50 employees",
  "51 – 200 employees",
  "201 – 1,000 employees",
  "1,000+ employees",
] as const;

type SaveState = "idle" | "saving" | "saved" | "error";

export default function CompanyProfileForm() {
  const { orgId } = useAuth();
  const org = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const updateProfile = useMutation(api.organizations.updateProfile);

  const [form, setForm] = useState({
    website: "",
    industry: "",
    companySize: "",
    description: "",
    location: "",
    linkedin: "",
    twitter: "",
    phone: "",
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (!org) return;
    setForm({
      website: org.website ?? "",
      industry: org.industry ?? "",
      companySize: org.companySize ?? "",
      description: org.description ?? "",
      location: org.location ?? "",
      linkedin: org.linkedin ?? "",
      twitter: org.twitter ?? "",
      phone: org.phone ?? "",
    });
  }, [org]);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
      ) => setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaveState("saving");
    try {
      await updateProfile({
        clerkOrgId: orgId,
        website: form.website || undefined,
        industry: form.industry || undefined,
        companySize: form.companySize || undefined,
        description: form.description || undefined,
        location: form.location || undefined,
        linkedin: form.linkedin || undefined,
        twitter: form.twitter || undefined,
        phone: form.phone || undefined,
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  if (org === undefined) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-border-strong bg-surface p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border-strong bg-surface shadow-sm"
    >
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold text-foreground">Company Details</h2>
        <p className="mt-0.5 text-sm text-muted">
          Shown to candidates on your job listings.
        </p>
      </div>

      <div className="space-y-5 px-6 py-5">
        {/* Row 1: Industry + Company size */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Industry
            </label>
            <select
              {...field("industry")}
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Company size
            </label>
            <select
              {...field("companySize")}
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select size</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Location + Phone */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Headquarters location
            </label>
            <input
              type="text"
              placeholder="e.g. London, UK"
              {...field("location")}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Phone number
            </label>
            <input
              type="tel"
              placeholder="e.g. +44 20 1234 5678"
              {...field("phone")}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Row 3: Website */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
            Website
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border-strong bg-canvas px-3 text-sm text-muted-foreground">
              https://
            </span>
            <input
              type="text"
              placeholder="yourcompany.com"
              value={form.website.replace(/^https?:\/\//, "")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  website: e.target.value
                    ? `https://${e.target.value.replace(/^https?:\/\//, "")}`
                    : "",
                }))
              }
              className="min-w-0 flex-1 rounded-r-lg border border-border-strong px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Row 4: LinkedIn + Twitter */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              LinkedIn
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border-strong bg-canvas px-3 text-sm text-muted-foreground">
                linkedin.com/company/
              </span>
              <input
                type="text"
                placeholder="your-company"
                value={form.linkedin.replace(
                  /^https?:\/\/(www\.)?linkedin\.com\/company\//,
                  ""
                )}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    linkedin: e.target.value
                      ? `https://linkedin.com/company/${e.target.value.replace(/^https?:\/\/(www\.)?linkedin\.com\/company\//, "")}`
                      : "",
                  }))
                }
                className="min-w-0 flex-1 rounded-r-lg border border-border-strong px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Twitter / X
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border-strong bg-canvas px-3 text-sm text-muted-foreground">
                @
              </span>
              <input
                type="text"
                placeholder="yourcompany"
                value={form.twitter.replace(/^@/, "")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    twitter: e.target.value
                      ? `@${e.target.value.replace(/^@/, "")}`
                      : "",
                  }))
                }
                className="min-w-0 flex-1 rounded-r-lg border border-border-strong px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Row 5: Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
            Company description
          </label>
          <textarea
            rows={4}
            placeholder="Briefly describe what your company does, your mission, and what makes it a great place to work…"
            {...field("description")}
            className="w-full resize-none rounded-lg border border-border-strong px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <p className="mt-1 flex justify-end text-xs text-muted-foreground">
            <span
              className={form.description.length > 500 ? "text-red-500" : ""}
            >
              {form.description.length} / 500
            </span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        {saveState === "saved" && (
          <p className="text-sm text-green-600">Changes saved.</p>
        )}
        {saveState === "error" && (
          <p className="text-sm text-red-600">Failed to save. Try again.</p>
        )}
        {(saveState === "idle" || saveState === "saving") && <span />}
        <button
          type="submit"
          disabled={saveState === "saving"}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveState === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
