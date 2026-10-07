"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  clearPendingSignup,
  getPendingSignup,
  signupWithGoogle,
  type PendingSignup,
} from "@/lib/staffAuth";

// Step two of "set up your business": reached from /auth after Google verified a new email. Creates the business,
// its first branch and the owner's admin account in one call, then drops them into the dashboard.
const subscribeNothing = () => () => {};
function readPendingRaw(): string | null {
  try {
    return sessionStorage.getItem("erp_signup");
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const raw = useSyncExternalStore(
    subscribeNothing,
    readPendingRaw,
    () => null,
  );
  const pending = useMemo<PendingSignup | null>(
    () => (raw ? (JSON.parse(raw) as PendingSignup) : null),
    [raw],
  );
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [branchName, setBranchName] = useState("Main Store");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getPendingSignup()) router.replace("/auth");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const failure = await signupWithGoogle({
      business_name: businessName.trim(),
      legal_name: legalName.trim() || undefined,
      first_branch: {
        branch_name: branchName.trim(),
        address_line: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
      },
    });
    setSubmitting(false);
    if (failure) return setError(failure);
    router.push("/portal/dashboard");
  }

  if (!pending) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-space-4 py-space-6">
      <Card className="w-full max-w-lg p-space-6">
        <Logo className="mb-space-5" />
        <h1 className="text-display mb-space-1 !text-[22px]">
          Set up your business
        </h1>
        <p className="text-body mb-space-5">
          Signed in with Google as{" "}
          <strong className="text-ink-900">{pending.email}</strong>. Tell us
          about your business and your first branch. You can add more later.
        </p>

        <form onSubmit={handleSubmit}>
          <Field label="Business name" htmlFor="business_name" required>
            <Input
              id="business_name"
              autoFocus
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </Field>
          <Field
            label="Legal name"
            htmlFor="legal_name"
            hint="As on your invoices. Leave blank to use the business name."
          >
            <Input
              id="legal_name"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </Field>

          <h2 className="mt-space-5 mb-space-3 text-[15px] font-bold text-ink-900">
            First branch
          </h2>
          <Field label="Branch name" htmlFor="branch_name" required>
            <Input
              id="branch_name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </Field>
          <Field label="Address" htmlFor="address">
            <Input
              id="address"
              autoComplete="street-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <div className="grid gap-x-space-3 sm:grid-cols-3">
            <Field label="City" htmlFor="city">
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>
            <Field label="State" htmlFor="state">
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </Field>
            <Field label="Pincode" htmlFor="pincode">
              <Input
                id="pincode"
                inputMode="numeric"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
            </Field>
          </div>

          {error && (
            <p className="mb-space-3 rounded-md bg-error-tint p-space-3 text-[13px] font-medium text-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={
              submitting || businessName.trim().length < 2 || !branchName.trim()
            }
            className="mt-space-2 w-full"
            size="lg"
          >
            {submitting ? "Setting up…" : "Create my workspace"}
          </Button>
        </form>

        <p className="mt-space-5 text-center text-[12.5px] text-ink-400">
          Not you?{" "}
          <Link
            href="/auth"
            onClick={clearPendingSignup}
            className="font-semibold text-brand-600 hover:underline"
          >
            Use a different Google account
          </Link>
        </p>
      </Card>
    </div>
  );
}
