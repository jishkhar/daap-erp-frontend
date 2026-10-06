"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { GoogleSignInButton } from "@/components/portal/GoogleSignInButton";
import { loginStaff, loginStaffWithGoogle } from "@/lib/staffAuth";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const failure = await loginStaff(email, password);
    setSubmitting(false);
    if (failure) return setError(failure);
    router.push("/portal/dashboard");
  }

  async function handleGoogle(idToken: string) {
    setSubmitting(true);
    setError(null);
    const outcome = await loginStaffWithGoogle(idToken);
    setSubmitting(false);
    if (outcome.kind === "error") return setError(outcome.message);
    router.push(outcome.kind === "signup" ? "/onboarding" : "/portal/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-space-4">
      <Card className="w-full max-w-sm p-space-6">
        <Logo className="mb-space-5" />
        <h1 className="text-display mb-space-1 !text-[22px]">Sign in</h1>
        <p className="text-body mb-space-5">Use your individual ERP login.</p>
        <GoogleSignInButton onCredential={handleGoogle} width={336} />
        <form onSubmit={handleSubmit}>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="password" error={error || undefined}>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-11" value={password} invalid={!!error} onChange={(e) => setPassword(e.target.value)} />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-400 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:text-ink-900"
              >
                <HugeiconsIcon icon={showPassword ? ViewOffSlashIcon : ViewIcon} size={18} />
              </button>
            </div>
          </Field>
          <Button type="submit" disabled={submitting || !email || !password} className="mt-space-2 w-full" size="lg">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-space-5 text-center text-[12.5px] text-ink-400">
          Don&apos;t have an account yet?{" "}
          <Link href="/auth" className="font-semibold text-brand-600 hover:underline">Set one up</Link>
        </p>
      </Card>
    </div>
  );
}
