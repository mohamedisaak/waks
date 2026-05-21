import Link from "next/link";
import CompanyProfileForm from "@/components/CompanyProfileForm";

export const metadata = {
  title: "Company Profile — Waks Dashboard",
};

export default function CompanyProfilePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Settings & Billing
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
        </div>
      </div>
      <CompanyProfileForm />
    </div>
  );
}
