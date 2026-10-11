"use client";

import {
  AlertTriangle,
  IndianRupee,
  LayoutDashboard,
  ShoppingCart,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChannelBadge, OrderStatusBadge } from "@/components/erp/StatusBadges";
import { PortalShell } from "@/components/portal/PortalShell";
import { FirstRunChecklist } from "@/components/portal/onboarding/guide";
import { StatTile } from "@/components/portal/StatTile";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useActiveBranch } from "@/lib/branch";
import { CHANNEL_ORDER, formatMoney, humanize } from "@/lib/erp";
import { useTodaySummary } from "@/hooks/useAnalytics";
import { useLowStock } from "@/hooks/useInventory";
import { useRecentOrders } from "@/hooks/useOrders";
import { formatDateTime } from "@/lib/erp";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { tenant, ready } = usePortalGuard();
  const router = useRouter();
  const { branchId } = useActiveBranch();
  const today = useTodaySummary(branchId);
  const orders = useRecentOrders(branchId);
  const lowStock = useLowStock(branchId);
  const cur = tenant?.currency ?? "INR";
  const byChannel = (c: string) =>
    today.data?.by_channel.find((x) => x.channel === c) ?? {
      orders: 0,
      revenue_minor: 0,
    };

  if (!ready) return null;
  const recent = orders.data ?? [];

  return (
    <PortalShell tenant={tenant} active="dashboard">
      <PageHeader
        scopedToBranch
        icon={<LayoutDashboard size={20} />}
        title="Dashboard"
        description={`Today across ${branchId === null ? "all your branches" : "this branch"}.`}
      />
      <FirstRunChecklist />
      {(today.error || orders.error) && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {(today.error ?? orders.error)?.message}
        </p>
      )}
      <div className="mb-space-5 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          loading={today.isFetching && !today.data}
          label="Sales today"
          value={formatMoney(today.data?.revenue_minor ?? 0, cur)}
          deltaPct={null}
          hint="excluding cancelled"
          tone="success"
          icon={<IndianRupee size={22} />}
        />
        <StatTile
          loading={today.isFetching && !today.data}
          label="Orders today"
          value={today.data?.orders ?? 0}
          deltaPct={null}
          hint="all channels"
          icon={<ShoppingCart size={22} />}
        />
        <StatTile
          loading={today.isFetching && !today.data}
          label="Open orders"
          value={today.data?.open_orders ?? 0}
          deltaPct={null}
          hint="awaiting payment or fulfilment"
          tone="warning"
          icon={<Timer size={22} />}
        />
        <StatTile
          loading={today.isFetching && !today.data}
          label="Low-stock items"
          value={today.data?.low_stock_items ?? lowStock.data?.length ?? 0}
          deltaPct={null}
          hint="at or below reorder level"
          tone="clay"
          icon={<AlertTriangle size={22} />}
        />
      </div>

      <div className="mb-space-5 grid gap-space-3 sm:grid-cols-3">
        {CHANNEL_ORDER.map((c) => (
          <Link key={c} href={`/portal/orders?channel=${c}`}>
            <Card elevation="interactive" className="p-space-4">
              <div className="flex items-center justify-between">
                <ChannelBadge channel={c} />
                <span className="text-[12px] text-ink-400">today</span>
              </div>
              {today.isFetching && !today.data ? (
                <>
                  <Skeleton className="mt-space-2 h-[26px] w-28" />
                  <Skeleton className="mt-1 h-4 w-16" />
                </>
              ) : (
                <>
                  <p className="mt-space-2 text-[22px] font-bold text-ink-900">
                    {formatMoney(byChannel(c).revenue_minor, cur)}
                  </p>
                  <p className="text-[13px] text-ink-600">
                    {byChannel(c).orders} order
                    {byChannel(c).orders === 1 ? "" : "s"}
                  </p>
                </>
              )}
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-space-4 lg:grid-cols-3">
        <Card className="p-space-4 lg:col-span-3">
          <div className="mb-space-2 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink-900">
              Recent orders
            </h2>
            <Link
              href="/portal/orders"
              className="text-[13px] font-semibold text-brand-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {recent.length === 0 &&
            (orders.isFetching ? (
              <SkeletonLines rows={2} />
            ) : (
              <p className="text-[13.5px] text-ink-400">{"No orders yet."}</p>
            ))}
          {recent.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-ink-400">
                    <th className="py-space-2 pr-space-3">Order</th>
                    <th className="py-space-2 pr-space-3">Customer</th>
                    <th className="py-space-2 pr-space-3">Channel</th>
                    <th className="py-space-2 pr-space-3">Date</th>
                    <th className="py-space-2 pr-space-3 text-right">Qty</th>
                    <th className="py-space-2 pr-space-3 text-right">Amount</th>
                    <th className="py-space-2 pr-space-3">Payment</th>
                    <th className="py-space-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/portal/orders/${o.id}`)}
                      className="cursor-pointer hover:bg-black/[0.02]"
                    >
                      <td className="py-space-2 pr-space-3 font-semibold text-ink-900">
                        <Link href={`/portal/orders/${o.id}`}>
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="py-space-2 pr-space-3">
                        {o.customer_name || o.customer_phone ? (
                          <>
                            <span className="block font-medium text-ink-900">
                              {o.customer_name ?? o.customer_phone}
                            </span>
                            {o.customer_name && o.customer_phone && (
                              <span className="block text-[12px] text-ink-600">
                                {o.customer_phone}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-ink-400">Walk-in</span>
                        )}
                      </td>
                      <td className="py-space-2 pr-space-3">
                        <ChannelBadge channel={o.channel} />
                      </td>
                      <td className="py-space-2 pr-space-3 text-ink-600">
                        {formatDateTime(o.placed_at)}
                      </td>
                      <td className="py-space-2 pr-space-3 text-right">
                        {o.item_count ?? 0}
                      </td>
                      <td className="py-space-2 pr-space-3 text-right font-medium">
                        {formatMoney(o.total_minor, o.currency)}
                      </td>
                      <td className="py-space-2 pr-space-3 capitalize text-ink-600">
                        {humanize(o.payment_status)}
                      </td>
                      <td className="py-space-2">
                        <OrderStatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
            Low stock
          </h2>
          {(lowStock.data ?? []).length === 0 &&
            (lowStock.isFetching ? (
              <SkeletonLines rows={2} />
            ) : (
              <p className="text-[13.5px] text-ink-400">
                {"Nothing is below its reorder level."}
              </p>
            ))}
          <ul className="divide-y divide-line">
            {(lowStock.data ?? []).map((l) => (
              <li
                key={`${l.branch_id}-${l.variant_id}`}
                className="flex items-center justify-between gap-space-2 py-space-2 text-[13.5px]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-900">
                    {l.product_name}
                  </span>
                  <span className="text-[12px] text-ink-400">
                    {l.branch_code} · {l.sku}
                  </span>
                </span>
                <span className="shrink-0 font-bold text-warning">
                  {l.available_qty}
                  <span className="font-normal text-ink-400">
                    {" "}
                    / {l.reorder_level}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PortalShell>
  );
}
