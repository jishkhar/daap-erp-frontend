"use client";

import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatTile } from "@/components/portal/StatTile";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useActiveBranch } from "@/lib/branch";
import { useSalesOverview } from "@/hooks/useAnalytics";
import { pctChange } from "@/components/portal/dashboard/format";
import {
  periodText,
  prevText,
  todayIso,
  useGlobalFilter,
} from "@/lib/globalFilter";
import { CHANNELS, CHANNEL_ORDER, formatMoney } from "@/lib/erp";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { PosDailyCloses } from "@/components/portal/PosDailyCloses";

const COLORS: Record<string, string> = {
  online: "#7c5cd6",
  pos: "#4a5d45",
  whatsapp: "#25d366",
};
const dayFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const monthFmt = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
});

/** A bar's label: an hour ("14:00"), a day ("8 Jan"), the week starting that day, or a month ("Jan 26"). */
function bucketLabel(iso: string, granularity: string) {
  if (granularity === "hour") return iso.slice(11);
  const d = new Date(`${iso}T00:00:00`);
  if (granularity === "month") return monthFmt.format(d);
  return granularity === "week"
    ? `Week of ${dayFmt.format(d)}`
    : dayFmt.format(d);
}

/** Sales analytics, computed by the server over the header's global filter (period and channel; cancelled orders excluded): revenue
 * over time, by channel and branch, plus each branch's expenses and current stock. */
