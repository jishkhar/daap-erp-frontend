"use client";

import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatTile } from "@/components/portal/StatTile";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { useActiveBranch } from "@/lib/branch";
import { CHANNELS, CHANNEL_ORDER, formatMoney, qs, useErpQuery } from "@/lib/erp";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";

const COLORS: Record<string, string> = { online: "#7c5cd6", pos: "#4a5d45", whatsapp: "#25d366" };
const RANGES = [{ days: 7, label: "Last 7 days" }, { days: 14, label: "Last 14 days" }, { days: 30, label: "Last 30 days" }, { days: 90, label: "Last 90 days" }];

type BranchRow = { branch_id: string; branch_code: string; branch_name: string; status: string; orders: number; revenue_minor: number; avg_order_minor: number; expenses_minor: number; stock_units: number; stock_value_minor: number; low_stock_items: number };
type Overview = {
  date_from: string; date_to: string;
  totals: { orders: number; revenue_minor: number; avg_order_minor: number; expenses_minor: number; stock_units: number; stock_value_minor: number; low_stock_items: number };
  by_channel: { channel: string; orders: number; revenue_minor: number }[];
  by_branch: BranchRow[];
  daily: ({ date: string } & Record<string, number | string>)[];
};

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Sales analytics, computed by the server over the chosen period (cancelled orders excluded): revenue by day, channel and
 * branch, plus each branch's expenses and current stock. */
