"use client";

import { Check, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useErpQuery } from "@/lib/erp";
import { roleDescription } from "@/lib/staffRoles";

type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
};

// Friendly module names for the matrix; anything not listed is shown as its raw module key.
const MODULE_LABEL: Record<string, string> = {
  tenant: "Company settings",
  branches: "Branches",
  users: "People",
  roles: "Roles",
  channels: "Channel keys",
  products: "Products",
  customers: "Customers",
  orders: "Orders",
  payments: "Payments",
  inventory: "Inventory",
  transfers: "Stock transfers",
  audit: "Activity log",
  events: "Event stream",
  retail: "POS billing",
  procurement: "Procurement",
  finance: "Finance",
  reports: "Reports",
  recommerce: "ReCommerce",
};

export default function RolesPage() {
  const { tenant, ready } = usePortalGuard();
  const roles = useErpQuery<Role[]>("/api/v1/roles");

  const modules = useMemo(() => {
    const set = new Set<string>();
    (roles.data ?? []).forEach((r) =>
      r.permissions.forEach((p) => set.add(p.split(":")[0])),
    );
    return [...set].sort((a, b) =>
      (MODULE_LABEL[a] ?? a).localeCompare(MODULE_LABEL[b] ?? b),
    );
  }, [roles.data]);

  if (!ready) return null;
  const actions = (role: Role, module: string) =>
    role.permissions
      .filter((p) => p.startsWith(`${module}:`))
      .map((p) => p.split(":")[1].replace(/_/g, " "));

  return (
    <PortalShell tenant={tenant} active="roles">
      <PageHeader
        icon={<ShieldCheck size={20} />}
        title="Roles & Permissions"
        description="What each role can do. A role applies to one branch or to all of them, depending on how it is granted."
      />
      {roles.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {roles.error}
        </p>
      )}
      {!roles.data && !roles.error ? (
        <div
          className="flex flex-col gap-space-4"
          role="status"
          aria-label="Loading roles"
        >
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-space-4">
              <div className="flex items-center justify-between gap-space-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="mt-space-3 h-[66px] w-full" />
            </Card>
          ))}
          <Card className="p-space-4">
            <div className="flex flex-col gap-space-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="mb-space-4 flex flex-col gap-space-4">
            {(roles.data ?? []).map((r) => (
              <Card key={r.id} className="p-space-4">
                <div className="flex items-center justify-between gap-space-3">
                  <h2 className="text-[15px] font-bold text-ink-900">
                    {r.name}
                  </h2>
                  <span className="text-[12px] text-ink-400">
                    {r.permissions.length} permissions
                  </span>
                </div>
                <div className="mt-space-3 rounded-md border border-line px-space-3 py-space-3 text-[13px] text-ink-600">
                  {r.description ?? roleDescription(r.code)}
                </div>
              </Card>
            ))}
          </div>
          <Card className="no-scrollbar overflow-x-auto p-space-2">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px] tracking-wide text-ink-400 uppercase">
                  <th className="p-space-3">Module</th>
                  {(roles.data ?? []).map((r) => (
                    <th key={r.id} className="p-space-3">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m} className="border-t border-line align-top">
                    <td className="p-space-3 font-semibold text-ink-900">
                      {MODULE_LABEL[m] ?? m}
                    </td>
                    {(roles.data ?? []).map((r) => {
                      const a = actions(r, m);
                      return (
                        <td key={r.id} className="p-space-3 text-ink-600">
                          {a.length === 0 ? (
                            <span className="text-ink-300">—</span>
                          ) : (
                            <span className="flex items-start gap-1">
                              <Check
                                size={14}
                                className="mt-0.5 shrink-0 text-success"
                              />
                              <span>{a.join(", ")}</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </PortalShell>
  );
}
