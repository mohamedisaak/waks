import { SignUp } from "@clerk/nextjs";
import { AuthBranding } from "@/components/AuthBranding";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const redirectUrl = params["redirect_url"] ?? params["redirectUrl"];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4">
      <AuthBranding />
      <SignUp forceRedirectUrl={redirectUrl} />
    </main>
  );
}
