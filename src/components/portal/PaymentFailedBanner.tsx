"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SERVICE_LABEL, SERVICES } from "@/lib/services";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";

/** A red banner while any service's last charge failed (Razorpay is retrying): the service keeps working only until the retries run out.
 * For people who can see billing; the button opens Plan & Billing on that service's "Fix payment". */
export function PaymentFailedBanner() {
  const session = useStaffSession();
  if (!session?.services || !hasPermission(session, "billing", "view"))
    return null;
  const failed = SERVICES.filter(
    (s) => session.services?.[s]?.state === "past_due",
  );
  if (!failed.length) return null;
  const names = failed.map((s) => SERVICE_LABEL[s]).join(" and ");
  return (
    <div
      role="alert"
      className="mb-space-4 flex flex-wrap items-center gap-space-3 rounded-lg border border-error/30 bg-error-tint p-space-3"
    >
      <AlertTriangle size={18} className="shrink-0 text-error" />
      <p className="min-w-0 flex-1 text-[13.5px] text-ink-900">
        <strong>Your {names} payment failed.</strong> It keeps working while
        Razorpay retries the payment, then stops. Pay with another card or UPI
        AutoPay to keep it on.
      </p>
      <Button
        href={`/portal/settings/billing?fix=${failed[0]}`}
        variant="destructive"
      >
        Fix payment
      </Button>
    </div>
  );
}
