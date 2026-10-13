"use client";

import { useParams } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { RoleEditor } from "@/components/portal/RoleEditor";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRoles } from "@/hooks/useTeam";

export default function EditRolePage() {
  const { tenant, ready } = usePortalGuard();
  const { id } = useParams<{ id: string }>();
  const roles = useRoles();
  const role = roles.data?.find((r) => r.id === id);
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="roles">
      {roles.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : role ? (
        <RoleEditor key={role.id + role.permissions.join()} role={role} />
      ) : (
        <p className="text-[14px] text-ink-600">That role no longer exists.</p>
      )}
    </PortalShell>
  );
}
