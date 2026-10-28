"use client";

import {
  ArrowLeftRight,
  Banknote,
  Boxes,
  Briefcase,
  Building2,
  CalendarClock,
  ToggleRight,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import {
  useModules,
  useSwitchModule,
  type ModuleKey,
  type OptionalModule,
} from "@/hooks/useModules";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/erp";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

const INFO: Record<
  ModuleKey,
  { icon: React.ReactNode; adds: string; off: string }
> = {
  back_office: {
    icon: <Briefcase size={20} />,
    adds: "Procurement, wholesale, inventory, stock transfers and finance under one switch, in the portal and on your tills. Each also has its own switch below.",
    off: "Procurement, Wholesale, Inventory, Transfers and Finance disappear from the portal and your tills. Sales still move stock and post to the books, and each module keeps its own switch for when Back office is back on.",
  },
  procurement: {
    icon: <Truck size={18} />,
    adds: "Suppliers, purchase requests and orders, goods receipts, supplier bills and payments, and purchase returns. Adds Procurement under Back office and Purchasing on your tills.",
    off: "Procurement disappears from the portal and Purchasing from your tills.",
  },
  wholesale: {
    icon: <Building2 size={18} />,
    adds: "Sell in bulk to retailers, dealers and contractors: business customers with a GSTIN, credit limit and price list, quotations, sales orders and receivables. Adds Wholesale under Back office and on your tills.",
    off: "Wholesale menus disappear from the portal and tills.",
  },
  inventory: {
    icon: <Boxes size={18} />,
    adds: "Stock by branch, receiving and adjusting stock, movements, serial numbers and reorder levels. Adds Inventory under Back office and on your tills.",
    off: "The Inventory page disappears from the portal and tills. Stock is still counted on every sale, and Products and orders still show it.",
  },
  transfers: {
    icon: <ArrowLeftRight size={18} />,
    adds: "Move stock between your branches with a request, approval, dispatch and receipt, so every unit is accounted for on the way. Adds Transfers under Back office.",
    off: "The Transfers menu disappears for everyone.",
  },
  finance: {
    icon: <Banknote size={18} />,
    adds: "Accounts, journal, expenses, tax invoices, settlements and financial reports. Adds Finance under Back office.",
    off: "The Finance page disappears. The books are still kept on every sale, so switching it back on shows everything.",
  },
  workforce: {
    icon: <CalendarClock size={20} />,
    adds: "Attendance with check-in and check-out, breaks, leave requests and approvals, holidays and team attendance, as one package. Adds the Workforce menu and Settings > Attendance and holidays.",
    off: "The whole Workforce menu (attendance, check-in, leave, holidays) disappears for everyone.",
  },
};

/** Settings > Modules: the business switches its optional modules on and off, for the portal and its tills alike (the till has no
 * switches of its own). Back office is one switch over its five modules, each with its own switch too. ShopConnect can disable a module
 * for the business; then the switch is locked and says to contact support. A module with open work can't be switched off (the server
 * refuses it too). */
export default function ModulesSettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const modules = useModules();
  const toggle = useSwitchModule();
  const [confirm, setConfirm] = useState<OptionalModule | null>(null);
  if (!ready) return null;
  const canEdit = hasTenantWide(session, "tenant:update");
  const currency = tenant?.currency ?? "INR";
  const all = modules.data ?? [];
  const backOffice = all.find((m) => m.key === "back_office");
  const children = all.filter((m) => m.parent === "back_office");
  const standalone = all.filter((m) => !m.parent && m.key !== "back_office");

  const apply = (m: OptionalModule, enabled: boolean) =>
    toggle.mutate(
      { key: m.key, enabled },
      {
        onSuccess: () => {
          toast.success(`${m.label} switched ${enabled ? "on" : "off"}`);
          setConfirm(null);
        },
        onError: (e) => {
          toast.error(
            `Couldn't switch ${m.label} ${enabled ? "on" : "off"}`,
            e.message,
          );
          setConfirm(null);
        },
      },
    );

  const row = (m: OptionalModule, nested = false) => (
    <ModuleRow
      key={m.key}
      module={m}
      nested={nested}
      canEdit={canEdit}
      pending={toggle.isPending}
      currency={currency}
      onToggle={() => (m.enabled ? setConfirm(m) : apply(m, true))}
    />
  );

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<ToggleRight size={20} />}
        title="Modules"
        description="Switch on only what your business uses, here for the portal and your tills alike. Switching a module off hides it for everyone and deletes nothing: switch it back on and everything is as you left it."
      />
      {modules.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {modules.error.message}
        </p>
      )}
      <div className="grid max-w-3xl gap-space-4">
        {!modules.data ? (
          <Card className="p-space-5">
            <SkeletonLines rows={6} />
          </Card>
        ) : (
          <>
            {backOffice && (
              <Card className="p-space-5">
                {row(backOffice)}
                <div className="mt-space-4 divide-y divide-line border-t border-line">
                  {children.map((m) => row(m, true))}
                </div>
              </Card>
            )}
            {standalone.map((m) => (
              <Card key={m.key} className="p-space-5">
                {row(m)}
              </Card>
            ))}
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirm !== null}
        title={`Switch off ${confirm?.label ?? ""}?`}
        message={
          confirm
            ? `${INFO[confirm.key].off} Nothing is deleted: switch it back on and everything is as you left it.`
            : ""
        }
        confirmLabel="Switch off"
        destructive
        busy={toggle.isPending}
        onConfirm={() => confirm && apply(confirm, false)}
        onCancel={() => setConfirm(null)}
      />
    </PortalShell>
  );
}

