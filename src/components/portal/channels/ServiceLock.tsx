"use client";

import { Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PlanPickerModal } from "@/components/portal/PlanPickerModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  buyLabel,
  SERVICE_LABEL,
  type Service,
  type ServiceState,
} from "@/lib/services";
import {
  hasPermission,
  refreshStaffSession,
  useStaffSession,
} from "@/lib/staffAuth";

const WHY: Record<ServiceState, (label: string) => string> = {
  none: (l) => `${l} isn't active on your account yet. Buy a plan to start using it.`,
  ended: (l) => `Your ${l} plan has ended. Renew to use ${l} again — your data is kept.`,
  pending: (l) => `Your ${l} payment hasn't gone through yet. Finish it to switch ${l} on.`,
  trialing: (l) => `Your ${l} trial has ended. Choose a plan to keep using it.`,
  active: (l) => `${l} is not available right now.`,
  past_due: (l) => `${l} is not available right now.`,
  comped: (l) => `${l} is not available right now.`,
};

/**
 * Wraps a Sales channel page. While the business has no working plan for `service` (never bought, trial or plan ended) the page shows as a dimmed,
 * non-interactive preview with ONE button over it -- Buy a plan / Renew -- that opens the plan chooser on that service's plans. A working service
 * (a trial included) renders its page as normal. The server enforces the same rule, so this is not only cosmetic.
 */
export function ServiceLock({
  service,
  children,
}: {
  service: Service;
  children: ReactNode;
}) {
  const session = useStaffSession();
  const info = session?.services?.[service];
  const locked = !!info?.locked;
  const [picking, setPicking] = useState(false);
  const canBuy = hasPermission(session, "billing", "write");

  // After paying in the Razorpay tab the service comes back by itself: keep asking until the server says it works.
  useEffect(() => {
    if (!locked) return;
    const poll = () => void refreshStaffSession();
    const timer = setInterval(poll, 8000);
    window.addEventListener("focus", poll);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, [locked]);

  if (!locked) return <>{children}</>;
  const label = SERVICE_LABEL[service];
  const state = info?.state ?? "none";

  return (
    <div className="relative min-h-[460px]">
      <div
        inert
        aria-hidden="true"
        className="pointer-events-none opacity-45 select-none"
      >
        {children}
      </div>
      <div className="absolute inset-x-0 top-0 flex justify-center px-space-3 pt-space-6">
        <Card className="w-full max-w-md p-space-5 text-center shadow-[var(--shadow-md)]">
          <span className="mx-auto mb-space-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-tint text-warning">
            <Lock size={22} />
          </span>
          <h2 className="text-[17px] font-bold text-ink-900">
            {state === "ended" ? `${label} has ended` : `${label} is locked`}
          </h2>
          <p className="mt-space-2 text-[13.5px] text-ink-600">
            {WHY[state](label)}
          </p>
          {canBuy ? (
            <Button className="mt-space-4" onClick={() => setPicking(true)}>
              {buyLabel(state)}
            </Button>
          ) : (
            <p className="mt-space-3 text-[13px] text-ink-600">
              Ask your account administrator to {state === "ended" ? "renew" : "buy"} it.
            </p>
          )}
        </Card>
      </div>
      <PlanPickerModal
        open={picking}
        service={service}
        onClose={() => setPicking(false)}
        onDone={() => void refreshStaffSession()}
      />
    </div>
  );
}
