"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Copy, PackagePlus, Package, Pencil, PackageOpen } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileUploadIcon, Download04Icon } from "@hugeicons/core-free-icons";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { erp, erpUpload, formatMoney, fromMinor, humanize, qs, toMinor, useErpQuery, type Product, type StockSummary, type TaxRule } from "@/lib/erp";
import { activeBranches, hasPermission, useStaffSession } from "@/lib/staffAuth";
import { useActiveBranch } from "@/lib/branch";
import { toast } from "@/lib/toast";
import { BARCODE_SPECS, BARCODE_TYPES, inferBarcodeType, sanitizeBarcode, validateBarcode, type BarcodeType } from "@/lib/barcode";

const LIFECYCLE_TONE = { draft: "warning", active: "success", discontinued: "neutral", archived: "neutral" } as const;

type Draft = { id?: string; sku: string; name: string; variant_name: string; description: string; price: string; mrp: string; cost: string; tax_code: string; serialization_type: string; barcode: string; barcode_type: BarcodeType; lifecycle_status: string };
const EMPTY: Draft = { sku: "", name: "", variant_name: "", description: "", price: "", mrp: "", cost: "", tax_code: "", serialization_type: "NONE", barcode: "", barcode_type: "EAN_13", lifecycle_status: "active" };

type ImportResult = { total: number; created: number; failed: number; errors: { row: number; sku: string | null; error: string }[] };

