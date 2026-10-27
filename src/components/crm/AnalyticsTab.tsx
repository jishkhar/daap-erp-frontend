"use client";

import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { KpiTile, SegmentBadge } from "@/components/crm/shared";
import { Card } from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { SEGMENT_META, type CrmAnalytics } from "@/lib/crm";
import { CHANNELS, formatMoney, useErpQuery } from "@/lib/erp";

function Bar({
  label,
  value,
  max,
  text,
}: {
  label: React.ReactNode;
  value: number;
  max: number;
  text: string;
}) {
  return (
    <div className="flex items-center gap-space-2 text-[13px]">
      <span className="w-24 shrink-0 text-ink-600">{label}</span>
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-black/[0.05]">
        <span
          className="block h-full rounded-full bg-brand-500"
          style={{
            width: `${max ? Math.max(2, (value / max) * 100) : 0}%`,
            opacity: value ? 1 : 0,
          }}
        />
      </span>
      <span className="w-20 shrink-0 text-right font-medium text-ink-900">
        {text}
      </span>
    </div>
  );
}

export function AnalyticsTab({
  currency,
  repeatRate,
}: {
  currency: string;
  repeatRate: number;
}) {
  const q = useErpQuery<CrmAnalytics>("/api/v1/crm/analytics");
  const a = q.data;
  if (!a)
    return q.error ? (
      <p className="text-[13px] font-medium text-error">{q.error}</p>
    ) : (
      <SkeletonLines rows={5} />
    );
  const maxGrowth = Math.max(...a.customer_growth.map((g) => g.customers), 0);
  const maxSeg = Math.max(...a.segments.map((s) => s.customers), 0);
  const maxCh = Math.max(...a.orders_by_channel.map((c) => c.orders), 0);
  const monthLabel = (m: string) =>
    new Date(`${m}-01`).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  return (
    <div className="space-y-space-4">
      <div className="grid gap-space-3 sm:grid-cols-3">
        <KpiTile
          label="Average lifetime value"
          value={formatMoney(a.avg_lifetime_value_minor, currency)}
          hint="per customer who has bought"
        />
        <KpiTile
          label="Orders per customer"
          value={a.avg_orders_per_customer}
          hint="customers who have bought"
        />
        <KpiTile
          label="Repeat purchase rate"
          value={`${repeatRate}%`}
          hint="bought more than once"
        />
      </div>
      <div className="grid gap-space-4 lg:grid-cols-2">
        <Card className="space-y-space-2 p-space-4">
          <h2 className="mb-space-1 text-[15px] font-bold text-ink-900">
            New customers per month
          </h2>
          {a.customer_growth.map((g) => (
            <Bar
              key={g.month}
              label={monthLabel(g.month)}
              value={g.customers}
              max={maxGrowth}
              text={String(g.customers)}
            />
          ))}
        </Card>
        <Card className="space-y-space-2 p-space-4">
          <h2 className="mb-space-1 text-[15px] font-bold text-ink-900">
            Customers by membership
          </h2>
          {a.segments.map((s) => (
            <Bar
              key={s.key}
              label={SEGMENT_META[s.key].label}
              value={s.customers}
              max={maxSeg}
              text={String(s.customers)}
            />
          ))}
        </Card>
        <Card className="space-y-space-2 p-space-4">
          <h2 className="mb-space-1 text-[15px] font-bold text-ink-900">
            Orders by channel
          </h2>
          {a.orders_by_channel.length === 0 && (
            <p className="text-[13px] text-ink-400">
              No orders from known customers yet.
            </p>
          )}
          {a.orders_by_channel.map((c) => (
            <Bar
              key={c.channel}
              label={CHANNELS[c.channel]?.label ?? c.channel}
              value={c.orders}
              max={maxCh}
              text={`${c.orders} · ${formatMoney(c.revenue_minor, currency)}`}
            />
          ))}
        </Card>
        <Card className="min-w-0 p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
            Top customers
          </h2>
          <DataTable
            data={a.top_customers}
            getRowId={(customer) => customer.id}
            paginate={false}
            emptyMessage="No completed orders yet."
            columns={[
              {
                header: "#",
                cell: ({ row }) => (
                  <span className="text-ink-400">{row.index + 1}</span>
                ),
              },
              {
                header: "Customer ID",
                cell: ({ row }) => (
                  <Link
                    href={`/portal/customers/${row.original.id}`}
                    className="whitespace-nowrap font-semibold text-brand-700 hover:underline"
                  >
                    {row.original.customer_code ?? "View customer"}
                  </Link>
                ),
              },
              {
                header: "Name",
                cell: ({ row }) => (
                  <span className="font-semibold text-ink-900">
                    {row.original.name}
                  </span>
                ),
              },
              {
                header: "Membership",
                cell: ({ row }) => (
                  <SegmentBadge segment={row.original.segment} />
                ),
              },
              {
                header: "Purchase amount",
                cell: ({ row }) =>
                  formatMoney(row.original.total_spent_minor, currency),
              },
              {
                header: "Orders",
                cell: ({ row }) => row.original.total_orders,
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
