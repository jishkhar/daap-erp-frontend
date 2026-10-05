"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { adminJson } from "@/lib/adminAuth";
import { useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import type { Plan, PlatformTenant } from "../page";

type Detail = PlatformTenant & { effective_features: string[]; feature_overrides: Record<string, boolean>; plan: Plan | null };

const FEATURES: { key: string; label: string }[] = [
  { key: "channel.online_website", label: "Online channel" },
  { key: "channel.retail", label: "POS channel" },
  { key: "channel.whatsapp_shop_connect", label: "WhatsApp channel" },
  { key: "procurement", label: "Procurement" },
  { key: "finance", label: "Finance" },
  { key: "recommerce", label: "ReCommerce" },
  { key: "abby_ai", label: "Abby AI" },
  { key: "fraudshield", label: "FraudShield" },
  { key: "analytics", label: "Analytics" },
];

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useAdminQuery<Detail>(`/api/platform/tenants/${id}`);
  const plansQ = useAdminQuery<Plan[]>("/api/platform/plans");
  const t = detail.data;
  const plans = plansQ.data ?? [];
  const error = detail.error;

  async function patch(body: unknown, message: string) {
    const res = await adminJson(`/api/platform/tenants/${id}`, "PATCH", body);
    if (res.error) return toast.error("Couldn't update", res.error);
    toast.success(message);
    detail.reload();
  }

  if (error) return <p className="text-error">{error}</p>;
  if (!t) return <p className="text-ink-400">Loading…</p>;
  const planFeatures = new Set(t.plan?.features ?? []);

  return (
    <>
      <Link href="/admin/tenants" className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"><ArrowLeft size={14} /> All tenants</Link>
      <div className="mb-space-5 flex flex-wrap items-center justify-between gap-space-3">
        <div><h1 className="text-display">{t.display_name}</h1><p className="text-[13.5px] text-ink-600">{t.tenant_code} · {t.legal_name} · {t.currency} · {t.timezone}</p></div>
        <div className="flex items-center gap-space-2">
          <Badge tone={t.status === "active" ? "success" : "warning"}>{t.status}</Badge>
          {t.status === "active" ? <Button variant="destructive" onClick={() => patch({ status: "suspended" }, "Tenant suspended")}>Suspend</Button> : <Button onClick={() => patch({ status: "active" }, "Tenant reactivated")}>Reactivate</Button>}
        </div>
      </div>
      <div className="grid gap-space-4 lg:grid-cols-2">
        <Card className="p-space-4">
          <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Plan</h2>
          <Select value={plans.find((p) => p.id === t.plan_id)?.code ?? ""} onChange={(e) => patch({ plan_code: e.target.value }, "Plan changed")} aria-label="Plan">
            {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </Select>
          {t.plan && <p className="mt-space-2 text-[13px] text-ink-600">Up to {t.plan.max_branches ?? "unlimited"} branches and {t.plan.max_users ?? "unlimited"} users.</p>}
        </Card>
        <Card className="p-space-4">
          <h2 className="mb-space-1 text-[15px] font-bold text-ink-900">Feature toggles</h2>
          <p className="mb-space-3 text-[12.5px] text-ink-600">A toggle overrides what the plan includes for this tenant only.</p>
          <ul className="divide-y divide-line">
            {FEATURES.map((f) => {
              const on = t.effective_features.includes(f.key);
              const overridden = f.key in t.feature_overrides;
              return (
                <li key={f.key} className="flex items-center justify-between py-space-2 text-[14px]">
                  <span>{f.label} {overridden ? <Badge tone="violet" className="ml-1">override</Badge> : planFeatures.has(f.key) ? <span className="ml-1 text-[12px] text-ink-400">in plan</span> : null}</span>
                  <Switch checked={on} onChange={() => patch({ feature_overrides: { ...t.feature_overrides, [f.key]: !on } }, `${f.label} ${on ? "disabled" : "enabled"}`)} />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
