"use client";

import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ADMIN_TOKEN_KEY, adminLogin } from "@/lib/adminAuth";
import { useIsClient, useStorageValue } from "@/lib/useStorageValue";

/** Gates every platform-admin page behind an individual DAAP super-admin account. Children render only once signed in. */
export function AdminSecretGate({ title, children }: { title: string; children: React.ReactNode }) {
  const isClient = useIsClient();
  const token = useStorageValue(ADMIN_TOKEN_KEY, "session");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const failure = await adminLogin(email, password);
    setSubmitting(false);
    if (failure) setError(failure);
  }

  if (!isClient) return null; // the browser value is unknown until hydration
  if (token === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-space-4">
        <Card className="w-full max-w-sm p-space-6">
          <Logo className="mb-space-5" />
          <h1 className="text-display mb-space-1 !text-[22px]">{title}</h1>
          <p className="text-body mb-space-5">For DAAP platform administrators. This area manages every tenant, so it has its own sign-in.</p>
          <form onSubmit={handleSubmit}>
            <Field label="Email" htmlFor="super_admin_email"><Input id="super_admin_email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Password" htmlFor="super_admin_password" error={error || undefined}><Input id="super_admin_password" type="password" value={password} invalid={!!error} onChange={(e) => setPassword(e.target.value)} /></Field>
            <Button type="submit" disabled={submitting || !email || !password} className="mt-space-2 w-full" size="lg">{submitting ? "Checking…" : "Sign in"}</Button>
          </form>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}
