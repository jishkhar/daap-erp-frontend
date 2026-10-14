"use client";
import { useParams } from "next/navigation";
import { ProductEditor } from "@/components/erp/ProductEditor";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { useErpQuery, type Product } from "@/lib/erp";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const {
    data: product,
    error,
    loading,
  } = useErpQuery<Product>(ready ? `/api/v1/products/${id}` : null);
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="products">
      {error ? (
        <p role="alert" className="text-error">
          {error}
        </p>
      ) : loading || !product ? (
        <p role="status">Loading product…</p>
      ) : (
        <ProductEditor key={product.id} product={product} />
      )}
    </PortalShell>
  );
}
