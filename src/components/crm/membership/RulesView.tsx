"use client";

import {
  Add01Icon,
  Briefcase01Icon,
  CheckmarkCircle02Icon,
  CrownIcon,
  GiftIcon,
  MoreHorizontalIcon,
  Notification01Icon,
  RefreshIcon,
  Search01Icon,
  Settings02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  CheckLine,
  HistoryList,
  StatCard,
  StatusPill,
  TierCrown,
  ViewHeader,
} from "@/components/crm/membership/parts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
import { Tabs } from "@/components/ui/Tabs";
import { type CrmSettings } from "@/lib/crm";
import { erp, formatMoney, fromMinor, toMinor, useErpQuery } from "@/lib/erp";
import {
  FREQUENCY_LABEL,
  TIER_LABEL,
  type Frequency,
  type HistoryEntry,
  type Overview,
  type Rule,
  type RuleKind,
  type RulesResponse,
} from "@/lib/membership";
import { toast } from "@/lib/toast";

type SubTab = "qualification" | "renewal" | "notification" | "history";
const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "qualification", label: "Qualification Rules" },
  { key: "renewal", label: "Renewal Rules" },
  { key: "notification", label: "Notifications" },
  { key: "history", label: "History" },
];
const APPLIES = [
  "All members",
  "Regular members",
  "Silver members",
  "Gold members",
  "Platinum members",
];

type Form = {
  kind: Exclude<RuleKind, "qualification">;
  name: string;
  applies: string;
  trigger: string;
  action: string;
  frequency: Frequency;
  status: Rule["status"];
};
const EMPTY: Form = {
  kind: "renewal",
  name: "",
  applies: "All members",
  trigger: "",
  action: "",
  frequency: "daily",
  status: "active",
};

function ruleIcon(r: Rule) {
  if (r.system) {
    const tier = r.id.replace("system:", "");
    if (tier === "silver" || tier === "gold" || tier === "platinum")
      return <TierCrown tier={tier} size={32} />;
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-tint text-success">
        <HugeiconsIcon
          icon={tier === "inactive" ? Briefcase01Icon : UserIcon}
          size={16}
        />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700">
      <HugeiconsIcon
        icon={r.kind === "notification" ? Notification01Icon : RefreshIcon}
        size={16}
      />
    </span>
  );
}

