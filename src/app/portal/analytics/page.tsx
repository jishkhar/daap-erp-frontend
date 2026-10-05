"use client";

import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FinancialReports } from "@/components/erp/reports/FinancialReports";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatTile } from "@/components/portal/StatTile";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useActiveBranch } from "@/lib/branch";
import { CHANNELS, CHANNEL_ORDER, formatMoney, qs, useErpQuery, type Order } from "@/lib/erp";
import { hasGrant, useStaffSession } from "@/lib/staffAuth";

const COLORS: Record<string, string> = { online: "#7c5cd6", pos: "#4a5d45", whatsapp: "#25d366" };
const DAYS = 14;

/** Sales analytics: revenue by channel and by branch, from live orders (cancelled excluded). The finance-grade
 * reports (margin, GST, branch P&L) arrive with the Finance module. */
export default function AnalyticsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const [view, setView] = useState<"sales" | "financial">("sales");
  const { branchId, branches } = useActiveBranch();
  const orders = useErpQuery<Order[]>(`/api/v1/orders${qs({ branch_id: branchId, limit: 200 })}`);
  const cur = tenant?.currency ?? "INR";

  const { daily, byChannel, byBranch, total, count } = useMemo(() => {
    const live = (orders.data ?? []).filter((o) => o.status !== "cancelled");
    const days: Record<string, Record<string, number>> = {};
    for (let i = DAYS - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days[d.toISOString().slice(0, 10)] = Object.fromEntries(CHANNEL_ORDER.map((c) => [c, 0])); }
    const ch = Object.fromEntries(CHANNEL_ORDER.map((c) => [c, 0])) as Record<string, number>;
    const br = new Map<string, number>();
    for (const o of live) {
      const day = new Date(o.placed_at).toISOString().slice(0, 10);
      if (days[day]) days[day][o.channel] += o.total_minor / 100;
      ch[o.channel] += o.total_minor;
      br.set(o.branch_id, (br.get(o.branch_id) ?? 0) + o.total_minor);
    }
    return {
      daily: Object.entries(days).map(([date, v]) => ({ date: date.slice(5), ...v })),
      byChannel: ch,
      byBranch: [...br.entries()].map(([id, minor]) => ({ id, minor })).sort((a, b) => b.minor - a.minor),
      total: live.reduce((s, o) => s + o.total_minor, 0), count: live.length,
    };
  }, [orders.data]);

  if (!ready) return null;
  const branchName = (id: string) => branches.find((b) => b.id === id)?.branch_name ?? `Branch #${id}`;

  return (
    <PortalShell tenant={tenant} active="analytics">
      <PageHeader icon={<BarChart3 size={20} />} title="Analytics / Reports" description="Live sales analytics, and the financial statements built from your books." />
      {hasGrant(session, "finance:view") && <Tabs tabs={[{ key: "sales", label: "Sales" }, { key: "financial", label: "Financial reports" }]} value={view} onChange={setView} />}
      {view === "financial" ? <FinancialReports currency={cur} /> : (<>
      {orders.error && <p className="mb-space-3 text-[13px] font-medium text-error">{orders.error}</p>}
      <div className="mb-space-5 grid gap-space-3 sm:grid-cols-3">
        <StatTile label="Revenue" value={formatMoney(total, cur)} deltaPct={null} hint="excluding cancelled" tone="success" icon={<BarChart3 size={22} />} />
        <StatTile label="Orders" value={count} deltaPct={null} hint="excluding cancelled" icon={<BarChart3 size={22} />} />
        <StatTile label="Average order" value={formatMoney(count ? Math.round(total / count) : 0, cur)} deltaPct={null} hint="per order" tone="violet" icon={<BarChart3 size={22} />} />
      </div>
      <Card className="mb-space-5 p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Revenue, last {DAYS} days, by channel</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={daily} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v) => formatMoney(Math.round(Number(v) * 100), cur)} />
              <Legend formatter={(key) => CHANNELS[key as keyof typeof CHANNELS]?.label ?? key} />
              {CHANNEL_ORDER.map((c) => <Bar key={c} dataKey={c} stackId="rev" fill={COLORS[c]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-space-4 md:grid-cols-2">
        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">By channel</h2>
          <ul className="divide-y divide-line">{CHANNEL_ORDER.map((c) => <li key={c} className="flex justify-between py-2 text-[14px]"><span>{CHANNELS[c].label}</span><span className="font-semibold">{formatMoney(byChannel[c], cur)}</span></li>)}</ul>
        </Card>
        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">By branch</h2>
          {byBranch.length === 0 ? <p className="text-[13.5px] text-ink-400">No sales yet.</p> : <ul className="divide-y divide-line">{byBranch.map((b) => <li key={b.id} className="flex justify-between py-2 text-[14px]"><span>{branchName(b.id)}</span><span className="font-semibold">{formatMoney(b.minor, cur)}</span></li>)}</ul>}
        </Card>
      </div>
      </>)}
    </PortalShell>
  );
}
