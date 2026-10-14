"use client";

import Image from "next/image";
import { ArrowLeft, ImagePlus, Package, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProductColorField } from "@/components/erp/ProductColorField";
import { ProductImagesModal } from "@/components/erp/ProductImagesModal";
import { ExtraBarcodes } from "@/components/erp/ExtraBarcodes";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  useAddVariant,
  useProductCategories,
  useSaveProduct,
} from "@/hooks/useProducts";
import { useStockFor } from "@/hooks/useInventory";
import { useTaxRules } from "@/hooks/useTaxes";
import { erpGet, fromMinor, humanize, toMinor, type Product } from "@/lib/erp";
import {
  BARCODE_TYPES,
  BARCODE_SPECS,
  sanitizeBarcode,
  validateBarcode,
  type BarcodeType,
} from "@/lib/barcode";
import { hasGrant, useStaffSession } from "@/lib/staffAuth";
import { PRODUCT_AUDIENCES } from "@/lib/productAudience";
import { toast } from "@/lib/toast";

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-xl">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function ProductEditor({ product }: { product?: Product }) {
  const router = useRouter();
  const session = useStaffSession();
  const canEdit = hasGrant(
    session,
    product ? "products:update" : "products:create",
  );
  const categories = useProductCategories();
  const taxes = useTaxRules();
  const saveProduct = useSaveProduct();
  const addVariant = useAddVariant();
  const stock = useStockFor(product ? [product.id] : [], "");
  const attrs = product?.variant_attributes ?? {};
  const initial = {
    name: product?.product_name ?? "",
    description: product?.description ?? "",
    sku: product?.sku ?? "",
    variant_name:
      product?.variant_name === "Default" ? "" : (product?.variant_name ?? ""),
    price: fromMinor(product?.price_minor ?? null),
    mrp: fromMinor(product?.mrp_minor ?? null),
    cost: fromMinor(product?.cost_minor ?? null),
    category_id: product?.category_id ?? "",
    tax_code: product?.tax_code ?? "",
    hsn_code: product?.hsn_code ?? "",
    weight_kg: String(attrs.weight_kg ?? ""),
    length_cm: String(attrs.length_cm ?? ""),
    width_cm: String(attrs.width_cm ?? ""),
    height_cm: String(attrs.height_cm ?? ""),
    lifecycle_status: product?.lifecycle_status ?? "draft",
    serialization_type: product?.serialization_type ?? "NONE",
    color_hex: typeof attrs.color_hex === "string" ? attrs.color_hex : "",
    target_audience:
      typeof attrs.target_audience === "string" ? attrs.target_audience : "",
    size: typeof attrs.size === "string" ? attrs.size : "",
    fabric: typeof attrs.fabric === "string" ? attrs.fabric : "",
    age_group: typeof attrs.age_group === "string" ? attrs.age_group : "",
    barcode: "",
    barcode_type: "EAN_13",
  };
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaProduct, setMediaProduct] = useState(product);
  const [variantOpen, setVariantOpen] = useState(false);
  const [variant, setVariant] = useState({ sku: "", name: "", price: "" });
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const saving = saveProduct.isPending;
  const currency = session?.tenant.currency ?? "INR";
  const set = (key: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setColor = useCallback(
    (color_hex: string) => setDraft((current) => ({ ...current, color_hex })),
    [],
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const back = () => {
    if (!dirty || window.confirm("Discard your unsaved product changes?"))
      router.push("/portal/products");
  };
  const text = (
    key: keyof typeof draft,
    label: string,
    options: {
      required?: boolean;
      hint?: string;
      decimal?: boolean;
      disabled?: boolean;
    } = {},
  ) => (
    <Field
      label={label}
      htmlFor={`product-${key}`}
      required={options.required}
      hint={options.hint}
      className="mb-0"
    >
      <Input
        id={`product-${key}`}
        value={draft[key]}
        onChange={(event) => set(key, event.target.value)}
        required={options.required}
        disabled={options.disabled}
        inputMode={options.decimal ? "decimal" : undefined}
      />
    </Field>
  );

  const save = () => {
    setError(null);
    const price = toMinor(draft.price),
      mrp = draft.mrp ? toMinor(draft.mrp) : null,
      cost = draft.cost ? toMinor(draft.cost) : null;
    if (!draft.name.trim() || (!product && !draft.sku.trim()))
      return setError("Enter a product title and SKU.");
    if (
      price === null ||
      (draft.mrp && mrp === null) ||
      (draft.cost && cost === null)
    )
      return setError("Enter valid non-negative price, MRP and cost amounts.");
    if (draft.color_hex && !/^#[0-9a-f]{6}$/i.test(draft.color_hex))
      return setError("Use a six-digit hex color, e.g. #FF5733.");
    const barcodeError = validateBarcode(
      draft.barcode_type as BarcodeType,
      draft.barcode.trim(),
    );
    if (!product && barcodeError) return setError(barcodeError);
    const attributes = { ...attrs };
    for (const key of [
      "weight_kg",
      "length_cm",
      "width_cm",
      "height_cm",
    ] as const) {
      if (!draft[key].trim()) {
        delete attributes[key];
        continue;
      }
      const amount = Number(draft[key]);
      if (!Number.isFinite(amount) || amount < 0)
        return setError(
          "Shipping weight and dimensions must be non-negative numbers.",
        );
      attributes[key] = amount;
    }
    for (const key of [
      "color_hex",
      "target_audience",
      "size",
      "fabric",
      "age_group",
    ] as const) {
      if (draft[key].trim())
        attributes[key] =
          key === "color_hex"
            ? draft[key].trim().toUpperCase()
            : draft[key].trim();
      else delete attributes[key];
    }
    const body = {
      name: draft.name.trim(),
      description: draft.description.trim() || "",
      variant_name: draft.variant_name.trim() || "Default",
      category_id: draft.category_id || null,
      price_minor: price,
      mrp_minor: mrp,
      cost_minor: cost,
      tax_code: draft.tax_code || null,
      hsn_code: draft.hsn_code.trim(),
      serialization_type: draft.serialization_type,
      lifecycle_status: draft.lifecycle_status,
      variant_attributes: attributes,
      ...(!product
        ? { sku: draft.sku.trim(), barcode: draft.barcode.trim() || null }
        : {}),
    };
    saveProduct.mutate(
      { id: product?.id, body },
      {
        onSuccess: (saved) => {
          setBaseline(draft);
          toast.success(product ? "Product updated" : "Product created");
          if (!product) router.replace(`/portal/products/${saved.id}`);
        },
        onError: (failure) => setError(failure.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-[1200px] pb-10">
      <div className="sticky top-0 z-20 -mx-1 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/95 px-1 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Back to products"
            onClick={back}
            className="rounded-full border border-line bg-card p-2"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <p className="text-xs text-ink-600">
              Products / {product ? "Edit product" : "Add product"}
            </p>
            <h1 className="max-w-[600px] truncate text-xl font-semibold">
              {draft.name || "Untitled product"}
            </h1>
          </div>
          <Badge
            tone={draft.lifecycle_status === "active" ? "success" : "neutral"}
          >
            {humanize(draft.lifecycle_status)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-ink-600">Unsaved changes</span>
          )}
          <Button variant="secondary" onClick={back} disabled={saving}>
            Cancel
          </Button>
          {canEdit && (
            <Button onClick={save} disabled={saving || (!dirty && !!product)}>
              <Save size={15} />
              {saving ? "Saving…" : "Save product"}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error"
        >
          {error}
        </p>
      )}
      <fieldset
        disabled={!canEdit || saving}
        className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"
      >
        <div className="min-w-0 space-y-5">
          <Section title="Product details">
            <div className="space-y-5">
              {text("name", "Title", { required: true })}
              <Field
                label="Description"
                htmlFor="product-description"
                className="mb-0"
              >
                <Textarea
                  id="product-description"
                  rows={8}
                  value={draft.description}
                  onChange={(event) => set("description", event.target.value)}
                  placeholder="Describe the product, material, fit and care instructions…"
                  className="min-h-[220px]"
                />
              </Field>
            </div>
          </Section>
          <Section
            title="Media"
            action={
              product && canEdit ? (
                <Button variant="ghost" onClick={() => setMediaOpen(true)}>
                  <ImagePlus size={16} />
                  Manage media
                </Button>
              ) : undefined
            }
          >
            {mediaProduct?.images?.length ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {mediaProduct.images.map((url, index) => (
                  <div
                    key={url}
                    className={`${index === 0 ? "col-span-2 row-span-2" : ""} overflow-hidden rounded-lg border border-line bg-paper`}
                  >
                    <Image
                      src={url}
                      alt={`${draft.name} ${index + 1}`}
                      width={400}
                      height={400}
                      unoptimized
                      className="aspect-square w-full object-cover"
                    />
                    {index === 0 && (
                      <p className="px-3 py-2 text-xs text-ink-600">
                        Cover image
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                disabled={!product}
                onClick={() => setMediaOpen(true)}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-paper/40 py-12 text-sm text-ink-600"
              >
                <ImagePlus size={28} />
                <span>
                  {product
                    ? "Add product images"
                    : "Save your product to upload images"}
                </span>
              </button>
            )}
            <p className="mt-3 text-xs text-ink-600">
              Up to 6 images · JPEG, PNG or WebP · 1 MB per image
            </p>
          </Section>
          <Section title="Pricing">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("price", `Price (${currency})`, {
                required: true,
                decimal: true,
              })}
              {text("mrp", `Compare-at price / MRP (${currency})`, {
                decimal: true,
              })}
              {text("cost", `Cost per item (${currency})`, { decimal: true })}
              <Field label="Tax" htmlFor="product-tax" className="mb-0">
                <Select
                  id="product-tax"
                  value={draft.tax_code}
                  onChange={(event) => set("tax_code", event.target.value)}
                >
                  <option value="">No tax</option>
                  {(taxes.data ?? []).map((tax) => (
                    <option key={tax.code} value={tax.code}>
                      {tax.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>
          <Section
            title="Inventory"
            action={
              <span className="text-xs text-ink-600">Tracked in ERP</span>
            }
          >
            {product && (
              <div className="mb-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="bg-paper text-xs text-ink-600">
                    <tr>
                      <th className="p-3">Location</th>
                      <th className="p-3">Available</th>
                      <th className="p-3">Committed</th>
                      <th className="p-3">In transit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3">All branches</td>
                      {stock.isError ? (
                        <td colSpan={3} className="p-3 text-error">
                          Could not load stock
                        </td>
                      ) : (
                        ["available_qty", "reserved_qty", "in_transit_qty"].map(
                          (key) => (
                            <td key={key} className="p-3 font-medium">
                              {stock.isFetching
                                ? "…"
                                : String(
                                    (
                                      stock.data?.[0] as unknown as Record<
                                        string,
                                        number
                                      >
                                    )?.[key] ?? 0,
                                  )}
                            </td>
                          ),
                        )
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {text("sku", "SKU", { required: true, disabled: !!product })}
              <Field
                label="Tracking"
                htmlFor="product-tracking"
                className="mb-0"
              >
                <Select
                  id="product-tracking"
                  value={draft.serialization_type}
                  onChange={(event) =>
                    set("serialization_type", event.target.value)
                  }
                >
                  <option value="NONE">Counted quantity</option>
                  <option value="SERIAL">Serial number</option>
                  <option value="IMEI">IMEI</option>
                </Select>
              </Field>
            </div>
            {product ? (
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Barcodes · {product.barcode || "No label"}
                </summary>
                <div className="mt-4">
                  <ExtraBarcodes product={product} />
                </div>
              </details>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Barcode type"
                  htmlFor="product-barcode-type"
                  className="mb-0"
                >
                  <Select
                    id="product-barcode-type"
                    value={draft.barcode_type}
                    onChange={(event) => {
                      set("barcode_type", event.target.value);
                      set(
                        "barcode",
                        sanitizeBarcode(
                          event.target.value as BarcodeType,
                          draft.barcode,
                        ),
                      );
                    }}
                  >
                    {BARCODE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {BARCODE_SPECS[type].label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Manufacturer barcode (optional)"
                  htmlFor="product-barcode"
                  className="mb-0"
                >
                  <Input
                    id="product-barcode"
                    value={draft.barcode}
                    maxLength={
                      BARCODE_SPECS[draft.barcode_type as BarcodeType].maxLength
                    }
                    onChange={(event) =>
                      set(
                        "barcode",
                        sanitizeBarcode(
                          draft.barcode_type as BarcodeType,
                          event.target.value,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            )}
          </Section>
          <Section title="Shipping">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("weight_kg", "Weight (kg)", { decimal: true })}
              {text("length_cm", "Package length (cm)", { decimal: true })}
              {text("width_cm", "Package width (cm)", { decimal: true })}
              {text("height_cm", "Package height (cm)", { decimal: true })}
            </div>
            <p className="mt-3 text-xs text-ink-600">
              Optional package details for your fulfilment team.
            </p>
          </Section>
          <Section
            title="Variants"
            action={
              product && canEdit ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (dirty)
                      return toast.info(
                        "Save your product changes before adding a variant.",
                      );
                    setVariant({ sku: "", name: "", price: draft.price });
                    setVariantOpen(true);
                  }}
                >
                  <Plus size={15} />
                  Add variant
                </Button>
              ) : undefined
            }
          >
            {text("variant_name", "Option name", {
              hint: "For example: Navy / M. Each variant has its own SKU, price and stock.",
            })}
          </Section>
          <Section title="Product attributes">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProductColorField value={draft.color_hex} onChange={setColor} />
              {text("size", "Size", {
                hint: "For example: M, XL or Free size.",
              })}
              {text("fabric", "Fabric", {
                hint: "For example: Silk, Cotton or Linen.",
              })}
              <Field label="Age group" htmlFor="product-age" className="mb-0">
                <Select
                  id="product-age"
                  value={draft.age_group}
                  onChange={(event) => set("age_group", event.target.value)}
                >
                  <option value="">Not specified</option>
                  {["Adult", "Teen", "Child", "Infant"].map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="For" htmlFor="product-audience" className="mb-0">
                <Select
                  id="product-audience"
                  value={draft.target_audience}
                  onChange={(event) =>
                    set("target_audience", event.target.value)
                  }
                >
                  <option value="">Not specified</option>
                  {PRODUCT_AUDIENCES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>
        </div>
        <aside className="min-w-0 space-y-5">
          <Section title="Status">
            <Select
              aria-label="Product status"
              value={draft.lifecycle_status}
              onChange={(event) => set("lifecycle_status", event.target.value)}
            >
              {["draft", "active", "discontinued", "archived"].map((status) => (
                <option key={status} value={status}>
                  {humanize(status)}
                </option>
              ))}
            </Select>
            <p className="mt-3 text-xs text-ink-600">
              Active products are available for sale through enabled channels.
            </p>
          </Section>
          <Section title="Product organization">
            <Field label="Category" htmlFor="product-category" className="mb-0">
              <Select
                id="product-category"
                value={draft.category_id}
                disabled={categories.isLoading}
                onChange={(event) => set("category_id", event.target.value)}
              >
                <option value="">No category</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parent_id
                      ? `${categories.data?.find((parent) => parent.id === category.parent_id)?.name ?? "Category"} / `
                      : ""}
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            {categories.error && (
              <p role="alert" className="mt-2 text-xs text-error">
                {categories.error.message}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-600">
              Manage categories and subcategories from the Categories tab.
            </p>
          </Section>
          <Section title="Tax classification">
            {text("hsn_code", "HSN code", { hint: "Used on tax invoices." })}
          </Section>
          {product && (
            <Section title="Stock management">
              <p className="mb-3 text-sm text-ink-600">
                Receive stock and review movements in Inventory.
              </p>
              <Button href="/portal/inventory" variant="secondary">
                <Package size={15} />
                Open inventory
              </Button>
            </Section>
          )}
        </aside>
      </fieldset>
      <ProductImagesModal
        product={mediaOpen ? (mediaProduct ?? null) : null}
        onClose={() => {
          setMediaOpen(false);
          if (product)
            void erpGet<Product>(`/api/v1/products/${product.id}`)
              .then(setMediaProduct)
              .catch(() => toast.error("Couldn't refresh product images"));
        }}
      />
      <Modal
        open={variantOpen}
        title="Add variant"
        onClose={() => {
          if (!addVariant.isPending) setVariantOpen(false);
        }}
        dismissible={!addVariant.isPending}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setVariantOpen(false)}
              disabled={addVariant.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={
                addVariant.isPending ||
                !variant.sku.trim() ||
                !variant.name.trim()
              }
              onClick={() => {
                const price = toMinor(variant.price);
                if (price === null || !product)
                  return toast.error("Enter a valid variant price");
                addVariant.mutate(
                  {
                    productId: product.id,
                    body: {
                      sku: variant.sku.trim(),
                      variant_name: variant.name.trim(),
                      price_minor: price,
                      tax_code: draft.tax_code || null,
                      serialization_type: draft.serialization_type,
                      variant_attributes: {
                        ...attrs,
                        size: variant.name.trim(),
                      },
                    },
                  },
                  {
                    onSuccess: (created) => {
                      setVariantOpen(false);
                      toast.success("Variant added");
                      router.push(`/portal/products/${created.id}`);
                    },
                    onError: (failure) =>
                      toast.error("Couldn't add variant", failure.message),
                  },
                );
              }}
            >
              {addVariant.isPending ? "Adding…" : "Add variant"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {(
            [
              ["name", "Option name"],
              ["sku", "SKU"],
              ["price", `Price (${currency})`],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} htmlFor={`variant-${key}`}>
              <Input
                id={`variant-${key}`}
                value={variant[key]}
                disabled={addVariant.isPending}
                onChange={(event) =>
                  setVariant((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </Field>
          ))}
        </div>
      </Modal>
    </div>
  );
}
