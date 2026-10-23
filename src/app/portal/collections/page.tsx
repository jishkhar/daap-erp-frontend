"use client";

import Image from "next/image";

import Link from "next/link";
import { FolderOpen, ImageIcon, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import {
  useCollections,
  useToggleCollectionHeader,
  useDeleteCollection,
  type ProductCollection,
} from "@/hooks/useCollections";
import { useProductCategories } from "@/hooks/useProducts";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";

export default function CollectionsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim().toLowerCase());
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<ProductCollection[]>([]);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const collections = useCollections();
  const categories = useProductCategories();
  const remove = useDeleteCollection();
  const toggleHeader = useToggleCollectionHeader();
  const canUpdate = hasTenantWide(session, "products:update");
  const canCreate = hasTenantWide(session, "products:create");
  const canDelete = hasTenantWide(session, "products:archive");
  const rows = (collections.data ?? []).filter(
    (c) =>
      `${c.name} ${c.description}`.toLowerCase().includes(query) &&
      (!filter ||
        (filter === "automatic"
          ? c.conditions?.length
          : !c.conditions?.length)),
  );
  const allSelected =
    rows.length > 0 && rows.every((c) => selected.includes(c.id));
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="collections">
      <div className="mb-space-4 flex flex-wrap items-center justify-between gap-space-3 md:flex-nowrap">
        <h1 className="flex shrink-0 items-center gap-space-2 whitespace-nowrap text-lg font-semibold">
          <FolderOpen size={20} className="shrink-0" /> Collections{" "}
          <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs font-normal text-ink-500">
            {collections.data?.length ?? 0}
          </span>
        </h1>
        {canCreate && (
          <Button
            href="/portal/collections/new"
            className="mobile-page-action ml-auto h-11 shrink-0 whitespace-nowrap md:h-10"
          >
            <Plus size={15} className="shrink-0" /> Add collection
          </Button>
        )}
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-space-2 border-b border-line p-space-2">
          <Select
            aria-label="Collection type"
            value={filter}
            onValueChange={(value) => setFilter(value)}
            className="!h-9 !w-36 !border-0 !bg-transparent !text-sm"
          >
            <option value="">All collections</option>
            <option value="manual">Manual</option>
            <option value="automatic">With conditions</option>
          </Select>
          <div className="relative min-w-40 flex-1">
            <Search size={16} className="absolute left-3 top-3 text-ink-400" />
            <Input
              aria-label="Search collections"
              placeholder="Search and filter collections"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!h-9 !border-0 !shadow-none pl-9"
            />
          </div>
          {canDelete && selected.length > 0 && (
            <Button
              className="mobile-page-action"
              variant="ghost"
              onClick={() =>
                setDeleting(
                  (collections.data ?? []).filter((c) =>
                    selected.includes(c.id),
                  ),
                )
              }
            >
              <Trash2 size={14} /> Delete ({selected.length})
            </Button>
          )}
        </div>
        {collections.error && (
          <p role="alert" className="p-4 text-sm text-error">
            {collections.error.message}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm">
            <thead className="bg-paper/50 text-xs text-ink-500">
              <tr>
                {canDelete && (
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all collections"
                      className="h-4 w-4 accent-brand-600"
                      checked={allSelected}
                      disabled={!rows.length}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...rows.map((c) => c.id),
                                ]),
                              ]
                            : selected.filter(
                                (id) => !rows.some((c) => c.id === id),
                              ),
                        )
                      }
                    />
                  </th>
                )}
                <th className="px-3 py-3 font-medium">Title</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
                <th className="w-[28%] px-4 py-3 font-medium">Conditions</th>
                <th className="px-4 py-3 font-medium">Show in header</th>
                {canDelete && (
                  <th className="w-12">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((collection) => (
                <tr key={collection.id} className="group hover:bg-paper/60">
                  {canDelete && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${collection.name}`}
                        className="h-4 w-4 accent-brand-600"
                        checked={selected.includes(collection.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, collection.id]
                              : selected.filter((id) => id !== collection.id),
                          )
                        }
                      />
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <Link
                      href={`/portal/collections/${collection.id}`}
                      className="flex items-center gap-space-3"
                    >
                      <span className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper">
                        {collection.image_url ? (
                          <Image
                            unoptimized
                            width={320}
                            height={400}
                            src={collection.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={18} className="text-ink-400" />
                        )}
                      </span>
                      <span className="line-clamp-2 max-w-xl font-medium text-ink-900 group-hover:text-brand-700">
                        {collection.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {collection.item_count.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-ink-500">
                    {collection.conditions?.length
                      ? collection.conditions.map((rule, index) => (
                          <p key={index}>
                            {rule.field === "category_id"
                              ? `Category is ${categories.data?.find((c) => c.id === rule.value)?.name ?? "selected category"}`
                              : rule.field === "lifecycle_status"
                                ? `Status is ${rule.value}`
                                : `Title contains “${rule.value}”`}
                          </p>
                        ))
                      : "Manual selection"}
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={collection.show_in_header}
                      disabled={!canUpdate || toggleHeader.isPending}
                      aria-label={`Show ${collection.name} in header`}
                      onChange={() =>
                        toggleHeader.mutate(
                          {
                            id: collection.id,
                            version: collection.version,
                            show_in_header: !collection.show_in_header,
                          },
                          {
                            onError: (error) =>
                              toast.error(
                                "Couldn't update header visibility",
                                error.message,
                              ),
                          },
                        )
                      }
                    />
                  </td>
                  {canDelete && (
                    <td className="pr-2">
                      <button
                        aria-label={`Delete ${collection.name}`}
                        type="button"
                        onClick={() => setDeleting([collection])}
                        className="rounded-md p-2 text-ink-400 hover:bg-error-tint hover:text-error"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {collections.isLoading ? (
          <p role="status" className="p-12 text-center text-sm text-ink-500">
            Loading collections…
          </p>
        ) : (
          !collections.error &&
          !rows.length && (
            <div className="p-12 text-center">
              <FolderOpen size={30} className="mx-auto mb-3 text-ink-300" />
              <h2 className="text-sm font-semibold">
                {search || filter
                  ? "No matching collections"
                  : "Create your first collection"}
              </h2>
              <p className="mt-2 text-sm text-ink-500">
                {search || filter
                  ? "Try a different search or filter."
                  : "Bring your products together for a theme like “Wedding Day”."}
              </p>
              {canCreate && !search && !filter && (
                <Button
                  href="/portal/collections/new"
                  className="mobile-page-action mt-4 h-11 whitespace-nowrap md:h-10"
                >
                  <Plus size={15} className="shrink-0" /> Add collection
                </Button>
              )}
            </div>
          )
        )}
        {rows.length > 0 && (
          <div className="border-t border-line px-4 py-3 text-xs text-ink-400">
            {rows.length} {rows.length === 1 ? "collection" : "collections"}
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={deleting.length > 0}
        title={
          deleting.length > 1 ? "Delete collections?" : "Delete collection?"
        }
        message={`Delete ${deleting.length > 1 ? `${deleting.length} collections` : `“${deleting[0]?.name ?? ""}”`}? Products will remain in your catalogue.`}
        confirmLabel="Delete"
        destructive
        busy={deletingBusy}
        onCancel={() => {
          if (!deletingBusy) setDeleting([]);
        }}
        onConfirm={async () => {
          if (deletingBusy) return;
          setDeletingBusy(true);
          try {
            for (const c of deleting) {
              await remove.mutateAsync(c.id);
              setSelected((prev) => prev.filter((id) => id !== c.id));
            }
            toast.success("Collections deleted");
          } catch (error) {
            toast.error(
              "Couldn't delete collection",
              error instanceof Error ? error.message : "Please try again.",
            );
          } finally {
            setDeletingBusy(false);
            setDeleting([]);
          }
        }}
      />
    </PortalShell>
  );
}
