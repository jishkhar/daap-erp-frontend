"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewSalesOrder } from "@/components/erp/wholesale/NewSalesOrder";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useSalesOrders } from "@/hooks/useWholesale";
import { useActiveBranch } from "@/lib/branch";
import { formatDateTime, formatMoney } from "@/lib/erp";
import { hasGrant, useStaffSession } from "@/lib/staffAuth";
import { useDebounced } from "@/lib/useDebounced";
import {
  SO_STATUS_LABEL,
  SO_STATUS_TONE,
  soNumber,
  type SalesOrderRow,
  type SoStatus,
} from "@/lib/wholesale";

/** Quotations and sales orders, newest first, with the buttons to start a new one. */
export function SalesOrdersTab({ currency }: { currency: string }) {
  const router = useRouter();
  const session = useStaffSession();
  const { branchId } = useActiveBranch();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const orders = useSalesOrders({
    status: status || undefined,
    branch_id: branchId,
    q: query || undefined,
  });
  const [creating, setCreating] = useState<"quotation" | "order" | null>(null);
  const canCreate = hasGrant(session, "wholesale:create");

  const columns = useMemo<ColumnDef<SalesOrderRow, unknown>[]>(
    () => [
      {
        header: "Number",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {soNumber(row.original)}
            </p>
            {row.original.so_number && row.original.quote_number && (
              <p className="text-[12px] text-ink-400">
                from {row.original.quote_number}
              </p>
            )}
          </div>
        ),
      },
      {
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <p className="text-ink-900">{row.original.legal_name}</p>
            <p className="text-[12px] text-ink-400">
              {row.original.account_code}
              {row.original.customer_po_ref
                ? ` · PO ${row.original.customer_po_ref}`
                : ""}
            </p>
          </div>
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
        header: "Sent",
        cell: ({ row }) =>
          row.original.so_number ? (
            `${row.original.dispatched_units} / ${row.original.units}`
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            <Badge tone={SO_STATUS_TONE[row.original.status]}>
              {SO_STATUS_LABEL[row.original.status]}
            </Badge>
            {row.original.expired && <Badge tone="error">Expired</Badge>}
          </span>
        ),
      },
      {
        header: "Created",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <Card className="mb-space-4 flex flex-wrap items-center gap-space-3 p-space-3">
        <Input
          aria-label="Search sales orders"
          placeholder="Search number, customer or their PO…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-72"
        />
        <Select
          aria-label="Status"
          value={status}
          onValueChange={(value) => setStatus(value)}
          className="w-52"
        >
          <option value="">Any status</option>
          <option value="OPEN">To dispatch</option>
          {(Object.keys(SO_STATUS_LABEL) as SoStatus[]).map((s) => (
            <option key={s} value={s}>
              {SO_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        {canCreate && (
          <div className="mobile-page-actions ml-auto flex gap-space-2">
            <Button
              variant="secondary"
              onClick={() => setCreating("quotation")}
            >
              <FileText size={16} /> New quotation
            </Button>
            <Button onClick={() => setCreating("order")}>
              <Plus size={16} /> New sales order
            </Button>
          </div>
        )}
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
          getRowId={(o) => o.id}
          onRowClick={(o) => router.push(`/portal/wholesale/orders/${o.id}`)}
          paginate={false}
          loading={orders.isFetching}
          emptyMessage={
            orders.isLoading
              ? "Loading…"
              : query || status
                ? "No order matches."
                : "No quotations or sales orders yet."
          }
        />
        <CursorPager {...orders.pager} />
      </Card>
      {creating && (
        <NewSalesOrder
          open
          kind={creating}
          currency={currency}
          onClose={() => setCreating(null)}
          onCreated={(so) => {
            setCreating(null);
            router.push(`/portal/wholesale/orders/${so.id}`);
          }}
        />
      )}
    </>
  );
}
