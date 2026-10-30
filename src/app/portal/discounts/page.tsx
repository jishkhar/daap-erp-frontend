"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Add01Icon,
  Delete02Icon,
  Edit02Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { CustomerSelect } from "@/components/erp/CustomerSelect";
import { SEGMENT_META, SEGMENT_ORDER, type Segment } from "@/lib/crm";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  CHANNELS,
  CHANNEL_ORDER,
  erp,
  formatDateTime,
  formatMoney,
  fromMinor,
  toMinor,
  useErpQuery,
  type Channel,
  type Discount,
  type DiscountKind,
  type Customer,
} from "@/lib/erp";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { formatPhone } from "@/lib/phone";

const KIND_LABEL: Record<DiscountKind, string> = {
  percent: "Percentage off",
  flat: "Flat amount off",
  free_delivery: "Free delivery",
  bogo: "Buy one get one",
};

type Scope = "category" | "collection" | "membership" | "individual";
const SCOPES: { key: Scope; label: string; hint: string }[] = [
  {
    key: "category",
    label: "Category",
    hint: "Only products in the chosen categories receive the discount.",
  },
  {
    key: "collection",
    label: "Collection",
    hint: "Only products currently in the chosen collections receive the discount.",
  },
  {
    key: "membership",
    label: "Membership",
    hint: "Customers must hold one of the chosen memberships.",
  },
  {
    key: "individual",
    label: "Individual",
    hint: "Named customers. The code is hidden from storefront coupon lists.",
  },
];

function CheckList({
  items,
  selected,
  onChange,
  loading,
  empty,
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  empty: string;
}) {
  if (!items.length)
    return (
      <p className="text-[13px] text-ink-600">{loading ? "Loading…" : empty}</p>
    );
  return (
    <div className="grid max-h-44 gap-space-2 overflow-y-auto sm:grid-cols-2">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-space-2 text-[14px]"
        >
          <input
            type="checkbox"
            checked={selected.includes(item.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, item.id]
                  : selected.filter((x) => x !== item.id),
              )
            }
          />
          <span className="min-w-0 truncate">{item.label}</span>
        </label>
      ))}
    </div>
  );
}

