"use client";

import { MessageSquareText } from "lucide-react";
import { ModulePlaceholder } from "@/components/erp/ModulePlaceholder";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Page() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="feedback">
      <PageHeader
        icon={<MessageSquareText size={20} />}
        title="Feedback"
        description="What customers say about their orders."
      />
      <ModulePlaceholder
        title="Feedback"
        summary="Customer ratings and comments collected after an order is fulfilled, attributed to the branch and channel that served it."
        planned={[
          "Ratings and comments per order, branch and channel",
          "Alerts for low ratings",
          "Feedback requests sent over WhatsApp",
        ]}
        phase="Phase 9 — Intelligence"
      />
    </PortalShell>
  );
}