export default function ProductsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const [search, setSearch] = useState("");
  const products = useErpQuery<Product[]>(`/api/v1/products${qs({ q: search, limit: 500 })}`);
  const { branchId: activeBranch } = useActiveBranch();
  // "All branches" shows the consolidated total; a chosen branch shows only that branch's stock.
  const stock = useErpQuery<StockSummary[]>(activeBranch ? `/api/v1/inventory${qs({ branch_id: activeBranch, limit: 1000 })}` : "/api/v1/inventory/consolidated");
  const taxes = useErpQuery<TaxRule[]>("/api/v1/tax-rules");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [receiving, setReceiving] = useState<Product | null>(null);
  const [variantOf, setVariantOf] = useState<Product | null>(null);
  const [variant, setVariant] = useState({ sku: "", name: "", price: "" });
  const [recvBranch, setRecvBranch] = useState("");
  const [recvQty, setRecvQty] = useState("");
  const [recvSerials, setRecvSerials] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const canWrite = hasPermission(session, "products", "write");
  const canReceive = !!session && Object.keys(session.permissions).includes("inventory:receive");
  const stockBy = useMemo(() => new Map((stock.data ?? []).map((s) => [s.variant_id, s])), [stock.data]);
  const cur = tenant?.currency ?? "INR";

  const columns = useMemo<ColumnDef<Product, unknown>[]>(() => [
    { header: "Product", cell: ({ row }) => (<div><p className="font-semibold text-ink-900">{row.original.name}</p><p className="text-[12px] text-ink-400">{row.original.sku}{row.original.serialization_type !== "NONE" && <> · tracked by {row.original.serialization_type === "IMEI" ? "IMEI" : "serial no."}</>}</p></div>) },
    { header: "Price", cell: ({ row }) => <span className="font-medium">{formatMoney(row.original.price_minor, cur)}</span> },
    { header: "Tax", cell: ({ row }) => row.original.tax_code ?? <span className="text-ink-400">—</span> },
    { header: "In stock", cell: ({ row }) => { const s = stockBy.get(row.original.id); return s ? <span><strong>{s.available_qty}</strong>{s.reserved_qty > 0 && <span className="text-ink-400"> (+{s.reserved_qty} reserved)</span>}</span> : <span className="text-ink-400">0</span>; } },
    { header: "Status", cell: ({ row }) => <Badge tone={LIFECYCLE_TONE[row.original.lifecycle_status]}>{row.original.lifecycle_status}</Badge> },
    { header: "", id: "actions", cell: ({ row }) => (
      <div className="flex justify-end gap-space-1">
        {canReceive && row.original.lifecycle_status !== "archived" && <Button variant="ghost" aria-label={`Receive stock for ${row.original.name}`} onClick={() => { setReceiving(row.original); setRecvBranch(String(activeBranches(session)[0]?.id ?? "")); setRecvQty(""); setRecvSerials(""); }}><PackageOpen size={16} /> Receive</Button>}
        {canWrite && row.original.lifecycle_status !== "archived" && <Button variant="ghost" aria-label={`Add a variant of ${row.original.name}`} onClick={() => { setVariantOf(row.original); setVariant({ sku: "", name: "", price: fromMinor(row.original.price_minor) }); }}><Copy size={15} /> Variant</Button>}
        {canWrite && <Button variant="ghost" aria-label={`Edit ${row.original.name}`} onClick={() => setDraft({ id: row.original.id, sku: row.original.sku, name: row.original.product_name, variant_name: row.original.variant_name === "Default" ? "" : row.original.variant_name, description: row.original.description ?? "", price: fromMinor(row.original.price_minor), mrp: fromMinor(row.original.mrp_minor), cost: fromMinor(row.original.cost_minor), tax_code: row.original.tax_code ?? "", serialization_type: row.original.serialization_type, barcode: row.original.barcode ?? "", barcode_type: inferBarcodeType(row.original.barcode), lifecycle_status: row.original.lifecycle_status })}><Pencil size={15} /> Edit</Button>}
      </div>) },
  ], [cur, stockBy, canReceive, canWrite, session]);

  if (!ready) return null;

  async function save() {
    if (!draft) return;
    const price = toMinor(draft.price);
    if (price === null) return toast.error("Enter a valid price", "e.g. 1299.00");
    const mrp = draft.mrp ? toMinor(draft.mrp) : null;
    const cost = draft.cost ? toMinor(draft.cost) : null;
    if ((draft.mrp && mrp === null) || (draft.cost && cost === null)) return toast.error("Enter valid amounts for MRP and cost");
    const barcodeError = validateBarcode(draft.barcode_type, draft.barcode.trim());
    if (barcodeError) return toast.error("Check the barcode", barcodeError);
    const body = { name: draft.name.trim(), ...(draft.variant_name.trim() ? { variant_name: draft.variant_name.trim() } : {}), description: draft.description.trim() || null, price_minor: price, mrp_minor: mrp, cost_minor: cost, tax_code: draft.tax_code || null, barcode: draft.barcode.trim() || null, serialization_type: draft.serialization_type, lifecycle_status: draft.lifecycle_status };
    setBusy(true);
    const res = draft.id ? await erp(`/api/v1/products/${draft.id}`, "PATCH", body) : await erp("/api/v1/products", "POST", { sku: draft.sku.trim(), ...body });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the product", res.error);
    toast.success(draft.id ? "Product updated" : "Product created");
    setDraft(null);
    products.reload();
  }

  async function importFile(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    setImporting(true);
    let res;
    try {
      res = await erpUpload<ImportResult>("/api/v1/products/import", file);
    } finally {
      setImporting(false);
    }
    if (res.error || !res.data) return toast.error("Couldn't import the file", res.error ?? undefined);
    setImportResult(res.data);
    if (res.data.created > 0) products.reload();
  }

  async function addVariant() {
    if (!variantOf) return;
    const price = toMinor(variant.price);
    if (price === null) return toast.error("Enter a valid price", "e.g. 1299.00");
    setBusy(true);
    const res = await erp(`/api/v1/products/${variantOf.id}/variants`, "POST", { sku: variant.sku.trim(), variant_name: variant.name.trim(), price_minor: price, tax_code: variantOf.tax_code, serialization_type: variantOf.serialization_type });
    setBusy(false);
    if (res.error) return toast.error("Couldn't add the variant", res.error);
    toast.success("Variant added");
    setVariantOf(null);
    products.reload();
  }

  async function receive() {
    if (!receiving) return;
    const qty = parseInt(recvQty, 10);
    if (!qty || qty <= 0) return toast.error("Enter a quantity");
    const serials = recvSerials.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    setBusy(true);
    const res = await erp("/api/v1/inventory/receipts", "POST", { branch_id: recvBranch, lines: [{ variant_id: receiving.id, quantity: qty, ...(receiving.serialization_type !== "NONE" ? { serial_numbers: serials } : {}) }] });
    setBusy(false);
    if (res.error) return toast.error("Couldn't receive stock", res.error);
    toast.success(`${qty} unit(s) received`);
    setReceiving(null);
    stock.reload();
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <PortalShell tenant={tenant} active="products">
      <PageHeader scopedToBranch icon={<Package size={20} />} title="Products" description="The product master shared by every branch and every channel."
        actions={canWrite && (
          <div className="flex gap-space-2">
            <input ref={fileInput} type="file" accept=".csv,.xlsx" hidden onChange={(e) => importFile(e.target.files?.[0])} />
            <Button variant="ghost" disabled={importing} onClick={() => fileInput.current?.click()}><HugeiconsIcon icon={FileUploadIcon} size={16} /> {importing ? "Importing…" : "Import CSV / Excel"}</Button>
            <Button onClick={() => setDraft({ ...EMPTY })}><PackagePlus size={16} /> Add product</Button>
          </div>)} />
      <Card className="mb-space-4 p-space-3"><Input placeholder="Search by name, SKU or barcode…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" aria-label="Search products" /></Card>
      {products.error && <p className="mb-space-3 text-[13px] font-medium text-error">{products.error}</p>}
      <Card className="p-space-2"><DataTable columns={columns} data={products.data ?? []} getRowId={(p) => String(p.id)} emptyMessage={products.loading ? "Loading products…" : "No products yet."} /></Card>

      <Modal open={draft !== null} onClose={() => setDraft(null)} width="lg" title={draft?.id ? "Edit product" : "Add product"}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button disabled={busy || !draft?.name.trim() || !draft?.price || (!draft?.id && !draft?.sku.trim())} onClick={save}>{draft?.id ? "Save changes" : "Create product"}</Button></>}>
        {draft && (
          <div className="grid gap-x-space-4 sm:grid-cols-2">
            <Field label="SKU" htmlFor="p_sku" required hint={draft.id ? "SKU can't be changed." : undefined}><Input id="p_sku" value={draft.sku} disabled={!!draft.id} onChange={(e) => set({ sku: e.target.value })} /></Field>
            <Field label="Name" htmlFor="p_name" required><Input id="p_name" value={draft.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            {draft.id && <Field label="Variant" htmlFor="p_vname" hint="e.g. 128GB, Black, XL."><Input id="p_vname" value={draft.variant_name} onChange={(e) => set({ variant_name: e.target.value })} /></Field>}
            <Field label={`Selling price (${cur})`} htmlFor="p_price" required><Input id="p_price" inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value })} /></Field>
            <Field label={`MRP (${cur})`} htmlFor="p_mrp"><Input id="p_mrp" inputMode="decimal" value={draft.mrp} onChange={(e) => set({ mrp: e.target.value })} /></Field>
            <Field label={`Cost (${cur})`} htmlFor="p_cost" hint="Used to value stock transfers."><Input id="p_cost" inputMode="decimal" value={draft.cost} onChange={(e) => set({ cost: e.target.value })} /></Field>
            <Field label="Tax" htmlFor="p_tax"><Select id="p_tax" value={draft.tax_code} onChange={(e) => set({ tax_code: e.target.value })}><option value="">No tax</option>{(taxes.data ?? []).map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</Select></Field>
            <Field label="Tracking" htmlFor="p_ser" hint="IMEI / serial numbers are tracked unit by unit. Can't change once stock exists."><Select id="p_ser" value={draft.serialization_type} onChange={(e) => set({ serialization_type: e.target.value })}><option value="NONE">Counted quantity</option><option value="IMEI">IMEI (phones)</option><option value="SERIAL">Serial number</option></Select></Field>
            <Field label="Status" htmlFor="p_status"><Select id="p_status" value={draft.lifecycle_status} onChange={(e) => set({ lifecycle_status: e.target.value })}>{["draft", "active", "discontinued", "archived"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></Field>
            <Field label="Barcode type" htmlFor="p_bartype"><Select id="p_bartype" value={draft.barcode_type} onChange={(e) => { const t = e.target.value as BarcodeType; set({ barcode_type: t, barcode: sanitizeBarcode(t, draft.barcode) }); }}>{BARCODE_TYPES.map((t) => <option key={t} value={t}>{BARCODE_SPECS[t].label}</option>)}</Select></Field>
            <Field label="Barcode" htmlFor="p_bar" hint={BARCODE_SPECS[draft.barcode_type].hint} error={validateBarcode(draft.barcode_type, draft.barcode.trim()) ?? undefined}><Input id="p_bar" value={draft.barcode} maxLength={BARCODE_SPECS[draft.barcode_type].maxLength} inputMode={BARCODE_SPECS[draft.barcode_type].digitsOnly ? "numeric" : "text"} onChange={(e) => set({ barcode: sanitizeBarcode(draft.barcode_type, e.target.value) })} /></Field>
            <Field label="Description" htmlFor="p_desc" className="sm:col-span-2"><Textarea id="p_desc" rows={2} value={draft.description} onChange={(e) => set({ description: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={importResult !== null} onClose={() => setImportResult(null)} width="lg" title="Import results"
        description={importResult ? `${importResult.created} of ${importResult.total} products imported${importResult.failed ? `, ${importResult.failed} skipped` : ""}.` : undefined}
        footer={<Button onClick={() => setImportResult(null)}>Done</Button>}>
        {importResult && importResult.errors.length > 0 && (
          <ul className="max-h-72 space-y-space-1 overflow-y-auto text-[13px]">
            {importResult.errors.map((e) => <li key={e.row}><strong>Row {e.row}{e.sku ? ` (${e.sku})` : ""}:</strong> <span className="text-error">{e.error}</span></li>)}
          </ul>)}
        {importResult && importResult.errors.length === 0 && <p className="text-[13px] text-ink-600">Every row was imported.</p>}
        <p className="mt-space-3 text-[12px] text-ink-400">Required columns: sku, name, price. Optional: variant_name, description, category, brand, mrp, cost, tax_code, serialization_type (NONE / SERIAL / IMEI), barcode, hsn_code, status. New categories and brands are created automatically.{" "}
          <a className="font-medium underline" href="/sample-products.csv" download><HugeiconsIcon icon={Download04Icon} size={12} className="inline" /> Download sample file</a></p>
      </Modal>

      <Modal open={variantOf !== null} onClose={() => setVariantOf(null)} title={`Add a variant — ${variantOf?.product_name ?? ""}`} description="A variant is its own SKU: it has its own price and its own stock."
        footer={<><Button variant="ghost" onClick={() => setVariantOf(null)}>Cancel</Button><Button disabled={busy || !variant.sku.trim() || !variant.name.trim() || !variant.price} onClick={addVariant}>Add variant</Button></>}>
        <Field label="SKU" htmlFor="v_sku" required><Input id="v_sku" value={variant.sku} onChange={(e) => setVariant({ ...variant, sku: e.target.value })} /></Field>
        <Field label="Variant name" htmlFor="v_name" required hint="e.g. 256GB, Red, XL."><Input id="v_name" value={variant.name} onChange={(e) => setVariant({ ...variant, name: e.target.value })} /></Field>
        <Field label={`Selling price (${cur})`} htmlFor="v_price" required><Input id="v_price" inputMode="decimal" value={variant.price} onChange={(e) => setVariant({ ...variant, price: e.target.value })} /></Field>
      </Modal>

      <Modal open={receiving !== null} onClose={() => setReceiving(null)} title={`Receive stock — ${receiving?.name ?? ""}`}
        footer={<><Button variant="ghost" onClick={() => setReceiving(null)}>Cancel</Button><Button disabled={busy || !recvQty || !recvBranch} onClick={receive}>Receive</Button></>}>
        <Field label="Branch" htmlFor="r_branch"><Select id="r_branch" value={recvBranch} onChange={(e) => setRecvBranch(e.target.value)}>{activeBranches(session).map((b) => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}</Select></Field>
        <Field label="Quantity" htmlFor="r_qty"><Input id="r_qty" inputMode="numeric" value={recvQty} onChange={(e) => setRecvQty(e.target.value)} /></Field>
        {receiving && receiving.serialization_type !== "NONE" && (
          <Field label={receiving.serialization_type === "IMEI" ? "IMEI numbers" : "Serial numbers"} htmlFor="r_serials" hint="One per line (or comma separated) — exactly as many as the quantity." required>
            <Textarea id="r_serials" rows={4} value={recvSerials} onChange={(e) => setRecvSerials(e.target.value)} />
          </Field>
        )}
      </Modal>
    </PortalShell>
  );
}
