"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import {
  canUseFeaturedListings,
  canUseScreeningQuestions,
} from "@/lib/orgPlan";

export default function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { orgId, has } = useAuth();
  const router = useRouter();
  const now = useTickerNow();

  const job = useQuery(api.jobs.getById, { id: id as Id<"jobPostings"> });
  const org = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const updateJob = useMutation(api.jobs.update);

  const tier = useOrgAccessTier(org ?? undefined, now) ?? (
    has?.({ plan: "pro" })
      ? "pro"
      : has?.({ plan: "starter" })
        ? "starter"
        : "free"
  );

  const hasFeaturedListings =
    canUseFeaturedListings(tier) ||
    (has?.({ feature: "featured_listings" }) ?? false);

  const screeningPlan = canUseScreeningQuestions(tier);

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
    featured: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [screeningRows, setScreeningRows] = useState<
    { id: string; prompt: string; required: boolean }[]
  >([]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate Convex job into employer form */
    if (job && !loaded) {
      setForm({
        title: job.title,
        description: job.description,
        location: job.location,
        locationType: job.locationType,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin?.toString() ?? "",
        salaryMax: job.salaryMax?.toString() ?? "",
        requirements: job.requirements,
        featured: job.featured,
      });
      setScreeningRows(
        (job.screeningQuestions ?? []).map((q) => ({
          id: q.id,
          prompt: q.prompt,
          required: q.required,
        }))
      );
      setLoaded(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [job, loaded]);

  if (job === undefined) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center animate-pulse">
        Loading...
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="text-center py-16">
        <p className="text-muted">Job posting not found.</p>
        <Link
          href="/dashboard/jobs"
          className="text-sm text-foreground underline mt-4 inline-block"
        >
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSubmitting(true);
    try {
      await updateJob({
        id: id as Id<"jobPostings">,
        clerkOrgId: orgId,
        title: form.title,
        description: form.description,
        location: form.location,
        locationType: form.locationType,
        employmentType: form.employmentType,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax) : undefined,
        requirements: form.requirements,
        featured: form.featured && hasFeaturedListings,
        ...(screeningPlan
          ? {
              screeningQuestions: screeningRows
                .filter((row) => row.prompt.trim().length > 0)
                .map((row) => ({
                  id: row.id,
                  prompt: row.prompt.trim(),
                  required: row.required,
                })),
            }
          : {}),
      });
      router.push("/dashboard/jobs");
    } catch (err) {
      console.error(err);
      alert("Failed to update job. Please try again.");
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
        <h1 className="text-2xl font-bold text-foreground">
          Edit Job Posting
        </h1>
      </div>

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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Min Salary
              </label>
              <input
                type="number"
                min="0"
                value={form.salaryMin}
                onChange={(e) =>
                  setForm({ ...form, salaryMin: e.target.value })
                }
                placeholder="e.g. 80000"
                className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Max Salary
              </label>
              <input
                type="number"
                min="0"
                value={form.salaryMax}
                onChange={(e) =>
                  setForm({ ...form, salaryMax: e.target.value })
                }
                placeholder="e.g. 120000"
                className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
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
            placeholder={"One point per line — each line becomes a bullet:\nManage the product roadmap\nCollaborate with cross-functional teams"}
            className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
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
            placeholder={"One qualification per line:\n3+ years of React experience\nStrong TypeScript skills"}
            className="w-full border border-border-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
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
            disabled={submitting}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href="/dashboard/jobs"
            className="px-4 py-2.5 rounded-lg text-sm text-muted hover:bg-surface-muted"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
