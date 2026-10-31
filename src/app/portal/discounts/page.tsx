"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Add01Icon,
  Delete02Icon,
  DeliveryTruck01Icon,
  Edit02Icon,
  GiftIcon,
  PackageIcon,
  MoneyBag02Icon,
  PercentCircleIcon,
  RefreshIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChipList,
  CheckList,
  OptionCard,
  Section,
  generateCode,
} from "@/components/ui/FormSection";
import {
  DateTimeField,
  isoToLocalInput,
  localInputToIso,
} from "@/components/ui/DateTimeField";
import { useMemo, useState } from "react";
import { CustomerSelect } from "@/components/erp/CustomerSelect";
import { ProductPicker } from "@/components/erp/ProductPicker";
import { useBranches } from "@/hooks/useBranches";
import type { CustomerAccount } from "@/lib/wholesale";
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
  buy_x_get_y: "Buy X get Y",
  fixed_price: "Fixed price",
};

const KIND_META: Record<
  DiscountKind,
  { icon: typeof Tag01Icon; hint: string }
> = {
  percent: { icon: PercentCircleIcon, hint: "e.g. 10% off" },
  flat: { icon: MoneyBag02Icon, hint: "e.g. ₹200 off" },
  free_delivery: { icon: DeliveryTruck01Icon, hint: "Free shipping" },
  bogo: { icon: GiftIcon, hint: "Buy 1 Get 1" },
  buy_x_get_y: { icon: PackageIcon, hint: "e.g. Buy 3 Get 1" },
  fixed_price: { icon: Tag01Icon, hint: "Special price" },
};

type Scope =
  | "category"
  | "collection"
  | "product"
  | "membership"
  | "tag"
  | "individual"
  | "b2b";
const SCOPES: {
  key: Scope;
  group: "product" | "customer";
  title: string;
  hint: string;
}[] = [
  {
    key: "category",
    group: "product",
    title: "Specific categories",
    hint: "Select categories",
  },
  {
    key: "collection",
    group: "product",
    title: "Specific collections",
    hint: "Select collections",
  },
  {
    key: "product",
    group: "product",
    title: "Specific products",
    hint: "Select products / SKUs",
  },
  {
    key: "membership",
    group: "customer",
    title: "Membership",
    hint: "Select tiers",
  },
  {
    key: "tag",
    group: "customer",
    title: "Customer tags / segments",
    hint: "Select customer tags",
  },
  {
    key: "individual",
    group: "customer",
    title: "Individual customers",
    hint: "Select customers",
  },
  {
    key: "b2b",
    group: "customer",
    title: "B2B accounts",
    hint: "Select business accounts",
  },
];

