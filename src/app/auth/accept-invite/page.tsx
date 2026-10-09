"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  acceptInvite,
  previewInvite,
  type InvitePreview,
} from "@/lib/staffAuth";

const MIN = 10;

// Where an administrator lands from the invitation email: they see which workspace it is for, choose their own password, and are signed in.
function AcceptInvite() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [problem, setProblem] = useState<string | null>(
    token
      ? null
      : "This invitation link is incomplete. Open the link from your email again.",
  );
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    if (!token) return;
    let live = true;
    previewInvite(token).then((r) => {
      if (live) {
        setInvite(r.invite);
        setProblem(r.error);
      }
    });
    return () => {
      live = false;
    };
  }, [token]);

  const mismatch = again !== "" && again !== password;
  const ready = password.length >= MIN && password === again;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const r = await acceptInvite(token, password);
    setBusy(false);
    if (r.error) return setProblem(r.error);
    if (r.signedIn) return router.push("/portal/dashboard");
    setSavedOnly(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-space-4 py-space-6">
      <Card className="w-full max-w-md p-space-6">
        <Logo className="mb-space-5" />
        {savedOnly ? (
          <>
            <h1 className="text-display mb-space-1 !text-[22px]">
              Password saved
            </h1>
            <p className="text-body">
              Your workspace isn&apos;t open for sign-in right now. Contact
              support, then sign in at{" "}
              <Link
                href="/portal/login"
                className="font-semibold text-brand-600 hover:underline"
              >
                the login page
              </Link>
              .
            </p>
          </>
        ) : !invite ? (
          <>
            <h1 className="text-display mb-space-1 !text-[22px]">Invitation</h1>
            <p
              className={
                problem
                  ? "rounded-md bg-error-tint p-space-3 text-[13px] font-medium text-error"
                  : "text-body"
              }
            >
              {problem ?? "Checking your invitation…"}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-display mb-space-1 !text-[22px]">
              Welcome, {invite.name}
            </h1>
            <p className="text-body mb-space-5">
              Choose a password for{" "}
              <strong className="text-ink-900">{invite.business_name}</strong>.
              You&apos;ll sign in with{" "}
              <strong className="text-ink-900">{invite.email}</strong> and the
              workspace code{" "}
              <strong className="text-ink-900">{invite.tenant_code}</strong>.
            </p>
            <form onSubmit={submit}>
              <Field
                label="New password"
                htmlFor="pw"
                hint={`At least ${MIN} characters.`}
                required
              >
                <Input
                  id="pw"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field
                label="Confirm password"
                htmlFor="pw2"
                error={mismatch ? "The two passwords don't match." : undefined}
                required
              >
                <Input
                  id="pw2"
                  type="password"
                  autoComplete="new-password"
                  value={again}
                  onChange={(e) => setAgain(e.target.value)}
                />
              </Field>
              {problem && (
                <p className="mb-space-3 rounded-md bg-error-tint p-space-3 text-[13px] font-medium text-error">
                  {problem}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={busy || !ready}
              >
                {busy ? "Saving…" : "Set password and continue"}
              </Button>
            </form>
            <p className="mt-space-5 text-center text-[12.5px] text-ink-400">
              Prefer Google?{" "}
              <Link
                href="/auth"
                className="font-semibold text-brand-600 hover:underline"
              >
                Continue with Google
              </Link>{" "}
              using {invite.email}.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInvite />
    </Suspense>
  );
}
