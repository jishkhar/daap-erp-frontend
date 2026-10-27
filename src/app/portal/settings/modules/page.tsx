"use client";

import {
  ArrowLeftRight,
  Building2,
  CalendarClock,
  ToggleRight,
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
import { formatMoney } from "@/lib/erp";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

const INFO: Record<
  ModuleKey,
  { icon: React.ReactNode; adds: string; off: string }
> = {
  wholesale: {
    icon: <Building2 size={20} />,
    adds: "Sell in bulk to retailers, dealers and contractors: business customers with a GSTIN, credit limit and price list, quotations, sales orders and receivables. Adds Wholesale under Back office and on your tills.",
    off: "Wholesale menus disappear from the portal and tills.",
  },
  transfers: {
    icon: <ArrowLeftRight size={20} />,
    adds: "Move stock between your branches with a request, approval, dispatch and receipt, so every unit is accounted for on the way. Adds Transfers under Back office.",
    off: "The Transfers menu disappears for everyone.",
  },
  workforce: {
    icon: <CalendarClock size={20} />,
    adds: "Attendance with check-in and check-out, breaks, leave requests and approvals, holidays and team attendance, as one package. Adds the Workforce menu and Settings > Attendance and holidays.",
    off: "The whole Workforce menu (attendance, check-in, leave, holidays) disappears for everyone.",
  },
};

/** Settings > Modules: the business switches its optional modules on and off. ShopConnect can disable one for the business; then the
 * switch is locked and says to contact support. A module with open work can't be switched off (the server refuses it too). */
export default function ModulesSettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const modules = useModules();
  const toggle = useSwitchModule();
  const [confirm, setConfirm] = useState<OptionalModule | null>(null);
  if (!ready) return null;
  const canEdit = hasTenantWide(session, "tenant:update");
  const currency = tenant?.currency ?? "INR";

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

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<ToggleRight size={20} />}
        title="Modules"
        description="Switch on only what your business uses. Switching a module off hides it for everyone and deletes nothing: switch it back on and everything is as you left it."
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
          modules.data.map((m) => {
            const blocked = !m.allowed;
            const busy = m.enabled && m.open_work.length > 0;
            const needsBranch = !m.enabled && m.needs_branches;
            const locked =
              !canEdit || blocked || busy || needsBranch || toggle.isPending;
            return (
              <Card key={m.key} className="p-space-5">
                <div className="flex items-start gap-space-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                    {INFO[m.key].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-space-2">
                      <h2 className="text-[15px] font-bold text-ink-900">
                        {m.label}
                      </h2>
                      {blocked ? (
                        <Badge tone="error">Disabled by ShopConnect</Badge>
                      ) : m.active ? (
                        <Badge tone="success">On</Badge>
                      ) : (
                        <Badge tone="neutral">Off</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-ink-600">
                      {INFO[m.key].adds}
                    </p>
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
                                ? ` (${formatMoney(w.amount_minor, currency)} owed)`
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
                    onChange={() =>
                      m.enabled ? setConfirm(m) : apply(m, true)
                    }
                  />
                </div>
              </Card>
            );
          })
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
