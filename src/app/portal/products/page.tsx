"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ImageIcon,
  PackagePlus,
  Package,
  Pencil,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileUploadIcon, Download04Icon } from "@hugeicons/core-free-icons";
import { ExtraBarcodes } from "@/components/erp/ExtraBarcodes";
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
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useStockFor } from "@/hooks/useInventory";
import {
  useCreateProductCategory,
  useProductCategories,
  useImportProducts,
  useProductList,
  useSaveProduct,
  type ImportResult,
} from "@/hooks/useProducts";
import { useTaxRules } from "@/hooks/useTaxes";
import {
  formatMoney,
  fromMinor,
  humanize,
  toMinor,
  type Product,
} from "@/lib/erp";
import { hasGrant, hasPermission, useStaffSession } from "@/lib/staffAuth";
import { useActiveBranch } from "@/lib/branch";
import { useDebounced } from "@/lib/useDebounced";
import { toast } from "@/lib/toast";
import {
  BARCODE_SPECS,
  BARCODE_TYPES,
  sanitizeBarcode,
  validateBarcode,
  type BarcodeType,
} from "@/lib/barcode";

const LIFECYCLE_TONE = {
  draft: "warning",
  active: "success",
  discontinued: "neutral",
  archived: "neutral",
} as const;

type Draft = {
  id?: string;
  sku: string;
  name: string;
  variant_name: string;
  description: string;
  category_id: string;
  color_hex: string;
  variant_attributes: Record<string, unknown>;
  price: string;
  mrp: string;
  cost: string;
  tax_code: string;
  serialization_type: string;
  barcode: string;
  barcode_type: BarcodeType;
  lifecycle_status: string;
};
const EMPTY: Draft = {
  sku: "",
  name: "",
  variant_name: "",
  description: "",
  category_id: "",
  color_hex: "",
  variant_attributes: {},
  price: "",
  mrp: "",
  cost: "",
  tax_code: "",
  serialization_type: "NONE",
  barcode: "",
  barcode_type: "EAN_13",
  lifecycle_status: "active",
};

