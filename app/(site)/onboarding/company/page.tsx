"use client";

import { useOrganizationList, useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useManagementNav } from "@/hooks/useManagementNav";

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

const PLAN_LABELS: Record<string, { label: string; color: string; price: string }> = {
  starter: {
    label: "Starter",
    color: "border-info-border bg-info-bg text-info-text",
    price: "$1/mo",
  },
  pro: {
    label: "Pro",
    color: "border-purple-200 bg-purple-50 text-purple-700",
    price: "$2/mo",
  },
};

export default function CompanyOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-cream">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-gray-900" />
        </div>
      }
    >
      <CompanyOnboardingContent />
    </Suspense>
  );
}

function CompanyOnboardingContent() {
  const { isLoaded: authLoaded, isSignedIn, orgId } = useAuth();
  const { paths } = useManagementNav();
  const { isLoaded: orgListLoaded, createOrganization, setActive } =
    useOrganizationList();
  const upsertOrg = useMutation(api.organizations.upsertOrg);
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") ?? undefined;
  const planInfo = plan ? PLAN_LABELS[plan] : undefined;
  const returnTo = `/onboarding/company${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    website: "",
    description: "",
  });
  const [step, setStep] = useState<"form" | "submitting" | "done">("form");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoaded) return;

    if (!isSignedIn) {
      router.replace(
        `/sign-up?redirect_url=${encodeURIComponent(returnTo)}`
      );
      return;
    }

    if (orgId) {
      router.replace(paths.home);
    }
  }, [authLoaded, isSignedIn, orgId, router, paths.home, returnTo]);

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
    if (!orgListLoaded || !createOrganization || !setActive) return;
    setStep("submitting");
    setError(null);

    try {
      const org = await createOrganization({ name: form.companyName });
      await setActive({ organization: org.id });

      await upsertOrg({
        clerkOrgId: org.id,
        name: org.name,
        slug: org.slug ?? org.id,
        logoUrl: org.imageUrl ?? undefined,
        plan: "free",
        createdAt: Date.now(),
        website: form.website || undefined,
        industry: form.industry || undefined,
        companySize: form.companySize || undefined,
        description: form.description || undefined,
      });

      setStep("done");

      if (plan === "starter" || plan === "pro") {
        router.push("/employers/pricing");
      } else {
        router.push(paths.home);
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setStep("form");
    }
  }

  if (!authLoaded || !isSignedIn || !orgListLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D]" />
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D] opacity-50" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Waks
            </span>
          </Link>
          <span className="text-sm text-muted-foreground">Company setup</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Page heading */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Set up your company workspace
          </h1>
          <p className="mt-2 text-sm text-muted">
            Tell us about your company so candidates can discover you. You can
            update these details anytime from your dashboard.
          </p>
        </div>

        {/* Plan banner */}
        {planInfo && (
          <div
            className={`mb-8 flex items-center justify-between rounded-xl border px-5 py-4 ${planInfo.color}`}
          >
            <div>
              <p className="text-sm font-semibold">
                Setting up for the{" "}
                <span className="font-bold">{planInfo.label} plan</span>
              </p>
              <p className="mt-0.5 text-xs opacity-80">
                After creating your company, you&apos;ll be taken to checkout to
                activate your {planInfo.label} subscription ({planInfo.price}).
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 rounded-full bg-surface/60 px-3 py-1 text-xs font-bold">
              {planInfo.price}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* ── Section 1: Company basics ── */}
          <section className="rounded-2xl border border-border-strong bg-surface p-6 shadow-sm">
            <h2 className="mb-5 text-base font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                1
              </span>
              Company basics
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  Company name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Corp"
                  {...field("companyName")}
                  className="w-full rounded-lg border border-border-strong px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This becomes your organization name in Waks and Clerk.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    {...field("industry")}
                    className="w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground-secondary focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="" disabled>
                      Select industry
                    </option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                    Company size <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    {...field("companySize")}
                    className="w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-foreground-secondary focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="" disabled>
                      Select size
                    </option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 2: Online presence ── */}
          <section className="rounded-2xl border border-border-strong bg-surface p-6 shadow-sm">
            <h2 className="mb-5 text-base font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                2
              </span>
              Online presence{" "}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </h2>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                Company website
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border-strong bg-surface-muted px-3 text-sm text-muted-foreground">
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
                  className="min-w-0 flex-1 rounded-r-lg border border-border-strong px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Shown to candidates on your job listings.
              </p>
            </div>
          </section>

          {/* ── Section 3: About your company ── */}
          <section className="rounded-2xl border border-border-strong bg-surface p-6 shadow-sm">
            <h2 className="mb-5 text-base font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                3
              </span>
              About your company{" "}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </h2>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                Company description
              </label>
              <textarea
                rows={4}
                placeholder="Briefly describe what your company does, your mission, and what makes it a great place to work..."
                {...field("description")}
                className="w-full resize-none rounded-lg border border-border-strong px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>2 – 3 sentences works best.</span>
                <span
                  className={
                    form.description.length > 500
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }
                >
                  {form.description.length} / 500
                </span>
              </p>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/employers"
              className="text-sm text-muted-foreground hover:text-foreground-secondary"
            >
              ← Back
            </Link>
            <button
              type="submit"
              disabled={step === "submitting"}
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step === "submitting" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating workspace…
                </>
              ) : planInfo ? (
                `Create workspace & go to checkout →`
              ) : (
                `Create company workspace →`
              )}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to Waks&apos;s{" "}
            <Link href="/" className="underline hover:text-foreground-secondary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/" className="underline hover:text-foreground-secondary">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
