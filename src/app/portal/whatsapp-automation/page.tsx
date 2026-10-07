"use client";

import { Zap } from "lucide-react";
import { ModulePlaceholder } from "@/components/erp/ModulePlaceholder";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Page() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="whatsapp-automation">
      <PageHeader
        icon={<Zap size={20} />}
        title="WhatsApp Automation"
        description="Automated WhatsApp messages triggered by order events."
      />
      <ModulePlaceholder
        title="WhatsApp Automation"
        summary="Rules that send WhatsApp messages automatically when something happens to an order or a customer."
        planned={[
          "Order confirmed, dispatched and delivered notifications",
          "Abandoned-cart and payment-pending reminders",
          "Template management and per-branch sender numbers",
        ]}
        phase="Phase 6 — WhatsApp Shop Connect"
      />
    </PortalShell>
  );
}
