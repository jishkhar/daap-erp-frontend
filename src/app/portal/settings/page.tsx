"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { erp, formatMoney, fromMinor, toMinor, useErpQuery } from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type TenantView = {
  tenant: { id: string; tenant_code: string; legal_name: string; display_name: string; currency: string; timezone: string; status: string };
  settings: { reservation_ttl_minutes: number; transfer_high_value_threshold_minor: number };
};

const LINKS = [
  { href: "/portal/settings/staff", label: "Team & Access", desc: "People who can sign in and the branches they work in." },
  { href: "/portal/settings/roles", label: "Roles & Permissions", desc: "What each role may see and do." },
  { href: "/portal/settings/storefront", label: "Online Storefront", desc: "Connect your website to the ERP." },
  { href: "/portal/settings/billing", label: "Plan & Billing", desc: "Your subscription, usage and payment history." },
  { href: "/portal/settings/activity", label: "Activity log", desc: "Who changed what, and when." },
];

function OperationsCard({ settings, currency, canEdit, onSaved }: { settings: TenantView["settings"]; currency: string; canEdit: boolean; onSaved: () => void }) {
  const [ttl, setTtl] = useState(String(settings.reservation_ttl_minutes));
  const [threshold, setThreshold] = useState(fromMinor(settings.transfer_high_value_threshold_minor));
  const [busy, setBusy] = useState(false);

  async function save() {
    const minor = toMinor(threshold);
    const minutes = parseInt(ttl, 10);
    if (minor === null || !minutes) return toast.error("Check the values", "Enter a whole number of minutes and a valid amount.");
    setBusy(true);
    const res = await erp("/api/v1/tenant/settings", "PATCH", { reservation_ttl_minutes: minutes, transfer_high_value_threshold_minor: minor });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save", res.error);
    toast.success("Settings saved");
    onSaved();
  }

  return (
    <Card className="p-space-4">
      <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Operations</h2>
      <Field label="Hold stock for unpaid orders (minutes)" htmlFor="s_ttl" hint="Online and WhatsApp orders release their stock if payment doesn't arrive in time. 5–1440.">
        <Input id="s_ttl" inputMode="numeric" disabled={!canEdit} value={ttl} onChange={(e) => setTtl(e.target.value)} />
      </Field>
      <Field label={`High-value transfer threshold (${currency})`} htmlFor="s_thr" hint={`Branch-to-branch transfers worth more than this need a regional manager's or admin's approval (now ${formatMoney(settings.transfer_high_value_threshold_minor, currency)}).`}>
        <Input id="s_thr" inputMode="decimal" disabled={!canEdit} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
      </Field>
      {canEdit && <Button disabled={busy} onClick={save}>Save settings</Button>}
    </Card>
  );
}

export default function SettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const view = useErpQuery<TenantView>("/api/v1/tenant");
  const canEdit = hasPermission(session, "settings", "write");

  if (!ready) return null;
  const t = view.data?.tenant;

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader icon={<Settings size={20} />} title="Settings" description="Company-wide configuration." />
      {view.error && <p className="mb-space-3 text-[13px] font-medium text-error">{view.error}</p>}
      <div className="grid gap-space-4 lg:grid-cols-2">
        <Card className="p-space-4">
          <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Company</h2>
          {t ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-space-4 gap-y-1.5 text-[14px]">
              <dt className="text-ink-600">Workspace</dt><dd className="font-medium">{t.tenant_code}</dd>
              <dt className="text-ink-600">Legal name</dt><dd className="font-medium">{t.legal_name}</dd>
              <dt className="text-ink-600">Display name</dt><dd className="font-medium">{t.display_name}</dd>
              <dt className="text-ink-600">Currency</dt><dd className="font-medium">{t.currency}</dd>
              <dt className="text-ink-600">Time zone</dt><dd className="font-medium">{t.timezone}</dd>
              <dt className="text-ink-600">Status</dt><dd className="font-medium capitalize">{t.status}</dd>
            </dl>
          ) : <p className="text-ink-400">{view.loading ? "Loading…" : ""}</p>}
        </Card>
        {view.data && <OperationsCard key={JSON.stringify(view.data.settings)} settings={view.data.settings} currency={view.data.tenant.currency} canEdit={canEdit} onSaved={view.reload} />}
      </div>
      <div className="mt-space-4 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-4">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card elevation="interactive" className="h-full p-space-4"><p className="font-semibold text-ink-900">{l.label}</p><p className="mt-1 text-[13px] text-ink-600">{l.desc}</p></Card>
          </Link>
        ))}
      </div>
    </PortalShell>
  );
}
