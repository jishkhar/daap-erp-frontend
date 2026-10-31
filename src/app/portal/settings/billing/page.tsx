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
import { useBilling, useCancelService } from "@/hooks/useBilling";
import { SERVICE_LABEL, SERVICES, type Service } from "@/lib/services";
import {
  refreshStaffSession,
  hasPermission,
  useStaffSession,
} from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { PaymentFailedBanner } from "@/components/portal/PaymentFailedBanner";
import { BillingEmail } from "./_components/BillingEmail";
import { PaymentMethodDialog } from "./_components/PaymentMethod";
import { createPaymentColumns } from "./_components/payment-columns";
import {
  AddServiceCard,
  cancelCopy,
  ON_PLAN,
  PlanRow,
} from "./_components/ServicePlans";
import { UsageStats } from "./_components/UsageStats";

const heading = "mt-space-5 mb-space-3 text-[15px] font-bold text-ink-900";

export default function BillingPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const view = useBilling();
  const canManage = hasPermission(session, "billing", "write");
  // The chooser: open on one service's plans ("pos"), or on the service step (null service); closed when `choosing` is false.
  const [choosing, setChoosing] = useState<{ service: Service | null } | null>(
    null,
  );
  const [cancelling, setCancelling] = useState<Service | null>(null);
  // Changing a plan's card / UPI AutoPay; emails link here with ?fix=pos (failed charge) or ?change=pos (renewal reminder).
  const [methodFor, setMethodFor] = useState<Service | null>(null);
  const cancelService = useCancelService();
  const busy = cancelService.isPending;
  const columns = useMemo(() => createPaymentColumns(), []);

  // Checkout opens in a new tab (Razorpay's Subscriptions API cannot redirect back), so refresh when the person returns.
  const { refetch: reload } = view;
  useEffect(() => {
    const refresh = () => {
      reload();
      void refreshStaffSession();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [reload]);

  // A link such as /portal/settings/billing#pos scrolls to that service once it is on screen; ?fix=pos / ?change=pos opens its payment method.
  const loaded = !!view.data;
  useEffect(() => {
    if (!loaded) return;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
    const query = new URLSearchParams(window.location.search);
    const asked = SERVICES.find(
      (s) => s === (query.get("fix") ?? query.get("change")),
    );
    if (asked) {
      window.history.replaceState(null, "", window.location.pathname);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opened once from the email's link, after the plans load
      setMethodFor(asked);
    }
  }, [loaded]);

  if (!ready) return null;
  const data = view.data;
  const onPlan = data
    ? SERVICES.filter((s) => ON_PLAN.includes(data.services[s].state))
    : [];
  const others = data ? SERVICES.filter((s) => !onPlan.includes(s)) : [];
  const confirm =
    cancelling && data
      ? cancelCopy(cancelling, data.services[cancelling])
      : null;

  function cancel(service: Service) {
    cancelService.mutate(service, {
      onSuccess: () => {
        toast.success(
          confirm?.label === "Cancel at period end"
            ? "Cancellation scheduled."
            : "Cancelled.",
        );
        void refreshStaffSession();
      },
      onError: (e) => toast.error("Couldn't complete that", e.message),
      onSettled: () => setCancelling(null),
    });
  }

  return (
    <PortalShell tenant={tenant} active="billing">
      <PageHeader
        icon={<CreditCard size={20} />}
        title="Plan & Billing"
        description="Website, POS and WhatsApp are bought separately: each has its own plan, renewal and billing."
      />
      {view.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {view.error.message}
        </p>
      )}
      <PaymentFailedBanner />
      {data && !data.billing_configured && (
        <p className="mb-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">
          Website payments aren&apos;t switched on for this platform yet.
          Contact your account manager to change a plan.
        </p>
      )}

      {data ? (
        <>
          <UsageStats
            usage={data.usage}
            showTerminals={!data.services.pos.locked}
          />

          <h2 className={heading}>Your plans</h2>
          {onPlan.length ? (
            <Card className="divide-y divide-line p-0">
              {onPlan.map((s) => (
                <PlanRow
                  key={s}
                  service={s}
                  info={data.services[s]}
                  tax={data.tax}
                  canManage={canManage}
                  onChoose={() => setChoosing({ service: s })}
                  onCancel={() => setCancelling(s)}
                  onChangeMethod={() => setMethodFor(s)}
                />
              ))}
            </Card>
          ) : (
            <Card className="p-space-4 text-[13px] text-ink-600">
              You aren&apos;t on any plan yet. Pick a service below to get
              started.
            </Card>
          )}

          {others.length > 0 && (
            <>
              <h2 className={heading}>
                {onPlan.length ? "Add more services" : "Services"}
              </h2>
              <div className="grid gap-space-3 md:grid-cols-2 xl:grid-cols-3">
                {others.map((s) => (
                  <AddServiceCard
                    key={s}
                    service={s}
                    info={data.services[s]}
                    canManage={canManage}
                    onChoose={() => setChoosing({ service: s })}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : view.isFetching ? (
        <Card className="p-space-4">
          <SkeletonLines rows={3} />
        </Card>
      ) : null}

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

      <h2 className={heading}>Billing history</h2>
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={data?.payments ?? []}
          getRowId={(p) => p.id}
          pageSize={10}
          loading={view.isFetching}
          emptyMessage={view.isFetching ? "Loading…" : "No payments yet."}
        />
      </Card>
      <BillingEmail canManage={canManage} />

      {canManage && methodFor && (
        <PaymentMethodDialog
          service={methodFor}
          info={data?.services[methodFor]}
          onClose={() => {
            setMethodFor(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={cancelling !== null}
        destructive
        busy={busy}
        title={
          cancelling ? `Cancel ${SERVICE_LABEL[cancelling]}?` : "Cancel plan?"
        }
        confirmLabel={confirm?.label ?? "Cancel"}
        message={confirm?.message ?? ""}
        onCancel={() => setCancelling(null)}
        onConfirm={() => cancelling && cancel(cancelling)}
      />
    </PortalShell>
  );
}
