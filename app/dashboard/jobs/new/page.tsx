"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import {
  canUseFeaturedListings,
  canUseScreeningQuestions,
} from "@/lib/orgPlan";
import ListingCreditsBanner from "@/components/ListingCreditsBanner";
import ListingCreditsPaywallModal from "@/components/ListingCreditsPaywallModal";
import { useEmployerBillingEnabled } from "@/hooks/useEmployerBillingEnabled";

export default function NewJobPage() {
  const { orgId } = useAuth();
  const router = useRouter();
  const now = useTickerNow();
  const org = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const createJob = useMutation(api.jobs.create);
  const entitlements = useQuery(
    api.organizations.getListingEntitlements,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const tier = useOrgAccessTier(org ?? undefined, now) ?? "free";
  const employerBillingEnabled = useEmployerBillingEnabled();
  const hasFeaturedListings = canUseFeaturedListings(tier);
  const screeningPlan = canUseScreeningQuestions(tier);
  const [showListingPaywall, setShowListingPaywall] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    locationType: "remote" as "remote" | "onsite" | "hybrid",
    employmentType: "full-time" as
      | "full-time"
      | "part-time"
      | "contract"
      | "internship",
    salaryMin: "",
    salaryMax: "",
    requirements: "",
    status: "draft" as "draft" | "active",
    featured: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [screeningRows, setScreeningRows] = useState<
    { id: string; prompt: string; required: boolean }[]
  >([]);

  const publishBlocked =
    employerBillingEnabled !== false &&
    entitlements !== undefined &&
    !entitlements.legacyUnlimitedListings &&
    !entitlements.canActivateMoreJobs;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !org) return;
    if (form.status === "active" && publishBlocked) {
      setShowListingPaywall(true);
      return;
    }
    setSubmitting(true);
    try {
      await createJob({
        orgId: org._id,
        clerkOrgId: orgId,
        title: form.title,
        description: form.description,
        location: form.location,
        locationType: form.locationType,
        employmentType: form.employmentType,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax) : undefined,
        requirements: form.requirements,
        screeningQuestions:
          screeningPlan && screeningRows.length > 0
            ? screeningRows
                .filter((row) => row.prompt.trim().length > 0)
                .map((row) => ({
                  id: row.id,
                  prompt: row.prompt.trim(),
                  required: row.required,
                }))
            : undefined,
        status: form.status,
        featured: form.featured && hasFeaturedListings,
      });
      router.push("/dashboard/jobs");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("listing credit") ||
        message.includes("active job limit")
      ) {
        setShowListingPaywall(true);
      } else {
        alert(message || "Failed to create job. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/jobs"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Post a New Job</h1>
      </div>

      {entitlements && <ListingCreditsBanner entitlements={entitlements} />}

      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-xl border border-border-strong p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-1">
            Job Title *
          </label>
          <input
            required
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Senior Software Engineer"
            className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Location *
            </label>
            <input
              required
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. San Francisco, CA"
              className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Work Type *
            </label>
            <select
              value={form.locationType}
              onChange={(e) =>
                setForm({
                  ...form,
                  locationType: e.target.value as typeof form.locationType,
                })
              }
              className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-surface"
            >
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Employment Type *
            </label>
            <select
              value={form.employmentType}
              onChange={(e) =>
                setForm({
                  ...form,
                  employmentType: e.target.value as typeof form.employmentType,
                })
              }
              className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-surface"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Publish Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as typeof form.status,
                })
              }
              className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-surface"
            >
              <option value="draft">Save as Draft</option>
              <option
                value="active"
                disabled={publishBlocked}
              >
                {publishBlocked
                  ? "Publish Now (no listing credits)"
                  : "Publish Now"}
              </option>
            </select>
            {publishBlocked && (
              <p className="mt-1 text-xs text-amber-700">
                You have no listing credits left. Save as draft or{" "}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => setShowListingPaywall(true)}
                >
                  buy credits
                </button>
                .
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Min Salary (optional)
            </label>
            <input
              type="number"
              min="0"
              value={form.salaryMin}
              onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              placeholder="e.g. 80000"
              className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Max Salary (optional)
            </label>
            <input
              type="number"
              min="0"
              value={form.salaryMax}
              onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
              placeholder="e.g. 120000"
              className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-1">
            Job Description *
          </label>
          <textarea
            required
            rows={6}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder={"Describe the role and responsibilities — one point per line:\nManage the product roadmap\nCollaborate with cross-functional teams\nDeliver features on schedule"}
            className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">Each line will appear as a bullet point on the job listing.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-1">
            Requirements *
          </label>
          <textarea
            required
            rows={4}
            value={form.requirements}
            onChange={(e) =>
              setForm({ ...form, requirements: e.target.value })
            }
            placeholder={"List qualifications — one per line:\n3+ years of React experience\nStrong TypeScript skills\nExperience with cloud platforms"}
            className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">Each line will appear as a bullet point on the job listing.</p>
        </div>

        {screeningPlan && (
          <div className="rounded-lg border border-border-strong bg-canvas p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Screening questions
                </p>
                <p className="text-xs text-muted">
                  Applicants must answer these before submitting (Starter+).
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-foreground-secondary border border-border-strong rounded-md px-2 py-1 bg-surface hover:bg-surface-muted"
                onClick={() =>
                  setScreeningRows((rows) => [
                    ...rows,
                    {
                      id: crypto.randomUUID(),
                      prompt: "",
                      required: true,
                    },
                  ])
                }
              >
                + Question
              </button>
            </div>

            <div className="space-y-2">
              {screeningRows.length === 0 && (
                <p className="text-xs text-muted-foreground">No extras yet.</p>
              )}
              {screeningRows.map((row, index) => (
                <div
                  key={row.id}
                  className="flex flex-col md:flex-row gap-2 bg-surface rounded-md border border-border-strong p-3"
                >
                  <span className="text-xs font-semibold text-muted-foreground mt-2">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={row.prompt}
                    onChange={(e) =>
                      setScreeningRows((rows) =>
                        rows.map((r) =>
                          r.id === row.id
                            ? { ...r, prompt: e.target.value }
                            : r
                        )
                      )
                    }
                    placeholder="What relevant experience proves you excel here?"
                    className="flex-1 text-sm rounded-md border border-border-strong px-3 py-2"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(e) =>
                        setScreeningRows((rows) =>
                          rows.map((r) =>
                            r.id === row.id
                              ? { ...r, required: e.target.checked }
                              : r
                          )
                        )
                      }
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() =>
                      setScreeningRows((rows) =>
                        rows.filter((r) => r.id !== row.id)
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasFeaturedListings && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={form.featured}
              onChange={(e) =>
                setForm({ ...form, featured: e.target.checked })
              }
              className="rounded border-border-strong"
            />
            <label htmlFor="featured" className="text-sm text-foreground-secondary">
              Feature this listing{" "}
              <span className="text-muted-foreground">
                (boosts visibility in search)
              </span>
            </label>
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-border">
          <button
            type="submit"
            disabled={submitting || !org}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Creating..."
              : form.status === "active"
                ? "Publish Job"
                : "Save Draft"}
          </button>
          <Link
            href="/dashboard/jobs"
            className="px-4 py-2.5 rounded-lg text-sm text-muted hover:bg-surface-muted"
          >
            Cancel
          </Link>
        </div>
      </form>

      {employerBillingEnabled !== false && showListingPaywall && orgId && (
        <ListingCreditsPaywallModal
          title="Buy a listing credit"
          description="Publish another concurrent active job after payment confirms."
          product="listing_single"
          clerkOrgId={orgId}
          returnPath="/dashboard/jobs/new"
          onClose={() => setShowListingPaywall(false)}
          onSuccess={() => setShowListingPaywall(false)}
        />
      )}
    </div>
  );
}
