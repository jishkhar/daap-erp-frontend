"use client";

import { AlertTriangle, IndianRupee, LayoutDashboard, ShoppingCart, Timer } from "lucide-react";
import Link from "next/link";
import { ChannelBadge, OrderStatusBadge } from "@/components/erp/StatusBadges";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatTile } from "@/components/portal/StatTile";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useActiveBranch } from "@/lib/branch";
import { CHANNELS, CHANNEL_ORDER, formatMoney, qs, useErpQuery, type Order } from "@/lib/erp";
import { formatDateTime } from "@/lib/erp";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";

type Level = { branch_id: string; branch_code: string; variant_id: string; product_name: string; sku: string; available_qty: number; reorder_level: number | null };

type Today = { orders: number; revenue_minor: number; by_channel: { channel: string; orders: number; revenue_minor: number }[]; open_orders: number; low_stock_items: number | null };

export default function DashboardPage() {
  const { tenant, ready } = usePortalGuard();
  const { branchId } = useActiveBranch();
  const today = useErpQuery<Today>(`/api/v1/analytics/today${qs({ branch_id: branchId })}`);
  const orders = useErpQuery<Order[]>(`/api/v1/orders${qs({ branch_id: branchId, limit: 8 })}`);
  const lowStock = useErpQuery<Level[]>(`/api/v1/inventory${qs({ branch_id: branchId, low_stock: true, limit: 50 })}`);
  const cur = tenant?.currency ?? "INR";
  const byChannel = (c: string) => today.data?.by_channel.find((x) => x.channel === c) ?? { orders: 0, revenue_minor: 0 };

  if (!ready) return null;
  const recent = orders.data ?? [];

  return (
    <PortalShell tenant={tenant} active="dashboard">
      <PageHeader scopedToBranch icon={<LayoutDashboard size={20} />} title="Dashboard" description={`Today across ${branchId === null ? "all your branches" : "this branch"}.`} />
      {(today.error || orders.error) && <p className="mb-space-3 text-[13px] font-medium text-error">{today.error ?? orders.error}</p>}
      <div className="mb-space-5 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile loading={today.loading && !today.data} label="Sales today" value={formatMoney(today.data?.revenue_minor ?? 0, cur)} deltaPct={null} hint="excluding cancelled" tone="success" icon={<IndianRupee size={22} />} />
        <StatTile loading={today.loading && !today.data} label="Orders today" value={today.data?.orders ?? 0} deltaPct={null} hint="all channels" icon={<ShoppingCart size={22} />} />
        <StatTile loading={today.loading && !today.data} label="Open orders" value={today.data?.open_orders ?? 0} deltaPct={null} hint="awaiting payment or fulfilment" tone="warning" icon={<Timer size={22} />} />
        <StatTile loading={today.loading && !today.data} label="Low-stock items" value={today.data?.low_stock_items ?? lowStock.data?.length ?? 0} deltaPct={null} hint="at or below reorder level" tone="clay" icon={<AlertTriangle size={22} />} />
      </div>

      <div className="mb-space-5 grid gap-space-3 sm:grid-cols-3">
        {CHANNEL_ORDER.map((c) => (
          <Link key={c} href={`/portal/channels/${CHANNELS[c].slug}`}>
            <Card elevation="interactive" className="p-space-4">
              <div className="flex items-center justify-between"><ChannelBadge channel={c} /><span className="text-[12px] text-ink-400">today</span></div>
              {today.loading && !today.data ? <><Skeleton className="mt-space-2 h-[26px] w-28" /><Skeleton className="mt-1 h-4 w-16" /></> : <><p className="mt-space-2 text-[22px] font-bold text-ink-900">{formatMoney(byChannel(c).revenue_minor, cur)}</p>
              <p className="text-[13px] text-ink-600">{byChannel(c).orders} order{byChannel(c).orders === 1 ? "" : "s"}</p></>}
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-space-4 lg:grid-cols-3">
        <Card className="p-space-4 lg:col-span-2">
          <div className="mb-space-2 flex items-center justify-between"><h2 className="text-[15px] font-bold text-ink-900">Recent orders</h2><Link href="/portal/orders" className="text-[13px] font-semibold text-brand-600 hover:underline">View all</Link></div>
          {recent.length === 0 && (orders.loading ? <SkeletonLines rows={2} /> : <p className="text-[13.5px] text-ink-400">{"No orders yet."}</p>)}
          <ul className="divide-y divide-line">
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/portal/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-space-2 py-space-2 text-[13.5px] hover:bg-black/[0.02]">
                  <span className="flex items-center gap-space-2"><span className="font-semibold text-ink-900">{o.order_number}</span><ChannelBadge channel={o.channel} /></span>
                  <span className="flex items-center gap-space-3"><span className="text-ink-600">{formatDateTime(o.placed_at)}</span><span className="font-medium">{formatMoney(o.total_minor, o.currency)}</span><OrderStatusBadge status={o.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">Low stock</h2>
          {(lowStock.data ?? []).length === 0 && (lowStock.loading ? <SkeletonLines rows={2} /> : <p className="text-[13.5px] text-ink-400">{"Nothing is below its reorder level."}</p>)}
          <ul className="divide-y divide-line">
            {(lowStock.data ?? []).map((l) => (
              <li key={`${l.branch_id}-${l.variant_id}`} className="flex items-center justify-between gap-space-2 py-space-2 text-[13.5px]">
                <span className="min-w-0"><span className="block truncate font-medium text-ink-900">{l.product_name}</span><span className="text-[12px] text-ink-400">{l.branch_code} · {l.sku}</span></span>
                <span className="shrink-0 font-bold text-warning">{l.available_qty}<span className="font-normal text-ink-400"> / {l.reorder_level}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PortalShell>
  );
}
