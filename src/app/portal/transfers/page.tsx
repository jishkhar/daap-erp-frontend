"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDataTransferHorizontalIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";
import { ProductPicker } from "@/components/erp/ProductPicker";
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
import { useActiveBranch } from "@/lib/branch";
import { erp, formatDateTime, formatMoney, humanize, qs, useErpQuery, type Product, type Tone } from "@/lib/erp";
import { useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Status = "REQUESTED" | "APPROVED" | "REJECTED" | "DISPATCHED" | "RECEIVED" | "CANCELLED";
type Transfer = { id: string; transfer_number: string; from_branch_id: string; to_branch_id: string; status: Status; total_value_minor: number; notes: string | null; rejection_reason: string | null; requested_at: string };
type Item = { id: string; variant_id: string; sku: string; product_name: string; serialization_type: "NONE" | "SERIAL" | "IMEI"; quantity: number; serials: { serial_number: string; received: boolean }[] };
type Detail = Transfer & { items: Item[] };
type Line = { product: Product; quantity: string };

const TONE: Record<Status, Tone> = { REQUESTED: "warning", APPROVED: "clay", REJECTED: "neutral", DISPATCHED: "violet", RECEIVED: "success", CANCELLED: "neutral" };
const STATUSES: Status[] = ["REQUESTED", "APPROVED", "DISPATCHED", "RECEIVED", "REJECTED", "CANCELLED"];
const serialList = (text: string) => text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

export default function TransfersPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const { branchId, branches } = useActiveBranch();
  const [status, setStatus] = useState("");
  const transfers = useErpQuery<Transfer[]>(`/api/v1/transfers${qs({ status, limit: 200 })}`);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const cur = tenant?.currency ?? "INR";

  const nameOf = useMemo(() => { const m = new Map((session?.branches ?? []).map((b) => [b.id, `${b.branch_name} (${b.branch_code})`])); return (id: string) => m.get(id) ?? `#${id.slice(0, 6)}`; }, [session]);
  // A chosen branch narrows the list to transfers going out of, or coming into, that branch.
  const rows = useMemo(() => (transfers.data ?? []).filter((t) => !branchId || t.from_branch_id === branchId || t.to_branch_id === branchId), [transfers.data, branchId]);

  const columns = useMemo<ColumnDef<Transfer, unknown>[]>(() => [
    { header: "Transfer", cell: ({ row }) => <span className="font-semibold text-ink-900">{row.original.transfer_number}</span> },
    { header: "From → To", cell: ({ row }) => `${nameOf(row.original.from_branch_id)} → ${nameOf(row.original.to_branch_id)}` },
    { header: "Value", cell: ({ row }) => formatMoney(row.original.total_value_minor, cur) },
    { header: "Status", cell: ({ row }) => <Badge tone={TONE[row.original.status]}>{humanize(row.original.status)}</Badge> },
    { header: "Requested", cell: ({ row }) => <span className="text-ink-600">{formatDateTime(row.original.requested_at)}</span> },
  ], [nameOf, cur]);

  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="transfers">
      <PageHeader scopedToBranch icon={<HugeiconsIcon icon={ArrowDataTransferHorizontalIcon} size={20} />} title="Stock transfers" description="Move stock between branches: request, approve, dispatch, receive."
        actions={<Button onClick={() => setCreating(true)}>New transfer</Button>} />
      <Card className="mb-space-4 p-space-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48" aria-label="Status"><option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>
      </Card>
      {transfers.error && <p className="mb-space-3 text-[13px] font-medium text-error">{transfers.error}</p>}
      <Card className="p-space-2"><DataTable columns={columns} data={rows} getRowId={(t) => t.id} onRowClick={(t) => setOpen(t.id)} loading={transfers.loading} emptyMessage={transfers.loading ? "Loading transfers…" : "No transfers yet."} /></Card>
      {creating && <NewTransfer branches={branches} defaultFrom={branchId ?? ""} onClose={() => setCreating(false)} onDone={(id) => { setCreating(false); transfers.reload(); setOpen(id); }} />}
      {open && <TransferDetail id={open} nameOf={nameOf} currency={cur} onClose={() => setOpen(null)} onChanged={transfers.reload} />}
    </PortalShell>
  );
}

