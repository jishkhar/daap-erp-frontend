"use client";

import { PortalShell } from "@/components/portal/PortalShell";
import { RoleEditor } from "@/components/portal/RoleEditor";
import { usePortalGuard } from "@/components/portal/usePortalGuard";

export default function NewRolePage() {
  const { tenant, ready } = usePortalGuard();
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="roles">
      <RoleEditor />
    </PortalShell>
  );
}
