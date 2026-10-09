"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { CheckboxRow } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GSTIN_PATTERN, GST_STATES, stateForGstin } from "@/lib/gstStates";
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
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);
  const [branchName, setBranchName] = useState("Main Store");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pickedState, setPickedState] = useState("");
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getPendingSignup()) router.replace("/auth");
  }, [router]);

  // A valid GSTIN fixes the state (its first two digits), so the dropdown follows it and is locked.
  const gstinValue = gstin.trim().toUpperCase();
  const gstinOk =
    GSTIN_PATTERN.test(gstinValue) && stateForGstin(gstinValue) !== null;
  const state = gstinOk ? (stateForGstin(gstinValue) ?? "") : pickedState;
  const toggleChannel = (c: string) =>
    setChannels((cs) =>
      cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c],
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const failure = await signupWithGoogle({
      business_name: businessName.trim(),
      legal_name: legalName.trim() || undefined,
      phone: phone.trim() || undefined,
      gstin: gstinOk ? gstinValue : undefined,
      planned_channels: channels,
      accepted_terms: terms,
      first_branch: {
        branch_name: branchName.trim(),
        address_line: address.trim() || undefined,
        city: city.trim() || undefined,
        state,
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

          <Field
            label="Phone"
            htmlFor="phone"
            hint="Used as your store's contact number."
          >
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field
            label="GSTIN"
            htmlFor="gstin"
            hint="Optional. If you have one, we set up your GST registration and read your state from it."
            error={
              gstin.trim() && !gstinOk
                ? "15 characters, like 07AAAAA0000A1Z5."
                : undefined
            }
          >
            <Input
              id="gstin"
              maxLength={15}
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
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
            <Field
              label="State"
              htmlFor="state"
              required
              hint={
                gstinOk
                  ? "Taken from your GSTIN."
                  : "Decides how GST is split on invoices."
              }
            >
              <Select
                id="state"
                value={state}
                disabled={gstinOk}
                onChange={(e) => setPickedState(e.target.value)}
              >
                <option value="">Select…</option>
                {GST_STATES.map((st) => (
                  <option key={st.code} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </Select>
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

          <h2 className="mt-space-5 mb-space-1 text-[15px] font-bold text-ink-900">
            What will you sell through?
          </h2>
          <p className="mb-space-3 text-[13px] text-ink-600">
            Optional. We use this to suggest your next steps; nothing is
            switched on or off by it.
          </p>
          <div className="mb-space-4 space-y-space-2">
            {(
              [
                ["pos", "In my store (POS)"],
                ["online", "My website"],
                ["whatsapp", "WhatsApp"],
              ] as const
            ).map(([value, label]) => (
              <CheckboxRow
                key={value}
                checked={channels.includes(value)}
                onChange={() => toggleChannel(value)}
              >
                {label}
              </CheckboxRow>
            ))}
          </div>

          <CheckboxRow
            checked={terms}
            onChange={setTerms}
            className="mb-space-4"
          >
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="font-semibold text-brand-600 hover:underline"
            >
              terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-semibold text-brand-600 hover:underline"
            >
              privacy policy
            </Link>
            .
          </CheckboxRow>

          {error && (
            <p className="mb-space-3 rounded-md bg-error-tint p-space-3 text-[13px] font-medium text-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={
              submitting ||
              businessName.trim().length < 2 ||
              !branchName.trim() ||
              !state ||
              !terms ||
              (gstin.trim() !== "" && !gstinOk)
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
