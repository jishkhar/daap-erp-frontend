"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  abandonCheckout,
  useConfirmCheckout,
  useStartPaymentMethod,
} from "@/hooks/useBilling";
import { formatMoney } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import { paySubscription } from "@/lib/razorpayCheckout";
import { SERVICE_LABEL, type Service } from "@/lib/services";
import { refreshStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import type { BillingService, PaysWith } from "./billing-types";

/** "Visa ···· 4366", "UPI AutoPay"; null when unknown. */
export function paysWithText(p: PaysWith | null | undefined) {
  if (!p) return null;
  if (p.method === "card")
    return p.card_last4
      ? `${p.card_network ?? "Card"} ···· ${p.card_last4}`
      : "Card";
  return (
    { upi: "UPI AutoPay", emandate: "Bank e-mandate", nach: "NACH mandate" }[
      p.method
    ] ?? p.method
  );
}

/** Can this plan's payment method be changed: billed through Razorpay and not set to cancel. */
export function canChangeMethod(info: BillingService) {
  const sub = info.subscription;
  return (
    !!sub?.billed &&
    (sub.status === "active" || sub.status === "past_due") &&
    !sub.cancel_at_period_end
  );
}

/** Change a billed plan's card / UPI AutoPay, any time; after a failed charge the plan is paid now on the new one. A short explanation first,
 * then Razorpay's window over the page. */
export function PaymentMethodDialog({
  service,
  info,
  onClose,
}: {
  service: Service | null;
  info: BillingService | undefined;
  onClose: () => void;
}) {
  const start = useStartPaymentMethod();
  const confirm = useConfirmCheckout();
  const [busy, setBusy] = useState(false);
  if (!service || !info) return null;
  const failed = info.subscription?.status === "past_due";
  const amount = info.next_charge_minor
    ? formatMoney(info.next_charge_minor, info.plan?.currency.trim() ?? "INR")
    : "the plan's price";
  const name = SERVICE_LABEL[service];

  async function go() {
    if (!service) return;
    setBusy(true);
    try {
      const started = await start.mutateAsync(service);
      const paid = await paySubscription({
        keyId: started.key_id,
        subscriptionId: started.razorpay_subscription_id,
        name: "DAAP",
        description: started.charge_now
          ? started.description
          : `New payment method for ${started.description}`,
        prefill: started.prefill,
      });
      if (!paid) {
        void abandonCheckout(started.checkout_id);
        toast.info("Nothing was changed.");
        return;
      }
      await confirm.mutateAsync({ checkoutId: started.checkout_id, paid });
      void refreshStaffSession();
      toast.success(
        started.charge_now
          ? `${name} is paid and active again.`
          : "Payment method updated",
        started.charge_now
          ? "Your invoice is on its way to your email."
          : `Your next charge on ${formatDate(started.starts_at)} uses it.`,
      );
      onClose();
    } catch (e) {
      toast.error("Couldn't update the payment method", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open
      busy={busy}
      title={failed ? `Fix your ${name} payment` : "Change payment method"}
      message={
        failed
          ? `Pay ${amount} now with another card or UPI AutoPay. ${name} is active again straight away, and the new payment method is used for every renewal after this.`
          : `Add a new card or UPI AutoPay for ${name}. Nothing is charged now (your bank may show a small verification amount that is refunded). Your next charge of ${amount} on ${formatDate(info.subscription?.current_period_end)} is taken from the new one.`
      }
      confirmLabel={failed ? `Pay ${amount}` : "Continue"}
      onConfirm={go}
      onCancel={onClose}
    />
  );
}
