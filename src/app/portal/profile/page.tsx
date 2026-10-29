"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, UserRound } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  clearStaffSession,
  refreshStaffSession,
  staffFetch,
  useStaffSession,
} from "@/lib/staffAuth";
import { roleLabel } from "@/lib/staffRoles";
import { toast } from "@/lib/toast";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { formatPhone, phoneError, toE164 } from "@/lib/phone";

type Profile = {
  id: string;
  display_id: string;
  name: string;
  email: string;
  phone: string | null;
};

export default function ProfilePage() {
  const { ready, tenant } = usePortalGuard();
  const session = useStaffSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changing, setChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void staffFetch("/api/v1/auth/profile").then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        if (result.unauthorized) router.replace("/portal/login");
        else setLoadError(result.error);
        return;
      }
      setProfile(result.data as Profile);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, router]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !name.trim()) return;
    const bad = phoneError(phone);
    if (bad) return toast.error("Check the phone number", bad);
    setSaving(true);
    const result = await staffFetch("/api/v1/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: toE164(phone) }),
    });
    setSaving(false);
    if (!result.ok) {
      if (result.unauthorized) router.replace("/portal/login");
      else toast.error("Couldn't save profile", result.error);
      return;
    }
    setProfile(result.data as Profile);
    setEditing(false);
    await refreshStaffSession();
    toast.success("Profile updated");
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (changing) return;
    setPasswordError(null);
    if (password.length < 10) {
      setPasswordError("New password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (password === current) {
      setPasswordError("Choose a different new password.");
      return;
    }
    setChanging(true);
    const result = await staffFetch("/api/v1/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: current,
        new_password: password,
      }),
    });
    setChanging(false);
    if (!result.ok) {
      if (result.unauthorized) router.replace("/portal/login");
      else setPasswordError(result.error);
      return;
    }
    setCurrent("");
    setPassword("");
    setConfirm("");
    clearStaffSession();
    toast.success("Password changed", "Sign in with your new password.");
    router.replace("/portal/login");
  };

  return (
    <PortalShell tenant={tenant} active="profile">
      <PageHeader
        title="Profile"
        description="Your ERP account details and password."
        icon={<UserRound size={20} />}
      />
      {loadError && (
        <p role="alert" className="mb-space-4 text-error">
          {loadError}
        </p>
      )}
      {!profile ? (
        <p role="status" className="text-ink-600">
          {loadError
            ? "Couldn't load your profile. Refresh to try again."
            : "Loading profile…"}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-space-5 lg:grid-cols-2">
          <Card className="min-w-0 p-space-5">
            <div className="mb-space-5 flex flex-wrap items-center justify-between gap-space-3">
              <div className="flex min-w-0 items-center gap-space-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                  {(profile.name.trim()[0] || "?").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="break-words font-semibold text-ink-900">
                    {profile.name}
                  </h2>
                  <p className="text-sm text-ink-600">
                    {session?.roles.map(roleLabel).join(", ")}
                  </p>
                </div>
              </div>
              {!editing && (
                <Button
                  className="mobile-page-action"
                  variant="secondary"
                  onClick={() => {
                    setName(profile.name);
                    setPhone(profile.phone ?? "");
                    setEditing(true);
                  }}
                >
                  <Pencil size={15} /> Edit profile
                </Button>
              )}
            </div>
            {editing ? (
              <form onSubmit={save}>
                <Field label="Full name" htmlFor="profile-name" required>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                    autoComplete="name"
                    disabled={saving}
                  />
                </Field>
                <Field label="Phone" htmlFor="profile-phone">
                  <PhoneInput
                    id="profile-phone"
                    value={phone}
                    onChange={setPhone}
                    disabled={saving}
                  />
                </Field>
                <p className="mb-space-4 text-sm text-ink-600">
                  Your email is your login and cannot be changed here.
                </p>
                <div className="mobile-page-actions flex gap-space-2">
                  <Button type="submit" disabled={saving || !name.trim()}>
                    {saving ? "Saving…" : "Save profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="space-y-space-4 border-t border-line pt-space-4 text-sm">
                {[
                  ["Email", profile.email],
                  ["Phone", formatPhone(profile.phone) || "—"],
                  ["Workspace", session?.tenant.name || "—"],
                  ["Display ID", profile.display_id || "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap justify-between gap-space-2"
                  >
                    <dt className="text-ink-600">{label}</dt>
                    <dd className="max-w-full break-all text-ink-900">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
          <Card className="min-w-0 p-space-5">
            <h2 className="mb-space-5 flex items-center gap-space-2 font-semibold text-ink-900">
              <KeyRound size={18} /> Change password
            </h2>
            <form onSubmit={changePassword}>
              <Field
                label="Current password"
                htmlFor="current-password"
                required
              >
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  maxLength={200}
                  disabled={changing}
                />
              </Field>
              <Field
                label="New password"
                htmlFor="new-password"
                required
                hint="At least 10 characters."
              >
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={10}
                  maxLength={200}
                  disabled={changing}
                />
              </Field>
              <Field
                label="Confirm new password"
                htmlFor="confirm-password"
                required
              >
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={10}
                  maxLength={200}
                  disabled={changing}
                />
              </Field>
              {passwordError && (
                <p role="alert" className="mb-space-3 text-sm text-error">
                  {passwordError}
                </p>
              )}
              <p className="mb-space-4 text-sm text-ink-600">
                Changing your password signs you out on all devices.
              </p>
              <Button
                className="mobile-page-action"
                type="submit"
                disabled={changing || !current || !password || !confirm}
              >
                {changing ? "Changing…" : "Change password"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </PortalShell>
  );
}