type Form = {
  scopes: Record<Scope, boolean>;
  categoryIds: string[];
  collectionIds: string[];
  products: { id: string; name: string }[];
  memberships: Segment[];
  tags: string[];
  customers: Customer[];
  accountIds: string[];
  branchIds: string[];
  code: string;
  name: string;
  description: string;
  kind: DiscountKind;
  value: string;
  buyQty: string;
  getQty: string;
  maxDiscount: string;
  minOrder: string;
  channels: Channel[];
  usageLimit: string;
  perCustomerLimit: string;
  minQuantity: string;
  combineDiscounts: boolean;
  combinePoints: boolean;
  priority: "low" | "normal" | "high";
  applyOn: "subtotal" | "total";
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const NO_SCOPES: Record<Scope, boolean> = {
  category: false,
  collection: false,
  product: false,
  membership: false,
  tag: false,
  individual: false,
  b2b: false,
};

const EMPTY: Form = {
  scopes: NO_SCOPES,
  categoryIds: [],
  collectionIds: [],
  products: [],
  memberships: [],
  tags: [],
  customers: [],
  accountIds: [],
  branchIds: [],
  code: "",
  name: "",
  description: "",
  kind: "percent",
  value: "",
  buyQty: "",
  getQty: "",
  maxDiscount: "",
  minOrder: "",
  channels: [...CHANNEL_ORDER],
  usageLimit: "",
  perCustomerLimit: "",
  minQuantity: "",
  combineDiscounts: false,
  combinePoints: false,
  priority: "normal",
  applyOn: "subtotal",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

const toLocalInput = isoToLocalInput;
const fromLocalInput = localInputToIso;

function toForm(d: Discount): Form {
  const moneyValue = d.kind === "flat" || d.kind === "fixed_price";
  return {
    scopes: {
      category: d.category_ids.length > 0,
      collection: d.collection_ids.length > 0,
      product: d.product_ids.length > 0,
      membership: d.memberships.length > 0,
      tag: d.customer_tags.length > 0,
      individual: d.customer_ids.length > 0,
      b2b: d.account_ids.length > 0,
    },
    categoryIds: d.category_ids,
    collectionIds: d.collection_ids,
    products: d.products,
    memberships: d.memberships,
    tags: d.customer_tags,
    customers: d.contacts,
    accountIds: d.account_ids,
    branchIds: d.branch_ids ?? [],
    code: d.code ?? "",
    name: d.name,
    description: d.description ?? "",
    kind: d.kind,
    value: moneyValue
      ? fromMinor(d.value)
      : d.kind === "percent"
        ? String(d.value)
        : "",
    buyQty: d.buy_quantity === null ? "" : String(d.buy_quantity),
    getQty: d.get_quantity === null ? "" : String(d.get_quantity),
    maxDiscount:
      d.max_discount_minor === null ? "" : fromMinor(d.max_discount_minor),
    minOrder: d.min_order_minor ? fromMinor(d.min_order_minor) : "",
    channels: d.channels,
    usageLimit: d.usage_limit === null ? "" : String(d.usage_limit),
    perCustomerLimit:
      d.per_customer_limit === null ? "" : String(d.per_customer_limit),
    minQuantity: d.min_quantity > 1 ? String(d.min_quantity) : "",
    combineDiscounts: d.combine_with_discounts,
    combinePoints: d.combine_with_points,
    priority: d.priority,
    applyOn: d.apply_on,
    startsAt: toLocalInput(d.starts_at),
    endsAt: toLocalInput(d.ends_at),
    isActive: d.is_active,
  };
}

const intOrNull = (v: string) => (v.trim() ? Number.parseInt(v, 10) : null);

function describe(d: Discount): string {
  if (d.kind === "percent") return `${d.value}% off`;
  if (d.kind === "flat") return `${formatMoney(d.value)} off`;
  if (d.kind === "fixed_price") return `${formatMoney(d.value)} each`;
  if (d.kind === "buy_x_get_y")
    return `Buy ${d.buy_quantity ?? 1} get ${d.get_quantity ?? 1}`;
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
    d.product_ids.length ? plural(d.product_ids.length, "product") : null,
    d.customer_tags.length ? d.customer_tags.join(", ") : null,
    d.account_ids.length
      ? plural(d.account_ids.length, "business account")
      : null,
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
  const tagList = useErpQuery<{ tag: string; customers: number }[]>(
    editing && form.scopes.tag ? "/api/v1/crm/tags" : null,
  );
  const accounts = useErpQuery<CustomerAccount[]>(
    editing && form.scopes.b2b
      ? "/api/v1/customer-accounts?status=active&limit=200"
      : null,
  );
  const branches = useBranches(editing !== null);
  const [branchMode, setBranchMode] = useState<"all" | "selected">("all");
  function openNew() {
    setForm(EMPTY);
    setBranchMode("all");
    setEditing("new");
  }
  function openEdit(d: Discount) {
    setForm(toForm(d));
    setBranchMode(d.branch_ids?.length ? "selected" : "all");
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

  async function save(asDraft = false) {
    const money = (v: string) => (v.trim() ? toMinor(v) : null);
    const minOrder = money(form.minOrder);
    const maxDiscount = money(form.maxDiscount);
    const moneyKind = form.kind === "flat" || form.kind === "fixed_price";
    let value = 0;
    if (form.kind === "percent") value = Number(form.value);
    if (moneyKind) value = money(form.value) ?? 0;
    if (
      (form.kind === "percent" && !(value > 0 && value <= 100)) ||
      (moneyKind && value <= 0)
    )
      return toast.error(
        "Check the value",
        form.kind === "percent"
          ? "A percentage must be between 0 and 100."
          : "Enter an amount above zero.",
      );
    const buy = intOrNull(form.buyQty);
    const get = intOrNull(form.getQty);
    if (form.kind === "buy_x_get_y" && (!buy || !get))
      return toast.error(
        "Check the quantities",
        "Enter how many to buy and how many come free.",
      );
    if (form.minOrder.trim() && minOrder === null)
      return toast.error("Check the minimum order", "Enter a valid amount.");
    if (form.maxDiscount.trim() && maxDiscount === null)
      return toast.error("Check the maximum discount", "Enter a valid amount.");
    if (!form.channels.length)
      return toast.error("Pick a channel", "Choose at least one channel.");
    if (form.scopes.individual && !form.customers.length)
      return toast.error(
        "Choose who this applies to",
        "Select at least one customer.",
      );
    if (
      (form.scopes.category && !form.categoryIds.length) ||
      (form.scopes.collection && !form.collectionIds.length) ||
      (form.scopes.product && !form.products.length) ||
      (form.scopes.membership && !form.memberships.length) ||
      (form.scopes.tag && !form.tags.length) ||
      (form.scopes.b2b && !form.accountIds.length)
    )
      return toast.error(
        "Choose who this applies to",
        "Select at least one item for the option you chose, or choose all products and customers.",
      );
    if (form.branchIds.length === 0 && branchMode === "selected")
      return toast.error("Pick a branch", "Choose at least one branch.");
    const body = {
      category_ids: form.scopes.category ? form.categoryIds : [],
      collection_ids: form.scopes.collection ? form.collectionIds : [],
      product_ids: form.scopes.product ? form.products.map((p) => p.id) : [],
      memberships: form.scopes.membership ? form.memberships : [],
      customer_tags: form.scopes.tag ? form.tags : [],
      customer_ids: form.scopes.individual
        ? form.customers.map((c) => c.id)
        : [],
      account_ids: form.scopes.b2b ? form.accountIds : [],
      branch_ids: branchMode === "selected" ? form.branchIds : null,
      code: form.code.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      kind: form.kind,
      value,
      buy_quantity: form.kind === "buy_x_get_y" ? buy : null,
      get_quantity: form.kind === "buy_x_get_y" ? get : null,
      max_discount_minor: form.kind === "percent" ? maxDiscount : null,
      min_order_minor: minOrder ?? 0,
      channels: form.channels,
      usage_limit: intOrNull(form.usageLimit),
      per_customer_limit: intOrNull(form.perCustomerLimit),
      min_quantity: intOrNull(form.minQuantity) ?? 1,
      combine_with_discounts: form.combineDiscounts,
      combine_with_points: form.combinePoints,
      priority: form.priority,
      apply_on: form.applyOn,
      starts_at: fromLocalInput(form.startsAt),
      ends_at: fromLocalInput(form.endsAt),
      is_active: asDraft ? false : form.isActive,
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
    toast.success(
      asDraft
        ? "Saved as draft (switched off)"
        : editing === "new"
          ? "Discount created"
          : "Discount saved",
    );
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
  const needsValue =
    form.kind === "percent" ||
    form.kind === "flat" ||
    form.kind === "fixed_price";

  const selectScope = (group: "product" | "customer", key: Scope | null) =>
    setForm((f) => ({
      ...f,
      scopes: {
        ...f.scopes,
        ...Object.fromEntries(
          SCOPES.filter((s) => s.group === group).map((s) => [
            s.key,
            s.key === key,
          ]),
        ),
      },
    }));
  const groupHasScope = (group: "product" | "customer") =>
    SCOPES.some((s) => s.group === group && form.scopes[s.key]);

  /** The picker a scope card shows once chosen; before that it shows the same box, greyed, as a hint of what comes next. */
  const scopeControl = (key: Scope, hint: string) => {
    if (!form.scopes[key])
      return (
        <div className="rounded-md border border-line bg-card px-space-3 py-space-2 text-center text-[13px] text-ink-600">
          {hint}
        </div>
      );
    switch (key) {
      case "category":
        return (
          <CheckList
            items={(categories.data ?? []).map((c) => ({
              id: c.id,
              label: c.name,
            }))}
            selected={form.categoryIds}
            onChange={(ids) => set("categoryIds", ids)}
            loading={categories.loading}
            empty="No categories yet."
            placeholder={hint}
          />
        );
      case "collection":
        return (
          <CheckList
            items={(collections.data ?? []).map((c) => ({
              id: c.id,
              label: c.name,
            }))}
            selected={form.collectionIds}
            onChange={(ids) => set("collectionIds", ids)}
            loading={collections.loading}
            empty="No collections yet."
            placeholder={hint}
          />
        );
      case "membership":
        return (
          <CheckList
            items={SEGMENT_ORDER.filter((k) => k !== "not_member").map((k) => ({
              id: k,
              label: SEGMENT_META[k].label,
            }))}
            selected={form.memberships}
            onChange={(ids) => set("memberships", ids as Segment[])}
            empty="No memberships."
            placeholder={hint}
          />
        );
      case "tag":
        return (
          <CheckList
            items={(tagList.data ?? []).map((t) => ({
              id: t.tag,
              label: t.tag,
            }))}
            selected={form.tags}
            onChange={(ids) => set("tags", ids)}
            loading={tagList.loading}
            empty="No customer tags yet."
            placeholder={hint}
          />
        );
      case "b2b":
        return (
          <CheckList
            items={(accounts.data ?? []).map((a) => ({
              id: a.id,
              label: a.legal_name,
            }))}
            selected={form.accountIds}
            onChange={(ids) => set("accountIds", ids)}
            loading={accounts.loading}
            empty="No business accounts yet."
            placeholder={hint}
          />
        );
      case "product":
        return (
          <div className="space-y-space-2">
            <ProductPicker
              exclude={form.products.map((p) => p.id)}
              onPick={(p) =>
                set("products", [
                  ...form.products,
                  { id: p.id, name: p.product_name },
                ])
              }
            />
            <ChipList
              items={form.products.map((p) => ({ id: p.id, label: p.name }))}
              onRemove={(id) =>
                set(
                  "products",
                  form.products.filter((p) => p.id !== id),
                )
              }
            />
          </div>
        );
      case "individual":
        return (
          <div className="space-y-space-2">
            <CustomerSelect
              id="d_contact"
              value={null}
              onChange={(customer) =>
                customer &&
                !form.customers.some((c) => c.id === customer.id) &&
                set("customers", [...form.customers, customer])
              }
            />
            <ChipList
              items={form.customers.map((c) => ({
                id: c.id,
                label: c.phone ? `${c.name} · ${c.phone}` : c.name,
              }))}
              onRemove={(id) =>
                set(
                  "customers",
                  form.customers.filter((c) => c.id !== id),
                )
              }
            />
          </div>
        );
    }
  };

  const eligibility = (group: "product" | "customer") =>
    SCOPES.filter((s) => s.group === group).map((scope) => (
      <OptionCard
        key={scope.key}
        selected={form.scopes[scope.key]}
        onSelect={() => selectScope(group, scope.key)}
        title={scope.title}
        hint={scope.hint}
      >
        {scopeControl(scope.key, scope.hint)}
      </OptionCard>
    ));

  const shortDate = (v: string) =>
    new Date(v).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const bothChannels =
    form.channels.includes("pos") && form.channels.includes("online");
  const toggleChannel = (c: Channel, on: boolean) =>
    set(
      "channels",
      on ? [...form.channels, c] : form.channels.filter((x) => x !== c),
    );

  const summaryLine = [
    form.kind === "percent"
      ? `${form.value || 0}% off${form.maxDiscount.trim() ? ` (max ₹${form.maxDiscount})` : ""}`
      : form.kind === "flat"
        ? `₹${form.value || 0} off`
        : form.kind === "fixed_price"
          ? `₹${form.value || 0} each`
          : form.kind === "buy_x_get_y"
            ? `Buy ${form.buyQty || "X"} get ${form.getQty || "Y"} free`
            : KIND_LABEL[form.kind],
    groupHasScope("product") ? "on selected products" : "on all products",
    form.minOrder.trim() ? `Min order ₹${form.minOrder}` : null,
    form.perCustomerLimit.trim()
      ? `${form.perCustomerLimit} use per customer`
      : null,
    form.startsAt || form.endsAt
      ? `Valid ${form.startsAt ? `from ${shortDate(form.startsAt)}` : "now"} ${form.endsAt ? `to ${shortDate(form.endsAt)}` : "with no end"}`
      : null,
    `Available on ${form.channels.map((c) => CHANNELS[c].label).join(" and ") || "no channel"} - ${form.isActive ? "Active" : "Paused"}`,
  ]
    .filter(Boolean)
    .join(" • ");

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
        title={
          editing === "new" ? "New Discount / Offer" : "Edit Discount / Offer"
        }
        description="Create a discount or offer that can be used in POS, website or campaigns."
        width="xl"
        compact
        bannerIcon={<HugeiconsIcon icon={Tag01Icon} size={20} />}
        bodyClassName="bg-paper"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              disabled={busy || !form.name.trim()}
              onClick={() => save(true)}
            >
              Save as draft
            </Button>
            <Button disabled={busy || !form.name.trim()} onClick={() => save()}>
              {editing === "new" ? "Create discount" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="form-compact space-y-space-2">
          <Section n={1} title="Basic Details">
            <div className="grid gap-space-2 md:grid-cols-2">
              <Field label="Name" htmlFor="d_name" required>
                <Input
                  id="d_name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
              <Field label="Description" htmlFor="d_desc">
                <textarea
                  id="d_desc"
                  rows={1}
                  maxLength={500}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="h-11 w-full resize-none rounded-md border border-line bg-card px-space-3 py-2 text-[13px] leading-5 text-ink-900 shadow-[var(--shadow-sm)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
              <Field label="Coupon code" htmlFor="d_code">
                <div className="flex gap-space-2">
                  <Input
                    id="d_code"
                    value={form.code}
                    className="uppercase"
                    onChange={(e) => set("code", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    type="button"
                    className="shrink-0 border border-line"
                    onClick={() => set("code", generateCode())}
                  >
                    <HugeiconsIcon icon={RefreshIcon} size={16} /> Generate
                  </Button>
                </div>
              </Field>
              <div>
                <p className="mb-space-1 text-[13px] font-semibold text-ink-900">
                  Status
                </p>
                <div className="flex items-center gap-space-3">
                  <Switch
                    tone="success"
                    checked={form.isActive}
                    onChange={() => set("isActive", !form.isActive)}
                    aria-label="Active"
                  />
                  <div>
                    <p className="text-[14px] font-semibold text-ink-900">
                      {form.isActive ? "Active" : "Paused"}
                    </p>
                    <p className="text-[12.5px] text-ink-600">
                      Turn off to pause the offer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section n={2} title="Discount Type & Value">
            <div className="grid grid-cols-2 gap-space-2 md:grid-cols-6">
              {(Object.keys(KIND_META) as DiscountKind[]).map((k) => (
                <OptionCard
                  key={k}
                  tile
                  selected={form.kind === k}
                  onSelect={() => set("kind", k)}
                  title={KIND_LABEL[k]}
                  hint={KIND_META[k].hint}
                  icon={<HugeiconsIcon icon={KIND_META[k].icon} size={24} />}
                />
              ))}
            </div>
            <div className="mt-space-2 grid gap-space-2 md:grid-cols-3">
              {needsValue && (
                <Field
                  label={
                    form.kind === "percent"
                      ? "Percentage (%)"
                      : form.kind === "flat"
                        ? "Amount (₹)"
                        : "Fixed price (₹)"
                  }
                  htmlFor="d_value"
                  required
                >
                  <div className="relative">
                    <Input
                      id="d_value"
                      inputMode="decimal"
                      value={form.value}
                      onChange={(e) => set("value", e.target.value)}
                    />
                    {form.kind === "percent" && (
                      <span className="pointer-events-none absolute right-space-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-600">
                        %
                      </span>
                    )}
                  </div>
                </Field>
              )}
              {form.kind === "buy_x_get_y" && (
                <>
                  <Field label="Buy quantity (X)" htmlFor="d_buy" required>
                    <Input
                      id="d_buy"
                      inputMode="numeric"
                      value={form.buyQty}
                      onChange={(e) =>
                        set("buyQty", e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </Field>
                  <Field label="Free quantity (Y)" htmlFor="d_get" required>
                    <Input
                      id="d_get"
                      inputMode="numeric"
                      value={form.getQty}
                      onChange={(e) =>
                        set("getQty", e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </Field>
                </>
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
            </div>
          </Section>

          <Section n={3} title="Product Eligibility">
            <div className="grid gap-space-2 md:grid-cols-4">
              <OptionCard
                selected={!groupHasScope("product")}
                onSelect={() => selectScope("product", null)}
                title="All products"
                hint="Applicable on entire catalog"
              />
              {eligibility("product")}
            </div>
          </Section>

          <Section n={4} title="Customer Eligibility">
            <div className="grid gap-space-2 md:grid-cols-5">
              <OptionCard
                selected={!groupHasScope("customer")}
                onSelect={() => selectScope("customer", null)}
                title="All customers"
                hint="Anyone can use"
              />
              {eligibility("customer")}
            </div>
          </Section>

          <Section n={5} title="Channels & Branches">
            <div className="grid gap-space-2 md:grid-cols-2">
              <div className="rounded-md border border-line p-space-3">
                <p className="mb-space-2 text-[13px] font-semibold text-ink-900">
                  Sales channel
                </p>
                <div className="flex flex-wrap gap-x-space-5 gap-y-space-2 text-[14px]">
                  <label className="flex items-center gap-space-2">
                    <input
                      type="checkbox"
                      checked={form.channels.includes("pos")}
                      onChange={(e) => toggleChannel("pos", e.target.checked)}
                    />
                    POS (in-store)
                  </label>
                  <label className="flex items-center gap-space-2">
                    <input
                      type="checkbox"
                      checked={form.channels.includes("online")}
                      onChange={(e) =>
                        toggleChannel("online", e.target.checked)
                      }
                    />
                    Website (E-commerce)
                  </label>
                  <label className="flex items-center gap-space-2">
                    <input
                      type="checkbox"
                      checked={form.channels.includes("whatsapp")}
                      onChange={(e) =>
                        toggleChannel("whatsapp", e.target.checked)
                      }
                    />
                    WhatsApp
                  </label>
                  <label className="flex items-center gap-space-2">
                    <input
                      type="checkbox"
                      checked={bothChannels}
                      onChange={(e) =>
                        set(
                          "channels",
                          e.target.checked
                            ? Array.from(
                                new Set<Channel>([
                                  ...form.channels,
                                  "pos",
                                  "online",
                                ]),
                              )
                            : form.channels.filter(
                                (c) => c !== "pos" && c !== "online",
                              ),
                        )
                      }
                    />
                    Both
                  </label>
                </div>
              </div>
              <div className="rounded-md border border-line p-space-3">
                <p className="mb-space-2 text-[13px] font-semibold text-ink-900">
                  Applicable branches
                </p>
                <div className="grid grid-cols-[auto_1fr] items-start gap-x-space-5 text-[14px]">
                  <label className="flex items-center gap-space-2">
                    <input
                      type="radio"
                      name="d_branches"
                      checked={branchMode === "all"}
                      onChange={() => setBranchMode("all")}
                    />
                    All branches
                  </label>
                  <div className="space-y-space-2">
                    <label className="flex items-center gap-space-2">
                      <input
                        type="radio"
                        name="d_branches"
                        checked={branchMode === "selected"}
                        onChange={() => setBranchMode("selected")}
                      />
                      Selected branches
                    </label>
                    {branchMode === "selected" ? (
                      <CheckList
                        items={(branches.data ?? []).map((b) => ({
                          id: b.id,
                          label: b.branch_name,
                        }))}
                        selected={form.branchIds}
                        onChange={(ids) => set("branchIds", ids)}
                        loading={branches.isLoading}
                        empty="No branches."
                        placeholder="Select branches"
                      />
                    ) : (
                      <div className="rounded-md border border-line bg-card px-space-3 py-space-2 text-[13px] text-ink-400">
                        Select branches
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section n={6} title="Usage & Combination Rules">
            <div className="grid gap-space-2 md:grid-cols-3">
              <Field
                label="Total uses allowed"
                htmlFor="d_use"
                hint="Leave empty for unlimited"
              >
                <Input
                  id="d_use"
                  inputMode="numeric"
                  value={form.usageLimit}
                  onChange={(e) =>
                    set("usageLimit", e.target.value.replace(/\D/g, ""))
                  }
                />
              </Field>
              <Field
                label="Uses per customer"
                htmlFor="d_pc"
                hint="Leave empty for unlimited"
              >
                <Input
                  id="d_pc"
                  inputMode="numeric"
                  value={form.perCustomerLimit}
                  onChange={(e) =>
                    set("perCustomerLimit", e.target.value.replace(/\D/g, ""))
                  }
                />
              </Field>
              <Field
                label="Minimum purchase quantity"
                htmlFor="d_minq"
                hint="Optional"
              >
                <Input
                  id="d_minq"
                  inputMode="numeric"
                  value={form.minQuantity}
                  onChange={(e) =>
                    set("minQuantity", e.target.value.replace(/\D/g, ""))
                  }
                />
              </Field>
            </div>
            <div className="mt-space-2 grid gap-space-2 md:grid-cols-4">
              <Field label="Combine with other discounts" htmlFor="d_cd">
                <Select
                  id="d_cd"
                  value={form.combineDiscounts ? "allow" : "no"}
                  onValueChange={(v) => set("combineDiscounts", v === "allow")}
                >
                  <option value="no">Do not allow</option>
                  <option value="allow">Allow</option>
                </Select>
              </Field>
              <Field label="Combine with loyalty points" htmlFor="d_cp">
                <Select
                  id="d_cp"
                  value={form.combinePoints ? "allow" : "no"}
                  onValueChange={(v) => set("combinePoints", v === "allow")}
                >
                  <option value="no">Do not allow</option>
                  <option value="allow">Allow</option>
                </Select>
              </Field>
              <Field label="Priority" htmlFor="d_prio">
                <Select
                  id="d_prio"
                  value={form.priority}
                  onValueChange={(v) => set("priority", v as Form["priority"])}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </Select>
              </Field>
              <div>
                <p className="mb-space-1 text-[13px] font-semibold text-ink-900">
                  Apply on
                </p>
                <div className="space-y-space-1 text-[14px]">
                  <label className="flex items-center gap-space-2">
                    <input
                      type="radio"
                      name="d_apply"
                      checked={form.applyOn === "subtotal"}
                      onChange={() => set("applyOn", "subtotal")}
                    />
                    Subtotal (before tax)
                  </label>
                  <label className="flex items-center gap-space-2">
                    <input
                      type="radio"
                      name="d_apply"
                      checked={form.applyOn === "total"}
                      onChange={() => set("applyOn", "total")}
                    />
                    Total amount (after tax)
                  </label>
                </div>
              </div>
            </div>
          </Section>

          <Section n={7} title="Schedule" aside>
            <div className="grid flex-1 gap-space-2 md:grid-cols-2">
              <DateTimeField
                id="d_start"
                label="Start date & time"
                value={form.startsAt}
                onChange={(v) => set("startsAt", v)}
              />
              <DateTimeField
                id="d_end"
                label="End date & time"
                value={form.endsAt}
                onChange={(v) => set("endsAt", v)}
                defaultTime="23:59"
              />
            </div>
          </Section>

          <Section n={8} title="Review & Summary" aside>
            <div className="flex flex-1 items-start gap-space-3 rounded-md border border-brand-200 bg-brand-50 p-space-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-800 text-white">
                <HugeiconsIcon icon={Tag01Icon} size={18} />
              </span>
              <div className="min-w-0 text-[13px] text-ink-600">
                <p className="text-[14px] font-bold text-ink-900">
                  {form.name.trim() || "Untitled discount"}
                  {form.code.trim() && ` (${form.code.trim().toUpperCase()})`}
                </p>
                <p>{summaryLine}</p>
              </div>
            </div>
          </Section>
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
