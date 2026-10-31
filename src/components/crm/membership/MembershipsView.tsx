"use client";

import {
  MoreHorizontalIcon,
  Search01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserGroupIcon,
  MoneyBag02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  StatCard,
  StatusPill,
  TierCrown,
  ViewHeader,
} from "@/components/crm/membership/parts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { erp, formatMoney, fromMinor, toMinor, useErpQuery } from "@/lib/erp";
import {
  TIER_LABEL,
  type Overview,
  type Tier,
  type TierPlan,
} from "@/lib/membership";
import { toast } from "@/lib/toast";

const feeText = (t: TierPlan, currency: string) => {
  if (t.tier === "inactive") return "-";
  if (!t.annual_fee_minor) return "Free";
  const per =
    t.validity_months === null
      ? "one-time"
      : t.validity_months === 12
        ? "year"
        : `${t.validity_months} months`;
  return `${formatMoney(t.annual_fee_minor, currency)} ${t.validity_months === null ? "(one-time)" : `/ ${per}`}`;
};

export function MembershipsView({
  currency,
  canConfigure,
  onOpenSegment,
  onChanged,
}: {
  currency: string;
  canConfigure: boolean;
  onOpenSegment: (tier: Tier) => void;
  onChanged: () => void;
}) {
  const data = useErpQuery<Overview>("/api/v1/crm/membership/overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<TierPlan | null>(null);
  const [form, setForm] = useState({
    description: "",
    fee: "",
    validity: "",
    active: true,
  });
  const [busy, setBusy] = useState(false);
  const k = data.data?.kpis;

  const rows = (data.data?.tiers ?? []).filter(
    (t) =>
      TIER_LABEL[t.tier].toLowerCase().includes(search.trim().toLowerCase()) &&
      (!status || (status === "active") === t.is_active),
  );

  function openEdit(t: TierPlan) {
    setForm({
      description: t.description ?? "",
      fee: t.annual_fee_minor ? fromMinor(t.annual_fee_minor) : "",
      validity: t.validity_months === null ? "" : String(t.validity_months),
      active: t.is_active,
    });
    setEditing(t);
  }

  async function save() {
    if (!editing) return;
    const fee = form.fee.trim() ? toMinor(form.fee) : 0;
    const months = form.validity.trim() ? Number(form.validity) : null;
    if (fee === null || fee < 0)
      return toast.error(
        "Check the fee",
        "Enter an amount, or leave it empty.",
      );
    if (
      months !== null &&
      !(Number.isInteger(months) && months >= 1 && months <= 120)
    )
      return toast.error(
        "Check the validity",
        "Enter 1 to 120 months, or leave it empty for no expiry.",
      );
    setBusy(true);
    const res = await erp(
      `/api/v1/crm/membership/tiers/${editing.tier}`,
      "PUT",
      {
        description: form.description.trim() || null,
        annual_fee_minor: fee,
        validity_months: months,
        is_active: form.active,
      },
    );
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the plan", res.error);
    toast.success(`${TIER_LABEL[editing.tier]} plan saved`);
    setEditing(null);
    data.reload();
    onChanged();
  }

  const columns = useMemo<ColumnDef<TierPlan, unknown>[]>(
    () => [
      {
        header: "Membership",
        cell: ({ row }) => (
          <span className="flex items-center gap-space-3">
            <TierCrown tier={row.original.tier} size={38} />
            <span>
              <span className="block font-semibold leading-tight text-ink-900">
                {TIER_LABEL[row.original.tier]}
              </span>
              <span className="block text-[12px] text-ink-600">
                {row.original.description}
              </span>
            </span>
          </span>
        ),
      },
      {
        header: "Member count",
        cell: ({ row }) => row.original.members.toLocaleString("en-IN"),
      },
      {
        header: "Annual fee",
        cell: ({ row }) => feeText(row.original, currency),
      },
      {
        header: "Key benefits",
        cell: ({ row }) =>
          row.original.key_benefits.length ? (
            <span className="block max-w-[320px] truncate text-ink-600">
              {row.original.key_benefits.join(", ")}
            </span>
          ) : (
            <span className="text-ink-600">No benefits</span>
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <StatusPill
            status={row.original.is_active ? "active" : "inactive_plan"}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        meta: { className: "!min-w-0" },
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${TIER_LABEL[row.original.tier]}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-600 hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => onOpenSegment(row.original.tier)}
              >
                View customers
              </DropdownMenuItem>
              {canConfigure && (
                <DropdownMenuItem onClick={() => openEdit(row.original)}>
                  Edit plan
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency, canConfigure],
  );

  return (
    <div>
      <ViewHeader
        title="Memberships"
        description="Create and manage membership tiers with exclusive benefits."
      />
      <div className="mb-space-4 grid grid-cols-2 gap-space-3 xl:grid-cols-4">
        <StatCard
          label="Total Members"
          value={k ? k.total_members.toLocaleString("en-IN") : "—"}
          delta={k?.total_delta_pct}
          icon={<HugeiconsIcon icon={UserGroupIcon} size={20} />}
        />
        <StatCard
          label="Active Members"
          value={k ? k.active_members.toLocaleString("en-IN") : "—"}
          hint={
            k && k.total_members
              ? `${Math.round((100 * k.active_members) / k.total_members)}% of total`
              : undefined
          }
          icon={<HugeiconsIcon icon={UserCheck01Icon} size={20} />}
        />
        <StatCard
          label="New Members"
          value={k ? k.new_this_month.toLocaleString("en-IN") : "—"}
          hint="this month"
          icon={<HugeiconsIcon icon={UserAdd01Icon} size={20} />}
        />
        <StatCard
          label="Revenue from Members"
          value={k ? formatMoney(k.revenue_minor, currency) : "—"}
          delta={k?.revenue_delta_pct}
          icon={<HugeiconsIcon icon={MoneyBag02Icon} size={20} />}
        />
      </div>
      <Card className="mb-space-3 flex flex-wrap items-center gap-space-2 p-space-3">
        <span className="relative min-w-[200px] flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <Input
            placeholder="Search by membership name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search memberships"
          />
        </span>
        <Select
          value={status}
          onValueChange={setStatus}
          className="!w-auto"
          aria-label="Status"
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Card>
      {data.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {data.error}
        </p>
      )}
      <Card className="p-space-2">
        <div className="whitespace-nowrap">
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(t) => t.tier}
            loading={data.loading}
            paginate={false}
            emptyMessage={
              data.loading ? "Loading memberships…" : "No memberships match."
            }
          />
        </div>
        <p className="px-space-3 py-space-3 text-[12.5px] text-ink-600">
          Showing {rows.length ? `1–${rows.length}` : "0"} of {rows.length}{" "}
          memberships
        </p>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `${TIER_LABEL[editing.tier]} membership` : ""}
        description="Tiers are earned from loyalty points (set in Rules). Here you set what a plan costs and how long it lasts."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={save}>
              Save plan
            </Button>
          </>
        }
      >
        <Field label="Description" htmlFor="m_desc">
          <Input
            id="m_desc"
            maxLength={120}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid gap-space-3 sm:grid-cols-2">
          <Field
            label={`Annual fee (${currency})`}
            htmlFor="m_fee"
            hint="Charged when a member joins or renews. Leave empty for free."
          >
            <Input
              id="m_fee"
              inputMode="decimal"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
            />
          </Field>
          <Field
            label="Validity (months)"
            htmlFor="m_valid"
            hint="Leave empty for a membership that never expires."
          >
            <Input
              id="m_valid"
              inputMode="numeric"
              value={form.validity}
              onChange={(e) =>
                setForm({
                  ...form,
                  validity: e.target.value.replace(/\D/g, ""),
                })
              }
            />
          </Field>
        </div>
        <div className="flex items-center gap-space-3 text-[14px]">
          <Switch
            tone="success"
            checked={form.active}
            onChange={() => setForm({ ...form, active: !form.active })}
            aria-label="Active"
          />
          {form.active ? "Active" : "Inactive"}
        </div>
      </Modal>
    </div>
  );
}
