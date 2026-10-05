"use client";

import { Globe } from "lucide-react";
import { ChannelConnections } from "@/components/erp/ChannelConnections";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function OnlineStorefrontPage() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="storefront">
      <PageHeader icon={<Globe size={20} />} title="Online Storefront" description="Connect your website to the ERP so its orders, stock and customers stay in one place." />
      <p className="max-w-2xl text-[14px] text-ink-600">
        Your website talks to the ERP with an API key. Orders it places are recorded on the <strong>Online</strong> channel, reserve stock from the right branch,
        and appear in Orders and Customers like any other sale.
      </p>
      <ChannelConnections channel="online" />
    </PortalShell>
  );
}
