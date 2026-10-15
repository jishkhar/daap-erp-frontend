"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { ProductThumb } from "@/components/erp/ProductImagesModal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useProductSearch } from "@/hooks/useProducts";
import {
  useSaveCollection,
  type CollectionDetail,
} from "@/hooks/useCollections";
import { type Product } from "@/lib/erp";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";

export function CollectionEditor({
  collection,
  editable,
  onClose,
}: {
  collection?: CollectionDetail;
  editable: boolean;
  onClose: () => void;
}) {
  const [version] = useState(collection?.version);
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [selected, setSelected] = useState<Product[]>(
    collection?.products ?? [],
  );
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim());
  const products = useProductSearch({ q: query, limit: 30 }, editable);
  const save = useSaveCollection();
  const selectedIds = new Set(selected.map((p) => p.id));
  const move = (index: number, direction: number) =>
    setSelected((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });

  return (
    <Modal
      open
      title={
        collection
          ? editable
            ? "Edit collection"
            : "View collection"
          : "Create collection"
      }
      description="Choose products from any category. A product can belong to several collections."
      width="lg"
      dismissible={!save.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" disabled={save.isPending} onClick={onClose}>
            {editable ? "Cancel" : "Close"}
          </Button>
          {editable && (
            <Button
              form="collection-editor"
              type="submit"
              disabled={
                save.isPending || !name.trim() || selected.length > 2000
              }
            >
              {save.isPending ? "Saving…" : "Save collection"}
            </Button>
          )}
        </>
      }
    >
      <form
        id="collection-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (!editable || save.isPending || !name.trim()) return;
          save.mutate(
            {
              id: collection?.id,
              version,
              name: name.trim(),
              description,
              variant_ids: selected.map((p) => p.id),
            },
            {
              onSuccess: () => {
                toast.success(
                  collection ? "Collection updated" : "Collection created",
                );
                onClose();
              },
            },
          );
        }}
      >
        <Field
          label="Collection name"
          htmlFor="collection-name"
          required
          hint="For example, Wedding Day, Festive Favourites or Summer Essentials."
        >
          <Input
            id="collection-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            disabled={!editable || save.isPending}
            autoFocus
          />
        </Field>
        <Field label="Description" htmlFor="collection-description">
          <textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            disabled={!editable || save.isPending}
            className="w-full rounded-md border border-line bg-card p-space-3 text-sm text-ink-900"
            placeholder="Describe the occasion or theme of this collection."
          />
        </Field>
        <fieldset disabled={save.isPending}>
          <legend className="mb-space-2 text-sm font-semibold">
            Selected products ({selected.length})
          </legend>
          {selected.length === 0 && (
            <p className="mb-space-3 text-sm text-ink-600">
              No products selected yet. You can save an empty collection and add
              products later.
            </p>
          )}
          <ul className="mb-space-4 max-h-64 divide-y divide-line overflow-y-auto">
            {selected.map((product, index) => (
              <li
                key={product.id}
                className="flex items-center gap-space-2 py-space-2"
              >
                <ProductThumb url={product.images?.[0]} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-ink-600">
                    {product.sku}
                    {product.variant_name && ` · ${product.variant_name}`}
                  </p>
                </div>
                {editable && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={index === 0}
                      aria-label={`Move ${product.name} up`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={index === selected.length - 1}
                      aria-label={`Move ${product.name} down`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove ${product.name}`}
                      onClick={() =>
                        setSelected((prev) =>
                          prev.filter((p) => p.id !== product.id),
                        )
                      }
                    >
                      <X size={15} />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {editable && (
            <>
              <Field
                label="Add products"
                htmlFor="collection-product-search"
                hint="Search by name, SKU or barcode. Select up to 2,000 products, in the order you want them listed."
              >
                <Input
                  id="collection-product-search"
                  placeholder="Search dresses or other products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Field>
              {products.error && (
                <p role="alert" className="text-sm text-error">
                  {products.error.message}
                </p>
              )}
              <p className="mb-space-2 text-xs text-ink-600">
                {products.isFetching
                  ? "Searching products…"
                  : products.data?.length === 30
                    ? "Showing the first 30 matches. Refine your search to find more products."
                    : "Select products to add to this collection."}
              </p>
              <ul
                className="max-h-64 divide-y divide-line overflow-y-auto"
                aria-label="Available products"
              >
                {(products.data ?? []).map((product) => (
                  <li key={product.id}>
                    <label className="flex cursor-pointer items-center gap-space-3 py-space-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-600"
                        checked={selectedIds.has(product.id)}
                        disabled={
                          products.isFetching ||
                          (!selectedIds.has(product.id) &&
                            selected.length >= 2000)
                        }
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, product]
                              : prev.filter((p) => p.id !== product.id),
                          )
                        }
                      />
                      <ProductThumb url={product.images?.[0]} />
                      <span>
                        <span className="font-medium">{product.name}</span>
                        <span className="block text-xs text-ink-600">
                          {product.sku}
                          {product.variant_name &&
                            ` · ${product.variant_name}`}{" "}
                          · {product.lifecycle_status}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {!products.isFetching &&
                !products.error &&
                products.data?.length === 0 && (
                  <p className="text-sm text-ink-600">
                    No products match your search.
                  </p>
                )}
            </>
          )}
        </fieldset>
        {save.error && (
          <p role="alert" className="mt-space-3 text-sm text-error">
            {save.error.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
