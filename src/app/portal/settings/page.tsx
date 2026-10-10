"use client";

import { MapPin, Settings, Store } from "lucide-react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  useSaveContact,
  useSaveSettings,
  useTenantView,
  type TenantContact as Contact,
  type TenantView,
} from "@/hooks/useTenantSettings";
import { formatMoney, fromMinor, toMinor } from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { CardSkeleton } from "@/components/ui/Skeleton";

const CONTACT_FIELDS: (keyof Contact)[] = [
  "email",
  "phone",
  "website",
  "registered_address",
  "city",
  "state",
  "pincode",
];

function GeneralSections({
  t,
  contact,
  canEdit,
}: {
  t: TenantView["tenant"];
  contact: Contact;
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<Record<keyof Contact, string> | null>(
    null,
  );
  const saveContact = useSaveContact();
  const busy = saveContact.isPending;
  const edit = () =>
    setDraft(
      Object.fromEntries(
        CONTACT_FIELDS.map((k) => [k, contact[k] ?? ""]),
      ) as Record<keyof Contact, string>,
    );
  const set = (k: keyof Contact, v: string) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  const address = [
    contact.registered_address,
    [contact.city, contact.state].filter(Boolean).join(", "),
    contact.pincode,
  ]
    .filter(Boolean)
    .join(" · ");

  function save() {
    if (!draft) return;
    saveContact.mutate(draft, {
      onSuccess: () => {
        toast.success("Contact details saved");
        setDraft(null);
      },
      onError: (e) =>
        toast.error("Couldn't save the contact details", e.message),
    });
  }

  const row = (
    icon: React.ReactNode,
    title: string,
    text: string | null,
    empty: string,
  ) => (
    <button
      type="button"
      disabled={!canEdit}
      onClick={edit}
      className="flex w-full items-center gap-space-3 px-space-3 py-space-3 text-left enabled:hover:bg-paper"
    >
      <span className="text-ink-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink-900">
          {title}
        </span>
        <span
          className={`block text-[13px] ${text ? "text-ink-600" : "text-ink-400"}`}
        >
          {text || empty}
        </span>
      </span>
      {canEdit && (
        <span className="text-[12.5px] font-semibold text-brand-700">Edit</span>
      )}
    </button>
  );

  return (
    <div className="mb-space-6 flex flex-col gap-space-4">
      <Card className="p-space-4">
        <h2 className="text-[15px] font-bold text-ink-900">Business details</h2>
        <p className="mb-space-3 mt-0.5 text-[13px] text-ink-600">
          Business entity used for financial products, markets, apps, and taxes
          in this shop
        </p>
        <div className="flex items-center gap-space-3 rounded-md border border-line px-space-3 py-space-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Store size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-ink-900">
              {t.legal_name}
            </p>
            <p className="text-[13px] text-ink-600">
              {t.currency === "INR" ? "India" : t.currency}
            </p>
          </div>
        </div>
        <dl className="mt-space-3 grid grid-cols-[auto_1fr] gap-x-space-4 gap-y-1.5 text-[14px]">
          <dt className="text-ink-600">Workspace</dt>
          <dd className="font-medium">{t.tenant_code}</dd>
          <dt className="text-ink-600">Legal name</dt>
          <dd className="font-medium">{t.legal_name}</dd>
          <dt className="text-ink-600">Display name</dt>
          <dd className="font-medium">{t.display_name}</dd>
          <dt className="text-ink-600">Currency</dt>
          <dd className="font-medium">{t.currency}</dd>
          <dt className="text-ink-600">Time zone</dt>
          <dd className="font-medium">{t.timezone}</dd>
          <dt className="text-ink-600">Status</dt>
          <dd className="font-medium capitalize">{t.status}</dd>
        </dl>
      </Card>

      <Card className="p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
          Store contact details
        </h2>
        <div className="divide-y divide-line rounded-md border border-line">
          {row(
            <Store size={16} />,
            t.display_name,
            [contact.email, contact.phone].filter(Boolean).join(" · ") || null,
            "Email and phone not set",
          )}
          {row(
            <MapPin size={16} />,
            "Store address",
            address || null,
            "Not set",
          )}
        </div>
        {contact.website && (
          <p className="mt-space-2 text-[13px] text-ink-600">
            Website: {contact.website}
          </p>
        )}
      </Card>

      <Card className="p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
          Store defaults
        </h2>
        <div className="mb-space-3 flex items-center justify-between gap-space-3 rounded-md border border-line px-space-3 py-space-3">
          <div>
            <p className="text-[14px] font-medium text-ink-900">
              Currency display
            </p>
            <p className="text-[13px] text-ink-600">
              The currency used across this workspace
            </p>
          </div>
          <span className="rounded-md bg-paper px-space-2 py-1 text-[12px] font-medium text-ink-700">
            {t.currency}
          </span>
        </div>
        {/* Backup region and units aren't stored by the backend yet: shown read-only. */}
        <Field
          label="Backup region"
          htmlFor="g_region"
          hint="Determines settings for customers outside of your markets"
        >
          <Select id="g_region" disabled defaultValue="India">
            <option>India</option>
          </Select>
        </Field>
        <div className="grid gap-space-3 sm:grid-cols-2">
          <Field label="Unit system" htmlFor="g_units">
            <Select id="g_units" disabled defaultValue="metric">
              <option value="metric">Metric system</option>
            </Select>
          </Field>
          <Field label="Default weight unit" htmlFor="g_weight">
            <Select id="g_weight" disabled defaultValue="kg">
              <option value="kg">Kilogram (kg)</option>
            </Select>
          </Field>
        </div>
        <Field
          label="Time zone"
          htmlFor="g_tz"
          hint="Sets the time for when orders and analytics are recorded"
        >
          <Select id="g_tz" disabled defaultValue={t.timezone}>
            <option>{t.timezone}</option>
          </Select>
        </Field>
      </Card>

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        width="lg"
        title="Contact details"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-x-space-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="c_email">
              <Input
                id="c_email"
                type="email"
                value={draft.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Phone" htmlFor="c_phone">
              <Input
                id="c_phone"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label="Website" htmlFor="c_web" className="sm:col-span-2">
              <Input
                id="c_web"
                value={draft.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </Field>
            <Field label="Address" htmlFor="c_addr" className="sm:col-span-2">
              <Textarea
                id="c_addr"
                rows={2}
                value={draft.registered_address}
                onChange={(e) => set("registered_address", e.target.value)}
              />
            </Field>
            <Field label="City" htmlFor="c_city">
              <Input
                id="c_city"
                value={draft.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>
            <Field label="State" htmlFor="c_state">
              <Input
                id="c_state"
                value={draft.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </Field>
            <Field label="Pincode" htmlFor="c_pin">
              <Input
                id="c_pin"
                inputMode="numeric"
                value={draft.pincode}
                onChange={(e) => set("pincode", e.target.value)}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function OperationsCard({
  settings,
  currency,
  canEdit,
}: {
  settings: TenantView["settings"];
  currency: string;
  canEdit: boolean;
}) {
  const [ttl, setTtl] = useState(String(settings.reservation_ttl_minutes));
  const [threshold, setThreshold] = useState(
    fromMinor(settings.transfer_high_value_threshold_minor),
  );
  const saveSettings = useSaveSettings();
  const busy = saveSettings.isPending;

  function save() {
    const minor = toMinor(threshold);
    const minutes = parseInt(ttl, 10);
    if (minor === null || !minutes)
      return toast.error(
        "Check the values",
        "Enter a whole number of minutes and a valid amount.",
      );
    saveSettings.mutate(
      {
        reservation_ttl_minutes: minutes,
        transfer_high_value_threshold_minor: minor,
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (e) => toast.error("Couldn't save", e.message),
      },
    );
  }

  return (
    <Card className="p-space-4">
      <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
        Operations
      </h2>
      <Field
        label="Hold stock for unpaid orders (minutes)"
        htmlFor="s_ttl"
        hint="Online and WhatsApp orders release their stock if payment doesn't arrive in time. 5–1440."
      >
        <Input
          id="s_ttl"
          inputMode="numeric"
          disabled={!canEdit}
          value={ttl}
          onChange={(e) => setTtl(e.target.value)}
        />
      </Field>
      <Field
        label={`High-value transfer threshold (${currency})`}
        htmlFor="s_thr"
        hint={`Branch-to-branch transfers worth more than this need a regional manager's or admin's approval (now ${formatMoney(settings.transfer_high_value_threshold_minor, currency)}).`}
      >
        <Input
          id="s_thr"
          inputMode="decimal"
          disabled={!canEdit}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </Field>
      {canEdit && (
        <Button disabled={busy} onClick={save}>
          Save settings
        </Button>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const view = useTenantView();
  const canEdit = hasPermission(session, "settings", "write");

  if (!ready) return null;
  const t = view.data?.tenant;

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<Settings size={20} />}
        title="Settings"
        description="Company-wide configuration."
      />
      {view.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {view.error.message}
        </p>
      )}
      {!view.data && !view.error && (
        <div className="flex flex-col gap-space-4">
          <CardSkeleton rows={5} />
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} />
        </div>
      )}
      {t && view.data && (
        <GeneralSections t={t} contact={view.data.contact} canEdit={canEdit} />
      )}
      <div>
        {view.data && (
          <OperationsCard
            key={JSON.stringify(view.data.settings)}
            settings={view.data.settings}
            currency={view.data.tenant.currency}
            canEdit={canEdit}
          />
        )}
      </div>
    </PortalShell>
  );
}
