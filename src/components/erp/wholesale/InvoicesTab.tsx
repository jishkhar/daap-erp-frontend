"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useWholesaleInvoices } from "@/hooks/useWholesale";
import { useActiveBranch } from "@/lib/branch";
import { formatDateTime, formatMoney } from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";
import {
  INVOICE_STATE_LABEL,
  INVOICE_STATE_TONE,
  type InvoiceState,
  type WholesaleInvoice,
} from "@/lib/wholesale";

/** Every wholesale sale, newest first: dispatches against sales orders and business bills made at a till. Paid in full, part paid or
 * on credit, each shows what was billed, paid and is still owed. They are kept off the retail Orders page; a row opens the order
 * (invoice, payments, returns). */
export function InvoicesTab({ currency }: { currency: string }) {
  const router = useRouter();
  const { branchId } = useActiveBranch();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const invoices = useWholesaleInvoices({
    status: status || undefined,
    branch_id: branchId,
    q: query || undefined,
  });

  const columns = useMemo<ColumnDef<WholesaleInvoice, unknown>[]>(
    () => [
      {
        header: "Invoice",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.invoice_number ?? row.original.order_number}
            </p>
            <p className="text-[12px] text-ink-400">
              {formatDateTime(row.original.placed_at)}
            </p>
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
        header: "From",
        cell: ({ row }) => (
          <div>
            <p className="text-ink-900">
              {row.original.so_number ?? "Counter bill"}
            </p>
            <p className="text-[12px] text-ink-400">
              {row.original.branch_name}
            </p>
          </div>
        ),
      },
      {
        header: "Total",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatMoney(row.original.total_minor, currency)}
          </span>
        ),
      },
      {
        header: "Paid",
        cell: ({ row }) => formatMoney(row.original.paid_minor, currency),
      },
      {
        header: "Owed",
        cell: ({ row }) =>
          row.original.balance_minor > 0 ? (
            <span className="font-medium">
              {formatMoney(row.original.balance_minor, currency)}
            </span>
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        header: "Due",
        cell: ({ row }) =>
          row.original.balance_minor > 0 && row.original.due_date ? (
            row.original.due_date
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={INVOICE_STATE_TONE[row.original.payment_state]}>
            {INVOICE_STATE_LABEL[row.original.payment_state]}
          </Badge>
        ),
      },
    ],
    [currency],
  );

  return (
    <>
      <Card className="mb-space-4 flex flex-wrap items-center gap-space-3 p-space-3">
        <Input
          aria-label="Search invoices"
          placeholder="Search invoice, customer or their PO…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-72"
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
        >
          <option value="">Any status</option>
          {(Object.keys(INVOICE_STATE_LABEL) as InvoiceState[]).map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATE_LABEL[s]}
            </option>
          ))}
        </Select>
      </Card>
      {invoices.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {invoices.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={invoices.rows}
          getRowId={(i) => i.id}
          onRowClick={(i) => router.push(`/portal/orders/${i.id}`)}
          paginate={false}
          loading={invoices.isFetching}
          emptyMessage={
            invoices.isLoading
              ? "Loading…"
              : query || status
                ? "No invoice matches."
                : "No wholesale invoices yet. Each dispatch of a sales order, and each business bill at a till, shows here."
          }
        />
        <CursorPager {...invoices.pager} />
      </Card>
    </>
  );
}
