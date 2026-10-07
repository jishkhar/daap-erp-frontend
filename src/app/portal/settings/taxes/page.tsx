"use client";

import { AlertTriangle, Percent } from "lucide-react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  erp,
  formatMoney,
  fromMinor,
  toMinor,
  useErpQuery,
  type TaxRule,
} from "@/lib/erp";
import {
  hasPermission,
  refreshStaffSession,
  useStaffSession,
} from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { SkeletonLines } from "@/components/ui/Skeleton";

type Registration = {
  id: string;
  gstin: string;
  state_code: string;
  state_name: string | null;
  pan: string;
  legal_name: string;
  trade_name: string | null;
  registration_type: "regular" | "composition";
  registered_address: string | null;
  is_default: boolean;
  is_active: boolean;
  branch_count: number;
};
type Listing = {
  registrations: Registration[];
  unlinked_branches: {
    id: string;
    branch_code: string;
    branch_name: string;
    state: string | null;
  }[];
};
type Draft = {
  id?: string;
  gstin: string;
  legal_name: string;
  trade_name: string;
  registration_type: string;
  registered_address: string;
  is_default: boolean;
  is_active: boolean;
};
const EMPTY: Draft = {
  gstin: "",
  legal_name: "",
  trade_name: "",
  registration_type: "regular",
  registered_address: "",
  is_default: false,
  is_active: true,
};
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function TaxesPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const listing = useErpQuery<Listing>("/api/v1/tenant/gst-registrations");
  const rules = useErpQuery<TaxRule[]>("/api/v1/tax-rules");
  const bandsQuery = useErpQuery<
    Record<string, { up_to_minor: number | null; rate_bps: number }[]>
  >("/api/v1/tax-rule-bands");
  const [bandEdit, setBandEdit] = useState<{
    code: string;
    rows: { limit: string; rate: string }[];
  } | null>(null);
  const tenantView = useErpQuery<{
    settings: { tax_inclusive_prices: boolean };
  }>("/api/v1/tenant");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [assign, setAssign] = useState<{
    id: string;
    name: string;
    registrationId: string;
  } | null>(null);
  const [removing, setRemoving] = useState<Registration | null>(null);
  const [busy, setBusy] = useState(false);
  const canWrite = hasPermission(session, "settings", "write");

  if (!ready) return null;
  const regs = listing.data?.registrations ?? [];
  const active = regs.filter((r) => r.is_active);
  const unlinked = listing.data?.unlinked_branches ?? [];
  const set = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));
  const gstin = draft?.gstin.trim().toUpperCase() ?? "";
  const gstinOk = GSTIN.test(gstin);

  async function save() {
    if (!draft) return;
    const body = {
      gstin,
      legal_name: draft.legal_name.trim(),
      trade_name: draft.trade_name.trim() || null,
      registration_type: draft.registration_type,
      registered_address: draft.registered_address.trim() || null,
      is_default: draft.is_default,
    };
    setBusy(true);
    const res = draft.id
      ? await erp(`/api/v1/tenant/gst-registrations/${draft.id}`, "PATCH", {
          ...body,
          is_active: draft.is_active,
        })
      : await erp("/api/v1/tenant/gst-registrations", "POST", body);
    setBusy(false);
    if (res.error)
      return toast.error("Couldn't save the registration", res.error);
    toast.success(draft.id ? "Registration updated" : "Registration added");
    setDraft(null);
    listing.reload();
  }

  async function setPricing(value: boolean) {
    setBusy(true);
    const res = await erp("/api/v1/tenant/settings", "PATCH", {
      tax_inclusive_prices: value,
    });
    setBusy(false);
    if (res.error)
      return toast.error("Couldn't change the pricing mode", res.error);
    toast.success(value ? "Prices now include tax" : "Prices now exclude tax");
    tenantView.reload();
    await refreshStaffSession(); // the New order screen reads the mode from the stored session
  }

  async function saveBands() {
    if (!bandEdit) return;
    const bands: { up_to_minor: number | null; rate_bps: number }[] = [];
    for (const r of bandEdit.rows) {
      const rate = Number(r.rate);
      const limit = r.limit.trim() === "" ? null : toMinor(r.limit);
      if (
        Number.isNaN(rate) ||
        rate < 0 ||
        rate > 100 ||
        r.rate.trim() === "" ||
        (r.limit.trim() !== "" && (limit === null || limit <= 0))
      )
        return toast.error(
          "Check the bands",
          "Each band needs a rate between 0 and 100, and a price limit above zero (or blank for 'above the highest limit').",
        );
      bands.push({ up_to_minor: limit, rate_bps: Math.round(rate * 100) });
    }
    setBusy(true);
    const res = await erp(
      `/api/v1/tax-rules/${encodeURIComponent(bandEdit.code)}/bands`,
      "PUT",
      { bands },
    );
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the bands", res.error);
    toast.success("Price bands saved");
    setBandEdit(null);
    bandsQuery.reload();
  }

  async function assignBranch() {
    if (!assign) return;
    setBusy(true);
    const res = await erp(
      `/api/v1/branches/${assign.id}/gst-registration`,
      "PUT",
      { gst_registration_id: assign.registrationId || null },
    );
    setBusy(false);
    if (res.error) return toast.error("Couldn't assign the branch", res.error);
    toast.success("Branch updated");
    setAssign(null);
    listing.reload();
  }

  async function remove() {
    if (!removing) return;
    const res = await erp(
      `/api/v1/tenant/gst-registrations/${removing.id}`,
      "DELETE",
    );
    if (res.error) return toast.error("Couldn't delete", res.error);
    toast.success("Registration deleted");
    setRemoving(null);
    listing.reload();
  }

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<Percent size={20} />}
        title="Taxes and duties"
        description="GST registrations, how tax is split, and the rates in use."
        actions={
          canWrite && (
            <Button onClick={() => setDraft({ ...EMPTY })}>
              Add registration
            </Button>
          )
        }
      />
      {listing.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {listing.error}
        </p>
      )}

      <div className="flex flex-col gap-space-4">
        <Card className="p-space-4">
          <h2 className="text-[15px] font-bold text-ink-900">Prices</h2>
          <p className="mb-space-3 mt-0.5 text-[13px] text-ink-600">
            Whether the price on a product already contains GST. This applies to
            orders placed from now on; existing orders and invoices don&apos;t
            change.
          </p>
          {tenantView.data ? (
            <div className="grid gap-space-3 sm:grid-cols-2">
              {(
                [
                  [
                    true,
                    "All prices include tax",
                    "Customers pay the price shown (the usual MRP for retail). GST is carved out of it and shown on the invoice.",
                  ],
                  [
                    false,
                    "Prices exclude tax",
                    "GST is added on top of the price at checkout (common for B2B and wholesale).",
                  ],
                ] as const
              ).map(([value, title, text]) => {
                const selected =
                  tenantView.data!.settings.tax_inclusive_prices === value;
                return (
                  <button
                    key={String(value)}
                    type="button"
                    disabled={busy || !canWrite || selected}
                    onClick={() => setPricing(value)}
                    aria-pressed={selected}
                    className={`rounded-md border px-space-3 py-space-3 text-left ${selected ? "border-brand-400 bg-brand-50" : "border-line hover:bg-paper"} disabled:cursor-default`}
                  >
                    <p className="text-[14px] font-semibold text-ink-900">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-600">{text}</p>
                  </button>
                );
              })}
            </div>
          ) : (tenantView.loading ? <SkeletonLines rows={2} /> : null)}
        </Card>

        <Card className="p-space-4">
          <h2 className="text-[15px] font-bold text-ink-900">
            GST registrations
          </h2>
          <p className="mb-space-3 mt-0.5 text-[13px] text-ink-600">
            A GSTIN is issued per state. Each branch trades under one
            registration; invoices show it as the seller.
          </p>
          {regs.length === 0 ? (
            <>{listing.loading ? <SkeletonLines rows={2} /> : <p className="rounded-md border border-line px-space-3 py-space-4 text-[13.5px] text-ink-400">{"No GST registration yet. Add your GSTIN so invoices show the seller's details."}</p>}</>
          ) : (
            <div className="divide-y divide-line rounded-md border border-line">
              {regs.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-space-3 px-space-3 py-space-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold tracking-wide text-ink-900">
                      {r.gstin}
                    </p>
                    <p className="text-[13px] text-ink-600">
                      {r.state_name ?? r.state_code} ({r.state_code}) ·{" "}
                      {r.legal_name}
                    </p>
                    <p className="text-[12px] text-ink-400">
                      PAN {r.pan} · {r.branch_count} active branch
                      {r.branch_count === 1 ? "" : "es"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-space-2">
                    {r.is_default && <Badge tone="brand">Default</Badge>}
                    {r.registration_type === "composition" && (
                      <Badge tone="warning">Composition</Badge>
                    )}
                    <Badge tone={r.is_active ? "success" : "neutral"}>
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setDraft({
                            id: r.id,
                            gstin: r.gstin,
                            legal_name: r.legal_name,
                            trade_name: r.trade_name ?? "",
                            registration_type: r.registration_type,
                            registered_address: r.registered_address ?? "",
                            is_default: r.is_default,
                            is_active: r.is_active,
                          })
                        }
                      >
                        Edit
                      </Button>
                    )}
                    {canWrite && (
                      <Button variant="ghost" onClick={() => setRemoving(r)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {regs.length > 0 && (
            <p className="mt-space-2 text-[12.5px] text-ink-400">
              PAN (company level): {regs[0].pan}
            </p>
          )}
          {unlinked.length > 0 && (
            <div className="mt-space-3 rounded-md border border-warning/30 bg-warning-tint px-space-3 py-space-3">
              <p className="flex items-center gap-space-2 text-[13.5px] font-semibold text-ink-900">
                <AlertTriangle size={15} className="text-warning" />{" "}
                {unlinked.length} branch
                {unlinked.length === 1 ? " has" : "es have"} no GST registration
              </p>
              <ul className="mt-space-2 space-y-1">
                {unlinked.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between text-[13.5px]"
                  >
                    <span>
                      {b.branch_name}{" "}
                      <span className="text-ink-400">
                        ({b.branch_code}
                        {b.state ? `, ${b.state}` : ""})
                      </span>
                    </span>
                    {canWrite && active.length > 0 && (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setAssign({
                            id: b.id,
                            name: b.branch_name,
                            registrationId: active[0].id,
                          })
                        }
                      >
                        Assign
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-space-2 text-[12.5px] text-ink-600">
                Invoices from these branches won&apos;t show a seller GSTIN.
              </p>
            </div>
          )}
        </Card>

        {active.length > 0 && (
          <Card className="p-space-4">
            <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
              How tax is split
            </h2>
            <div className="space-y-space-3 text-[13.5px] text-ink-600">
              {active.map((r) => (
                <div key={r.id}>
                  <p className="font-semibold text-ink-900">
                    Sold from the {r.state_name ?? r.state_code} registration (
                    {r.state_code})
                  </p>
                  <ul className="list-disc pl-space-5">
                    <li>
                      Delivered or sold in {r.state_name ?? r.state_code}:{" "}
                      <strong>CGST + SGST</strong> (half each)
                    </li>
                    <li>
                      Delivered to any other state: <strong>IGST</strong>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-space-3 text-[12.5px] text-ink-400">
              The rate itself comes from each product, not from the state.
            </p>
          </Card>
        )}

        <Card className="p-space-4">
          <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">Tax rates</h2>
          {(rules.data ?? []).length === 0 ? (rules.loading ? <SkeletonLines rows={2} /> : <p className="text-[13.5px] text-ink-400">{"No tax rates defined."}</p>) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-ink-400">
                  <th className="py-1">Code</th>
                  <th>Name</th>
                  <th className="text-right">Rate</th>
                  <th>Price bands</th>
                </tr>
              </thead>
              <tbody>
                {(rules.data ?? []).map((t) => {
                  const bands = bandsQuery.data?.[t.code] ?? [];
                  return (
                    <tr key={t.id} className="border-t border-line align-top">
                      <td className="py-1.5 font-medium">{t.code}</td>
                      <td>{t.name}</td>
                      <td className="text-right tabular-nums">
                        {t.rate_bps / 100}%
                      </td>
                      <td className="pl-space-3 text-[13px] text-ink-600">
                        {bands.length === 0 ? (
                          <span className="text-ink-400">None</span>
                        ) : (
                          bands.map((b, i) => (
                            <div key={i}>
                              {b.up_to_minor === null
                                ? "Above"
                                : `Up to ${formatMoney(b.up_to_minor, tenant?.currency ?? "INR")}`}
                              : {b.rate_bps / 100}%
                            </div>
                          ))
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            className="mt-0.5 text-[12.5px] font-semibold text-brand-700 underline"
                            onClick={() =>
                              setBandEdit({
                                code: t.code,
                                rows: bands.length
                                  ? bands.map((b) => ({
                                      limit:
                                        b.up_to_minor === null
                                          ? ""
                                          : fromMinor(b.up_to_minor),
                                      rate: String(b.rate_bps / 100),
                                    }))
                                  : [
                                      {
                                        limit: "",
                                        rate: String(t.rate_bps / 100),
                                      },
                                    ],
                              })
                            }
                          >
                            {bands.length ? "Edit" : "Add"} bands
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-space-2 text-[12.5px] text-ink-400">
            Rates apply per product through its tax code. Price bands change the
            rate by price per piece (for example clothing: one rate up to a
            limit, another above). The band is chosen from the price per piece
            as listed, before any discount. Confirm the limits with your CA.
          </p>
        </Card>
      </div>

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        width="lg"
        title={draft?.id ? "Edit GST registration" : "Add GST registration"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !gstinOk || !draft?.legal_name.trim()}
              onClick={save}
            >
              {draft?.id ? "Save changes" : "Add registration"}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-x-space-4 sm:grid-cols-2">
            <Field
              label="GSTIN"
              htmlFor="g_gstin"
              required
              className="sm:col-span-2"
              error={
                draft.gstin.trim() && !gstinOk
                  ? "15 characters, like 07AAAAA0000A1Z5."
                  : undefined
              }
              hint={
                gstinOk
                  ? `State code ${gstin.slice(0, 2)} · PAN ${gstin.slice(2, 12)}`
                  : "The state and PAN are read from the GSTIN."
              }
            >
              <Input
                id="g_gstin"
                value={draft.gstin}
                maxLength={15}
                onChange={(e) => set({ gstin: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Legal name" htmlFor="g_legal" required>
              <Input
                id="g_legal"
                value={draft.legal_name}
                onChange={(e) => set({ legal_name: e.target.value })}
              />
            </Field>
            <Field label="Trade name" htmlFor="g_trade">
              <Input
                id="g_trade"
                value={draft.trade_name}
                onChange={(e) => set({ trade_name: e.target.value })}
              />
            </Field>
            <Field
              label="Registration type"
              htmlFor="g_type"
              className="sm:col-span-2"
              hint="Composition-scheme businesses can't charge GST on invoices or claim input credit."
            >
              <Select
                id="g_type"
                value={draft.registration_type}
                onChange={(e) => set({ registration_type: e.target.value })}
              >
                <option value="regular">Regular</option>
                <option value="composition">Composition</option>
              </Select>
            </Field>
            <Field
              label="Registered address"
              htmlFor="g_addr"
              className="sm:col-span-2"
            >
              <Textarea
                id="g_addr"
                rows={3}
                value={draft.registered_address}
                onChange={(e) => set({ registered_address: e.target.value })}
              />
            </Field>
            <div className="mb-space-4 flex items-center gap-space-3 sm:col-span-2">
              <Switch
                checked={draft.is_default}
                onChange={() => set({ is_default: !draft.is_default })}
                aria-label="Default registration"
              />
              <span className="text-[14px] text-ink-900">
                Default registration
              </span>
            </div>
            {draft.id && (
              <div className="mb-space-4 flex items-center gap-space-3 sm:col-span-2">
                <Switch
                  checked={draft.is_active}
                  onChange={() => set({ is_active: !draft.is_active })}
                  aria-label="Active"
                />
                <span className="text-[14px] text-ink-900">Active</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={bandEdit !== null}
        onClose={() => setBandEdit(null)}
        width="md"
        title={`Price bands for ${bandEdit?.code ?? ""}`}
        description="Leave the limit blank for the rate above the highest limit."
        footer={
          <>
            <Button variant="ghost" onClick={() => setBandEdit(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={saveBands}>
              Save bands
            </Button>
          </>
        }
      >
        {bandEdit && (
          <div className="space-y-space-2">
            {bandEdit.rows.map((r, i) => (
              <div key={i} className="flex items-end gap-space-2">
                <Field
                  label={i === 0 ? "Price per piece up to" : undefined}
                  htmlFor={`band_l${i}`}
                  className="!mb-0 flex-1"
                >
                  <Input
                    id={`band_l${i}`}
                    inputMode="decimal"
                    placeholder="No limit"
                    value={r.limit}
                    onChange={(e) =>
                      setBandEdit({
                        ...bandEdit,
                        rows: bandEdit.rows.map((x, j) =>
                          j === i ? { ...x, limit: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <Field
                  label={i === 0 ? "Rate %" : undefined}
                  htmlFor={`band_r${i}`}
                  className="!mb-0 w-28"
                >
                  <Input
                    id={`band_r${i}`}
                    inputMode="decimal"
                    value={r.rate}
                    onChange={(e) =>
                      setBandEdit({
                        ...bandEdit,
                        rows: bandEdit.rows.map((x, j) =>
                          j === i ? { ...x, rate: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <Button
                  variant="ghost"
                  aria-label="Remove band"
                  onClick={() =>
                    setBandEdit({
                      ...bandEdit,
                      rows: bandEdit.rows.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                setBandEdit({
                  ...bandEdit,
                  rows: [...bandEdit.rows, { limit: "", rate: "" }],
                })
              }
            >
              Add band
            </Button>
            <p className="text-[12.5px] text-ink-400">
              Removing every band returns the code to its single rate.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={assign !== null}
        onClose={() => setAssign(null)}
        title={`GST registration for ${assign?.name ?? ""}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssign(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={assignBranch}>
              Assign
            </Button>
          </>
        }
      >
        {assign && (
          <Field label="Registration" htmlFor="a_reg">
            <Select
              id="a_reg"
              value={assign.registrationId}
              onChange={(e) =>
                setAssign({ ...assign, registrationId: e.target.value })
              }
            >
              {active.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.gstin} — {r.state_name ?? r.state_code}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Delete this GST registration?"
        message={
          removing
            ? `${removing.gstin} will be removed. This can't be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </PortalShell>
  );
}
