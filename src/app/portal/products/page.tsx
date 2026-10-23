"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ImageIcon,
  PackagePlus,
  Package,
  Pencil,
  MoreHorizontal,
  Eye,
  FolderPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileUploadIcon } from "@hugeicons/core-free-icons";
import { ProductImportModal } from "@/components/erp/ProductImportModal";
import { ProductCategoriesTab } from "@/components/erp/ProductCategoriesTab";
import {
  ProductImagesModal,
  ProductThumb,
} from "@/components/erp/ProductImagesModal";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useStockFor } from "@/hooks/useInventory";
import {
  useProductCategories,
  useProductList,
  type ImportResult,
} from "@/hooks/useProducts";
import { formatMoney, type Product } from "@/lib/erp";
import { hasGrant, hasPermission, useStaffSession } from "@/lib/staffAuth";
import { useActiveBranch } from "@/lib/branch";
import { useDebounced } from "@/lib/useDebounced";
import { productAudienceLabel } from "@/lib/productAudience";

const LIFECYCLE_TONE = {
  draft: "warning",
  active: "success",
  discontinued: "neutral",
  archived: "neutral",
} as const;

export default function ProductsPage() {
  const { tenant, ready } = usePortalGuard();
  const router = useRouter();
  const session = useStaffSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [categoryOpen, setCategoryOpen] = useState(false);
  // Paged on the server; stock is read for just the products on the page.
  const query = useDebounced(search.trim());
  const products = useProductList(query);
  const { branchId: activeBranch } = useActiveBranch();
  // "All branches" shows the consolidated total; a chosen branch shows only that branch's stock.
  const stock = useStockFor(
    products.rows.map((p) => p.id),
    activeBranch ?? "",
  );
  const categories = useProductCategories();
  const [imagesOf, setImagesOf] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const canWrite = hasPermission(session, "products", "write");
  const stockBy = useMemo(
    () => new Map((stock.data ?? []).map((s) => [s.variant_id, s])),
    [stock.data],
  );
  const cur = tenant?.currency ?? "INR";

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        header: "Product",
        cell: ({ row }) => (
          <div className="flex items-center gap-space-2">
            <ProductThumb url={row.original.images?.[0]} />
            <div>
              <button
                type="button"
                onClick={() =>
                  router.push(`/portal/products/${row.original.id}`)
                }
                className="text-left font-semibold text-ink-900 hover:text-brand-700 hover:underline"
              >
                {row.original.name}
              </button>
              <p className="text-[12px] text-ink-400">
                {row.original.sku}
                {row.original.serialization_type !== "NONE" && (
                  <>
                    {" "}
                    · tracked by{" "}
                    {row.original.serialization_type === "IMEI"
                      ? "IMEI"
                      : "serial no."}
                  </>
                )}
              </p>
            </div>
          </div>
        ),
      },
      {
        header: "Category",
        cell: ({ row }) =>
          row.original.category_name ??
          categories.data?.find((c) => c.id === row.original.category_id)
            ?.name ??
          "—",
      },
      {
        header: "For",
        cell: ({ row }) =>
          productAudienceLabel(
            row.original.variant_attributes?.target_audience,
          ),
      },
      {
        header: "Color",
        cell: ({ row }) => {
          const hex = row.original.variant_attributes?.color_hex;
          return typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex) ? (
            <span className="flex items-center gap-space-2">
              <span
                className="h-4 w-4 rounded border border-line"
                style={{ backgroundColor: hex }}
              />
              {hex.toUpperCase()}
            </span>
          ) : (
            "—"
          );
        },
      },
      {
        header: "Price",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatMoney(row.original.price_minor, cur)}
          </span>
        ),
      },
      {
        header: "Tax",
        cell: ({ row }) =>
          row.original.tax_code ?? <span className="text-ink-400">—</span>,
      },
      {
        header: "In stock",
        cell: ({ row }) => {
          const s = stockBy.get(row.original.id);
          return s ? (
            <span>
              <strong>{s.available_qty}</strong>
              {s.reserved_qty > 0 && (
                <span className="text-ink-400">
                  {" "}
                  (+{s.reserved_qty} reserved)
                </span>
              )}
            </span>
          ) : (
            <span className="text-ink-400">0</span>
          );
        },
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={LIFECYCLE_TONE[row.original.lifecycle_status]}>
            {row.original.lifecycle_status}
          </Badge>
        ),
      },
      {
        header: "Images",
        id: "images",
        cell: ({ row }) => (
          <div className="flex justify-end gap-space-1">
            {canWrite && (
              <Button
                variant="ghost"
                aria-label={`Images of ${row.original.name}`}
                onClick={() => setImagesOf(row.original.id)}
              >
                <ImageIcon size={15} /> Images
              </Button>
            )}
          </div>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${row.original.name}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-600 hover:bg-black/[0.04] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <MoreHorizontal size={20} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/portal/products/${row.original.id}`)
                }
              >
                <Eye size={16} /> View
              </DropdownMenuItem>
              {canWrite && (
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/portal/products/${row.original.id}`)
                  }
                >
                  <Pencil size={16} /> Edit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [cur, stockBy, canWrite, categories.data, router],
  );

  if (!ready) return null;

  return (
    <PortalShell tenant={tenant} active="products">
      <PageHeader
        scopedToBranch={tab === "products"}
        icon={<Package size={20} />}
        title="Products"
        description="The product master shared by every branch and every channel."
        actionsClassName={
          tab === "products"
            ? "w-full md:w-auto"
            : "w-full justify-end md:w-auto"
        }
        actions={
          tab === "products"
            ? canWrite && (
                <div className="mobile-page-actions mobile-page-actions-pair flex w-full flex-wrap justify-end gap-space-2 md:w-auto">
                  <Button
                    variant="ghost"
                    className="min-w-0 gap-1 whitespace-nowrap !px-2 text-[12px] min-[360px]:text-[14px] md:gap-space-2 md:!px-space-4"
                    onClick={() => setImportOpen(true)}
                  >
                    <HugeiconsIcon
                      icon={FileUploadIcon}
                      size={16}
                      className="shrink-0"
                    />
                    <span>Import CSV / Excel</span>
                  </Button>
                  <Button
                    className="min-w-0 gap-1 whitespace-nowrap !px-2 text-[12px] min-[360px]:text-[14px] md:gap-space-2 md:!px-space-4"
                    onClick={() => router.push("/portal/products/new")}
                  >
                    <PackagePlus size={16} className="shrink-0" />
                    <span>Add product</span>
                  </Button>
                </div>
              )
            : hasGrant(session, "products:create") && (
                <Button onClick={() => setCategoryOpen(true)}>
                  <FolderPlus size={16} /> Add category
                </Button>
              )
        }
      />
      <Tabs
        tabs={[
          { key: "products", label: "Products" },
          { key: "categories", label: "Categories" },
        ]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setCategoryOpen(false);
        }}
      />
      {tab === "categories" ? (
        <ProductCategoriesTab
          createOpen={categoryOpen}
          onCloseCreate={() => setCategoryOpen(false)}
        />
      ) : (
        <>
          <Card className="mb-space-4 p-space-3">
            <Input
              placeholder="Search by name, SKU or barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
              aria-label="Search products"
            />
          </Card>
          {products.error && (
            <p className="mb-space-3 text-[13px] font-medium text-error">
              {products.error.message}
            </p>
          )}
          <Card className="p-space-2">
            <DataTable
              columns={columns}
              data={products.rows}
              getRowId={(p) => String(p.id)}
              paginate={false}
              loading={products.isFetching}
              emptyMessage={
                products.isLoading ? "Loading products…" : "No products yet."
              }
            />
            <CursorPager {...products.pager} />
          </Card>
        </>
      )}

      <ProductImagesModal
        product={products.rows.find((p) => p.id === imagesOf) ?? null}
        onClose={() => setImagesOf(null)}
      />

      {importOpen && (
        <ProductImportModal
          currency={cur}
          onClose={() => setImportOpen(false)}
          onImported={(result) => {
            setImportOpen(false);
            setImportResult(result);
          }}
        />
      )}

      <Modal
        open={importResult !== null}
        onClose={() => setImportResult(null)}
        width="lg"
        title="Import results"
        description={
          importResult
            ? `${importResult.created} of ${importResult.total} products imported${importResult.failed ? `, ${importResult.failed} skipped` : ""}.`
            : undefined
        }
        footer={<Button onClick={() => setImportResult(null)}>Done</Button>}
      >
        {importResult && importResult.errors.length > 0 && (
          <ul className="max-h-72 space-y-space-1 overflow-y-auto text-[13px]">
            {importResult.errors.map((e) => (
              <li key={e.row}>
                <strong>
                  Row {e.row}
                  {e.sku ? ` (${e.sku})` : ""}:
                </strong>{" "}
                <span className="text-error">{e.error}</span>
              </li>
            ))}
          </ul>
        )}
        {importResult && importResult.errors.length === 0 && (
          <p className="text-[13px] text-ink-600">Every row was imported.</p>
        )}
      </Modal>
    </PortalShell>
  );
}
