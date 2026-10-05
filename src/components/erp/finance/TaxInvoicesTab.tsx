"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime, formatMoney, useErpQuery, type TaxDocument } from "@/lib/erp";

/** GST tax invoices and credit notes, with a printable view. */
export function TaxInvoicesTab({ currency }: { currency: string }) {
  const docs = useErpQuery<TaxDocument[]>("/api/v1/finance/tax-documents?limit=200");
  const [open, setOpen] = useState<TaxDocument | null>(null);
  const m = (v: number) => formatMoney(v, currency);

  const columns = useMemo<ColumnDef<TaxDocument, unknown>[]>(() => [
    { header: "Number", cell: ({ row }) => <span className="font-semibold text-ink-900">{row.original.doc_number}</span> },
    { header: "Type", cell: ({ row }) => <Badge tone={row.original.doc_type === "INVOICE" ? "success" : "clay"}>{row.original.doc_type === "INVOICE" ? "Invoice" : "Credit note"}</Badge> },
    { header: "Order", cell: ({ row }) => row.original.order_number ?? `#${row.original.order_id}` },
    { header: "Customer", cell: ({ row }) => row.original.customer_name ?? <span className="text-ink-400">Walk-in</span> },
    { header: "Taxable", cell: ({ row }) => m(row.original.taxable_minor) },
    { header: "GST", cell: ({ row }) => m(row.original.cgst_minor + row.original.sgst_minor + row.original.igst_minor) },
    { header: "Total", cell: ({ row }) => <span className="font-medium">{m(row.original.total_minor)}</span> },
    { header: "Issued", cell: ({ row }) => <span className="text-ink-600">{formatDateTime(row.original.issued_at)}</span> },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [currency]);

  return (
    <>
      {docs.error && <p className="mb-space-3 text-[13px] font-medium text-error">{docs.error}</p>}
      <Card className="p-space-2"><DataTable columns={columns} data={docs.data ?? []} getRowId={(d) => String(d.id)} onRowClick={setOpen} emptyMessage={docs.loading ? "Loading…" : "No tax documents yet — one is issued when goods are delivered."} /></Card>
      <Modal open={open !== null} onClose={() => setOpen(null)} width="lg" title={open ? `${open.doc_type === "INVOICE" ? "Tax invoice" : "Credit note"} ${open.doc_number}` : ""}
        footer={<Button variant="secondary" onClick={() => window.print()}><Printer size={15} /> Print</Button>}>
        {open && (
          <div className="text-[13.5px]">
            <div className="mb-space-3 grid grid-cols-2 gap-space-3">
              <div><p className="text-[12px] text-ink-400">Billed to</p><p className="font-semibold text-ink-900">{open.customer_name ?? "Walk-in customer"}</p>{open.customer_gstin && <p className="text-ink-600">GSTIN {open.customer_gstin}</p>}</div>
              <div className="text-right"><p className="text-[12px] text-ink-400">Place of supply</p><p className="font-medium">{open.place_of_supply ?? "—"} ({open.supply_type === "INTER" ? "inter-state" : "intra-state"})</p></div>
            </div>
            <table className="w-full"><thead><tr className="border-b border-line text-left text-[12px] text-ink-400"><th className="py-1">Item</th><th>HSN</th><th className="text-right">Qty</th><th className="text-right">Taxable</th><th className="text-right">GST</th></tr></thead>
              <tbody>{open.lines.map((l, i) => <tr key={i} className="border-b border-line"><td className="py-1.5">{l.name}<span className="block text-[11.5px] text-ink-400">{l.sku}</span></td><td>{l.hsn ?? "—"}</td><td className="text-right">{l.quantity}</td><td className="text-right">{m(l.taxable_minor)}</td><td className="text-right">{m(l.tax_minor)} <span className="text-ink-400">({l.tax_rate_bps / 100}%)</span></td></tr>)}</tbody></table>
            <div className="mt-space-3 ml-auto max-w-xs space-y-1">
              <div className="flex justify-between"><span className="text-ink-600">Taxable value</span><span>{m(open.taxable_minor)}</span></div>
              {open.supply_type === "INTRA" ? <><div className="flex justify-between"><span className="text-ink-600">CGST</span><span>{m(open.cgst_minor)}</span></div><div className="flex justify-between"><span className="text-ink-600">SGST</span><span>{m(open.sgst_minor)}</span></div></> : <div className="flex justify-between"><span className="text-ink-600">IGST</span><span>{m(open.igst_minor)}</span></div>}
              <div className="flex justify-between border-t border-line pt-1 text-[15px] font-bold"><span>Total</span><span>{m(open.total_minor)}</span></div>
            </div>
            {open.reason && <p className="mt-space-3 text-ink-600">Reason: {open.reason}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
