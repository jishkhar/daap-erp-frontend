"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { AccountPanel } from "@/components/erp/wholesale/AccountPanel";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useReceipts, useReceivables } from "@/hooks/useWholesale";
import { formatDateTime, formatMoney } from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";
import {
  AGING_BUCKETS,
  AGING_LABEL,
  RECEIPT_METHOD_LABEL,
  type Receipt,
  type Receivables,
} from "@/lib/wholesale";

type Row = Receivables["customers"][number];

/** What each business customer owes, aged from each invoice's due date. Click a customer for their statement and to record a payment. */
export function ReceivablesTab({ currency }: { currency: string }) {
  const data = useReceivables();
  const [open, setOpen] = useState<string | null>(null);
  const r = data.data;
  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.legal_name}
            </p>
            <p className="text-[12px] text-ink-400">
              {row.original.account_code} · {row.original.invoices} invoice
              {row.original.invoices === 1 ? "" : "s"}
            </p>
          </div>
        ),
      },
      ...AGING_BUCKETS.map((b) => ({
        header: AGING_LABEL[b],
        cell: ({ row }: { row: { original: Row } }) =>
          row.original.buckets[b] ? (
            <span className={b === "not_due" ? "" : "font-medium text-error"}>
              {formatMoney(row.original.buckets[b], currency)}
            </span>
          ) : (
            <span className="text-ink-400">—</span>
          ),
      })),
      {
        header: "Total owed",
        cell: ({ row }) => (
          <span className="font-semibold">
            {formatMoney(row.original.outstanding_minor, currency)}
          </span>
        ),
      },
    ],
    [currency],
  );
  return (
    <>
      {data.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {data.error.message}
        </p>
      )}
      {!r && !data.error && <SkeletonLines rows={4} />}
      {r && (
        <>
          <div className="mb-space-4 grid grid-cols-2 gap-space-3 sm:grid-cols-3">
            {[
              ["Owed to you", formatMoney(r.total_minor, currency), ""],
              [
                "Overdue",
                formatMoney(r.overdue_minor, currency),
                r.overdue_minor ? "text-error" : "",
              ],
              ["Customers owing", String(r.customers.length), ""],
            ].map(([label, value, tone]) => (
              <Card key={label} className="p-space-3">
                <p className="text-label">{label}</p>
                <p
                  className={`text-[20px] font-bold ${tone || "text-ink-900"}`}
                >
                  {value}
                </p>
              </Card>
            ))}
          </div>
          <Card className="p-space-2">
            <DataTable
              columns={columns}
              data={r.customers}
              getRowId={(c) => c.customer_account_id}
              onRowClick={(c) => setOpen(c.customer_account_id)}
              emptyMessage="No business customer owes you anything."
            />
          </Card>
          <p className="mt-space-2 text-[12px] text-ink-400">
            As of {r.as_of}. Late = past the invoice&apos;s due date (issue date
            plus the customer&apos;s credit days).
          </p>
        </>
      )}
      <AccountPanel
        accountId={open}
        currency={currency}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

/** Every payment received from business customers, newest first. */
export function ReceiptsTab({ currency }: { currency: string }) {
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const receipts = useReceipts({ q: query || undefined });
  const [open, setOpen] = useState<string | null>(null);
  const columns: ColumnDef<Receipt, unknown>[] = [
    {
      header: "Receipt",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-ink-900">
            {row.original.receipt_number}
          </p>
          <p className="text-[12px] text-ink-400">{row.original.received_on}</p>
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
          </p>
        </div>
      ),
    },
    {
      header: "How",
      cell: ({ row }) => (
        <span>
          {RECEIPT_METHOD_LABEL[row.original.method]}
          {row.original.reference && (
            <span className="text-ink-400"> · {row.original.reference}</span>
          )}
        </span>
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
      header: "Kept as credit",
      cell: ({ row }) =>
        row.original.advance_minor ? (
          formatMoney(row.original.advance_minor, currency)
        ) : (
          <span className="text-ink-400">—</span>
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
  ];
  return (
    <>
      <Card className="mb-space-4 p-space-3">
        <Input
          aria-label="Search payments"
          placeholder="Search receipt number, customer or reference…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full md:w-80"
        />
      </Card>
      {receipts.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {receipts.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={receipts.rows}
          getRowId={(r) => r.id}
          onRowClick={(r) => setOpen(r.customer_account_id)}
          paginate={false}
          loading={receipts.isFetching}
          emptyMessage={
            receipts.isLoading ? "Loading…" : "No payments recorded yet."
          }
        />
        <CursorPager {...receipts.pager} />
      </Card>
      <AccountPanel
        accountId={open}
        currency={currency}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
