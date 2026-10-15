"use client";

import Link from "next/link";
import { CollectionEditor } from "@/components/erp/CollectionEditor";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { useCollection } from "@/hooks/useCollections";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";

export function CollectionWorkspace({ id }: { id?: string }) {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const detail = useCollection(id ?? null);
  if (!ready) return null;
  const editable = hasTenantWide(
    session,
    id ? "products:update" : "products:create",
  );
  return (
    <PortalShell tenant={tenant} active="collections">
      {!id && !editable ? (
        <p role="alert">You do not have permission to create collections.</p>
      ) : id && !detail.data ? (
        <div className="py-16 text-center">
          <p role={detail.error ? "alert" : "status"}>
            {detail.error?.message ?? "Loading collection…"}
          </p>
          <Link
            href="/portal/collections"
            className="mt-4 inline-block text-sm underline"
          >
            Back to collections
          </Link>
        </div>
      ) : (
        <CollectionEditor
          key={id ?? "new"}
          collection={id ? detail.data : undefined}
          editable={editable}
        />
      )}
    </PortalShell>
  );
}
