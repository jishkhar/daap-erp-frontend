"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChannelBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/erp/StatusBadges";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import {
  formatDateTime,
  formatMoney,
  humanize,
  useErpQuery,
  type Customer,
  type Interaction,
  type Order,
  type StoreCredit,
} from "@/lib/erp";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tenant, ready } = usePortalGuard();
  const customer = useErpQuery<Customer & { interactions: Interaction[] }>(
    `/api/v1/customers/${id}`,
  );
  const orders = useErpQuery<Order[]>(
    `/api/v1/orders?customer_id=${id}&limit=100`,
  );
  const credit = useErpQuery<StoreCredit>(
    `/api/v1/customers/${id}/store-credit`,
  );
  if (!ready) return null;
  const c = customer.data;

  return (
    <PortalShell tenant={tenant} active="customers">
      <Link
        href="/portal/customers"
        className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft size={14} /> All customers
      </Link>
      {customer.error && (
        <p className="text-[14px] font-medium text-error">{customer.error}</p>
      )}
      {!c && !customer.error && (
        <p className="text-ink-400">Loading customer…</p>
      )}
      {c && (
        <>
          <div className="mb-space-5">
            <h1 className="text-display">{c.name}</h1>
            <p className="mt-1 text-[13.5px] text-ink-600">
              {[c.phone, c.email].filter(Boolean).join(" · ")}{" "}
              <Badge
                tone={c.status === "active" ? "success" : "neutral"}
                className="ml-2"
              >
                {c.status}
              </Badge>
            </p>
          </div>
          <div className="grid gap-space-4 lg:grid-cols-3">
            <Card className="p-space-3 lg:col-span-2">
              <h2 className="mb-space-2 px-space-2 pt-space-1 text-[15px] font-bold text-ink-900">
                Orders
              </h2>
              <DataTable
                columns={[
                  {
                    header: "Order",
                    cell: ({ row }) => (
                      <span className="font-semibold">
                        {row.original.order_number}
                      </span>
                    ),
                  },
                  {
                    header: "Channel",
                    cell: ({ row }) => (
                      <ChannelBadge channel={row.original.channel} />
                    ),
                  },
                  {
                    header: "Total",
                    cell: ({ row }) =>
                      formatMoney(
                        row.original.total_minor,
                        row.original.currency,
                      ),
                  },
                  {
                    header: "Payment",
                    cell: ({ row }) => (
                      <PaymentStatusBadge
                        status={row.original.payment_status}
                      />
                    ),
                  },
                  {
                    header: "Status",
                    cell: ({ row }) => (
                      <OrderStatusBadge status={row.original.status} />
                    ),
                  },
                  {
                    header: "Placed",
                    cell: ({ row }) => formatDateTime(row.original.placed_at),
                  },
                ]}
                data={orders.data ?? []}
                getRowId={(o) => String(o.id)}
                onRowClick={(o) => router.push(`/portal/orders/${o.id}`)}
                pageSize={10}
                emptyMessage={orders.loading ? "Loading…" : "No orders yet."}
              />
            </Card>
            <div className="space-y-space-4">
              {credit.data &&
                (credit.data.balance_minor > 0 ||
                  credit.data.entries.length > 0) && (
                  <Card className="p-space-4">
                    <h2 className="mb-space-1 text-[15px] font-bold text-ink-900">
                      Store credit
                    </h2>
                    <p className="text-[22px] font-bold text-ink-900">
                      {formatMoney(
                        credit.data.balance_minor,
                        tenant?.currency ?? "INR",
                      )}
                    </p>
                    <ul className="mt-space-2 space-y-1 text-[12.5px] text-ink-600">
                      {credit.data.entries.slice(0, 5).map((e) => (
                        <li key={e.id} className="flex justify-between gap-2">
                          <span>{e.reason}</span>
                          <span
                            className={
                              e.delta_minor < 0 ? "text-error" : "text-success"
                            }
                          >
                            {formatMoney(
                              e.delta_minor,
                              tenant?.currency ?? "INR",
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              <Card className="p-space-4">
                <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
                  Activity
                </h2>
                {c.interactions.length === 0 && (
                  <p className="text-[13px] text-ink-400">Nothing yet.</p>
                )}
                <ol className="space-y-space-3 border-l border-line pl-space-4">
                  {c.interactions.map((i) => (
                    <li key={i.id} className="relative text-[13.5px]">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-500" />
                      <p className="font-medium text-ink-900">
                        {i.summary ?? humanize(i.kind)}
                      </p>
                      <p className="flex items-center gap-space-2 text-[12px] text-ink-400">
                        <ChannelBadge channel={i.channel} />{" "}
                        {formatDateTime(i.occurred_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          </div>
        </>
      )}
    </PortalShell>
  );
}