export function RulesView({
  currency,
  canConfigure,
  onChanged,
}: {
  currency: string;
  canConfigure: boolean;
  onChanged: () => void;
}) {
  const data = useErpQuery<RulesResponse>("/api/v1/crm/membership/rules");
  const plans = useErpQuery<Overview>("/api/v1/crm/membership/overview");
  const [sub, setSub] = useState<SubTab>("qualification");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Rule | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [value, setValue] = useState("");
  const [removing, setRemoving] = useState<Rule | null>(null);
  const [busy, setBusy] = useState(false);
  const history = useErpQuery<HistoryEntry[]>(
    sub === "history" ? "/api/v1/crm/membership/history" : null,
  );
  const k = data.data?.kpis;
  const list = sub === "history" ? [] : (data.data?.[sub] ?? []);
  const rows = list.filter(
    (r) =>
      `${r.name} ${r.trigger_text} ${r.action_text}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (!tier ||
        r.applies_to.toLowerCase().includes(tier) ||
        r.applies_to === "All members" ||
        r.applies_to === "All customers") &&
      (!status || r.status === status),
  );

  const reload = () => {
    data.reload();
    plans.reload();
    onChanged();
  };

  function openEdit(r: Rule | "new") {
    if (r !== "new" && r.system) setValue(String(r.value ?? ""));
    else
      setForm(
        r === "new"
          ? {
              ...EMPTY,
              kind: sub === "notification" ? "notification" : "renewal",
            }
          : {
              kind: r.kind as Form["kind"],
              name: r.name,
              applies: r.applies_to,
              trigger: r.trigger_text,
              action: r.action_text,
              frequency: r.frequency,
              status: r.status,
            },
      );
    setEditing(r);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    let res;
    if (editing !== "new" && editing.system) {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) {
        setBusy(false);
        return toast.error("Check the value", "Enter a whole number.");
      }
      res = await erp(
        `/api/v1/crm/membership/rules/system/${editing.id.replace("system:", "")}`,
        "PUT",
        { value: n },
      );
    } else {
      const body = {
        kind: form.kind,
        name: form.name.trim(),
        applies_to: form.applies,
        trigger_text: form.trigger.trim(),
        action_text: form.action.trim(),
        frequency: form.frequency,
        status: form.status,
      };
      res =
        editing === "new"
          ? await erp("/api/v1/crm/membership/rules", "POST", body)
          : await erp(
              `/api/v1/crm/membership/rules/${editing.id}`,
              "PUT",
              body,
            );
    }
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the rule", res.error);
    toast.success("Rule saved");
    setEditing(null);
    reload();
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    const res = await erp(
      `/api/v1/crm/membership/rules/${removing.id}`,
      "DELETE",
    );
    setBusy(false);
    if (res.error) return toast.error("Couldn't delete the rule", res.error);
    toast.success("Rule deleted");
    setRemoving(null);
    reload();
  }

  const columns = useMemo<ColumnDef<Rule, unknown>[]>(
    () => [
      {
        header: "Rule name",
        cell: ({ row }) => (
          <span className="flex items-center gap-space-2">
            {ruleIcon(row.original)}
            <span className="font-semibold text-ink-900">
              {row.original.name}
            </span>
          </span>
        ),
      },
      { header: "Applies to", cell: ({ row }) => row.original.applies_to },
      {
        header: "Trigger / condition",
        cell: ({ row }) => (
          <span className="block max-w-[260px] truncate whitespace-normal">
            {row.original.trigger_text}
          </span>
        ),
      },
      { header: "Action", cell: ({ row }) => row.original.action_text },
      {
        header: "Frequency",
        cell: ({ row }) => FREQUENCY_LABEL[row.original.frequency],
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <StatusPill
            status={
              row.original.status === "active"
                ? "active"
                : row.original.status === "draft"
                  ? "draft"
                  : "paused"
            }
          />
        ),
      },
      ...(canConfigure
        ? [
            {
              id: "actions",
              header: "Actions",
              meta: { className: "!min-w-0" },
              cell: ({ row }: { row: { original: Rule } }) =>
                row.original.system && row.original.field === null ? null : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions for ${row.original.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-600 hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                    >
                      <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => openEdit(row.original)}>
                        Edit
                      </DropdownMenuItem>
                      {!row.original.system && (
                        <DropdownMenuItem
                          onClick={() => setRemoving(row.original)}
                        >
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ),
            } as ColumnDef<Rule, unknown>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canConfigure],
  );

  const points = (key: string) =>
    data.data?.qualification.find((r) => r.id === `system:${key}`)?.value;
  const summary = [
    {
      tier: "regular" as const,
      lines: [
        "All registered customers are eligible",
        "Auto-assigned when the profile is complete",
      ],
    },
    {
      tier: "silver" as const,
      lines: [
        `Loyalty points ≥ ${points("silver")?.toLocaleString("en-IN") ?? "—"}`,
        "Auto-upgrade from Regular",
      ],
    },
    {
      tier: "gold" as const,
      lines: [
        `Loyalty points ≥ ${points("gold")?.toLocaleString("en-IN") ?? "—"}`,
        "Auto-upgrade from Silver",
      ],
    },
    {
      tier: "platinum" as const,
      lines: [
        `Loyalty points ≥ ${points("platinum")?.toLocaleString("en-IN") ?? "—"}`,
        "Auto-upgrade from Gold",
      ],
    },
  ];

  const editingSystem = editing !== null && editing !== "new" && editing.system;

  return (
    <div>
      <ViewHeader
        title="Membership Rules"
        description="Configure qualification, upgrade, renewal and expiry rules for Regular, Silver, Gold and Platinum memberships."
        action={
          canConfigure && (
            <Button onClick={() => openEdit("new")} className="shrink-0">
              <HugeiconsIcon icon={Add01Icon} size={16} /> Add rule
            </Button>
          )
        }
      />
      <div className="mb-space-4 grid grid-cols-2 gap-space-3 xl:grid-cols-4">
        <StatCard
          label="Total Rules"
          value={k ? k.total : "—"}
          icon={<HugeiconsIcon icon={GiftIcon} size={20} />}
        />
        <StatCard
          label="Active Rules"
          value={k ? k.active : "—"}
          icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />}
        />
        <StatCard
          label="Automated Upgrades"
          value={k ? k.automated_upgrades : "—"}
          hint="Regular → Platinum"
          icon={<HugeiconsIcon icon={Settings02Icon} size={20} />}
        />
        <StatCard
          label="Upcoming Expiry Alerts"
          value={k ? k.expiring_30d : "—"}
          hint="in next 30 days"
          icon={<HugeiconsIcon icon={Notification01Icon} size={20} />}
        />
      </div>

      <Tabs
        tabs={SUB_TABS}
        value={sub}
        onChange={setSub}
        className="!mb-space-3"
      />

      {sub !== "history" && (
        <Card className="mb-space-3 flex flex-wrap items-center gap-space-2 p-space-3">
          <span className="relative min-w-[200px] flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <Input
              placeholder="Search by rule name, condition or action…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search rules"
            />
          </span>
          <Select
            value={tier}
            onValueChange={setTier}
            className="!w-auto"
            aria-label="Tier"
          >
            <option value="">All tiers</option>
            {(["regular", "silver", "gold", "platinum"] as const).map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onValueChange={setStatus}
            className="!w-auto"
            aria-label="Status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
          </Select>
        </Card>
      )}
      {data.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {data.error}
        </p>
      )}

      <Card className="p-space-2">
        {sub === "history" ? (
          <HistoryList
            entries={history.data ?? []}
            prefixes={["rule", "tier"]}
            loading={history.loading}
          />
        ) : (
          <>
            <div className="whitespace-nowrap">
              <DataTable
                columns={columns}
                data={rows}
                getRowId={(r) => r.id}
                loading={data.loading}
                paginate={false}
                emptyMessage={
                  data.loading
                    ? "Loading rules…"
                    : sub === "qualification"
                      ? "No rules match."
                      : "No rules yet. Add one to start."
                }
              />
            </div>
            <p className="px-space-3 pt-space-3 text-[12.5px] text-ink-600">
              Showing {rows.length ? `1–${rows.length}` : "0"} of {list.length}{" "}
              rules
            </p>
            <p className="px-space-3 pb-space-3 text-[12px] text-ink-400">
              {sub === "qualification"
                ? "Qualification rules are applied automatically from loyalty points; editing one changes the real tier threshold."
                : "Renewal and notification rules are saved settings: nothing is sent or changed automatically from them yet."}
            </p>
          </>
        )}
      </Card>

      <Card className="mt-space-4 p-space-4">
        <div className="mb-space-3 flex items-center gap-space-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <HugeiconsIcon icon={CrownIcon} size={20} />
          </span>
          <div>
            <h3 className="text-[16px] font-bold text-ink-900">
              Tier Qualification Summary
            </h3>
            <p className="text-[12.5px] text-ink-600">
              Overview of how customers qualify for each membership tier and the
              automation behaviour.
            </p>
          </div>
        </div>
        <div className="grid gap-space-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((s) => {
            const plan = plans.data?.tiers.find((p) => p.tier === s.tier);
            return (
              <div
                key={s.tier}
                className="rounded-lg border border-line p-space-3"
              >
                <div className="mb-space-2 flex items-center gap-space-3">
                  <TierCrown tier={s.tier} size={40} />
                  <div>
                    <p className="font-semibold text-ink-900">
                      {TIER_LABEL[s.tier]}
                    </p>
                    <p className="text-[12px] text-ink-600">
                      {plan?.description}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {s.lines.map((line) => (
                    <CheckLine key={line}>{line}</CheckLine>
                  ))}
                  {(plan?.key_benefits ?? []).slice(0, 2).map((b) => (
                    <CheckLine key={b}>{b}</CheckLine>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      <PointsConversion
        currency={currency}
        canConfigure={canConfigure}
        onChanged={reload}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editingSystem
            ? (editing as Rule).name
            : editing === "new"
              ? "Add rule"
              : "Edit rule"
        }
        description={
          editingSystem
            ? "This changes the real threshold used to work out every customer's membership tier."
            : "Saved as a setting; nothing is sent or changed automatically from it yet."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                (editingSystem
                  ? value.trim() === ""
                  : !form.name.trim() ||
                    !form.trigger.trim() ||
                    !form.action.trim())
              }
              onClick={save}
            >
              Save rule
            </Button>
          </>
        }
      >
        {editingSystem ? (
          <Field
            label={
              (editing as Rule).field === "inactive_after_days"
                ? "Days without a purchase"
                : "Loyalty points required"
            }
            htmlFor="r_value"
            required
          >
            <Input
              id="r_value"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        ) : (
          <>
            <div className="grid gap-space-3 sm:grid-cols-2">
              <Field label="Rule type" htmlFor="r_kind">
                <Select
                  id="r_kind"
                  value={form.kind}
                  onValueChange={(v) =>
                    setForm({ ...form, kind: v as Form["kind"] })
                  }
                >
                  <option value="renewal">Renewal rule</option>
                  <option value="notification">Notification</option>
                </Select>
              </Field>
              <Field label="Applies to" htmlFor="r_applies">
                <Select
                  id="r_applies"
                  value={form.applies}
                  onValueChange={(v) => setForm({ ...form, applies: v })}
                >
                  {APPLIES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Rule name" htmlFor="r_name" required>
              <Input
                id="r_name"
                maxLength={80}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Trigger / condition" htmlFor="r_trigger" required>
              <Input
                id="r_trigger"
                maxLength={160}
                placeholder="e.g. Membership expires in 30 days"
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
              />
            </Field>
            <Field label="Action" htmlFor="r_action" required>
              <Input
                id="r_action"
                maxLength={160}
                placeholder="e.g. Send expiry notification"
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
              />
            </Field>
            <div className="grid gap-space-3 sm:grid-cols-2">
              <Field label="Frequency" htmlFor="r_freq">
                <Select
                  id="r_freq"
                  value={form.frequency}
                  onValueChange={(v) =>
                    setForm({ ...form, frequency: v as Frequency })
                  }
                >
                  {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABEL[f]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" htmlFor="r_status">
                <Select
                  id="r_status"
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as Rule["status"] })
                  }
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                </Select>
              </Field>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Delete this rule?"
        message={`“${removing?.name ?? ""}” will be removed.`}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

/** How many loyalty points equal how much money when a customer redeems them (moved here from the old Membership tab). */
function PointsConversion({
  currency,
  canConfigure,
  onChanged,
}: {
  currency: string;
  canConfigure: boolean;
  onChanged: () => void;
}) {
  const data = useErpQuery<{ settings: CrmSettings }>("/api/v1/crm/segments");
  const [points, setPoints] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const s = data.data?.settings;
  if (!s) return null;
  const shownAmount = amount ?? fromMinor(s.redemption_value_minor ?? 100);
  const n = Number(points ?? s.redemption_points ?? 100);
  const minor = toMinor(shownAmount);
  const valid =
    Number.isSafeInteger(n) &&
    n > 0 &&
    n <= 10 ** 9 &&
    minor !== null &&
    minor > 0 &&
    minor <= 10 ** 12 &&
    /^\d+(\.\d{1,2})?$/.test(shownAmount);

  async function save() {
    setBusy(true);
    const res = await erp("/api/v1/crm/settings", "PUT", {
      redemption_points: n,
      redemption_value_minor: minor,
    });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save", res.error);
    toast.success("Conversion saved");
    setPoints(null);
    setAmount(null);
    data.reload();
    onChanged();
  }

  return (
    <Card className="mt-space-4 p-space-4">
      <h3 className="mb-space-1 text-[15px] font-bold text-ink-900">
        Loyalty points to money conversion
      </h3>
      <p className="mb-space-3 text-[13px] text-ink-600">
        How many points equal a money deduction when a customer redeems them.
        This is separate from the rate at which customers earn points.
      </p>
      <div className="grid max-w-xl gap-space-3 sm:grid-cols-2">
        <Field
          label="Loyalty points"
          htmlFor="rp_points"
          hint="A positive whole number of points."
        >
          <Input
            id="rp_points"
            inputMode="numeric"
            disabled={!canConfigure || busy}
            value={points ?? String(s.redemption_points ?? 100)}
            onChange={(e) => setPoints(e.target.value)}
          />
        </Field>
        <Field
          label={`Deduction amount (${currency})`}
          htmlFor="rp_amount"
          hint="The money value of those points."
        >
          <Input
            id="rp_amount"
            inputMode="decimal"
            disabled={!canConfigure || busy}
            value={shownAmount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      </div>
      {valid && (
        <p className="text-[13px] font-semibold text-brand-700">
          {n.toLocaleString("en-IN")} points = {formatMoney(minor!, currency)}{" "}
          deduction.
        </p>
      )}
      {canConfigure && (
        <Button
          className="mobile-page-action mt-space-3"
          disabled={busy || !valid || (points === null && amount === null)}
          onClick={save}
        >
          Save conversion
        </Button>
      )}
    </Card>
  );
}
