"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import CompanyProfileForm from "@/components/CompanyProfileForm";

export default function OrganizationSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>
        <p className="text-sm text-muted mt-1">
          Manage your organization profile, members, and settings.
        </p>
      </div>

      <OrganizationProfile
        routing="hash"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border border-border-strong rounded-xl w-full",
          },
        }}
      />

      <CompanyProfileForm />
    </div>
  );
}
