"use client";

import { ArrowLeft, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useStockFor } from "@/hooks/useInventory";
import { useProductCategories } from "@/hooks/useProducts";
import { useActiveBranch } from "@/lib/branch";
import { formatMoney, humanize, useErpQuery, type Product } from "@/lib/erp";
import { productAudienceLabel } from "@/lib/productAudience";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const {
    data: product,
    error,
    loading,
  } = useErpQuery<Product>(ready ? `/api/v1/products/${id}` : null);
  const { branchId } = useActiveBranch();
  const stock = useStockFor(product ? [product.id] : [], branchId ?? "");
  const categories = useProductCategories();
  const cur = tenant?.currency ?? "INR";
  if (!ready) return null;

  return (
    <PortalShell tenant={tenant} active="products">
      <Link
        href="/portal/products"
        className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft size={14} /> All products
      </Link>
      <PageHeader
        icon={<Package size={20} />}
        title={product?.name ?? "Product details"}
        description="Product details and uploaded images."
      />
      {error ? (
        <p role="alert" className="text-error">
          {error}
        </p>
      ) : loading || !product ? (
        <p role="status">Loading product…</p>
      ) : (
        <div className="grid gap-space-4 xl:grid-cols-2">
          <Card className="p-space-4">
            <h2 className="mb-space-4 text-lg font-semibold">
              Product details
            </h2>
            <dl className="grid gap-space-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-400">SKU</dt>
                <dd>{product.sku}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Variant</dt>
                <dd>{product.variant_name}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Category</dt>
                <dd>
                  {product.category_name ??
                    categories.data?.find((c) => c.id === product.category_id)
                      ?.name ??
                    "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-400">For</dt>
                <dd>{productAudienceLabel(product.variant_attributes?.target_audience)}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Color</dt>
                <dd>
                  {typeof product.variant_attributes?.color_hex === "string"
                    ? product.variant_attributes.color_hex.toUpperCase()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-400">Price</dt>
                <dd>{formatMoney(product.price_minor, cur)}</dd>
              </div>
              <div>
                <dt className="text-ink-400">MRP</dt>
                <dd>
                  {product.mrp_minor === null
                    ? "—"
                    : formatMoney(product.mrp_minor, cur)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-400">Tax</dt>
                <dd>{product.tax_code ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-400">In stock</dt>
                <dd>
                  {stock.isPending
                    ? "Loading…"
                    : stock.isError
                      ? "—"
                      : (stock.data?.find(
                          (item) => item.variant_id === product.id,
                        )?.available_qty ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-400">Status</dt>
                <dd>{humanize(product.lifecycle_status)}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Barcode</dt>
                <dd>{product.barcode ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-400">Description</dt>
                <dd className="whitespace-pre-wrap break-words">
                  {product.description || "—"}
                </dd>
              </div>
            </dl>

            {stock.isError && (
              <p role="alert" className="mt-space-3 text-error">
                Could not load stock.
              </p>
            )}
          </Card>
          <Card className="p-space-4">
            <h2 className="mb-space-4 text-lg font-semibold">
              Product images ({product.images?.length ?? 0})
            </h2>
            {product.images?.length ? (
              <div className="grid grid-cols-2 gap-space-3 sm:grid-cols-3">
                {product.images.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-line p-space-2 focus-visible:ring-2 focus-visible:ring-brand-400"
                    aria-label={`Open image ${index + 1} of ${product.name}`}
                  >
                    <Image
                      src={url}
                      alt={`${product.name} — image ${index + 1}`}
                      width={400}
                      height={400}
                      unoptimized
                      className="aspect-square w-full rounded object-contain"
                    />
                    <p className="mt-space-2 text-xs text-ink-600">
                      {index === 0 ? "Cover image" : `Image ${index + 1}`}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">
                No images uploaded for this product.
              </p>
            )}
          </Card>
        </div>
      )}
    </PortalShell>
  );
}
