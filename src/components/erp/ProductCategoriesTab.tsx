"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  useCreateProductCategory,
  useProductCategories,
  type ProductCategory,
} from "@/hooks/useProducts";
import { toast } from "@/lib/toast";

export function ProductCategoriesTab({
  createOpen,
  onCloseCreate,
}: {
  createOpen: boolean;
  onCloseCreate: () => void;
}) {
  const categories = useProductCategories();
  const create = useCreateProductCategory();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const columns = useMemo<ColumnDef<ProductCategory>[]>(
    () => [
      { header: "Category", accessorKey: "name" },
      {
        header: "Parent category",
        cell: ({ row }) =>
          categories.data?.find(
            (category) => category.id === row.original.parent_id,
          )?.name ?? "—",
      },
      {
        header: "Items",
        accessorFn: (category) => category.item_count ?? 0,
        cell: ({ getValue }) => (
          <span className="font-semibold">
            {Number(getValue()).toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        header: "Active items",
        accessorFn: (category) => category.active_item_count ?? 0,
      },
      {
        header: "Subcategories",
        accessorFn: (category) => category.subcategory_count ?? 0,
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={row.original.is_active === false ? "neutral" : "success"}
          >
            {row.original.is_active === false ? "Inactive" : "Active"}
          </Badge>
        ),
      },
      {
        header: "Created",
        cell: ({ row }) =>
          row.original.created_at
            ? new Intl.DateTimeFormat("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date(row.original.created_at))
            : "—",
      },
    ],
    [categories.data],
  );
  const rows = (categories.data ?? []).filter((category) =>
    category.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || create.isPending) return;
    create.mutate(
      { name: name.trim(), parent_id: parentId || null },
      {
        onSuccess: () => {
          setName("");
          setParentId("");
          setSearch("");
          onCloseCreate();
          toast.success("Category added");
        },
        onError: (error) => toast.error("Couldn't add category", error.message),
      },
    );
  };
  return (
    <>
      <Card className="mb-space-4 p-space-3">
        <Input
          aria-label="Search categories"
          placeholder="Search categories…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-md"
        />
      </Card>
      {categories.error && (
        <p role="alert" className="mb-space-3 text-sm text-error">
          {categories.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <p className="px-space-2 py-space-2 text-xs text-ink-600">
          Item counts include sellable product variants assigned directly to
          each category. Creation dates are shown when recorded.
        </p>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(category) => category.id}
          loading={categories.isFetching}
          emptyMessage={
            categories.isLoading
              ? "Loading categories…"
              : search.trim()
                ? "No categories match your search."
                : "No categories yet."
          }
        />
      </Card>
      <Modal
        open={createOpen}
        title="Add category"
        description="Organize your products so they’re easier to find."
        width="md"
        compact
        dismissible={!create.isPending}
        onClose={() => {
          if (!create.isPending) {
            setName("");
            setParentId("");
            onCloseCreate();
          }
        }}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={create.isPending}
              onClick={() => {
                setName("");
                setParentId("");
                onCloseCreate();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-product-category"
              disabled={create.isPending || !name.trim()}
            >
              {create.isPending ? "Adding…" : "Add category"}
            </Button>
          </>
        }
      >
        <form id="create-product-category" onSubmit={add}>
          <Field
            label="Category name"
            htmlFor="new-product-category"
            required
            className="mb-0"
            hint="Use a clear name, such as Sarees, Kurtis or Accessories. You can assign products to this category when adding or editing them."
          >
            <Input
              id="new-product-category"
              placeholder="e.g. Sarees"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              disabled={create.isPending}
              required
              autoFocus
            />
          </Field>
          <Field
            label="Parent category"
            htmlFor="category-parent"
            className="mt-space-4 mb-0"
            hint="Choose a parent to create a subcategory. Leave this empty for a main category."
          >
            <Select
              id="category-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              disabled={create.isPending || categories.isLoading}
            >
              <option value="">No parent (main category)</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>
    </>
  );
}
