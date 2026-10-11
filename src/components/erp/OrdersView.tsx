"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ChannelBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/erp/StatusBadges";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useOrderList } from "@/hooks/useOrders";
import { useActiveBranch } from "@/lib/branch";
import {
  CHANNELS,
  CHANNEL_ORDER,
  formatDateTime,
  formatMoney,
  humanize,
  type Order,
} from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";

const STATUSES: Order["status"][] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
];
const PAYMENT_STATUSES: Order["payment_status"][] = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "partially_refunded",
  "refunded",
];

type Props = {
  /** Channel the filter starts on (from the page's ?channel= link); omitted = all channels. */
  initialChannel?: string;
};

/** The orders list: filters + table. Orders from every channel live here; the channel is a filter. */
export function OrdersView({ initialChannel = "" }: Props) {
  const router = useRouter();
  const session = useStaffSession();
  const canUpdate = hasPermission(session, "orders", "write");
  const { branchId, branches } = useActiveBranch();
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [channelFilter, setChannelFilter] = useState(initialChannel);
  const [search, setSearch] = useState("");

  const q = useDebounced(search.trim());
  // paged on the server (newest first); each row carries its customer's name
  const orders = useOrderList({
    channel: channelFilter,
    status,
    payment_status: paymentStatus,
    branch_id: branchId,
    q,
  });
  const branchCode = useMemo(
    () => new Map(branches.map((b) => [b.id, b.branch_code])),
    [branches],
  );

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        header: "Order",
        cell: ({ row }) => (
          <span className="font-semibold text-ink-900">
            {row.original.order_number}
          </span>
        ),
      },
      {
        header: "Channel",
        cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
      },
      {
        header: "Branch",
        cell: ({ row }) =>
          branchCode.get(row.original.branch_id) ??
          `#${row.original.branch_id}`,
      },
      {
        header: "Customer",
        cell: ({ row }) =>
          row.original.customer_id ? (
            row.original.customer_name || `#${row.original.customer_id}`
          ) : (
            <span className="text-ink-400">Walk-in</span>
          ),
      },
      {
        header: "Total",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatMoney(row.original.total_minor, row.original.currency)}
          </span>
        ),
      },
      {
        header: "Payment",
        cell: ({ row }) => (
          <PaymentStatusBadge status={row.original.payment_status} />
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        header: "Placed",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDateTime(row.original.placed_at)}
          </span>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${row.original.order_number}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-600 hover:bg-black/[0.04] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <MoreHorizontal size={20} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/portal/orders/${row.original.id}`)
                  }
                >
                  <Eye size={16} /> View
                </DropdownMenuItem>
                {canUpdate && (
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/portal/orders/${row.original.id}#order-actions`,
                      )
                    }
                  >
                    <Pencil size={16} /> Edit
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [branchCode, canUpdate, router],
  );

  return (
    <>
      <Card className="mb-space-4 flex flex-wrap items-center gap-space-3 p-space-3">
        <Input
          placeholder="Search order number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          aria-label="Search orders"
        />
        <Select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="w-44"
          aria-label="Channel"
        >
          <option value="">All channels</option>
          {CHANNEL_ORDER.map((c) => (
            <option key={c} value={c}>
              {CHANNELS[c].label}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
          aria-label="Order status"
        >
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <Select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          className="w-48"
          aria-label="Payment status"
        >
          <option value="">Any payment</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </Card>

      {orders.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {orders.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={orders.rows}
          getRowId={(o) => String(o.id)}
          paginate={false}
          onRowClick={(o) => router.push(`/portal/orders/${o.id}`)}
          loading={orders.isFetching}
          emptyMessage={
            orders.isLoading
              ? "Loading orders…"
              : "No orders match these filters."
          }
        />
        <CursorPager {...orders.pager} />
      </Card>
    </>
  );
}
