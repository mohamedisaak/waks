import { auth } from "@clerk/nextjs/server";
import SettingsBillingContent from "@/components/SettingsBillingContent";

export const metadata = {
  title: "Settings & Billing — Waks Dashboard",
};

export default async function SettingsPage() {
  const { orgId, orgSlug } = await auth();

  return <SettingsBillingContent orgId={orgId ?? null} orgSlug={orgSlug ?? null} />;
}
