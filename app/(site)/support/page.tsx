import Link from "next/link";

export const metadata = {
  title: "Contact Support — Waks",
  description: "Get help from the Waks team with billing, plan changes, and more.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D]" />
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D] opacity-50" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Waks
            </span>
          </Link>
          <Link
            href="/employers/pricing"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            ← Back to Pricing
          </Link>
        </div>
      </header>

      <main className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          {/* Hero */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#4CAF7D]/30 bg-[#4CAF7D]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#3d9e6e]">
              Support
            </div>
            <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-foreground">
              We&apos;re here to help
            </h1>
            <p className="text-lg text-muted">
              Need to downgrade your plan or have a billing question? Send us a
              message and we&apos;ll get back to you within one business day.
            </p>
          </div>

          {/* Contact card */}
          <div className="rounded-2xl border border-border-strong bg-surface p-8 shadow-sm">
            <h2 className="mb-6 text-lg font-semibold text-foreground">
              Send us a message
            </h2>
            <form
              action="mailto:support@waks.com"
              method="get"
              encType="text/plain"
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                    Your name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Jane Smith"
                    className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF7D]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="jane@company.com"
                    className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF7D]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                  Subject
                </label>
                <select
                  name="subject"
                  defaultValue="downgrade"
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF7D]"
                >
                  <option value="downgrade">Plan downgrade request</option>
                  <option value="billing">Billing question</option>
                  <option value="refund">Refund request</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                  Message
                </label>
                <textarea
                  name="body"
                  rows={5}
                  placeholder="Please include your organization name and any relevant details…"
                  className="w-full resize-none rounded-lg border border-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF7D]"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
              >
                Send message
              </button>
            </form>
          </div>

          {/* Alternative contact */}
          <div className="mt-6 rounded-2xl border border-border-strong bg-surface p-6 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-foreground">
              Or reach us directly
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:support@waks.com"
                className="flex flex-1 items-center gap-3 rounded-xl border border-border-strong px-4 py-3 text-sm text-foreground-secondary transition-colors hover:border-slate-400"
              >
                <svg className="h-5 w-5 flex-shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span>support@waks.com</span>
              </a>
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-border-strong px-4 py-3 text-sm text-muted">
                <svg className="h-5 w-5 flex-shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Response within 1 business day</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
