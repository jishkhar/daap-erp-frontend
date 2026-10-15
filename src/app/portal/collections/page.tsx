"use client";

import { FolderOpen, FolderPlus, Pencil, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { CollectionEditor } from "@/components/erp/CollectionEditor";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  useCollection,
  useCollections,
  useDeleteCollection,
  type ProductCollection,
} from "@/hooks/useCollections";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

export default function CollectionsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<string | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProductCollection | null>(null);
  const collections = useCollections();
  const detail = useCollection(editor && editor !== "new" ? editor : null);
  const remove = useDeleteCollection();
  const canCreate = hasTenantWide(session, "products:create");
  const canEdit = hasTenantWide(session, "products:update");
  const canDelete = hasTenantWide(session, "products:archive");
  const rows = (collections.data ?? []).filter((c) =>
    `${c.name} ${c.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="collections">
      <PageHeader
        icon={<FolderOpen size={20} />}
        title="Collections"
        description="Create your own product selections for occasions, themes or campaigns."
        actions={
          canCreate && (
            <Button onClick={() => setEditor("new")}>
              <FolderPlus size={16} /> Add collection
            </Button>
          )
        }
      />
      <Card className="mb-space-4 p-space-3">
        <Input
          aria-label="Search collections"
          placeholder="Search collections…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </Card>
      {collections.error && (
        <p role="alert" className="mb-space-3 text-sm text-error">
          {collections.error.message}
        </p>
      )}
      {collections.isLoading ? (
        <p className="text-sm text-ink-600">Loading collections…</p>
      ) : !collections.error && rows.length === 0 ? (
        <Card className="p-space-6 text-center">
          <FolderOpen size={32} className="mx-auto mb-space-3 text-brand-600" />
          <h2 className="text-lg font-semibold">
            {search.trim()
              ? "No collections match your search"
              : "Create your first collection"}
          </h2>
          <p className="mt-space-2 text-sm text-ink-600">
            {search.trim()
              ? "Try another name or theme."
              : "Bring products together for a theme like “Wedding Day”. Choose dresses from any category, and reuse products across collections."}
          </p>
          {!search.trim() && canCreate && (
            <Button className="mt-space-4" onClick={() => setEditor("new")}>
              <FolderPlus size={16} /> Add collection
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-space-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((collection) => (
            <Card key={collection.id} className="flex flex-col p-space-4">
              <button
                type="button"
                className="text-left"
                onClick={() => setEditor(collection.id)}
              >
                <h2 className="text-lg font-semibold text-ink-900">
                  {collection.name}
                </h2>
              </button>
              <p className="mt-space-2 whitespace-pre-wrap break-words text-sm text-ink-600">
                {collection.description || "No description yet."}
              </p>
              <p className="my-space-3 text-sm font-medium">
                {collection.item_count}{" "}
                {collection.item_count === 1 ? "product" : "products"}
              </p>
              <p className="mb-space-3 text-xs text-ink-600">
                Updated{" "}
                {new Date(collection.updated_at).toLocaleDateString("en-IN")}
              </p>
              <div className="mt-auto flex flex-wrap gap-space-2">
                <Button
                  variant="secondary"
                  onClick={() => setEditor(collection.id)}
                >
                  {canEdit ? <Pencil size={15} /> : <Eye size={15} />}
                  {canEdit ? "Edit collection" : "View products"}
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    aria-label={`Delete ${collection.name}`}
                    onClick={() => {
                      remove.reset();
                      setDeleting(collection);
                    }}
                  >
                    <Trash2 size={15} />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editor && editor !== "new" && !detail.data && (
        <Card className="mt-space-4 p-space-4">
          <p
            role={detail.error ? "alert" : "status"}
            className={detail.error ? "text-error" : "text-ink-600"}
          >
            {detail.error ? detail.error.message : "Loading collection…"}
          </p>
          <Button variant="ghost" onClick={() => setEditor(null)}>
            Cancel
          </Button>
        </Card>
      )}
      {(editor === "new" || (editor && detail.data)) && (
        <CollectionEditor
          key={editor}
          collection={editor === "new" ? undefined : detail.data}
          editable={editor === "new" ? canCreate : canEdit}
          onClose={() => setEditor(null)}
        />
      )}
      {remove.error && (
        <p role="alert" className="mt-space-3 text-sm text-error">
          {remove.error.message}
        </p>
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete collection?"
        message={`Delete “${deleting?.name ?? ""}”? Its products will remain in your catalogue and other collections.`}
        confirmLabel="Delete collection"
        destructive
        busy={remove.isPending}
        onCancel={() => {
          if (!remove.isPending) setDeleting(null);
        }}
        onConfirm={() => {
          if (!deleting || remove.isPending) return;
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              toast.success("Collection deleted");
            },
            onError: (error) => {
              setDeleting(null);
              toast.error("Couldn't delete collection", error.message);
            },
          });
        }}
      />
    </PortalShell>
  );
}
