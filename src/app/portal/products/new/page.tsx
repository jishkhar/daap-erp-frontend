"use client";
import { ProductEditor } from "@/components/erp/ProductEditor";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";

export default function NewProductPage() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="products">
      <ProductEditor />
    </PortalShell>
  );
}
