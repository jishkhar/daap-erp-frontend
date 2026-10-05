"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Building03Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { erp, fromMinor, humanize, toMinor, useErpQuery } from "@/lib/erp";
import { hasPermission, refreshStaffSession, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Branch = {
  id: string; branch_code: string; branch_name: string; address_line: string | null; city: string | null; state: string | null; pincode: string | null;
  fulfilment_enabled: boolean; fulfilment_priority: number; status: "active" | "inactive";
};
type Draft = { id?: string; branch_code: string; branch_name: string; address_line: string; city: string; state: string; pincode: string; fulfilment_enabled: boolean; fulfilment_priority: string; status: string };
const EMPTY: Draft = { branch_code: "", branch_name: "", address_line: "", city: "", state: "", pincode: "", fulfilment_enabled: true, fulfilment_priority: "100", status: "active" };

export default function BranchesPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const branches = useErpQuery<Branch[]>("/api/v1/branches");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Branch | null>(null);
  const [added, setAdded] = useState<Branch | null>(null);
  const canWrite = hasPermission(session, "branches", "write");

  const columns = useMemo<ColumnDef<Branch, unknown>[]>(() => [
    { header: "Branch", cell: ({ row }) => (<div><p className="font-semibold text-ink-900">{row.original.branch_name}</p><p className="text-[12px] text-ink-400">{row.original.branch_code}</p></div>) },
    { header: "Location", cell: ({ row }) => [row.original.city, row.original.state].filter(Boolean).join(", ") || <span className="text-ink-400">—</span> },
    { header: "Online orders", cell: ({ row }) => (row.original.fulfilment_enabled ? `Fulfils (priority ${row.original.fulfilment_priority})` : <span className="text-ink-400">Doesn&apos;t fulfil</span>) },
    { header: "Status", cell: ({ row }) => <Badge tone={row.original.status === "active" ? "success" : "neutral"}>{row.original.status}</Badge> },
    { header: "", id: "actions", cell: ({ row }) => (
      <div className="flex justify-end"><Button variant="ghost" aria-label={`Hours, pincodes and staff of ${row.original.branch_name}`} onClick={() => setDetail(row.original)}>Hours &amp; staff</Button>{canWrite && <Button variant="ghost" aria-label={`Edit ${row.original.branch_name}`} onClick={() => setDraft({ id: row.original.id, branch_code: row.original.branch_code, branch_name: row.original.branch_name, address_line: row.original.address_line ?? "", city: row.original.city ?? "", state: row.original.state ?? "", pincode: row.original.pincode ?? "", fulfilment_enabled: row.original.fulfilment_enabled, fulfilment_priority: String(row.original.fulfilment_priority), status: row.original.status })}><HugeiconsIcon icon={PencilEdit02Icon} size={15} /> Edit</Button>}</div>) },
  ], [canWrite]);

  if (!ready) return null;
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save() {
    if (!draft) return;
    const priority = parseInt(draft.fulfilment_priority, 10);
    if (Number.isNaN(priority) || priority < 0) return toast.error("Priority must be a whole number", "Lower numbers are tried first.");
    const common = { branch_name: draft.branch_name.trim(), address_line: draft.address_line.trim() || null, city: draft.city.trim() || null, state: draft.state.trim() || null, pincode: draft.pincode.trim() || null, fulfilment_enabled: draft.fulfilment_enabled, fulfilment_priority: priority };
    setBusy(true);
    const res = draft.id
      ? await erp(`/api/v1/branches/${draft.id}`, "PATCH", { ...common, status: draft.status })
      : await erp("/api/v1/branches", "POST", { ...common, ...(draft.branch_code.trim() ? { branch_code: draft.branch_code.trim() } : {}) });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the branch", res.error);
    toast.success(draft.id ? "Branch updated" : "Branch added");
    if (!draft.id && res.data) setAdded(res.data as Branch);
    setDraft(null);
    branches.reload();
    await refreshStaffSession();           // the branch switcher and every branch dropdown read the stored session
  }

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader icon={<HugeiconsIcon icon={Building03Icon} size={20} />} title="Branches" description="Your stores and locations. Use the branch switcher at the top to filter the portal by branch."
        actions={canWrite && <Button onClick={() => setDraft({ ...EMPTY })}><HugeiconsIcon icon={Add01Icon} size={16} /> Add branch</Button>} />
      {added && (
        <Card className="mb-space-4 border-brand-200 bg-brand-50 p-space-4">
          <p className="text-[14px] font-semibold text-ink-900">{added.branch_name} ({added.branch_code}) is ready. Next steps:</p>
          <ul className="mt-space-2 list-disc space-y-1 pl-space-5 text-[14px] text-ink-600">
            <li><Link className="font-semibold text-brand-700 underline" href="/portal/settings/staff">Assign a manager and staff</Link> to this branch.</li>
            <li><Link className="font-semibold text-brand-700 underline" href="/portal/inventory">Receive opening stock</Link> into it.</li>
            <li><button type="button" className="font-semibold text-brand-700 underline" onClick={() => { setDetail(added); setAdded(null); }}>Set opening hours and delivery pincodes.</button></li>
          </ul>
          <button type="button" className="mt-space-2 text-[12.5px] text-ink-400 underline" onClick={() => setAdded(null)}>Dismiss</button>
        </Card>)}
      {branches.error && <p className="mb-space-3 text-[13px] font-medium text-error">{branches.error}</p>}
      <Card className="p-space-2"><DataTable columns={columns} data={branches.data ?? []} getRowId={(b) => b.id} emptyMessage={branches.loading ? "Loading branches…" : "No branches yet."} /></Card>
      <p className="mt-space-3 text-[12.5px] text-ink-400">Branches are never deleted, because orders, stock and the books refer to them. Deactivate a branch to retire it.</p>

      {detail && <BranchDetail branch={detail} canWrite={canWrite} currency={tenant?.currency ?? "INR"} onClose={() => setDetail(null)} />}

      <Modal open={draft !== null} onClose={() => setDraft(null)} width="lg" title={draft?.id ? "Edit branch" : "Add branch"}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button disabled={busy || !draft?.branch_name.trim()} onClick={save}>{draft?.id ? "Save changes" : "Add branch"}</Button></>}>
        {draft && (
          <div className="grid gap-x-space-4 sm:grid-cols-2">
            <Field label="Branch name" htmlFor="b_name" required><Input id="b_name" value={draft.branch_name} onChange={(e) => set({ branch_name: e.target.value })} /></Field>
            <Field label="Code" htmlFor="b_code" hint={draft.id ? "The code can't be changed." : "Optional — generated if left empty."}><Input id="b_code" value={draft.branch_code} disabled={!!draft.id} maxLength={12} onChange={(e) => set({ branch_code: e.target.value.toUpperCase() })} /></Field>
            <Field label="Address" htmlFor="b_addr" className="sm:col-span-2"><Input id="b_addr" value={draft.address_line} onChange={(e) => set({ address_line: e.target.value })} /></Field>
            <Field label="City" htmlFor="b_city"><Input id="b_city" value={draft.city} onChange={(e) => set({ city: e.target.value })} /></Field>
            <Field label="State" htmlFor="b_state"><Input id="b_state" value={draft.state} onChange={(e) => set({ state: e.target.value })} /></Field>
            <Field label="Pincode" htmlFor="b_pin"><Input id="b_pin" inputMode="numeric" value={draft.pincode} onChange={(e) => set({ pincode: e.target.value })} /></Field>
            <Field label="Fulfilment priority" htmlFor="b_prio" hint="When a branch can't supply an online order, the next lowest number is tried."><Input id="b_prio" inputMode="numeric" value={draft.fulfilment_priority} onChange={(e) => set({ fulfilment_priority: e.target.value.replace(/\D/g, "") })} /></Field>
            <div className="mb-space-4 flex items-center gap-space-3 sm:col-span-2"><Switch checked={draft.fulfilment_enabled} onChange={() => set({ fulfilment_enabled: !draft.fulfilment_enabled })} aria-label="Fulfils online orders" /><span className="text-[14px] text-ink-900">Fulfils online and WhatsApp orders</span></div>
            {draft.id && <Field label="Status" htmlFor="b_status" hint="A branch with open orders, or the only active branch, can't be deactivated."><Select id="b_status" value={draft.status} onChange={(e) => set({ status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>}
          </div>
        )}
      </Modal>
    </PortalShell>
  );
}


type Hour = { weekday: number; opens_at: string; closes_at: string; channel: string | null };
type Area = { pincode: string; delivery_fee_minor: number | null };
type StaffRow = { user_id: string; name: string; email: string; status: string; role_name: string; scope: "all" | "branch" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function BranchDetail({ branch, canWrite, currency, onClose }: { branch: Branch; canWrite: boolean; currency: string; onClose: () => void }) {
  const [tab, setTab] = useState<"hours" | "areas" | "staff">("hours");
  const schedule = useErpQuery<{ hours: Hour[]; areas: Area[] }>(`/api/v1/branches/${branch.id}/schedule`);
  const staff = useErpQuery<StaffRow[]>(tab === "staff" ? `/api/v1/branches/${branch.id}/staff` : null);
  const [hours, setHours] = useState<Hour[] | null>(null);        // null = not edited yet: show what the server has
  const [pins, setPins] = useState<string | null>(null);
  const [slot, setSlot] = useState({ weekday: "1", opens_at: "09:00", closes_at: "18:00" });
  const [busy, setBusy] = useState(false);

  const shownHours = hours ?? schedule.data?.hours ?? [];
  const shownPins = pins ?? (schedule.data?.areas ?? []).map((a) => (a.delivery_fee_minor === null ? a.pincode : `${a.pincode}, ${fromMinor(a.delivery_fee_minor)}`)).join("\n");

  function addSlot() {
    if (slot.opens_at >= slot.closes_at) return toast.error("Closing time must be after opening time");
    setHours([...shownHours, { weekday: Number(slot.weekday), opens_at: slot.opens_at, closes_at: slot.closes_at, channel: null }].sort((a, b) => a.weekday - b.weekday || a.opens_at.localeCompare(b.opens_at)));
  }

  async function saveHours() {
    setBusy(true);
    const res = await erp(`/api/v1/branches/${branch.id}/hours`, "PUT", { hours: shownHours });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the hours", res.error);
    toast.success("Opening hours saved");
    setHours(null);
    schedule.reload();
  }

  async function savePins() {
    const areas: Area[] = [];
    for (const line of shownPins.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const [pincode, fee] = line.split(",").map((x) => x.trim());
      const minor = fee ? toMinor(fee) : null;
      if (fee && minor === null) return toast.error(`Check the fee on “${line}”`, "Use a plain amount like 49 or 49.50.");
      areas.push({ pincode, delivery_fee_minor: minor });
    }
    setBusy(true);
    const res = await erp(`/api/v1/branches/${branch.id}/serviceable-areas`, "PUT", { areas });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the pincodes", res.error);
    toast.success("Serviceable pincodes saved");
    setPins(null);
    schedule.reload();
  }

  return (
    <Modal open onClose={onClose} width="lg" title={`${branch.branch_name} (${branch.branch_code})`} description="Opening hours, delivery coverage and who works here." footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <Tabs tabs={[{ key: "hours", label: "Opening hours" }, { key: "areas", label: "Delivery pincodes" }, { key: "staff", label: "Staff" }]} value={tab} onChange={setTab} />
      {schedule.error && <p className="mb-space-3 text-[13px] text-error">{schedule.error}</p>}
      {tab === "hours" && (<>
        {shownHours.length === 0 && <p className="mb-space-3 text-[13.5px] text-ink-400">{schedule.loading ? "Loading…" : "No opening hours set yet."}</p>}
        <ul className="mb-space-3 divide-y divide-line">{shownHours.map((h, i) => (
          <li key={`${h.weekday}-${h.opens_at}-${i}`} className="flex items-center justify-between py-space-2 text-[14px]">
            <span><strong className="text-ink-900">{DAYS[h.weekday]}</strong> {h.opens_at} – {h.closes_at}{h.channel && <span className="text-ink-400"> · {humanize(h.channel)} only</span>}</span>
            {canWrite && <button type="button" className="text-[13px] font-semibold text-error" onClick={() => setHours(shownHours.filter((_, j) => j !== i))}>Remove</button>}
          </li>))}
        </ul>
        {canWrite && (<>
          <div className="mb-space-3 flex flex-wrap items-end gap-space-2">
            <Select aria-label="Day" value={slot.weekday} onChange={(e) => setSlot({ ...slot, weekday: e.target.value })} className="w-40">{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</Select>
            <Input aria-label="Opens at" type="time" value={slot.opens_at} onChange={(e) => setSlot({ ...slot, opens_at: e.target.value })} className="w-32" />
            <Input aria-label="Closes at" type="time" value={slot.closes_at} onChange={(e) => setSlot({ ...slot, closes_at: e.target.value })} className="w-32" />
            <Button variant="secondary" onClick={addSlot}>Add</Button>
          </div>
          <Button disabled={busy || hours === null} onClick={saveHours}>Save hours</Button>
        </>)}
      </>)}
      {tab === "areas" && (<>
        <Field label="Pincodes this branch delivers to" htmlFor="b_pins" hint={`One per line. Add a delivery fee after a comma if it differs, e.g. “560001, 49” (${currency}). Online orders to a listed pincode are fulfilled from this branch first when the ordering branch can't supply them.`}>
          <Textarea id="b_pins" rows={8} disabled={!canWrite} value={shownPins} onChange={(e) => setPins(e.target.value)} />
        </Field>
        {canWrite && <Button disabled={busy || pins === null} onClick={savePins}>Save pincodes</Button>}
      </>)}
      {tab === "staff" && (<>
        {staff.error && <p className="text-[13px] text-error">{staff.error}</p>}
        {(staff.data ?? []).length === 0 && <p className="text-[13.5px] text-ink-400">{staff.loading ? "Loading…" : "Nobody is assigned to this branch yet."}</p>}
        <ul className="divide-y divide-line">{(staff.data ?? []).map((m, i) => (
          <li key={`${m.user_id}-${i}`} className="flex items-center justify-between gap-space-3 py-space-2 text-[14px]">
            <span><strong className="text-ink-900">{m.name}</strong> <span className="text-ink-400">{m.email}</span></span>
            <span className="flex items-center gap-space-2"><Badge tone="neutral">{humanize(m.role_name)}</Badge><Badge tone={m.scope === "all" ? "violet" : "brand"}>{m.scope === "all" ? "all branches" : "this branch"}</Badge></span>
          </li>))}
        </ul>
        <p className="mt-space-3 text-[12.5px] text-ink-400">Change assignments under <Link className="underline" href="/portal/settings/staff">Team &amp; Access</Link>.</p>
      </>)}
    </Modal>
  );
}
