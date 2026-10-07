"use client";

import { Tag } from "lucide-react";
import { ModulePlaceholder } from "@/components/erp/ModulePlaceholder";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Page() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="discounts">
      <PageHeader
        icon={<Tag size={20} />}
        title="Discounts"
        description="Coupons and promotions across channels."
      />
      <ModulePlaceholder
        title="Discounts"
        summary="Discount rules and coupon codes that apply across Online, POS and WhatsApp orders. Today a discount can only be set on an individual order line (through the API); reusable rules and coupon codes come next."
        planned={[
          "Coupon codes with validity, usage limits and minimum order value",
          "Channel- and branch-specific promotions",
          "Approval limits for staff-applied discounts",
        ]}
        phase="Phase 4–5 — Retail & Online Website"
      />
    </PortalShell>
  );
}