function NewTransfer({ branches, defaultFrom, onClose, onDone }: { branches: { id: string; branch_name: string; branch_code: string }[]; defaultFrom: string; onClose: () => void; onDone: (id: string) => void }) {
  const [from, setFrom] = useState(defaultFrom || branches[0]?.id || "");
  const [to, setTo] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const stock = useErpQuery<{ variant_id: string; available_qty: number }[]>(from ? `/api/v1/inventory${qs({ branch_id: from, limit: 1000 })}` : null);
  const available = (id: string) => (stock.data ?? []).find((s) => s.variant_id === id)?.available_qty ?? 0;

  async function submit() {
    if (!from || !to || from === to) return toast.error("Choose two different branches");
    if (lines.length === 0) return toast.error("Add at least one product");
    const items = lines.map((l) => ({ variant_id: l.product.id, quantity: parseInt(l.quantity, 10) }));
    if (items.some((i) => !i.quantity || i.quantity <= 0)) return toast.error("Every line needs a quantity");
    setBusy(true);
    const res = await erp<Transfer>("/api/v1/transfers", "POST", { from_branch_id: from, to_branch_id: to, lines: items, notes: notes.trim() || null });
    setBusy(false);
    if (res.error || !res.data) return toast.error("Couldn't request the transfer", res.error ?? undefined);
    toast.success(`Transfer ${res.data.transfer_number} requested`);
    onDone(res.data.id);
  }

  return (
    <Modal open onClose={onClose} width="lg" title="New transfer" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={submit}>Request transfer</Button></>}>
      <div className="grid gap-x-space-4 sm:grid-cols-2">
        <Field label="From branch" htmlFor="t_from"><Select id="t_from" value={from} onChange={(e) => { setFrom(e.target.value); setLines([]); }}>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}</Select></Field>
        <Field label="To branch" htmlFor="t_to"><Select id="t_to" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose…</option>{branches.filter((b) => b.id !== from).map((b) => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}</Select></Field>
      </div>
      <Field label="Add products" htmlFor="t_prod"><ProductPicker id="t_prod" onPick={(p) => setLines((ls) => (ls.some((l) => l.product.id === p.id) ? ls : [...ls, { product: p, quantity: "1" }]))} /></Field>
      {lines.map((l) => (
        <div key={l.product.id} className="mb-space-2 flex items-center gap-space-3 rounded-md border border-line p-space-2">
          <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium text-ink-900">{l.product.name}</p><p className="text-[12px] text-ink-400">{l.product.sku} · {available(l.product.id)} available at source</p></div>
          <Input aria-label="Quantity" inputMode="numeric" className="h-9 w-20" value={l.quantity} onChange={(e) => setLines((ls) => ls.map((x) => (x.product.id === l.product.id ? { ...x, quantity: e.target.value.replace(/\D/g, "") } : x)))} />
          <button type="button" aria-label={`Remove ${l.product.name}`} className="text-ink-400 hover:text-error" onClick={() => setLines((ls) => ls.filter((x) => x.product.id !== l.product.id))}><HugeiconsIcon icon={Delete02Icon} size={16} /></button>
        </div>
      ))}
      <Field label="Notes" htmlFor="t_notes" className="mt-space-3"><Input id="t_notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </Modal>
  );
}

