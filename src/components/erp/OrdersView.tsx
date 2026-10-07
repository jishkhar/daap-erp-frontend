"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChannelBadge, OrderStatusBadge, PaymentStatusBadge } from "@/components/erp/StatusBadges";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useActiveBranch } from "@/lib/branch";
import { CHANNELS, CHANNEL_ORDER, formatDateTime, formatMoney, humanize, qs, useErpQuery, type Channel, type Customer, type Order } from "@/lib/erp";

const STATUSES: Order["status"][] = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "shipped", "completed", "cancelled", "refunded"];
const PAYMENT_STATUSES: Order["payment_status"][] = ["pending", "authorized", "paid", "failed", "partially_refunded", "refunded"];

type Props = {
  /** Fixed channel (the Sales Channels pages); omitted = all channels with a channel filter. */
  channel?: Channel;
};

/** The orders list: filters + table. Used by Orders (all channels) and each Sales Channel page. */
export function OrdersView({ channel }: Props) {
  const router = useRouter();
  const { branchId, branches } = useActiveBranch();
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [search, setSearch] = useState("");

  const effectiveChannel = channel ?? (channelFilter || undefined);
  const path = `/api/v1/orders${qs({ channel: effectiveChannel, status, payment_status: paymentStatus, branch_id: branchId, q: search, limit: 200 })}`;
  const orders = useErpQuery<Order[]>(path);
  const customers = useErpQuery<Customer[]>("/api/v1/customers?limit=200");

  const customerName = useMemo(() => new Map((customers.data ?? []).map((c) => [c.id, c.name])), [customers.data]);
  const branchCode = useMemo(() => new Map(branches.map((b) => [b.id, b.branch_code])), [branches]);

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      { header: "Order", cell: ({ row }) => <span className="font-semibold text-ink-900">{row.original.order_number}</span> },
      ...(channel ? [] : [{ header: "Channel", cell: ({ row }: { row: { original: Order } }) => <ChannelBadge channel={row.original.channel} /> } as ColumnDef<Order, unknown>]),
      { header: "Branch", cell: ({ row }) => branchCode.get(row.original.branch_id) ?? `#${row.original.branch_id}` },
      { header: "Customer", cell: ({ row }) => (row.original.customer_id ? customerName.get(row.original.customer_id) ?? `#${row.original.customer_id}` : <span className="text-ink-400">Walk-in</span>) },
      { header: "Total", cell: ({ row }) => <span className="font-medium">{formatMoney(row.original.total_minor, row.original.currency)}</span> },
      { header: "Payment", cell: ({ row }) => <PaymentStatusBadge status={row.original.payment_status} /> },
      { header: "Status", cell: ({ row }) => <OrderStatusBadge status={row.original.status} /> },
      { header: "Placed", cell: ({ row }) => <span className="text-ink-600">{formatDateTime(row.original.placed_at)}</span> },
    ],
    [channel, branchCode, customerName],
  );

  return (
    <>
      <Card className="mb-space-4 flex flex-wrap items-center gap-space-3 p-space-3">
        <Input placeholder="Search order number…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" aria-label="Search orders" />
        {!channel && (
          <Select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="w-44" aria-label="Channel">
            <option value="">All channels</option>
            {CHANNEL_ORDER.map((c) => (
              <option key={c} value={c}>{CHANNELS[c].label}</option>
            ))}
          </Select>
        )}
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44" aria-label="Order status">
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
        <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-48" aria-label="Payment status">
          <option value="">Any payment</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
      </Card>

      {orders.error && <p className="mb-space-3 text-[13px] font-medium text-error">{orders.error}</p>}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={orders.data ?? []}
          getRowId={(o) => String(o.id)}
          onRowClick={(o) => router.push(`/portal/orders/${o.id}`)}
          loading={orders.loading} emptyMessage={orders.loading ? "Loading orders…" : "No orders match these filters."}
        />
      </Card>
    </>
  );
}
