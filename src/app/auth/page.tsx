"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { GoogleSignInButton } from "@/components/portal/GoogleSignInButton";
import { Card } from "@/components/ui/Card";
import { loginStaffWithGoogle } from "@/lib/staffAuth";

// The single entry point for BOTH "set up your business" (landing page CTA) and signing in with Google: Google doesn't
// distinguish sign-up from sign-in, so there is one button. An existing account goes straight to the dashboard; a new
// Google email continues to /onboarding to name the business and its first branch.
export default function AuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGoogle(idToken: string) {
    setBusy(true);
    setError(null);
    const outcome = await loginStaffWithGoogle(idToken);
    if (outcome.kind === "error") {
      setBusy(false);
      return setError(outcome.message);
    }
    router.push(
      outcome.kind === "signup" ? "/onboarding" : "/portal/dashboard",
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-space-4">
      <Card className="w-full max-w-sm p-space-6">
        <Logo className="mb-space-5" />

        <h1 className="text-display mb-space-1 !text-[22px]">Sign in</h1>
        <p className="text-body mb-space-5">
          Continue with Google to set up a new business or get to a workspace
          you already own.
        </p>

        {error && (
          <p className="mb-space-4 rounded-md bg-error-tint p-space-3 text-[13px] font-medium text-error">
            {error}
          </p>
        )}

        <div className={busy ? "pointer-events-none opacity-60" : undefined}>
          <GoogleSignInButton
            onCredential={handleGoogle}
            width={336}
            divider={false}
          />
        </div>

        <p className="mt-space-5 text-center text-[12.5px] text-ink-400">
          Prefer a password instead?{" "}
          <Link
            href="/portal/login"
            className="font-semibold text-brand-600 hover:underline"
          >
            Staff login
          </Link>
        </p>
      </Card>
    </div>
  );
}
