"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { erp, formatMoney, humanize, toMinor, useErpQuery, type Account, type JournalEntry } from "@/lib/erp";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Row = { account: string; debit: string; credit: string };

/** The general journal: every entry the system or a person has posted, and manual adjustments. Entries are never edited — reverse them. */
export function JournalTab({ currency }: { currency: string }) {
  const session = useStaffSession();
  const entries = useErpQuery<JournalEntry[]>("/api/v1/finance/journal-entries?limit=200");
  const accounts = useErpQuery<Account[]>("/api/v1/finance/accounts");
  const [view, setView] = useState<JournalEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [rows, setRows] = useState<Row[]>([{ account: "", debit: "", credit: "" }, { account: "", debit: "", credit: "" }]);
  const [busy, setBusy] = useState(false);
  const canManage = hasTenantWide(session, "finance:manage");
  const m = (v: number) => formatMoney(v, currency);

  const debit = rows.reduce((s, r) => s + (toMinor(r.debit) ?? 0), 0), credit = rows.reduce((s, r) => s + (toMinor(r.credit) ?? 0), 0);
  const balanced = debit > 0 && debit === credit && rows.every((r) => r.account && ((toMinor(r.debit) ?? 0) > 0) !== ((toMinor(r.credit) ?? 0) > 0));
  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const columns = useMemo<ColumnDef<JournalEntry, unknown>[]>(() => [
    { header: "Entry", cell: ({ row }) => <span className="font-semibold text-ink-900">{row.original.entry_number}</span> },
    { header: "Date", cell: ({ row }) => row.original.entry_date },
    { header: "Source", cell: ({ row }) => humanize(row.original.source_type) },
    { header: "Memo", cell: ({ row }) => <span className="text-ink-600">{row.original.memo ?? "—"}</span> },
  ], []);

  async function openEntry(e: JournalEntry) {
    const res = await erp<JournalEntry>(`/api/v1/finance/journal-entries/${e.id}`);
    if (res.data) setView(res.data);
  }

  async function post() {
    setBusy(true);
    const res = await erp("/api/v1/finance/journal-entries", "POST", { memo: memo.trim(), lines: rows.map((r) => ({ account: r.account, debit_minor: toMinor(r.debit) ?? 0, credit_minor: toMinor(r.credit) ?? 0 })) });
    setBusy(false);
    if (res.error) return toast.error("Couldn't post the entry", res.error);
    toast.success("Entry posted");
    setOpen(false); setMemo(""); setRows([{ account: "", debit: "", credit: "" }, { account: "", debit: "", credit: "" }]);
    entries.reload();
  }

  async function reverse(e: JournalEntry) {
    const reason = window.prompt("Reason for reversing this entry?");
    if (!reason) return;
    const res = await erp(`/api/v1/finance/journal-entries/${e.id}/reverse`, "POST", { reason });
    if (res.error) return toast.error("Couldn't reverse", res.error);
    toast.success("Entry reversed");
    setView(null); entries.reload();
  }

  return (
    <>
      <Card className="mb-space-4 flex flex-wrap items-center justify-between gap-space-3 p-space-3">
        <p className="text-[13px] text-ink-600">Sales, payments, stock and purchases post here automatically. Entries can&apos;t be edited — a mistake is fixed by reversing it.</p>
        {canManage && <Button onClick={() => setOpen(true)}><Plus size={16} /> Manual entry</Button>}
      </Card>
      {entries.error && <p className="mb-space-3 text-[13px] font-medium text-error">{entries.error}</p>}
      <Card className="p-space-2"><DataTable columns={columns} data={entries.data ?? []} getRowId={(e) => String(e.id)} onRowClick={openEntry} emptyMessage={entries.loading ? "Loading…" : "No journal entries yet."} /></Card>

      <Modal open={view !== null} onClose={() => setView(null)} width="lg" title={view?.entry_number ?? ""} description={view?.memo ?? undefined}
        footer={view && canManage && !view.reversal_of ? <Button variant="secondary" onClick={() => reverse(view)}><Undo2 size={15} /> Reverse entry</Button> : undefined}>
        {view && (
          <table className="w-full text-[13.5px]"><thead><tr className="border-b border-line text-left text-[12px] text-ink-400"><th className="py-1">Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
            <tbody>{(view.lines ?? []).map((l, i) => <tr key={i} className="border-b border-line"><td className="py-1.5">{l.account_code} · {l.account_name}</td><td className="text-right">{l.debit_minor ? m(l.debit_minor) : ""}</td><td className="text-right">{l.credit_minor ? m(l.credit_minor) : ""}</td></tr>)}</tbody></table>
        )}
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} width="lg" title="Manual journal entry" description="Debits must equal credits."
        footer={<><span className={`mr-auto text-[13px] ${balanced ? "text-success" : "text-ink-600"}`}>Debit {m(debit)} · Credit {m(credit)}{balanced ? " ✓ balanced" : ""}</span><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy || !balanced || !memo.trim()} onClick={post}>Post entry</Button></>}>
        <Field label="Memo" htmlFor="je_memo" required><Input id="je_memo" value={memo} onChange={(e) => setMemo(e.target.value)} /></Field>
        <div className="space-y-space-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px_110px_36px] items-center gap-space-2">
              <Select aria-label="Account" value={r.account} onChange={(e) => setRow(i, { account: e.target.value })}><option value="">Account…</option>{(accounts.data ?? []).map((a) => <option key={a.id} value={a.code}>{a.code} · {a.name}</option>)}</Select>
              <Input aria-label="Debit" inputMode="decimal" placeholder="Debit" value={r.debit} onChange={(e) => setRow(i, { debit: e.target.value, credit: e.target.value ? "" : r.credit })} />
              <Input aria-label="Credit" inputMode="decimal" placeholder="Credit" value={r.credit} onChange={(e) => setRow(i, { credit: e.target.value, debit: e.target.value ? "" : r.debit })} />
              <button type="button" aria-label="Remove line" disabled={rows.length <= 2} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-md text-ink-400 hover:bg-black/[0.04] hover:text-error disabled:opacity-30"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="mt-space-2" onClick={() => setRows((rs) => [...rs, { account: "", debit: "", credit: "" }])}><Plus size={15} /> Add line</Button>
      </Modal>
    </>
  );
}
