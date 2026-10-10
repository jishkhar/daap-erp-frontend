"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ProductSelect } from "@/components/erp/ProductSelect";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  ASSET_STATUS_TONE,
  QC_CHECKS,
  formatDateTime,
  formatMoney,
  humanize,
  toMinor,
  type Product,
} from "@/lib/erp";
import {
  useAssetAction,
  useRecommerceAsset,
  type AssetAction,
} from "@/hooks/useRecommerce";
import { activeBranches, hasGrantAt, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { SkeletonLines } from "@/components/ui/Skeleton";

type Dialog =
  | null
  | "acquire"
  | "reject"
  | "grade"
  | "part"
  | "labour"
  | "move"
  | "qc"
  | "scrap";

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const asset = useRecommerceAsset(id);
  const step = useAssetAction(id);
  const [part, setPart] = useState<Product | null>(null); // chosen by searching the catalogue (ordinary stock, not devices)
  const [dialog, setDialog] = useState<Dialog>(null);
  const busy = step.isPending;
  const [f, setF] = useState({
    price: "",
    method: "UPI",
    ref: "",
    idType: "AADHAAR",
    idLast4: "",
    reason: "",
    grade: "A",
    desc: "",
    part: "",
    qty: "1",
    cost: "",
    branch: "",
    note: "",
    outcome: "PASS",
    notes: "",
  });
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(QC_CHECKS.map((c) => [c.key, true])),
  );
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  const cur = tenant?.currency ?? "INR";
  const a = asset.data;
  if (!ready) return null;

  const at = (perm: string) =>
    a ? hasGrantAt(session, perm, a.current_branch_id) : false;
  const canAcquire = a
    ? hasGrantAt(session, "recommerce:acquire", a.acquisition_branch_id)
    : false;
  const manager = Boolean(
    session && session.permissions["recommerce:manage"] === "*",
  );
  const otherBranches = activeBranches(session).filter(
    (b) => a && b.id !== a.current_branch_id,
  );

  function act(action: AssetAction, body: unknown, ok: string) {
    step.mutate(
      { action, body },
      {
        onSuccess: () => {
          toast.success(ok);
          setDialog(null);
        },
        onError: (e) => toast.error("That didn't work", e.message),
      },
    );
  }
  const close = () => setDialog(null);
  const cancel = (
    <Button variant="ghost" onClick={close}>
      Cancel
    </Button>
  );

  const st = a?.status;
  const inWork =
    st === "ACQUIRED" ||
    st === "GRADED" ||
    st === "IN_REFURBISHMENT" ||
    st === "QC_FAILED";

  return (
    <PortalShell tenant={tenant} active="recommerce">
      <Link
        href="/portal/recommerce"
        className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft size={14} /> ReCommerce
      </Link>
      {asset.error && (
        <p className="text-[14px] font-medium text-error">
          {asset.error.message}
        </p>
      )}
      {!a && !asset.error && <SkeletonLines rows={3} />}
      {a && (
        <>
          <div className="mb-space-4 flex flex-wrap items-start justify-between gap-space-3">
            <div>
              <h1 className="text-display">
                {a.asset_number} · {a.product_name}
              </h1>
              <p className="mt-1 text-[13.5px] text-ink-600">
                <span className="font-mono">{a.serial_number}</span> ·{" "}
                {a.source_type === "TRADE_IN" ? "Trade-in" : "Buyback"}{" "}
                <Badge tone={ASSET_STATUS_TONE[a.status]} className="ml-2">
                  {humanize(a.status)}
                </Badge>
                {a.grade && (
                  <Badge tone="neutral" className="ml-1">
                    Grade {a.grade}
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-space-2">
              {st === "INSPECTED" && canAcquire && (
                <>
                  <Button
                    onClick={() => {
                      set({
                        price: String((a.quoted_price_minor / 100).toFixed(2)),
                      });
                      setDialog("acquire");
                    }}
                  >
                    Buy this device
                  </Button>
                  <Button variant="ghost" onClick={() => setDialog("reject")}>
                    Decline
                  </Button>
                </>
              )}
              {(st === "ACQUIRED" ||
                st === "GRADED" ||
                st === "IN_REFURBISHMENT") &&
                at("recommerce:refurbish") && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      set({ grade: a.grade ?? a.suggested_grade ?? "A" });
                      setDialog("grade");
                    }}
                  >
                    {a.grade ? "Re-grade" : "Grade"}
                  </Button>
                )}
              {(st === "GRADED" ||
                st === "IN_REFURBISHMENT" ||
                st === "QC_FAILED") &&
                at("recommerce:refurbish") && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setDialog("part")}
                    >
                      Add part
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setDialog("labour")}
                    >
                      Add labour
                    </Button>
                    <Button
                      onClick={() => act("submit-qc", {}, "Submitted for QC")}
                    >
                      Submit for QC
                    </Button>
                  </>
                )}
              {st === "QC_PENDING" && at("recommerce:qc") && (
                <Button onClick={() => setDialog("qc")}>Quality check</Button>
              )}
              {inWork &&
                at("recommerce:refurbish") &&
                otherBranches.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      set({ branch: String(otherBranches[0].id) });
                      setDialog("move");
                    }}
                  >
                    Move
                  </Button>
                )}
              {(inWork || st === "QC_PENDING") && manager && (
                <Button
                  variant="destructive"
                  onClick={() => setDialog("scrap")}
                >
                  Scrap
                </Button>
              )}
            </div>
          </div>
          {a.rejection_reason && (
            <p className="mb-space-3 rounded-lg bg-warning/10 p-space-3 text-[13.5px] text-ink-800">
              {a.rejection_reason}
            </p>
          )}

          <div className="grid gap-space-4 lg:grid-cols-3">
            <div className="space-y-space-4 lg:col-span-2">
              <Card className="p-space-4">
                <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
                  Cost basis
                </h2>
                <dl className="grid grid-cols-2 gap-y-space-2 text-[14px] sm:grid-cols-4">
                  {(
                    [
                      ["Quoted", a.quoted_price_minor],
                      ["Acquisition", a.acquisition_cost_minor],
                      ["Parts", a.parts_cost_minor],
                      ["Labour", a.labour_cost_minor],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[12px] text-ink-400">{k}</dt>
                      <dd className="font-medium text-ink-900">
                        {formatMoney(v, cur)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-space-3 border-t border-line pt-space-2 text-[14px]">
                  Total cost <b>{formatMoney(a.cost_basis_minor, cur)}</b>
                  {a.resale_sku && (
                    <>
                      {" "}
                      · resale <span className="font-mono">
                        {a.resale_sku}
                      </span>{" "}
                      at <b>{formatMoney(a.resale_price_minor ?? 0, cur)}</b>
                      {a.unit_status && <> ({humanize(a.unit_status)})</>}
                    </>
                  )}
                </p>
              </Card>
              <Card className="p-space-4">
                <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
                  Work done
                </h2>
                {a.work_items.length === 0 && (
                  <p className="text-[13px] text-ink-400">
                    No parts or labour yet.
                  </p>
                )}
                <ul className="divide-y divide-line text-[13.5px]">
                  {a.work_items.map((w) => (
                    <li key={w.id} className="flex justify-between py-space-2">
                      <span>
                        {w.kind === "PART"
                          ? `${w.product_name ?? "Part"} × ${w.quantity}`
                          : "Labour"}{" "}
                        — {w.description}
                      </span>
                      <span className="font-medium">
                        {formatMoney(w.cost_minor, cur)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <Card className="p-space-4">
              <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
                History
              </h2>
              <ol className="space-y-space-3 border-l border-line pl-space-4">
                {a.events.map((e) => (
                  <li key={e.id} className="relative text-[13.5px]">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-500" />
                    <p className="font-medium text-ink-900">
                      {humanize(e.event_type)}
                      {e.from_status &&
                      e.to_status &&
                      e.from_status !== e.to_status
                        ? ` → ${humanize(e.to_status)}`
                        : ""}
                    </p>
                    <p className="text-[12px] text-ink-400">
                      {formatDateTime(e.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <Modal
            open={dialog === "acquire"}
            onClose={close}
            title="Buy this device"
            description={`Quoted ${formatMoney(a.quoted_price_minor, cur)}. Offers above the quote need a manager.`}
            footer={
              <>
                {cancel}
                <Button
                  disabled={busy || !toMinor(f.price)}
                  onClick={() =>
                    act(
                      "acquire",
                      {
                        offered_price_minor: toMinor(f.price),
                        payout_method: f.method,
                        payout_reference: f.ref.trim() || null,
                        id_proof_type: f.idLast4 ? f.idType : null,
                        id_proof_last4: f.idLast4 || null,
                      },
                      "Device acquired",
                    )
                  }
                >
                  Confirm purchase
                </Button>
              </>
            }
          >
            <Field label={`Price (${cur})`} htmlFor="a_price">
              <Input
                id="a_price"
                inputMode="decimal"
                value={f.price}
                onChange={(e) => set({ price: e.target.value })}
              />
            </Field>
            <Field label="Payout" htmlFor="a_method">
              <Select
                id="a_method"
                value={f.method}
                onChange={(e) => set({ method: e.target.value })}
              >
                {(a.source_type === "TRADE_IN"
                  ? ["TRADE_IN_CREDIT"]
                  : ["UPI", "BANK_TRANSFER", "CASH"]
                ).map((m) => (
                  <option key={m} value={m}>
                    {humanize(m)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payment reference" htmlFor="a_ref">
              <Input
                id="a_ref"
                value={f.ref}
                onChange={(e) => set({ ref: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-space-3">
              <Field label="ID proof" htmlFor="a_idt">
                <Select
                  id="a_idt"
                  value={f.idType}
                  onChange={(e) => set({ idType: e.target.value })}
                >
                  {["AADHAAR", "PAN", "DRIVING_LICENCE", "PASSPORT"].map(
                    (m) => (
                      <option key={m} value={m}>
                        {humanize(m)}
                      </option>
                    ),
                  )}
                </Select>
              </Field>
              <Field
                label="Last 4 digits"
                htmlFor="a_id4"
                hint="Required for large payouts"
              >
                <Input
                  id="a_id4"
                  inputMode="numeric"
                  maxLength={4}
                  value={f.idLast4}
                  onChange={(e) => set({ idLast4: e.target.value })}
                />
              </Field>
            </div>
          </Modal>
          <Modal
            open={dialog === "reject"}
            onClose={close}
            title="Decline this device"
            footer={
              <>
                {cancel}
                <Button
                  variant="destructive"
                  disabled={busy || !f.reason.trim()}
                  onClick={() =>
                    act("reject", { reason: f.reason.trim() }, "Quote declined")
                  }
                >
                  Decline
                </Button>
              </>
            }
          >
            <Field label="Reason" htmlFor="r_reason" required>
              <Textarea
                id="r_reason"
                rows={3}
                value={f.reason}
                onChange={(e) => set({ reason: e.target.value })}
              />
            </Field>
          </Modal>
          <Modal
            open={dialog === "grade"}
            onClose={close}
            title="Grade the device"
            footer={
              <>
                {cancel}
                <Button
                  disabled={busy}
                  onClick={() => act("grade", { grade: f.grade }, "Graded")}
                >
                  Save grade
                </Button>
              </>
            }
          >
            <Field label="Grade" htmlFor="g_grade">
              <Select
                id="g_grade"
                value={f.grade}
                onChange={(e) => set({ grade: e.target.value })}
              >
                {["A", "B", "C"].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                    {a.suggested_grade === g ? " (suggested)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </Modal>
          <Modal
            open={dialog === "part"}
            onClose={close}
            title="Add a spare part"
            description="Taken from this branch's stock at its current cost."
            footer={
              <>
                {cancel}
                <Button
                  disabled={busy || !f.part || !f.desc.trim()}
                  onClick={() =>
                    act(
                      "work-items",
                      {
                        kind: "PART",
                        description: f.desc.trim(),
                        variant_id: f.part,
                        quantity: parseInt(f.qty, 10) || 1,
                      },
                      "Part added",
                    )
                  }
                >
                  Add part
                </Button>
              </>
            }
          >
            <Field label="Part" htmlFor="p_part">
              <ProductSelect
                id="p_part"
                value={part}
                serialized={false}
                placeholder="Search spare parts by name or SKU…"
                onChange={(p) => {
                  setPart(p);
                  set({ part: p ? String(p.id) : "" });
                }}
              />
            </Field>
            <Field label="Quantity" htmlFor="p_qty">
              <Input
                id="p_qty"
                inputMode="numeric"
                value={f.qty}
                onChange={(e) => set({ qty: e.target.value })}
              />
            </Field>
            <Field label="What was done" htmlFor="p_desc">
              <Input
                id="p_desc"
                value={f.desc}
                onChange={(e) => set({ desc: e.target.value })}
              />
            </Field>
          </Modal>
          <Modal
            open={dialog === "labour"}
            onClose={close}
            title="Add labour"
            footer={
              <>
                {cancel}
                <Button
                  disabled={busy || !toMinor(f.cost) || !f.desc.trim()}
                  onClick={() =>
                    act(
                      "work-items",
                      {
                        kind: "LABOUR",
                        description: f.desc.trim(),
                        cost_minor: toMinor(f.cost),
                      },
                      "Labour added",
                    )
                  }
                >
                  Add labour
                </Button>
              </>
            }
          >
            <Field label="What was done" htmlFor="l_desc">
              <Input
                id="l_desc"
                value={f.desc}
                onChange={(e) => set({ desc: e.target.value })}
              />
            </Field>
            <Field label={`Cost (${cur})`} htmlFor="l_cost">
              <Input
                id="l_cost"
                inputMode="decimal"
                value={f.cost}
                onChange={(e) => set({ cost: e.target.value })}
              />
            </Field>
          </Modal>
          <Modal
            open={dialog === "move"}
            onClose={close}
            title="Move to another branch"
            description="The cost moves with the unit."
            footer={
              <>
                {cancel}
                <Button
                  disabled={busy || !f.branch}
                  onClick={() =>
                    act(
                      "move",
                      { to_branch_id: f.branch, note: f.note.trim() || null },
                      "Moved",
                    )
                  }
                >
                  Move
                </Button>
              </>
            }
          >
            <Field label="Branch" htmlFor="m_branch">
              <Select
                id="m_branch"
                value={f.branch}
                onChange={(e) => set({ branch: e.target.value })}
              >
                {otherBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_code} — {b.branch_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note" htmlFor="m_note">
              <Input
                id="m_note"
                value={f.note}
                onChange={(e) => set({ note: e.target.value })}
              />
            </Field>
          </Modal>
          <Modal
            open={dialog === "qc"}
            onClose={close}
            title="Quality check"
            description="Someone other than the person who prepared the unit must do this."
            footer={
              <>
                {cancel}
                <Button
                  disabled={busy}
                  variant={f.outcome === "FAIL" ? "destructive" : "primary"}
                  onClick={() =>
                    act(
                      "qc",
                      {
                        outcome: f.outcome,
                        checks,
                        notes: f.notes.trim() || null,
                      },
                      f.outcome === "PASS"
                        ? "Passed — unit is in stock"
                        : "Sent back for rework",
                    )
                  }
                >
                  {f.outcome === "PASS" ? "Pass" : "Fail"}
                </Button>
              </>
            }
          >
            <div className="mb-space-3 space-y-space-2">
              {QC_CHECKS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-space-2 text-[14px]"
                >
                  <input
                    type="checkbox"
                    checked={checks[c.key]}
                    onChange={(e) =>
                      setChecks({ ...checks, [c.key]: e.target.checked })
                    }
                  />{" "}
                  {c.label}
                </label>
              ))}
            </div>
            <Field label="Outcome" htmlFor="q_out">
              <Select
                id="q_out"
                value={f.outcome}
                onChange={(e) => set({ outcome: e.target.value })}
              >
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail — send back</option>
              </Select>
            </Field>
            <Field label="Notes" htmlFor="q_notes">
              <Textarea
                id="q_notes"
                rows={2}
                value={f.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Field>
          </Modal>
          <Modal
            open={dialog === "scrap"}
            onClose={close}
            title="Scrap this unit"
            description={`The full cost of ${formatMoney(a.cost_basis_minor, cur)} is written off.`}
            footer={
              <>
                {cancel}
                <Button
                  variant="destructive"
                  disabled={busy || !f.reason.trim()}
                  onClick={() =>
                    act("scrap", { reason: f.reason.trim() }, "Scrapped")
                  }
                >
                  Scrap
                </Button>
              </>
            }
          >
            <Field label="Reason" htmlFor="s_reason" required>
              <Textarea
                id="s_reason"
                rows={3}
                value={f.reason}
                onChange={(e) => set({ reason: e.target.value })}
              />
            </Field>
          </Modal>
        </>
      )}
    </PortalShell>
  );
}
