"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlanPickerModal } from "@/components/portal/PlanPickerModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CONTACT, supportMailto } from "@/utils/contact";
import {
  hasPermission,
  logoutStaff,
  refreshStaffSession,
  useStaffSession,
} from "@/lib/staffAuth";

/** Shown over every portal page while the tenant has no active plan (trial over, subscription cancelled or expired). It can't be closed: the
 * server refuses everything but billing in this state, so the only ways forward are renewing or contacting support. */
export function SubscriptionGate() {
  const router = useRouter();
  const session = useStaffSession();
  const [picking, setPicking] = useState(false);
  const ended = !!session?.accessEnded;

  // After paying in the Razorpay tab the plan comes back by itself: keep asking until the server says the plan is active again.
  useEffect(() => {
    if (!ended) return;
    const poll = () => void refreshStaffSession();
    const timer = setInterval(poll, 8000);
    window.addEventListener("focus", poll);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, [ended]);

  if (!ended) return null;
  const canRenew = hasPermission(session, "billing", "write");

  return (
    <>
      <Modal
        open
        dismissible={false}
        onClose={() => {}}
        title="No active plan"
        width="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={async () => {
                await logoutStaff();
                router.push("/portal/login");
              }}
            >
              Sign out
            </Button>
            {canRenew && (
              <Button onClick={() => setPicking(true)}>Renew</Button>
            )}
          </>
        }
      >
        <div className="flex flex-col items-center gap-space-3 py-space-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-tint text-warning">
            <Lock size={22} />
          </span>
          <p className="text-[14px] text-ink-900">
            No active plan for this account.
          </p>
          <p className="text-[13px] text-ink-600">
            If you&apos;ve already paid, contact support at{" "}
            <a
              href={supportMailto}
              className="font-semibold text-brand-600 hover:underline"
            >
              {CONTACT.supportEmail}
            </a>
            .
            {canRenew
              ? " Otherwise, renew to get access."
              : " Otherwise, ask your account administrator to renew."}
          </p>
        </div>
      </Modal>
      <PlanPickerModal open={picking} onClose={() => setPicking(false)} />
    </>
  );
}