export default function AnalyticsPage() {
  const { tenant, ready } = usePortalGuard();
  const { branchId } = useActiveBranch();
  const { params } = useGlobalFilter();
  const data = useSalesOverview(params, branchId);
  const cur = tenant?.currency ?? "INR";
  const t = data.data?.totals;
  const prev = data.data?.prev;
  const vs = prevText(data.data?.period);
  const delta = (key: keyof NonNullable<typeof prev>) =>
    t && prev ? pctChange(t[key], prev[key]) : null;
  // POS day closes follow the period too, by the dates the server worked out
  const closesRange = data.data
    ? { date_from: data.data.date_from, date_to: data.data.date_to }
    : { date_from: todayIso(), date_to: todayIso() };
  const daily = useMemo(
    () =>
      (data.data?.daily ?? []).map((d) => ({
        date: bucketLabel(String(d.date), data.data!.granularity),
        ...Object.fromEntries(
          CHANNEL_ORDER.map((c) => [c, Number(d[c] ?? 0) / 100]),
        ),
      })),
    [data.data],
  );
  const topRevenue = Math.max(
    1,
    ...(data.data?.by_branch ?? []).map((b) => b.revenue_minor),
  );

  if (!ready) return null;

  return (
    <PortalShell tenant={tenant} active="analytics">
      <PageHeader
        scopedToBranch
        icon={<BarChart3 size={20} />}
        title="Analytics"
        description="Live sales analytics: revenue by day, channel and branch."
      />
      <>
        <p className="mb-space-4 text-[13.5px] text-ink-600">
          {branchId ? "This branch" : "All your branches"} ·{" "}
          {periodText(data.data?.period)}
        </p>
        {data.error && (
          <p className="mb-space-3 text-[13px] font-medium text-error">
            {data.error.message}
          </p>
        )}
        <div className="mb-space-5 grid gap-space-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatTile
            loading={data.isFetching && !data.data}
            label="Revenue"
            value={formatMoney(t?.revenue_minor ?? 0, cur)}
            deltaPct={delta("revenue_minor")}
            hint={
              t && t.returns_minor > 0
                ? `${formatMoney(t.net_revenue_minor, cur)} after returns · ${vs}`
                : `excluding cancelled · ${vs}`
            }
            tone="success"
            icon={<BarChart3 size={22} />}
          />
          <StatTile
            loading={data.isFetching && !data.data}
            label="Orders"
            value={t?.orders ?? 0}
            deltaPct={delta("orders")}
            hint={`excluding cancelled · ${vs}`}
            icon={<BarChart3 size={22} />}
          />
          <StatTile
            loading={data.isFetching && !data.data}
            label="Average order"
            value={formatMoney(t?.avg_order_minor ?? 0, cur)}
            deltaPct={delta("avg_order_minor")}
            hint={`per order · ${vs}`}
            tone="violet"
            icon={<BarChart3 size={22} />}
          />
          <StatTile
            loading={data.isFetching && !data.data}
            label="Expenses"
            value={formatMoney(t?.expenses_minor ?? 0, cur)}
            deltaPct={delta("expenses_minor")}
            upIsGood={false}
            hint={
              params.channel
                ? "approved and paid · every channel"
                : `approved and paid · ${vs}`
            }
            tone="clay"
            icon={<BarChart3 size={22} />}
          />
          <StatTile
            loading={data.isFetching && !data.data}
            label="Stock value"
            value={formatMoney(t?.stock_value_minor ?? 0, cur)}
            deltaPct={null}
            hint={`${t?.stock_units ?? 0} units now, at cost`}
            tone="info"
            icon={<BarChart3 size={22} />}
          />
          <StatTile
            loading={data.isFetching && !data.data}
            label="Low-stock items"
            value={t?.low_stock_items ?? 0}
            deltaPct={null}
            hint="at or below reorder level"
            tone="warning"
            icon={<BarChart3 size={22} />}
          />
        </div>
        <Card className="mb-space-5 p-space-4">
          <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
            Revenue over time, by channel
          </h2>
          <div className="h-72 w-full">
            {data.isFetching && !data.data ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={daily} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    fontSize={12}
                    minTickGap={16}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    formatter={(v) =>
                      formatMoney(Math.round(Number(v) * 100), cur)
                    }
                  />
                  <Legend
                    formatter={(key) =>
                      CHANNELS[key as keyof typeof CHANNELS]?.label ?? key
                    }
                  />
                  {CHANNEL_ORDER.map((c) => (
                    <Bar key={c} dataKey={c} stackId="rev" fill={COLORS[c]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <div className="mb-space-5 grid gap-space-4 md:grid-cols-2">
          <Card className="p-space-4">
            <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
              By channel
            </h2>
            {data.isFetching && !data.data ? (
              <SkeletonLines rows={3} />
            ) : (
              <ul className="divide-y divide-line">
                {CHANNEL_ORDER.filter(
                  (c) => !params.channel || c === params.channel,
                ).map((c) => {
                  const row = data.data?.by_channel.find(
                    (x) => x.channel === c,
                  );
                  return (
                    <li
                      key={c}
                      className="flex justify-between py-2 text-[14px]"
                    >
                      <span>
                        {CHANNELS[c].label}{" "}
                        <span className="text-ink-400">
                          · {row?.orders ?? 0} orders
                        </span>
                      </span>
                      <span className="font-semibold">
                        {formatMoney(row?.revenue_minor ?? 0, cur)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card className="p-space-4">
            <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
              Revenue share by branch
            </h2>
            {(data.data?.by_branch ?? []).every(
              (b) => b.revenue_minor === 0,
            ) ? (
              data.isFetching ? (
                <SkeletonLines rows={2} />
              ) : (
                <p className="text-[13.5px] text-ink-400">
                  {"No sales in this period."}
                </p>
              )
            ) : (
              <ul className="space-y-space-2">
                {(data.data?.by_branch ?? []).map((b) => (
                  <li key={b.branch_id} className="text-[14px]">
                    <div className="flex justify-between">
                      <span>{b.branch_name}</span>
                      <span className="font-semibold">
                        {formatMoney(b.revenue_minor, cur)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/[0.06]">
                      <div
                        className="h-1.5 rounded-full bg-brand-600"
                        style={{
                          width: `${(b.revenue_minor / topRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card className="no-scrollbar mb-space-5 overflow-x-auto p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
            Branch comparison
          </h2>
          <table className="w-full min-w-[720px] text-[13.5px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-ink-400">
                <th className="py-2">Branch</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg order</th>
                <th>Expenses</th>
                <th>Stock units</th>
                <th>Stock value</th>
                <th>Low stock</th>
              </tr>
            </thead>
            <tbody>
              {data.isFetching && !data.data
                ? [0, 1, 2].map((i) => (
                    <tr key={i} className="border-t border-line">
                      <td colSpan={8} className="py-2">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : (data.data?.by_branch ?? []).map((b) => (
                    <tr key={b.branch_id} className="border-t border-line">
                      <td className="py-2 font-medium text-ink-900">
                        {b.branch_name}{" "}
                        <span className="text-ink-400">
                          {b.branch_code}
                          {b.status === "inactive" ? " · inactive" : ""}
                        </span>
                      </td>
                      <td>{b.orders}</td>
                      <td className="font-semibold">
                        {formatMoney(b.revenue_minor, cur)}
                      </td>
                      <td>{formatMoney(b.avg_order_minor, cur)}</td>
                      <td>{formatMoney(b.expenses_minor, cur)}</td>
                      <td>{b.stock_units}</td>
                      <td>{formatMoney(b.stock_value_minor, cur)}</td>
                      <td>{b.low_stock_items || "—"}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </Card>
        <PosDailyCloses
          range={closesRange}
          branchId={branchId}
          currency={cur}
        />
      </>
    </PortalShell>
  );
}