function TransferDetail({ id, nameOf, currency, onClose, onChanged }: { id: string; nameOf: (id: string) => string; currency: string; onClose: () => void; onChanged: () => void }) {
  const detail = useErpQuery<Detail>(`/api/v1/transfers/${id}`);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [serials, setSerials] = useState<Record<string, string>>({});       // variant_id -> typed serials (dispatch) / confirmed serials (receive)
  const [qtys, setQtys] = useState<Record<string, string>>({});             // variant_id -> received quantity
  const t = detail.data;

  // Edits are kept per product; until the person types, the fields show the sensible default (everything arrived).
  const qtyOf = (i: Item) => qtys[i.variant_id] ?? String(i.quantity);
  const serialsOf = (i: Item) => serials[i.variant_id] ?? (t?.status === "DISPATCHED" ? i.serials.map((x) => x.serial_number).join("\n") : "");

  async function act(path: string, body?: unknown, done?: string) {
    setBusy(true);
    const res = await erp(`/api/v1/transfers/${id}/${path}`, "POST", body ?? {});
    setBusy(false);
    if (res.error) return toast.error("That didn't work", res.error);
    toast.success(done ?? "Done");
    setRejecting(false);
    detail.reload();
    onChanged();
  }

  const dispatchBody = () => ({ serials: Object.fromEntries((t?.items ?? []).filter((i) => i.serialization_type !== "NONE").map((i) => [i.variant_id, serialList(serialsOf(i))])) });
  const receiveBody = () => ({ items: (t?.items ?? []).map((i) => { const q = parseInt(qtyOf(i), 10) || 0; return { variant_id: i.variant_id, quantity: q, serial_numbers: i.serialization_type !== "NONE" ? serialList(serialsOf(i)).slice(0, q) : [] }; }) });

  return (
    <Modal open onClose={onClose} width="lg" title={t ? `Transfer ${t.transfer_number}` : "Transfer"} description={t ? `${nameOf(t.from_branch_id)} → ${nameOf(t.to_branch_id)} · ${formatMoney(t.total_value_minor, currency)}` : undefined}
      footer={t && (
        <div className="flex w-full flex-wrap justify-end gap-space-2">
          {(t.status === "REQUESTED" || t.status === "APPROVED") && <Button variant="destructive" disabled={busy} onClick={() => act("cancel", undefined, "Transfer cancelled")}>Cancel transfer</Button>}
          {t.status === "REQUESTED" && <><Button variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>Reject</Button><Button disabled={busy} onClick={() => act("approve", undefined, "Transfer approved — stock reserved at the source")}>Approve</Button></>}
          {t.status === "APPROVED" && <Button disabled={busy} onClick={() => act("dispatch", dispatchBody(), "Dispatched — stock is in transit")}>Dispatch</Button>}
          {t.status === "DISPATCHED" && <Button disabled={busy} onClick={() => act("receive", receiveBody(), "Received into stock")}>Receive</Button>}
        </div>)}>
      {detail.error && <p className="text-[13px] text-error">{detail.error}</p>}
      {t && (<>
        <div className="mb-space-3 flex items-center gap-space-2"><Badge tone={TONE[t.status]}>{humanize(t.status)}</Badge><span className="text-[13px] text-ink-400">Requested {formatDateTime(t.requested_at)}</span></div>
        {t.notes && <p className="mb-space-3 text-[14px] text-ink-600">{t.notes}</p>}
        {t.rejection_reason && <p className="mb-space-3 text-[14px] text-error">Rejected: {t.rejection_reason}</p>}
        {t.items.map((i) => (
          <div key={i.id} className="mb-space-2 rounded-md border border-line p-space-3">
            <div className="flex items-center justify-between gap-space-3">
              <div><p className="text-[14px] font-semibold text-ink-900">{i.product_name}</p><p className="text-[12px] text-ink-400">{i.sku} · {i.quantity} unit(s)</p></div>
              {t.status === "DISPATCHED" && <Input aria-label={`Received quantity for ${i.sku}`} inputMode="numeric" className="h-9 w-24" value={qtyOf(i)} onChange={(e) => setQtys({ ...qtys, [i.variant_id]: e.target.value.replace(/\D/g, "") })} />}
            </div>
            {i.serialization_type !== "NONE" && (t.status === "APPROVED" || t.status === "DISPATCHED") && (
              <Textarea rows={2} className="mt-space-2" aria-label={`Serial numbers for ${i.sku}`} placeholder={t.status === "APPROVED" ? `Scan ${i.quantity} ${i.serialization_type === "IMEI" ? "IMEI" : "serial"} number(s), one per line` : "Serials that arrived, one per line"} value={serialsOf(i)} onChange={(e) => setSerials({ ...serials, [i.variant_id]: e.target.value })} />)}
            {i.serials.length > 0 && t.status !== "DISPATCHED" && <p className="mt-space-1 text-[12px] text-ink-400">{i.serials.map((s) => s.serial_number).join(", ")}</p>}
          </div>))}
        {t.status === "DISPATCHED" && <p className="text-[12px] text-ink-400">Enter fewer than were sent if some didn&apos;t arrive; the difference is written off at the destination.</p>}
      </>)}
      {rejecting && (
        <div className="mt-space-3 rounded-md border border-line p-space-3">
          <Field label="Reason for rejecting" htmlFor="t_reason"><Input id="t_reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-space-2"><Button variant="ghost" onClick={() => setRejecting(false)}>Back</Button><Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => act("reject", { reason: reason.trim() }, "Transfer rejected")}>Reject transfer</Button></div>
        </div>)}
    </Modal>
  );
}
