"use client";

import { MessageCircle } from "lucide-react";
import { ModulePlaceholder } from "@/components/erp/ModulePlaceholder";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Page() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="whatsapp-inbox">
      <PageHeader
        icon={<MessageCircle size={20} />}
        title="WhatsApp Inbox"
        description="Customer conversations from WhatsApp Shop Connect."
      />
      <ModulePlaceholder
        title="WhatsApp Inbox"
        summary="A shared inbox for customer conversations that arrive through WhatsApp, linked to the customer record and their orders."
        planned={[
          "Conversations grouped by customer, with the customer's order history alongside",
          "Hand-off between the bot and your staff",
          "Reply from the branch that owns the order",
        ]}
        phase="Phase 6 — WhatsApp Shop Connect"
      />
    </PortalShell>
  );
}
