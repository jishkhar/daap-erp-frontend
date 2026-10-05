"use client";

import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { adminJson } from "@/lib/adminAuth";
import { useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";

export type PlatformTenant = { id: string; tenant_code: string; legal_name: string; display_name: string; plan_id: string | null; status: "active" | "trial" | "suspended" | "cancelled"; currency: string; timezone: string; created_at: string };
export type Plan = { id: string; code: string; name: string; max_branches: number | null; max_users: number | null; features: string[] };

const EMPTY = { legal_name: "", display_name: "", plan_code: "growth", currency: "INR", branch_name: "", city: "", admin_name: "", admin_email: "", admin_password: "" };
const STATUS_TONE = { active: "success", trial: "violet", suspended: "warning", cancelled: "neutral" } as const;

export default function TenantsPage() {
  const tenantsQ = useAdminQuery<PlatformTenant[]>("/api/platform/tenants");
  const plansQ = useAdminQuery<Plan[]>("/api/platform/plans");
  const tenants = tenantsQ.data;
  const plans = plansQ.data ?? [];
  const error = tenantsQ.error ?? plansQ.error;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ code: string; email: string } | null>(null);

  async function provision() {
    setBusy(true);
    const res = await adminJson<{ tenant: { tenant_code: string } }>("/api/platform/tenants", "POST", {
      legal_name: form.legal_name.trim(), display_name: form.display_name.trim(), plan_code: form.plan_code, currency: form.currency.toUpperCase(),
      first_branch: { branch_name: form.branch_name.trim(), ...(form.city.trim() ? { city: form.city.trim() } : {}) },
      admin_name: form.admin_name.trim(), admin_email: form.admin_email.trim(), admin_password: form.admin_password,
    });
    setBusy(false);
    if (res.error || !res.data) return toast.error("Couldn't create the tenant", res.error ?? undefined);
    setOpen(false);
    setCreated({ code: res.data.tenant.tenant_code, email: form.admin_email.trim() });
    setForm(EMPTY);
    tenantsQ.reload();
  }

  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));
  const valid = form.legal_name.trim() && form.display_name.trim() && form.branch_name.trim() && form.admin_name.trim() && form.admin_email.trim() && form.admin_password.length >= 10;

  return (
    <>
      <PageHeader icon={<Building2 size={20} />} title="Tenants" description="Every company on the platform."
        actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> New tenant</Button>} />
      {error && <p className="mb-space-3 text-[13px] font-medium text-error">{error}</p>}
      <Card className="overflow-x-auto p-space-2">
        <table className="w-full text-[14px]">
          <thead><tr className="text-left text-[12px] tracking-wide text-ink-400 uppercase"><th className="p-space-3">Code</th><th className="p-space-3">Company</th><th className="p-space-3">Plan</th><th className="p-space-3">Currency</th><th className="p-space-3">Status</th></tr></thead>
          <tbody>
            {(tenants ?? []).map((t) => (
              <tr key={t.id} className="border-t border-line hover:bg-black/[0.02]">
                <td className="p-space-3 font-semibold"><Link href={`/admin/tenants/${t.id}`} className="text-brand-600 hover:underline">{t.tenant_code}</Link></td>
                <td className="p-space-3"><span className="font-medium text-ink-900">{t.display_name}</span><span className="block text-[12px] text-ink-400">{t.legal_name}</span></td>
                <td className="p-space-3">{plans.find((p) => p.id === t.plan_id)?.name ?? "—"}</td>
                <td className="p-space-3">{t.currency}</td>
                <td className="p-space-3"><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></td>
              </tr>
            ))}
            {tenants && tenants.length === 0 && <tr><td colSpan={5} className="p-space-4 text-center text-ink-400">No tenants yet.</td></tr>}
            {!tenants && !error && <tr><td colSpan={5} className="p-space-4 text-center text-ink-400">Loading…</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} width="lg" title="New tenant" description="Creates the company, its first branch and its administrator."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy || !valid} onClick={provision}>Create tenant</Button></>}>
        <div className="grid gap-x-space-4 sm:grid-cols-2">
          <Field label="Legal name" htmlFor="t_legal" required><Input id="t_legal" value={form.legal_name} onChange={(e) => set({ legal_name: e.target.value })} /></Field>
          <Field label="Display name" htmlFor="t_disp" required><Input id="t_disp" value={form.display_name} onChange={(e) => set({ display_name: e.target.value })} /></Field>
          <Field label="Plan" htmlFor="t_plan"><Select id="t_plan" value={form.plan_code} onChange={(e) => set({ plan_code: e.target.value })}>{plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</Select></Field>
          <Field label="Currency" htmlFor="t_cur"><Input id="t_cur" maxLength={3} value={form.currency} onChange={(e) => set({ currency: e.target.value })} /></Field>
          <Field label="First branch name" htmlFor="t_branch" required><Input id="t_branch" value={form.branch_name} onChange={(e) => set({ branch_name: e.target.value })} /></Field>
          <Field label="City" htmlFor="t_city"><Input id="t_city" value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
          <Field label="Administrator name" htmlFor="t_an" required><Input id="t_an" value={form.admin_name} onChange={(e) => set({ admin_name: e.target.value })} /></Field>
          <Field label="Administrator email" htmlFor="t_ae" required><Input id="t_ae" type="email" value={form.admin_email} onChange={(e) => set({ admin_email: e.target.value })} /></Field>
          <Field label="Temporary password" htmlFor="t_ap" hint="At least 10 characters. Share it securely." required className="sm:col-span-2"><Input id="t_ap" type="password" value={form.admin_password} onChange={(e) => set({ admin_password: e.target.value })} /></Field>
        </div>
      </Modal>
      <Modal open={created !== null} onClose={() => setCreated(null)} title="Tenant created" footer={<Button onClick={() => setCreated(null)}>Done</Button>}>
        <p className="text-[14px] text-ink-700">Company code <strong>{created?.code}</strong>. The administrator signs in at <code>/portal/login</code> with this code and <strong>{created?.email}</strong>.</p>
      </Modal>
    </>
  );
}
