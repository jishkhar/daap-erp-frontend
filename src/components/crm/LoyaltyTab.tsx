"use client";

import { useState } from "react";
import { KpiTile, SegmentBadge } from "@/components/crm/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SkeletonLines } from "@/components/ui/Skeleton";
import type { LoyaltyOverview } from "@/lib/crm";
import { erp, formatDateTime, useErpQuery } from "@/lib/erp";
import { toast } from "@/lib/toast";

export function LoyaltyTab({ canConfigure, onOpenCustomer, onChanged }: { canConfigure: boolean; onOpenCustomer: (id: string) => void; onChanged: () => void }) {
  const data = useErpQuery<LoyaltyOverview>("/api/v1/crm/loyalty");
  const [rate, setRate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const d = data.data;

  async function save() {
    const n = Number.parseInt(rate ?? "", 10);
    if (!Number.isFinite(n) || n < 0) return toast.error("Enter a number", "Points per ₹100 must be zero or more.");
    setBusy(true);
    const res = await erp("/api/v1/crm/settings", "PUT", { points_per_100: n });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save", res.error);
    toast.success("Loyalty rate saved");
    setRate(null);
    data.reload();
    onChanged();
  }

  if (!d) return data.error ? <p className="text-[13px] font-medium text-error">{data.error}</p> : <SkeletonLines rows={4} />;
  return (
    <div className="space-y-space-4">
      <div className="grid gap-space-3 sm:grid-cols-3">
        <KpiTile label="Members with points" value={d.members} />
        <KpiTile label="Points earned from orders" value={d.points_earned.toLocaleString("en-IN")} />
        <KpiTile label="Points adjusted by staff" value={d.points_adjusted.toLocaleString("en-IN")} />
      </div>
      <Card className="p-space-4">
        <h2 className="mb-space-1 text-[15px] font-bold text-ink-900">How points are earned</h2>
        <p className="mb-space-3 text-[13px] text-ink-600">Customers earn points on delivered orders. Staff can add or take away points from a customer&apos;s profile (for example to redeem a reward).</p>
        <div className="flex max-w-sm items-end gap-space-3">
          <Field label="Points per ₹100 spent" htmlFor="ppr">
            <Input id="ppr" inputMode="numeric" disabled={!canConfigure} value={rate ?? String(d.settings.points_per_100)} onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))} />
          </Field>
          {canConfigure && <Button disabled={busy || rate === null} onClick={save}>Save</Button>}
        </div>
      </Card>
      <div className="grid gap-space-4 lg:grid-cols-2">
        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">Top members</h2>
          {d.top.length === 0 && <p className="text-[13px] text-ink-400">No points earned yet.</p>}
          <ul className="divide-y divide-line">
            {d.top.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-space-2 text-[13.5px]">
                <button type="button" className="flex items-center gap-space-2 font-semibold text-ink-900 hover:underline" onClick={() => onOpenCustomer(t.id)}>{t.name} <SegmentBadge segment={t.segment} /></button>
                <span className="font-bold">{t.loyalty_points.toLocaleString("en-IN")} pts</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">Recent adjustments</h2>
          {d.recent.length === 0 && <p className="text-[13px] text-ink-400">No adjustments yet.</p>}
          <ul className="divide-y divide-line">
            {d.recent.map((r) => (
              <li key={r.id} className="py-space-2 text-[13.5px]">
                <div className="flex justify-between"><span className="font-medium text-ink-900">{r.customer_name}</span><span className={r.delta < 0 ? "font-bold text-error" : "font-bold text-success"}>{r.delta > 0 ? "+" : ""}{r.delta}</span></div>
                <p className="text-[12px] text-ink-400">{r.reason} · {formatDateTime(r.created_at)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