export default function ProductsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const [search, setSearch] = useState("");
  // Paged on the server; stock is read for just the products on the page.
  const query = useDebounced(search.trim());
  const products = useProductList(query);
  const { branchId: activeBranch } = useActiveBranch();
  // "All branches" shows the consolidated total; a chosen branch shows only that branch's stock.
  const stock = useStockFor(
    products.rows.map((p) => p.id),
    activeBranch ?? "",
  );
  const taxes = useTaxRules();
  const categories = useProductCategories();
  const createCategory = useCreateProductCategory();
  const [newCategory, setNewCategory] = useState("");
  const saveProduct = useSaveProduct();
  const importProducts = useImportProducts();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewOf, setViewOf] = useState<Product | null>(null);
  const [imagesOf, setImagesOf] = useState<string | null>(null);
  const busy = saveProduct.isPending || createCategory.isPending;
  const importing = importProducts.isPending;
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
              <p className="font-semibold text-ink-900">{row.original.name}</p>
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
              <DropdownMenuItem onClick={() => setViewOf(row.original)}>
                <Eye size={16} /> View
              </DropdownMenuItem>
              {canWrite && (
                <DropdownMenuItem
                  onClick={() => {
                    setDraft({
                      id: row.original.id,
                      sku: row.original.sku,
                      name: row.original.product_name,
                      variant_name:
                        row.original.variant_name === "Default"
                          ? ""
                          : row.original.variant_name,
                      description: row.original.description ?? "",
                      category_id: row.original.category_id ?? "",
                      color_hex:
                        typeof row.original.variant_attributes?.color_hex ===
                        "string"
                          ? row.original.variant_attributes.color_hex
                          : "",
                      variant_attributes: row.original.variant_attributes ?? {},
                      price: fromMinor(row.original.price_minor),
                      mrp: fromMinor(row.original.mrp_minor),
                      cost: fromMinor(row.original.cost_minor),
                      tax_code: row.original.tax_code ?? "",
                      serialization_type: row.original.serialization_type,
                      barcode: "",
                      barcode_type: "EAN_13",
                      lifecycle_status: row.original.lifecycle_status,
                    });
                  }}
                >
                  <Pencil size={16} /> Edit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [cur, stockBy, canWrite, categories.data],
  );

  if (!ready) return null;

  function save() {
    if (!draft) return;
    const price = toMinor(draft.price);
    if (price === null)
      return toast.error("Enter a valid price", "e.g. 1299.00");
    const mrp = draft.mrp ? toMinor(draft.mrp) : null;
    const cost = draft.cost ? toMinor(draft.cost) : null;
    if ((draft.mrp && mrp === null) || (draft.cost && cost === null))
      return toast.error("Enter valid amounts for MRP and cost");
    const barcodeError = validateBarcode(
      draft.barcode_type,
      draft.barcode.trim(),
    );
    if (barcodeError) return toast.error("Check the barcode", barcodeError);
    if (
      draft.color_hex.trim() &&
      !/^#[0-9a-f]{6}$/i.test(draft.color_hex.trim())
    )
      return toast.error(
        "Enter a valid color",
        "Use a six-digit hex code, e.g. #FF5733.",
      );
    const attributes = { ...draft.variant_attributes };
    if (draft.color_hex.trim())
      attributes.color_hex = draft.color_hex.trim().toUpperCase();
    else delete attributes.color_hex;
    const body = {
      category_id: draft.category_id || null,
      variant_attributes: attributes,
      name: draft.name.trim(),
      ...(draft.variant_name.trim()
        ? { variant_name: draft.variant_name.trim() }
        : {}),
      description: draft.description.trim() || null,
      price_minor: price,
      mrp_minor: mrp,
      cost_minor: cost,
      tax_code: draft.tax_code || null,
      serialization_type: draft.serialization_type,
      lifecycle_status: draft.lifecycle_status,
    };
    const editing = Boolean(draft.id);
    saveProduct.mutate(
      editing
        ? { id: draft.id, body }
        : {
            body: {
              sku: draft.sku.trim(),
              ...body,
              // the manufacturer's barcode, if the box has one; the shop's own label is issued by the server
              barcode: draft.barcode.trim() || null,
            },
          },
      {
        onSuccess: () => {
          toast.success(editing ? "Product updated" : "Product created");
          setDraft(null);
        },
        onError: (e) => toast.error("Couldn't save the product", e.message),
      },
    );
  }

  function importFile(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    importProducts.mutate(file, {
      onSuccess: setImportResult,
      onError: (e) => toast.error("Couldn't import the file", e.message),
    });
  }

  const set = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <PortalShell tenant={tenant} active="products">
      <PageHeader
        scopedToBranch
        icon={<Package size={20} />}
        title="Products"
        description="The product master shared by every branch and every channel."
        actions={
          canWrite && (
            <div className="flex gap-space-2">
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx"
                hidden
                onChange={(e) => importFile(e.target.files?.[0])}
              />
              <Button
                variant="ghost"
                disabled={importing}
                onClick={() => fileInput.current?.click()}
              >
                <HugeiconsIcon icon={FileUploadIcon} size={16} />{" "}
                {importing ? "Importing…" : "Import CSV / Excel"}
              </Button>
              <Button onClick={() => setDraft({ ...EMPTY })}>
                <PackagePlus size={16} /> Add product
              </Button>
            </div>
          )
        }
      />
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

      <Modal
        open={viewOf !== null}
        onClose={() => setViewOf(null)}
        width="lg"
        title="Product details"
        description={viewOf?.name}
      >
        {viewOf && (
          <dl className="grid gap-space-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-400">SKU</dt>
              <dd>{viewOf.sku}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Variant</dt>
              <dd>{viewOf.variant_name}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Category</dt>
              <dd>
                {viewOf.category_name ??
                  categories.data?.find((c) => c.id === viewOf.category_id)
                    ?.name ??
                  "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ink-400">Color</dt>
              <dd>
                {typeof viewOf.variant_attributes?.color_hex === "string"
                  ? viewOf.variant_attributes.color_hex.toUpperCase()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ink-400">Price</dt>
              <dd>{formatMoney(viewOf.price_minor, cur)}</dd>
            </div>
            <div>
              <dt className="text-ink-400">MRP</dt>
              <dd>
                {viewOf.mrp_minor === null
                  ? "—"
                  : formatMoney(viewOf.mrp_minor, cur)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-400">Tax</dt>
              <dd>{viewOf.tax_code ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-400">In stock</dt>
              <dd>{stockBy.get(viewOf.id)?.available_qty ?? 0}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Status</dt>
              <dd>{humanize(viewOf.lifecycle_status)}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Shop label barcode</dt>
              <dd>{viewOf.barcode ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-400">Description</dt>
              <dd className="whitespace-pre-wrap break-words">
                {viewOf.description || "—"}
              </dd>
            </div>
          </dl>
        )}
      </Modal>

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        width="lg"
        title={draft?.id ? "Edit product" : "Add product"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !draft?.name.trim() ||
                !draft?.price ||
                (!draft?.id && !draft?.sku.trim())
              }
              onClick={save}
            >
              {draft?.id ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-x-space-4 sm:grid-cols-2">
            <Field
              label="SKU"
              htmlFor="p_sku"
              required
              hint={draft.id ? "SKU can't be changed." : undefined}
            >
              <Input
                id="p_sku"
                value={draft.sku}
                disabled={!!draft.id}
                onChange={(e) => set({ sku: e.target.value })}
              />
            </Field>
            <Field label="Name" htmlFor="p_name" required>
              <Input
                id="p_name"
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
            {draft.id && (
              <Field
                label="Variant"
                htmlFor="p_vname"
                hint="e.g. 128GB, Black, XL."
              >
                <Input
                  id="p_vname"
                  value={draft.variant_name}
                  onChange={(e) => set({ variant_name: e.target.value })}
                />
              </Field>
            )}
            <Field label="Category" htmlFor="p_category">
              <Select
                id="p_category"
                value={draft.category_id}
                onChange={(e) => set({ category_id: e.target.value })}
                disabled={categories.isLoading}
              >
                <option value="">No category</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {categories.error && (
                <p className="text-[13px] text-error">
                  {categories.error.message}
                </p>
              )}
              {hasGrant(session, "products:create") && (
                <div className="mt-space-2 flex gap-space-2">
                  <Input
                    aria-label="New category name"
                    placeholder="New category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={busy || !newCategory.trim()}
                    onClick={() =>
                      createCategory.mutate(newCategory.trim(), {
                        onSuccess: (category) => {
                          set({ category_id: category.id });
                          setNewCategory("");
                          toast.success("Category added");
                        },
                        onError: (e) =>
                          toast.error("Couldn't add the category", e.message),
                      })
                    }
                  >
                    Add category
                  </Button>
                </div>
              )}
            </Field>
            <Field
              label="Color (hex code)"
              htmlFor="p_color"
              hint="Use # followed by six hex digits, e.g. #FF5733. Leave empty for none."
            >
              <div className="flex items-center gap-space-2">
                <input
                  type="color"
                  aria-label="Choose product color"
                  value={
                    /^#[0-9a-f]{6}$/i.test(draft.color_hex)
                      ? draft.color_hex
                      : "#000000"
                  }
                  onChange={(e) =>
                    set({ color_hex: e.target.value.toUpperCase() })
                  }
                  className="h-10 w-12 shrink-0 cursor-pointer rounded border border-line"
                />
                <Input
                  id="p_color"
                  placeholder="#FF5733"
                  maxLength={7}
                  value={draft.color_hex}
                  onChange={(e) => set({ color_hex: e.target.value })}
                />
              </div>
            </Field>
            <Field label={`Selling price (${cur})`} htmlFor="p_price" required>
              <Input
                id="p_price"
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => set({ price: e.target.value })}
              />
            </Field>
            <Field label={`MRP (${cur})`} htmlFor="p_mrp">
              <Input
                id="p_mrp"
                inputMode="decimal"
                value={draft.mrp}
                onChange={(e) => set({ mrp: e.target.value })}
              />
            </Field>
            <Field
              label={`Cost (${cur})`}
              htmlFor="p_cost"
              hint="Used to value stock transfers."
            >
              <Input
                id="p_cost"
                inputMode="decimal"
                value={draft.cost}
                onChange={(e) => set({ cost: e.target.value })}
              />
            </Field>
            <Field label="Tax" htmlFor="p_tax">
              <Select
                id="p_tax"
                value={draft.tax_code}
                onChange={(e) => set({ tax_code: e.target.value })}
              >
                <option value="">No tax</option>
                {(taxes.data ?? []).map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Tracking"
              htmlFor="p_ser"
              hint="IMEI / serial numbers are tracked unit by unit. Can't change once stock exists."
            >
              <Select
                id="p_ser"
                value={draft.serialization_type}
                onChange={(e) => set({ serialization_type: e.target.value })}
              >
                <option value="NONE">Counted quantity</option>
                <option value="IMEI">IMEI (phones)</option>
                <option value="SERIAL">Serial number</option>
              </Select>
            </Field>
            <Field label="Status" htmlFor="p_status">
              <Select
                id="p_status"
                value={draft.lifecycle_status}
                onChange={(e) => set({ lifecycle_status: e.target.value })}
              >
                {["draft", "active", "discontinued", "archived"].map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </Field>
            {draft.id ? (
              <div className="sm:col-span-2">
                <p className="text-[13px] font-semibold text-ink-900">
                  Shop label barcode
                </p>
                <p className="font-mono text-[15px]">
                  {products.rows.find((p) => p.id === draft.id)?.barcode ?? "—"}
                </p>
                <p className="text-[12px] text-ink-400">
                  Issued by the system and printed on the till. It never
                  changes.
                </p>
              </div>
            ) : (
              <>
                <Field label="Manufacturer barcode type" htmlFor="p_bartype">
                  <Select
                    id="p_bartype"
                    value={draft.barcode_type}
                    onChange={(e) => {
                      const t = e.target.value as BarcodeType;
                      set({
                        barcode_type: t,
                        barcode: sanitizeBarcode(t, draft.barcode),
                      });
                    }}
                  >
                    {BARCODE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {BARCODE_SPECS[t].label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Manufacturer barcode (optional)"
                  htmlFor="p_bar"
                  hint={BARCODE_SPECS[draft.barcode_type].hint}
                  error={
                    validateBarcode(draft.barcode_type, draft.barcode.trim()) ??
                    undefined
                  }
                >
                  <Input
                    id="p_bar"
                    value={draft.barcode}
                    maxLength={BARCODE_SPECS[draft.barcode_type].maxLength}
                    inputMode={
                      BARCODE_SPECS[draft.barcode_type].digitsOnly
                        ? "numeric"
                        : "text"
                    }
                    onChange={(e) =>
                      set({
                        barcode: sanitizeBarcode(
                          draft.barcode_type,
                          e.target.value,
                        ),
                      })
                    }
                  />
                </Field>
              </>
            )}
            {draft.id && (
              <ExtraBarcodes
                product={products.rows.find((p) => p.id === draft.id) ?? null}
              />
            )}
            <Field
              label="Description"
              htmlFor="p_desc"
              className="sm:col-span-2"
            >
              <Textarea
                id="p_desc"
                rows={2}
                value={draft.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <ProductImagesModal
        product={products.rows.find((p) => p.id === imagesOf) ?? null}
        onClose={() => setImagesOf(null)}
      />

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
        <p className="mt-space-3 text-[12px] text-ink-400">
          Required columns: sku, name, price. Optional: variant_name,
          description, category, brand, mrp, cost, tax_code, serialization_type
          (NONE / SERIAL / IMEI), barcode, hsn_code, status. New categories and
          brands are created automatically.{" "}
          <a
            className="font-medium underline"
            href="/sample-products.csv"
            download
          >
            <HugeiconsIcon icon={Download04Icon} size={12} className="inline" />{" "}
            Download sample file
          </a>
        </p>
      </Modal>
    </PortalShell>
  );
}
