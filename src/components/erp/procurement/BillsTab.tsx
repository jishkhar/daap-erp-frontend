"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PayPurchaseOrder } from "@/components/erp/procurement/PayBillsModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useSupplierBills, useSupplierPayments } from "@/hooks/useProcurement";
import { useActiveBranch } from "@/lib/branch";
import { formatDateTime, formatMoney } from "@/lib/erp";
import {
  BILL_STATE_LABEL,
  BILL_STATE_TONE,
  SUPPLIER_PAYMENT_METHOD_LABEL,
  billName,
  type BillState,
  type SupplierBill,
  type SupplierPayment,
} from "@/lib/procurement";
import { hasGrantAt, useStaffSession } from "@/lib/staffAuth";
import { useDebounced } from "@/lib/useDebounced";

/** Every supplier bill (goods receipt), newest first: what it came to, what is paid and still owed, when it is due. A row opens its
 * purchase order; Pay pays that bill. */
export function BillsTab({ currency }: { currency: string }) {
  const router = useRouter();
  const session = useStaffSession();
  const { branchId } = useActiveBranch();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const bills = useSupplierBills({
    status: status || undefined,
    branch_id: branchId,
    q: query || undefined,
  });
  const [paying, setPaying] = useState<SupplierBill | null>(null);

  const columns = useMemo<ColumnDef<SupplierBill, unknown>[]>(
    () => [
      {
        header: "Bill",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.supplier_invoice_number ?? row.original.grn_number}
            </p>
            <p className="text-[12px] text-ink-400">
              {row.original.supplier_invoice_number
                ? `${row.original.grn_number} · `
                : ""}
              {formatDateTime(row.original.received_at)}
            </p>
          </div>
        ),
      },
      {
        header: "Supplier",
        cell: ({ row }) => (
          <div>
            <p className="text-ink-900">{row.original.supplier_name}</p>
            <p className="text-[12px] text-ink-400">
              {row.original.po_number}
              {row.original.branch_code ? ` · ${row.original.branch_code}` : ""}
            </p>
          </div>
        ),
      },
      {
        header: "Total",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatMoney(
              row.original.total_minor - row.original.returned_minor,
              currency,
            )}
          </span>
        ),
      },
      {
        header: "Paid",
        cell: ({ row }) => formatMoney(row.original.paid_minor, currency),
      },
      {
        header: "We owe",
        cell: ({ row }) =>
          row.original.owed_minor > 0 ? (
            <span className="font-medium">
              {formatMoney(row.original.owed_minor, currency)}
            </span>
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        header: "Due",
        cell: ({ row }) =>
          row.original.owed_minor > 0 ? (
            row.original.due_date
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={BILL_STATE_TONE[row.original.payment_state]}>
            {BILL_STATE_LABEL[row.original.payment_state]}
          </Badge>
        ),
      },
      {
        header: "",
        id: "pay",
        cell: ({ row }) =>
          row.original.owed_minor > 0 &&
          hasGrantAt(session, "procurement:pay", row.original.branch_id) ? (
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setPaying(row.original);
              }}
            >
              <Wallet size={14} /> Pay
            </Button>
          ) : null,
      },
    ],
    [currency, session],
  );

  return (
    <>
      <Card className="mb-space-4 flex flex-wrap items-center gap-space-3 p-space-3">
        <Input
          aria-label="Search bills"
          placeholder="Search bill, receipt, PO or supplier…"
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
          {(Object.keys(BILL_STATE_LABEL) as BillState[]).map((s) => (
            <option key={s} value={s}>
              {BILL_STATE_LABEL[s]}
            </option>
          ))}
        </Select>
      </Card>
      {bills.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {bills.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={bills.rows}
          getRowId={(b) => b.id}
          onRowClick={(b) =>
            router.push(`/portal/procurement/orders/${b.po_id}`)
          }
          paginate={false}
          loading={bills.isFetching}
          emptyMessage={
            bills.isLoading
              ? "Loading…"
              : query || status
                ? "No bill matches."
                : "No supplier bills yet. Each goods receipt shows here as the supplier's bill."
          }
        />
        <CursorPager {...bills.pager} />
      </Card>
      {paying && (
        <PayPurchaseOrder
          poId={paying.po_id}
          grnId={paying.id}
          currency={currency}
          onClose={() => setPaying(null)}
        />
      )}
    </>
  );
}

/** Every payment made to suppliers, newest first, with the bills it paid. */
export function SupplierPaymentsTab({ currency }: { currency: string }) {
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const payments = useSupplierPayments({ q: query || undefined });

  const columns = useMemo<ColumnDef<SupplierPayment, unknown>[]>(
    () => [
      {
        header: "Payment",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.payment_number}
            </p>
            <p className="text-[12px] text-ink-400">{row.original.paid_on}</p>
          </div>
        ),
      },
      {
        header: "Supplier",
        cell: ({ row }) => (
          <div>
            <p className="text-ink-900">{row.original.supplier_name}</p>
            <p className="text-[12px] text-ink-400">
              {row.original.supplier_code}
            </p>
          </div>
        ),
      },
      {
        header: "How",
        cell: ({ row }) => (
          <span>
            {SUPPLIER_PAYMENT_METHOD_LABEL[row.original.method]}
            {row.original.reference && (
              <span className="text-ink-400"> · {row.original.reference}</span>
            )}
          </span>
        ),
      },
      {
        header: "Paid for",
        cell: ({ row }) =>
          row.original.allocations.length === 0 ? (
            <span className="text-ink-400">Not against a bill</span>
          ) : (
            <div className="text-[12.5px]">
              {row.original.allocations.map((a) => (
                <p key={a.grn_id}>
                  {billName(a)} · {a.po_number}:{" "}
                  {formatMoney(a.amount_minor, currency)}
                </p>
              ))}
            </div>
          ),
      },
      {
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatMoney(row.original.amount_minor, currency)}
          </span>
        ),
      },
      {
        header: "Recorded",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
    ],
    [currency],
  );

  return (
    <>
      <Card className="mb-space-4 p-space-3">
        <Input
          aria-label="Search payments"
          placeholder="Search payment number, reference or supplier…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-80"
        />
      </Card>
      {payments.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {payments.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={payments.rows}
          getRowId={(p) => p.id}
          paginate={false}
          loading={payments.isFetching}
          emptyMessage={
            payments.isLoading ? "Loading…" : "No payments to suppliers yet."
          }
        />
        <CursorPager {...payments.pager} />
      </Card>
    </>
  );
}
