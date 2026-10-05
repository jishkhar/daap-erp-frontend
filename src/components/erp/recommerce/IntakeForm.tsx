"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { erp, useErpQuery, type Product, type RecommerceAsset } from "@/lib/erp";
import { hasGrantAt, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

/** Counter inspection: identify the device, record its condition, get a grade and a quote. */
export function IntakeForm({ branchId, onDone }: { branchId: string | null; onDone: (asset: RecommerceAsset) => void }) {
  const session = useStaffSession();
  const products = useErpQuery<Product[]>("/api/v1/products?limit=500");
  const devices = useMemo(() => (products.data ?? []).filter((p) => p.serialization_type !== "NONE" && p.lifecycle_status === "active"), [products.data]);
  const buyBranches = (session?.branches ?? []).filter((b) => hasGrantAt(session, "recommerce:acquire", b.id));
  const [branch, setBranch] = useState<string>(branchId ? String(branchId) : "");
  const [f, setF] = useState({ product: "", serial: "", source: "BUYBACK", name: "", phone: "", screen: "perfect", body: "perfect", battery: "", water: false, locked: false, stolen: false, faults: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  const branchValue = branch || (buyBranches[0] ? String(buyBranches[0].id) : "");
  const valid = f.product && f.serial.trim() && branchValue && (f.source === "BUYBACK" || f.name.trim());

  async function submit() {
    setBusy(true);
    const battery = f.battery.trim() === "" ? null : parseInt(f.battery, 10);
    const res = await erp<RecommerceAsset>("/api/v1/recommerce/intake", "POST", {
      branch_id: branchValue, variant_id: f.product, serial_number: f.serial.trim(), source_type: f.source,
      customer: f.name.trim() ? { name: f.name.trim(), phone: f.phone.trim() || null } : null,
      inspection: { screen: f.screen, body: f.body, battery_health_pct: battery, water_damage: f.water, activation_locked: f.locked, reported_lost_or_stolen: f.stolen,
        faults: f.faults.split(",").map((x) => x.trim()).filter(Boolean), notes: f.notes.trim() || null },
    });
    setBusy(false);
    if (res.error || !res.data) return toast.error("Couldn't record the inspection", res.error ?? undefined);
    toast.success(res.data.status === "REJECTED" ? "Device rejected" : "Inspection recorded");
    onDone(res.data);
  }

  return (
    <Card className="max-w-3xl p-space-5">
      <h2 className="mb-space-1 text-[16px] font-bold text-ink-900">New device inspection</h2>
      <p className="mb-space-4 text-[13px] text-ink-600">The IMEI is checked (15 digits, valid check digit, not already in the system). A locked or reported-stolen device is rejected on the spot.</p>
      <div className="grid gap-x-space-4 sm:grid-cols-2">
        <Field label="Branch" htmlFor="i_branch"><Select id="i_branch" value={branchValue} onChange={(e) => setBranch(e.target.value)}>{buyBranches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} — {b.branch_name}</option>)}</Select></Field>
        <Field label="Type" htmlFor="i_src"><Select id="i_src" value={f.source} onChange={(e) => set({ source: e.target.value })}><option value="BUYBACK">Buyback (we pay out)</option><option value="TRADE_IN">Trade-in (store credit)</option></Select></Field>
        <Field label="Device model" htmlFor="i_prod" required><Select id="i_prod" value={f.product} onChange={(e) => set({ product: e.target.value })}><option value="">Select…</option>{devices.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</Select></Field>
        <Field label="IMEI / serial" htmlFor="i_serial" required><Input id="i_serial" inputMode="numeric" value={f.serial} onChange={(e) => set({ serial: e.target.value })} /></Field>
        <Field label="Customer name" htmlFor="i_name" required={f.source === "TRADE_IN"}><Input id="i_name" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Customer phone" htmlFor="i_phone"><Input id="i_phone" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="Screen" htmlFor="i_screen"><Select id="i_screen" value={f.screen} onChange={(e) => set({ screen: e.target.value })}><option value="perfect">Perfect</option><option value="scratched">Scratched</option><option value="cracked">Cracked</option></Select></Field>
        <Field label="Body" htmlFor="i_body"><Select id="i_body" value={f.body} onChange={(e) => set({ body: e.target.value })}><option value="perfect">Perfect</option><option value="worn">Worn</option><option value="damaged">Damaged</option></Select></Field>
        <Field label="Battery health (%)" htmlFor="i_bat"><Input id="i_bat" inputMode="numeric" value={f.battery} onChange={(e) => set({ battery: e.target.value })} /></Field>
        <Field label="Faults (comma separated)" htmlFor="i_faults"><Input id="i_faults" value={f.faults} onChange={(e) => set({ faults: e.target.value })} placeholder="speaker, camera" /></Field>
      </div>
      <div className="mb-space-3 flex flex-wrap gap-x-space-5 gap-y-space-2 text-[13.5px] text-ink-800">
        {([["water", "Water damage"], ["locked", "Activation / iCloud locked"], ["stolen", "Reported lost or stolen"]] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-space-2"><input type="checkbox" checked={f[k]} onChange={(e) => set({ [k]: e.target.checked })} /> {label}</label>
        ))}
      </div>
      <Field label="Notes" htmlFor="i_notes"><Textarea id="i_notes" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      <Button disabled={busy || !valid} onClick={submit}>Record inspection</Button>
    </Card>
  );
}
