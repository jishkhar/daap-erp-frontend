"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { ProductThumb } from "@/components/erp/ProductImagesModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useProductCategories, useProductSearch } from "@/hooks/useProducts";
import type { Product } from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";

export function CollectionProductPicker({
  mode,
  selectedIds,
  onAdd,
  onClose,
}: {
  mode: "add" | "exclude";
  selectedIds: string[];
  onAdd: (products: Product[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [picked, setPicked] = useState<Map<string, Product>>(new Map());
  const categories = useProductCategories();
  const products = useProductSearch({
    q: useDebounced(search.trim()),
    category_id: category || undefined,
    lifecycle_status: status || undefined,
    limit: 100,
  });
  const rows = products.data ?? [];
  const available = rows.filter((p) => !selectedIds.includes(p.id));
  const allPicked =
    available.length > 0 && available.every((p) => picked.has(p.id));
  const toggle = (product: Product, checked: boolean) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (checked) next.set(product.id, product);
      else next.delete(product.id);
      return next;
    });
  return (
    <Modal
      open
      title={mode === "add" ? "Add products" : "Exclude products"}
      width="lg"
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto self-center text-sm text-ink-600">
            {picked.size} selected
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!picked.size}
            onClick={() => {
              onAdd([...picked.values()]);
              onClose();
            }}
          >
            {mode === "add" ? "Add" : "Exclude"}
            {picked.size > 0 && ` (${picked.size})`}
          </Button>
        </>
      }
    >
      <div className="sticky top-0 z-10 space-y-space-3 bg-card pb-space-3">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-3 text-ink-400" />
          <Input
            autoFocus
            aria-label="Search products"
            placeholder="Search by product name, SKU or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-space-2">
          <Select
            aria-label="Filter by category"
            value={category}
            onValueChange={(value) => setCategory(value)}
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={status}
            onValueChange={(value) => setStatus(value)}
          >
            <option value="">All statuses</option>
            {["active", "draft", "discontinued", "archived"].map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        {categories.error && (
          <p role="alert" className="text-xs text-error">
            {categories.error.message}
          </p>
        )}
      </div>
      {products.error && (
        <p role="alert" className="text-sm text-error">
          {products.error.message}
        </p>
      )}
      <label className="flex items-center gap-space-3 border-y border-line py-space-3 text-xs text-ink-600">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-600"
          aria-label="Select all visible products"
          checked={allPicked}
          disabled={products.isFetching || !available.length}
          onChange={(e) => {
            const checked = e.target.checked;
            setPicked((prev) => {
              const next = new Map(prev);
              available.forEach((p) =>
                checked ? next.set(p.id, p) : next.delete(p.id),
              );
              return next;
            });
          }}
        />
        {products.isFetching ? "Searching…" : `${rows.length} products`}
      </label>
      <ul className="divide-y divide-line" aria-label="Product results">
        {rows.map((product) => (
          <li key={product.id}>
            <label className="flex cursor-pointer items-center gap-space-3 px-1 py-space-3 hover:bg-paper">
              <input
                type="checkbox"
                aria-label={`Select ${product.name}`}
                className="h-4 w-4 shrink-0 accent-brand-600"
                checked={
                  selectedIds.includes(product.id) || picked.has(product.id)
                }
                disabled={
                  selectedIds.includes(product.id) || products.isFetching
                }
                onChange={(e) => toggle(product, e.target.checked)}
              />
              <ProductThumb url={product.images?.[0]} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {product.name}
                </span>
                <span className="text-xs text-ink-400">{product.sku}</span>
              </span>
              <Badge
                tone={
                  product.lifecycle_status === "active" ? "success" : "info"
                }
              >
                {product.lifecycle_status}
              </Badge>
            </label>
          </li>
        ))}
      </ul>
      {!products.isFetching && !rows.length && !products.error && (
        <p className="py-12 text-center text-sm text-ink-600">
          No matching products. Try a different search or filter.
        </p>
      )}
      {rows.length === 100 && (
        <p className="pt-space-3 text-xs text-ink-600">
          Showing the first 100 matches. Refine your search to find more
          products.
        </p>
      )}
    </Modal>
  );
}
