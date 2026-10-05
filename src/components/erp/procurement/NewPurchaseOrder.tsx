"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { erp, formatMoney, toMinor, useErpQuery, type Product, type PurchaseOrder, type Supplier } from "@/lib/erp";
import { useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Row = { variant_id: string; quantity: string; cost: string };
const EMPTY_ROW: Row = { variant_id: "", quantity: "", cost: "" };

/** Create a purchase order: pick supplier and receiving branch, add lines at their negotiated cost, optionally note freight. */
export function NewPurchaseOrder({ open, onClose, onCreated, currency }: { open: boolean; onClose: () => void; onCreated: (po: PurchaseOrder) => void; currency: string }) {
  const session = useStaffSession();
  const suppliers = useErpQuery<Supplier[]>(open ? "/api/v1/suppliers" : null);
  const products = useErpQuery<Product[]>(open ? "/api/v1/products?limit=500" : null);
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }]);
  const [freight, setFreight] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const branches = session?.branches ?? [];
  const lineTotal = rows.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0) * (toMinor(r.cost) ?? 0), 0);
  const valid = supplierId && (branchId || branches.length === 1) && rows.every((r) => r.variant_id && parseInt(r.quantity, 10) > 0 && toMinor(r.cost) !== null) && rows.length > 0;
  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function submit() {
    setBusy(true);
    const res = await erp<PurchaseOrder>("/api/v1/purchase-orders", "POST", {
      supplier_id: supplierId, branch_id: branchId || branches[0]?.id,
      lines: rows.map((r) => ({ variant_id: r.variant_id, quantity: parseInt(r.quantity, 10), unit_cost_minor: toMinor(r.cost) })),
      additional_costs_minor: freight ? toMinor(freight) ?? 0 : 0, notes: notes.trim() || null,
    });
    setBusy(false);
    if (res.error || !res.data) return toast.error("Couldn't create the purchase order", res.error ?? undefined);
    toast.success(`${res.data.po_number} created`);
    setRows([{ ...EMPTY_ROW }]); setFreight(""); setNotes(""); setSupplierId("");
    onCreated(res.data);
  }

  return (
    <Modal open={open} onClose={onClose} width="lg" title="New purchase order" description="Costs are before GST; tax comes from each product's tax slab."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={busy || !valid} onClick={submit}>Create purchase order</Button></>}>
      <div className="grid gap-x-space-4 sm:grid-cols-2">
        <Field label="Supplier" htmlFor="po_sup" required>
          <Select id="po_sup" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Choose a supplier…</option>
            {(suppliers.data ?? []).filter((s) => s.status === "active").map((s) => <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>)}
          </Select>
        </Field>
        <Field label="Deliver to branch" htmlFor="po_branch" required>
          <Select id="po_branch" value={branchId || (branches.length === 1 ? String(branches[0].id) : "")} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Choose a branch…</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}
          </Select>
        </Field>
      </div>
      <p className="text-label mb-space-2">Items</p>
      <div className="space-y-space-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_130px_36px] items-center gap-space-2">
            <Select aria-label="Product" value={r.variant_id} onChange={(e) => setRow(i, { variant_id: e.target.value })}>
              <option value="">Product…</option>
              {(products.data ?? []).filter((p) => !rows.some((o, j) => j !== i && o.variant_id === String(p.id))).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
            </Select>
            <Input aria-label="Quantity" inputMode="numeric" placeholder="Qty" value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} />
            <Input aria-label="Unit cost" inputMode="decimal" placeholder={`Cost (${currency})`} value={r.cost} onChange={(e) => setRow(i, { cost: e.target.value })} />
            <button type="button" aria-label="Remove line" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-md text-ink-400 hover:bg-black/[0.04] hover:text-error disabled:opacity-30"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <Button variant="ghost" className="mt-space-2" onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW }])}><Plus size={15} /> Add item</Button>
      <div className="mt-space-3 grid gap-x-space-4 sm:grid-cols-2">
        <Field label={`Expected freight / duty (${currency})`} htmlFor="po_freight" hint="Spread across the items at receipt as landed cost."><Input id="po_freight" inputMode="decimal" value={freight} onChange={(e) => setFreight(e.target.value)} /></Field>
        <Field label="Notes" htmlFor="po_notes"><Input id="po_notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
      <p className="text-right text-[13.5px] text-ink-600">Items total (before tax): <strong className="text-ink-900">{formatMoney(lineTotal, currency)}</strong></p>
    </Modal>
  );
}
