"use client";

import { CreditCard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { PlanPickerModal } from "@/components/portal/PlanPickerModal";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { erp, useErpQuery } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import { SERVICE_LABEL, SERVICES, type Service } from "@/lib/services";
import { refreshStaffSession, hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import type { BillingView } from "./_components/billing-types";
import { createPaymentColumns } from "./_components/payment-columns";
import { ServiceBillingCard } from "./_components/ServiceBillingCard";

function Meter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[13px]">
        <span className="text-ink-600">{label}</span>
        <span className="font-semibold text-ink-900">
          {used}
          {max ? ` / ${max}` : " (unlimited)"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-error" : "bg-brand-600"}`}
          style={{ width: max ? `${Math.max(pct, 2)}%` : "0%" }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const view = useErpQuery<BillingView>("/api/v1/billing");
  const canManage = hasPermission(session, "billing", "write");
  // The chooser: open on one service's plans ("pos"), or on the service step (null service); closed when `choosing` is false.
  const [choosing, setChoosing] = useState<{ service: Service | null } | null>(null);
  const [cancelling, setCancelling] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);
  const columns = useMemo(() => createPaymentColumns(), []);

  // Checkout opens in a new tab (Razorpay's Subscriptions API cannot redirect back), so refresh when the person returns.
  const { reload } = view;
  useEffect(() => {
    const refresh = () => {
      reload();
      void refreshStaffSession();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [reload]);

  // A link such as /portal/settings/billing#pos scrolls to that service once it is on screen.
  const loaded = !!view.data;
  useEffect(() => {
    if (!loaded) return;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [loaded]);

  if (!ready) return null;
  const data = view.data;

  async function cancel(service: Service) {
    setBusy(true);
    const res = await erp(`/api/v1/billing/${service}/cancel`, "POST", {
      at_cycle_end: true,
    });
    setBusy(false);
    setCancelling(null);
    if (res.error) return toast.error("Couldn't complete that", res.error);
    toast.success("Cancellation scheduled.");
    reload();
    void refreshStaffSession();
  }

  return (
    <PortalShell tenant={tenant} active="billing">
      <PageHeader
        icon={<CreditCard size={20} />}
        title="Plan & Billing"
        description="Online, POS and WhatsApp are bought separately: each has its own plan, renewal and billing."
      />
      {view.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {view.error}
        </p>
      )}
      {data && !data.billing_configured && (
        <p className="mb-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">
          Online payments aren&apos;t switched on for this platform yet. Contact
          your account manager to change a plan.
        </p>
      )}

      {data ? (
        <div className="grid gap-space-4 xl:grid-cols-3">
          {SERVICES.map((s) => (
            <ServiceBillingCard
              key={s}
              service={s}
              info={data.services[s]}
              canManage={canManage}
              onChoose={() => setChoosing({ service: s })}
              onCancel={() => setCancelling(s)}
            />
          ))}
        </div>
      ) : view.loading ? (
        <Card className="p-space-4">
          <SkeletonLines rows={3} />
        </Card>
      ) : null}

      <Card className="mt-space-4 p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Usage</h2>
        {!data && view.loading && <SkeletonLines rows={3} />}
        {data && (
          <div className="space-y-space-3 rounded-md border border-line p-space-3">
            <Meter
              label="Branches"
              used={data.usage.branches}
              max={data.usage.max_branches}
            />
            <Meter
              label="Users"
              used={data.usage.users}
              max={data.usage.max_users}
            />
            {!data.services.pos.locked && (
              <Meter
                label="POS terminals"
                used={data.usage.terminals}
                max={data.usage.max_terminals}
              />
            )}
            <p className="text-[12px] text-ink-400">
              Branches and users are limited by your most generous live plan;
              POS terminals by your POS plan.
            </p>
          </div>
        )}
      </Card>

      <PlanPickerModal
        key={choosing?.service ?? "all"}
        open={choosing !== null}
        service={choosing?.service ?? undefined}
        onClose={() => setChoosing(null)}
        onDone={() => {
          reload();
          void refreshStaffSession();
        }}
      />

      <h2 className="mt-space-5 mb-space-3 text-[15px] font-bold text-ink-900">
        Payment history
      </h2>
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={data?.payments ?? []}
          getRowId={(p) => p.id}
          pageSize={10}
          loading={view.loading}
          emptyMessage={view.loading ? "Loading…" : "No payments yet."}
        />
      </Card>

      <ConfirmDialog
        open={cancelling !== null}
        destructive
        busy={busy}
        title={cancelling ? `Cancel ${SERVICE_LABEL[cancelling]}?` : "Cancel plan?"}
        confirmLabel="Cancel at period end"
        message={
          cancelling
            ? `You keep ${SERVICE_LABEL[cancelling]} until ${formatDate(data?.services[cancelling].subscription?.current_period_end)}. After that it stops working until you subscribe again. Your other services and your data are not affected.`
            : ""
        }
        onCancel={() => setCancelling(null)}
        onConfirm={() => cancelling && cancel(cancelling)}
      />
    </PortalShell>
  );
}
