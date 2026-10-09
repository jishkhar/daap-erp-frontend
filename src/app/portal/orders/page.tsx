"use client";

import { ShoppingCart } from "lucide-react";
import { OrdersView } from "@/components/erp/OrdersView";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { GstNotice } from "@/components/portal/onboarding/guide";
import { PageHeader } from "@/components/ui/PageHeader";

export default function OrdersPage() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  // Rendered only after sign-in resolves (client side), so reading the address bar here cannot mismatch the server render.
  const channel =
    new URLSearchParams(window.location.search).get("channel") ?? "";
  return (
    <PortalShell tenant={tenant} active="orders">
      <PageHeader
        scopedToBranch
        icon={<ShoppingCart size={20} />}
        title="Orders"
        description="Every order from every channel and branch, in one place."
        actions={<Button href="/portal/orders/new">New order</Button>}
      />
      <GstNotice />
      <OrdersView initialChannel={channel} />
    </PortalShell>
  );
}