export default function AnalyticsPage() {
  const { tenant, ready } = usePortalGuard();
  const [days, setDays] = useState(14);
  const { branchId } = useActiveBranch();
  const range = useMemo(() => { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - (days - 1)); return { date_from: isoDay(from), date_to: isoDay(to) }; }, [days]);
  const data = useErpQuery<Overview>(`/api/v1/analytics/sales${qs({ ...range, branch_id: branchId })}`);
  const cur = tenant?.currency ?? "INR";
  const t = data.data?.totals;
  const daily = useMemo(() => (data.data?.daily ?? []).map((d) => ({ date: String(d.date).slice(5), ...Object.fromEntries(CHANNEL_ORDER.map((c) => [c, Number(d[c] ?? 0) / 100])) })), [data.data]);
  const topRevenue = Math.max(1, ...(data.data?.by_branch ?? []).map((b) => b.revenue_minor));

  if (!ready) return null;

  return (
    <PortalShell tenant={tenant} active="analytics">
      <PageHeader scopedToBranch icon={<BarChart3 size={20} />} title="Analytics" description="Live sales analytics: revenue by day, channel and branch." />
      <>
      <div className="mb-space-4 flex flex-wrap items-center justify-between gap-space-3">
        <p className="text-[13.5px] text-ink-600">{branchId ? "This branch" : "All your branches"} · {data.data ? `${data.data.date_from} to ${data.data.date_to}` : `${range.date_from} to ${range.date_to}`}</p>
        <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-44" aria-label="Period">{RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}</Select>
      </div>
      {data.error && <p className="mb-space-3 text-[13px] font-medium text-error">{data.error}</p>}
      <div className="mb-space-5 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile loading={data.loading && !data.data} label="Revenue" value={formatMoney(t?.revenue_minor ?? 0, cur)} deltaPct={null} hint="excluding cancelled" tone="success" icon={<BarChart3 size={22} />} />
        <StatTile loading={data.loading && !data.data} label="Orders" value={t?.orders ?? 0} deltaPct={null} hint="excluding cancelled" icon={<BarChart3 size={22} />} />
        <StatTile loading={data.loading && !data.data} label="Average order" value={formatMoney(t?.avg_order_minor ?? 0, cur)} deltaPct={null} hint="per order" tone="violet" icon={<BarChart3 size={22} />} />
        <StatTile loading={data.loading && !data.data} label="Expenses" value={formatMoney(t?.expenses_minor ?? 0, cur)} deltaPct={null} hint="approved and paid" tone="clay" icon={<BarChart3 size={22} />} />
        <StatTile loading={data.loading && !data.data} label="Stock value" value={formatMoney(t?.stock_value_minor ?? 0, cur)} deltaPct={null} hint={`${t?.stock_units ?? 0} units now, at cost`} tone="info" icon={<BarChart3 size={22} />} />
        <StatTile loading={data.loading && !data.data} label="Low-stock items" value={t?.low_stock_items ?? 0} deltaPct={null} hint="at or below reorder level" tone="warning" icon={<BarChart3 size={22} />} />
      </div>
      <Card className="mb-space-5 p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Revenue by day and channel</h2>
        <div className="h-72 w-full">
          {data.loading && !data.data ? <Skeleton className="h-full w-full" /> : <ResponsiveContainer>
            <BarChart data={daily} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} fontSize={12} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v) => formatMoney(Math.round(Number(v) * 100), cur)} />
              <Legend formatter={(key) => CHANNELS[key as keyof typeof CHANNELS]?.label ?? key} />
              {CHANNEL_ORDER.map((c) => <Bar key={c} dataKey={c} stackId="rev" fill={COLORS[c]} />)}
            </BarChart>
          </ResponsiveContainer>}
        </div>
      </Card>
      <div className="mb-space-5 grid gap-space-4 md:grid-cols-2">
        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">By channel</h2>
          {data.loading && !data.data ? <SkeletonLines rows={3} /> : <ul className="divide-y divide-line">{CHANNEL_ORDER.map((c) => { const row = data.data?.by_channel.find((x) => x.channel === c); return <li key={c} className="flex justify-between py-2 text-[14px]"><span>{CHANNELS[c].label} <span className="text-ink-400">· {row?.orders ?? 0} orders</span></span><span className="font-semibold">{formatMoney(row?.revenue_minor ?? 0, cur)}</span></li>; })}</ul>}
        </Card>
        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">Revenue share by branch</h2>
          {(data.data?.by_branch ?? []).every((b) => b.revenue_minor === 0) ? (data.loading ? <SkeletonLines rows={2} /> : <p className="text-[13.5px] text-ink-400">{"No sales in this period."}</p>) : (
            <ul className="space-y-space-2">{(data.data?.by_branch ?? []).map((b) => (
              <li key={b.branch_id} className="text-[14px]"><div className="flex justify-between"><span>{b.branch_name}</span><span className="font-semibold">{formatMoney(b.revenue_minor, cur)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-black/[0.06]"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(b.revenue_minor / topRevenue) * 100}%` }} /></div></li>))}
            </ul>)}
        </Card>
      </div>
      <Card className="no-scrollbar overflow-x-auto p-space-4">
        <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">Branch comparison</h2>
        <table className="w-full min-w-[720px] text-[13.5px]">
          <thead><tr className="text-left text-[12px] uppercase tracking-wide text-ink-400"><th className="py-2">Branch</th><th>Orders</th><th>Revenue</th><th>Avg order</th><th>Expenses</th><th>Stock units</th><th>Stock value</th><th>Low stock</th></tr></thead>
          <tbody>{data.loading && !data.data ? [0, 1, 2].map((i) => <tr key={i} className="border-t border-line"><td colSpan={8} className="py-2"><Skeleton className="h-4 w-full" /></td></tr>) : (data.data?.by_branch ?? []).map((b) => (
            <tr key={b.branch_id} className="border-t border-line"><td className="py-2 font-medium text-ink-900">{b.branch_name} <span className="text-ink-400">{b.branch_code}{b.status === "inactive" ? " · inactive" : ""}</span></td><td>{b.orders}</td><td className="font-semibold">{formatMoney(b.revenue_minor, cur)}</td><td>{formatMoney(b.avg_order_minor, cur)}</td><td>{formatMoney(b.expenses_minor, cur)}</td><td>{b.stock_units}</td><td>{formatMoney(b.stock_value_minor, cur)}</td><td>{b.low_stock_items || "—"}</td></tr>))}
          </tbody>
        </table>
      </Card>
      </>
    </PortalShell>
  );
}