type Form = {
  scopes: Record<Scope, boolean>;
  categoryIds: string[];
  collectionIds: string[];
  memberships: Segment[];
  customers: Customer[];
  code: string;
  name: string;
  kind: DiscountKind;
  value: string;
  maxDiscount: string;
  minOrder: string;
  channels: Channel[];
  usageLimit: string;
  perCustomerLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY: Form = {
  scopes: {
    category: false,
    collection: false,
    membership: false,
    individual: false,
  },
  categoryIds: [],
  collectionIds: [],
  memberships: [],
  customers: [],
  code: "",
  name: "",
  kind: "percent",
  value: "",
  maxDiscount: "",
  minOrder: "",
  channels: [...CHANNEL_ORDER],
  usageLimit: "",
  perCustomerLimit: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

/** ISO instant -> the value a datetime-local input wants (local time). */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function toForm(d: Discount): Form {
  return {
    scopes: {
      category: d.category_ids.length > 0,
      collection: d.collection_ids.length > 0,
      membership: d.memberships.length > 0,
      individual: d.customer_ids.length > 0,
    },
    categoryIds: d.category_ids,
    collectionIds: d.collection_ids,
    memberships: d.memberships,
    customers: d.contacts,
    code: d.code ?? "",
    name: d.name,
    kind: d.kind,
    value:
      d.kind === "flat"
        ? fromMinor(d.value)
        : d.kind === "percent"
          ? String(d.value)
          : "",
    maxDiscount:
      d.max_discount_minor === null ? "" : fromMinor(d.max_discount_minor),
    minOrder: d.min_order_minor ? fromMinor(d.min_order_minor) : "",
    channels: d.channels,
    usageLimit: d.usage_limit === null ? "" : String(d.usage_limit),
    perCustomerLimit:
      d.per_customer_limit === null ? "" : String(d.per_customer_limit),
    startsAt: toLocalInput(d.starts_at),
    endsAt: toLocalInput(d.ends_at),
    isActive: d.is_active,
  };
}

const intOrNull = (v: string) => (v.trim() ? Number.parseInt(v, 10) : null);

function describe(d: Discount): string {
  if (d.kind === "percent") return `${d.value}% off`;
  if (d.kind === "flat") return `${formatMoney(d.value)} off`;
  return KIND_LABEL[d.kind];
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

function appliesTo(d: Discount): string {
  const parts = [
    d.category_ids.length
      ? plural(d.category_ids.length, "category").replace(
          "categorys",
          "categories",
        )
      : null,
    d.collection_ids.length
      ? plural(d.collection_ids.length, "collection")
      : null,
    d.memberships.length
      ? d.memberships.map((m) => SEGMENT_META[m].label).join(", ")
      : null,
    d.customer_ids.length ? plural(d.customer_ids.length, "customer") : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All products and customers";
}

function status(d: Discount): {
  label: string;
  tone: "success" | "neutral" | "warning";
} {
  const now = Date.now();
  if (!d.is_active) return { label: "Off", tone: "neutral" };
  if (d.ends_at && new Date(d.ends_at).getTime() < now)
    return { label: "Expired", tone: "neutral" };
  if (d.starts_at && new Date(d.starts_at).getTime() > now)
    return { label: "Scheduled", tone: "warning" };
  return { label: "Live", tone: "success" };
}

export default function DiscountsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const discounts = useErpQuery<Discount[]>("/api/v1/discounts");
  const canManage = hasTenantWide(session, "discounts:manage");

  const [editing, setEditing] = useState<Discount | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Discount | null>(null);
  const categories = useErpQuery<{ id: string; name: string }[]>(
    editing && form.scopes.category ? "/api/v1/categories" : null,
  );
  const collections = useErpQuery<{ id: string; name: string }[]>(
    editing && form.scopes.collection ? "/api/v1/collections" : null,
  );
  function openNew() {
    setForm(EMPTY);
    setEditing("new");
  }
  function openEdit(d: Discount) {
    setForm(toForm(d));
    setEditing(d);
  }

  async function toggle(d: Discount) {
    const res = await erp(`/api/v1/discounts/${d.id}`, "PATCH", {
      is_active: !d.is_active,
    });
    if (res.error)
      return toast.error("Couldn't update the discount", res.error);
    discounts.reload();
  }

  async function save() {
    const money = (v: string) => (v.trim() ? toMinor(v) : null);
    const minOrder = money(form.minOrder);
    const maxDiscount = money(form.maxDiscount);
    let value = 0;
    if (form.kind === "percent") value = Number(form.value);
    if (form.kind === "flat") value = money(form.value) ?? 0;
    if (
      (form.kind === "percent" && !(value > 0 && value <= 100)) ||
      (form.kind === "flat" && value <= 0)
    )
      return toast.error(
        "Check the value",
        form.kind === "percent"
          ? "A percentage must be between 0 and 100."
          : "Enter an amount above zero.",
      );
    if (form.minOrder.trim() && minOrder === null)
      return toast.error("Check the minimum order", "Enter a valid amount.");
    if (form.maxDiscount.trim() && maxDiscount === null)
      return toast.error("Check the maximum discount", "Enter a valid amount.");
    if (!form.channels.length)
      return toast.error("Pick a channel", "Choose at least one channel.");

    if (
      (form.scopes.category && !form.categoryIds.length) ||
      (form.scopes.collection && !form.collectionIds.length) ||
      (form.scopes.membership && !form.memberships.length) ||
      (form.scopes.individual && !form.customers.length)
    )
      return toast.error(
        "Choose who this applies to",
        "Select at least one item for every box you ticked, or choose all products and customers.",
      );
    const body = {
      category_ids: form.scopes.category ? form.categoryIds : [],
      collection_ids: form.scopes.collection ? form.collectionIds : [],
      memberships: form.scopes.membership ? form.memberships : [],
      customer_ids: form.scopes.individual
        ? form.customers.map((c) => c.id)
        : [],
      code: form.code.trim() || null,
      name: form.name.trim(),
      kind: form.kind,
      value,
      max_discount_minor: form.kind === "percent" ? maxDiscount : null,
      min_order_minor: minOrder ?? 0,
      channels: form.channels,
      usage_limit: intOrNull(form.usageLimit),
      per_customer_limit: intOrNull(form.perCustomerLimit),
      starts_at: fromLocalInput(form.startsAt),
      ends_at: fromLocalInput(form.endsAt),
      is_active: form.isActive,
    };
    setBusy(true);
    const res =
      editing === "new"
        ? await erp("/api/v1/discounts", "POST", body)
        : await erp(
            `/api/v1/discounts/${(editing as Discount).id}`,
            "PATCH",
            body,
          );
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the discount", res.error);
    toast.success(editing === "new" ? "Discount created" : "Discount saved");
    setEditing(null);
    discounts.reload();
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    const res = await erp<{ deactivated: boolean }>(
      `/api/v1/discounts/${removing.id}`,
      "DELETE",
    );
    setBusy(false);
    if (res.error)
      return toast.error("Couldn't remove the discount", res.error);
    toast.success(
      res.data?.deactivated
        ? "Discount switched off (it has been used on orders)"
        : "Discount removed",
    );
    setRemoving(null);
    discounts.reload();
  }

  const columns = useMemo<ColumnDef<Discount, unknown>[]>(
    () => [
      {
        header: "Discount",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-ink-900">
              {row.original.name}
            </div>
            <div className="font-mono text-[12px] text-ink-600">
              {row.original.code ?? "Applied automatically"}
            </div>
          </div>
        ),
      },
      { header: "Offer", cell: ({ row }) => describe(row.original) },
      {
        header: "Applies to",
        cell: ({ row }) => (
          <div className="text-ink-600">
            {appliesTo(row.original)}
            {row.original.customer_ids.length > 0 && (
              <p className="text-xs">Private campaign offer</p>
            )}
          </div>
        ),
      },
      {
        header: "Min order",
        cell: ({ row }) =>
          row.original.min_order_minor ? (
            formatMoney(row.original.min_order_minor)
          ) : (
            <span className="text-ink-400">—</span>
          ),
      },
      {
        header: "Channels",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {row.original.channels.map((c) => CHANNELS[c].label).join(", ")}
          </span>
        ),
      },
      {
        header: "Valid",
        cell: ({ row }) =>
          row.original.starts_at || row.original.ends_at ? (
            <span className="text-ink-600">
              {row.original.starts_at
                ? formatDateTime(row.original.starts_at)
                : "Now"}
              {" → "}
              {row.original.ends_at
                ? formatDateTime(row.original.ends_at)
                : "No end"}
            </span>
          ) : (
            <span className="text-ink-400">Always</span>
          ),
      },
      {
        header: "Used",
        cell: ({ row }) =>
          `${row.original.times_used}${row.original.usage_limit !== null ? ` / ${row.original.usage_limit}` : ""}`,
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const s = status(row.original);
          return <Badge tone={s.tone}>{s.label}</Badge>;
        },
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: Discount } }) => (
                <div className="flex items-center justify-end gap-space-2">
                  <Switch
                    size="sm"
                    tone="success"
                    checked={row.original.is_active}
                    onChange={() => toggle(row.original)}
                    aria-label={`Toggle ${row.original.name}`}
                  />
                  <Button
                    variant="ghost"
                    onClick={() => openEdit(row.original)}
                    aria-label="Edit"
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setRemoving(row.original)}
                    aria-label="Delete"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                  </Button>
                </div>
              ),
            } as ColumnDef<Discount, unknown>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage],
  );

  if (!ready) return null;

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const needsValue = form.kind === "percent" || form.kind === "flat";

  return (
    <PortalShell tenant={tenant} active="discounts">
      <PageHeader
        icon={<HugeiconsIcon icon={Tag01Icon} size={20} />}
        title="Discounts"
        description="Coupon codes and promotions across Website, POS and WhatsApp."
        actionsClassName="w-full justify-end md:w-auto"
        actions={
          canManage && (
            <Button onClick={openNew}>
              <HugeiconsIcon icon={Add01Icon} size={16} /> New discount
            </Button>
          )
        }
      />
      {discounts.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {discounts.error}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={discounts.data ?? []}
          getRowId={(d) => d.id}
          loading={discounts.loading}
          emptyMessage={
            discounts.loading ? "Loading discounts…" : "No discounts yet."
          }
        />
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New discount" : "Edit discount"}
        description="Shoppers enter the code at checkout; leave it empty for an offer with no code."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={busy || !form.name.trim()} onClick={save}>
              {editing === "new" ? "Create discount" : "Save changes"}
            </Button>
          </>
        }
      >
        <Field label="Name" htmlFor="d_name" required>
          <Input
            id="d_name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Coupon code" htmlFor="d_code">
          <Input
            id="d_code"
            value={form.code}
            className="uppercase"
            onChange={(e) => set("code", e.target.value)}
          />
        </Field>
        <Field
          label="Applies to"
          htmlFor="d_target"
          hint="Tick several to combine them: a customer must match the customer options and the basket must contain a matching product."
        >
          <div id="d_target" className="space-y-space-3">
            <label className="flex items-center gap-space-2 text-[14px]">
              <input
                type="checkbox"
                checked={!SCOPES.some((x) => form.scopes[x.key])}
                onChange={() =>
                  set("scopes", {
                    category: false,
                    collection: false,
                    membership: false,
                    individual: false,
                  })
                }
              />
              All products and customers
            </label>
            {SCOPES.map((scope) => (
              <div key={scope.key} className="space-y-space-2">
                <label className="flex items-center gap-space-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={form.scopes[scope.key]}
                    onChange={(e) =>
                      set("scopes", {
                        ...form.scopes,
                        [scope.key]: e.target.checked,
                      })
                    }
                  />
                  {scope.label}
                </label>
                {form.scopes[scope.key] && (
                  <div className="ml-6 space-y-space-2 rounded-md border border-line p-space-3">
                    <p className="text-[12.5px] text-ink-600">{scope.hint}</p>
                    {scope.key === "category" && (
                      <>
                        <CheckList
                          items={(categories.data ?? []).map((c) => ({
                            id: c.id,
                            label: c.name,
                          }))}
                          selected={form.categoryIds}
                          onChange={(ids) => set("categoryIds", ids)}
                          loading={categories.loading}
                          empty="No categories yet."
                        />
                        {categories.error && (
                          <p className="text-sm text-error">
                            {categories.error}
                          </p>
                        )}
                      </>
                    )}
                    {scope.key === "collection" && (
                      <>
                        <CheckList
                          items={(collections.data ?? []).map((c) => ({
                            id: c.id,
                            label: c.name,
                          }))}
                          selected={form.collectionIds}
                          onChange={(ids) => set("collectionIds", ids)}
                          loading={collections.loading}
                          empty="No collections yet."
                        />
                        {collections.error && (
                          <p className="text-sm text-error">
                            {collections.error}
                          </p>
                        )}
                      </>
                    )}
                    {scope.key === "membership" && (
                      <CheckList
                        items={SEGMENT_ORDER.filter(
                          (key) => key !== "not_member",
                        ).map((key) => ({
                          id: key,
                          label: SEGMENT_META[key].label,
                        }))}
                        selected={form.memberships}
                        onChange={(ids) => set("memberships", ids as Segment[])}
                        empty="No memberships."
                      />
                    )}
                    {scope.key === "individual" && (
                      <>
                        <CustomerSelect
                          id="d_contact"
                          value={null}
                          onChange={(customer) =>
                            customer &&
                            !form.customers.some((c) => c.id === customer.id) &&
                            set("customers", [...form.customers, customer])
                          }
                        />
                        {form.customers.length > 0 && (
                          <ul className="space-y-space-1">
                            {form.customers.map((c) => (
                              <li
                                key={c.id}
                                className="flex items-center justify-between gap-space-2 rounded-md bg-ink-50 px-space-3 py-space-1 text-[14px]"
                              >
                                <span className="min-w-0 truncate">
                                  {c.name}
                                  {c.phone && (
                                    <span className="text-[12px] text-ink-400">
                                      {" "}
                                      · {c.phone}
                                    </span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Remove ${c.name}`}
                                  onClick={() =>
                                    set(
                                      "customers",
                                      form.customers.filter(
                                        (x) => x.id !== c.id,
                                      ),
                                    )
                                  }
                                  className="shrink-0 text-ink-400 hover:text-ink-900"
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Field>
        <Field label="Type" htmlFor="d_kind">
          <Select
            id="d_kind"
            value={form.kind}
            onValueChange={(value) => set("kind", value as DiscountKind)}
          >
            {(Object.keys(KIND_LABEL) as DiscountKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        {needsValue && (
          <Field
            label={form.kind === "percent" ? "Percentage (%)" : "Amount (₹)"}
            htmlFor="d_value"
            required
          >
            <Input
              id="d_value"
              inputMode="decimal"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
            />
          </Field>
        )}
        {form.kind === "percent" && (
          <Field label="Maximum discount (₹)" htmlFor="d_max">
            <Input
              id="d_max"
              inputMode="decimal"
              value={form.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
            />
          </Field>
        )}
        <Field label="Minimum order (₹)" htmlFor="d_min">
          <Input
            id="d_min"
            inputMode="decimal"
            value={form.minOrder}
            onChange={(e) => set("minOrder", e.target.value)}
          />
        </Field>
        <Field label="Channels">
          <div className="flex flex-wrap gap-space-3">
            {CHANNEL_ORDER.map((c) => (
              <label
                key={c}
                className="flex items-center gap-space-2 text-[14px]"
              >
                <input
                  type="checkbox"
                  checked={form.channels.includes(c)}
                  onChange={(e) =>
                    set(
                      "channels",
                      e.target.checked
                        ? [...form.channels, c]
                        : form.channels.filter((x) => x !== c),
                    )
                  }
                />
                {CHANNELS[c].label}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-space-3">
          <Field label="Total uses allowed" htmlFor="d_use">
            <Input
              id="d_use"
              inputMode="numeric"
              value={form.usageLimit}
              onChange={(e) =>
                set("usageLimit", e.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          <Field label="Uses per customer" htmlFor="d_pc">
            <Input
              id="d_pc"
              inputMode="numeric"
              value={form.perCustomerLimit}
              onChange={(e) =>
                set("perCustomerLimit", e.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          <Field label="Starts" htmlFor="d_start">
            <Input
              id="d_start"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
          </Field>
          <Field label="Ends" htmlFor="d_end">
            <Input
              id="d_end"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
            />
          </Field>
        </div>
        <div className="flex items-center gap-space-3 text-[14px]">
          <Switch
            tone="success"
            checked={form.isActive}
            onChange={() => set("isActive", !form.isActive)}
            aria-label="Active"
          />
          Active
        </div>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Remove discount?"
        message={`“${removing?.name ?? ""}” will be removed. If it has already been used on orders it is switched off instead.`}
        confirmLabel="Remove"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </PortalShell>
  );
}