/** One module with its badge, what it adds, why it is off and its switch. A nested row is a Back office module: while Back office is off it
 * says so, and its own switch can still be changed (it applies when Back office is back on). */
function ModuleRow({
  module: m,
  nested,
  canEdit,
  pending,
  currency,
  onToggle,
}: {
  module: OptionalModule;
  nested: boolean;
  canEdit: boolean;
  pending: boolean;
  currency: string;
  onToggle: () => void;
}) {
  const blocked = !m.allowed;
  const busy = m.enabled && m.open_work.length > 0;
  const needsBranch = !m.enabled && m.needs_branches;
  const locked = !canEdit || blocked || busy || needsBranch || pending;
  return (
    <div
      className={cn(
        "flex items-start gap-space-4",
        nested && "py-space-4 last:pb-0",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600",
          nested ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        {INFO[m.key].icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-space-2">
          <h2
            className={cn(
              "font-bold text-ink-900",
              nested ? "text-[14px]" : "text-[15px]",
            )}
          >
            {m.label}
          </h2>
          {blocked ? (
            <Badge tone="error">Disabled by ShopConnect</Badge>
          ) : m.active ? (
            <Badge tone="success">On</Badge>
          ) : m.reason === "parent" ? (
            <Badge tone="neutral">Off with Back office</Badge>
          ) : (
            <Badge tone="neutral">Off</Badge>
          )}
        </div>
        <p className="mt-1 text-[13px] text-ink-600">{INFO[m.key].adds}</p>
        {blocked && (
          <p className="mt-space-2 text-[13px] font-medium text-error">
            This module has been disabled for your business. Please{" "}
            <Link
              href="/portal/support"
              className="underline hover:no-underline"
            >
              contact support
            </Link>{" "}
            to turn it back on.
          </p>
        )}
        {!blocked && m.enabled && m.reason === "no_service" && (
          <p className="mt-space-2 text-[12.5px] font-medium text-warning">
            It needs a live plan (Online, POS or WhatsApp) to work.
          </p>
        )}
        {!blocked && m.reason === "parent" && (
          <p className="mt-space-2 text-[12.5px] text-ink-400">
            Back office is off, so this is off too. Its own switch is kept for
            when Back office is back on.
          </p>
        )}
        {needsBranch && !blocked && (
          <p className="mt-space-2 text-[12.5px] text-ink-400">
            Stock transfers need at least two branches.{" "}
            <Link
              href="/portal/settings/branches"
              className="font-medium text-brand-600 hover:underline"
            >
              Add a branch
            </Link>{" "}
            first.
          </p>
        )}
        {m.open_work.length > 0 && (
          <div className="mt-space-2 rounded-md bg-warning-tint px-space-3 py-space-2 text-[12.5px] text-ink-900">
            <p className="font-semibold">
              Open work — finish or cancel it before switching off:
            </p>
            <ul className="mt-1 list-disc pl-space-4">
              {m.open_work.map((w) => (
                <li key={w.key}>
                  {w.count} {w.label}
                  {w.amount_minor
                    ? ` (${formatMoney(w.amount_minor, currency)})`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Switch
        checked={m.enabled && !blocked}
        disabled={locked}
        aria-label={`${m.label} ${m.enabled ? "on" : "off"}`}
        onChange={onToggle}
      />
    </div>
  );
}
