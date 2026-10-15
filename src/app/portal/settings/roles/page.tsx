"use client";

import { Copy, Minus, Plus, ShieldCheck, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { PERMISSION_LABEL } from "@/components/portal/PermissionGrid";
import {
  useDuplicateRole,
  useRoleCatalogue,
  useRoles,
  type Role,
} from "@/hooks/useTeam";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

const CATEGORY_LABEL: Record<Role["category"], string> = {
  store: "Store",
  pos: "Point of Sale",
  organization: "Administrator",
};

/** A till permission as the overview names it: its own label, or "Module: action" (a bare "View" would not say what of). */
function tillLabel(p: string): string {
  if (PERMISSION_LABEL[p]) return PERMISSION_LABEL[p];
  const [module, action] = p.split(":");
  const words = (x: string) => x.replace(/_/g, " ");
  return `${words(module).replace(/^./, (c) => c.toUpperCase())}: ${words(action)}`;
}

export default function RolesPage() {
  const { tenant, ready } = usePortalGuard();
  const router = useRouter();
  const session = useStaffSession();
  const roles = useRoles();
  const catalogue = useRoleCatalogue();
  const duplicate = useDuplicateRole();
  const [q, setQ] = useState("");
  const [overview, setOverview] = useState<"pages" | "till">("pages");
  const canWrite = hasPermission(session, "roles", "write");

  const shown = useMemo(
    () =>
      (roles.data ?? []).filter((r) =>
        r.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [roles.data, q],
  );

  // Portal pages: store roles (and the administrator), what each can view. The till: point-of-sale roles (and the administrator),
  // which till permissions each holds.
  const storeRoles = (roles.data ?? []).filter((r) => r.category !== "pos");
  const tillRoles = (roles.data ?? []).filter((r) => r.category !== "store");
  const canView = (role: Role, perms: string[]) =>
    role.category === "organization" ||
    perms.some((x) => role.permissions.includes(x));
  const holds = (role: Role, perm: string) =>
    role.category === "organization" || role.permissions.includes(perm);

  if (!ready) return null;

  async function copy(r: Role) {
    try {
      const made = await duplicate.mutateAsync(r.id);
      toast.success("Role duplicated");
      router.push(`/portal/settings/roles/${made.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <PortalShell tenant={tenant} active="roles">
      <PageHeader
        icon={<ShieldCheck size={20} />}
        title="Roles & Permissions"
        description="Create roles for your store team and your tills, then give them to people on the Users page. Administrators can see and do everything."
        actions={
          canWrite && (
            <Button href="/portal/settings/roles/new">
              <Plus size={16} /> Add role
            </Button>
          )
        }
      />
      {roles.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {roles.error.message}
        </p>
      )}
      <Card className="mb-space-5 p-space-2">
        <div className="p-space-2">
          <Input
            placeholder="Search roles"
            aria-label="Search roles"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {!roles.data && !roles.error ? (
          <div
            className="flex flex-col gap-space-2 p-space-2"
            role="status"
            aria-label="Loading roles"
          >
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-paper text-left text-[11px] tracking-wide text-ink-400 uppercase">
                <th className="p-space-3 font-semibold">Name</th>
                <th className="p-space-3 font-semibold">Category</th>
                <th className="p-space-3 text-right font-semibold">Users</th>
                <th className="w-12 p-space-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-line ${r.is_system ? "text-ink-400" : "text-ink-900"}`}
                >
                  <td className="p-space-3 font-medium">
                    <Link
                      href={`/portal/settings/roles/${r.id}`}
                      className="hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.description && (
                      <div className="text-[12px] font-normal text-ink-400">
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="p-space-3">
                    <Badge
                      tone={
                        r.category === "pos"
                          ? "violet"
                          : r.category === "store"
                            ? "clay"
                            : "brand"
                      }
                    >
                      {CATEGORY_LABEL[r.category]}
                    </Badge>
                  </td>
                  <td className="p-space-3 text-right">{r.user_count}</td>
                  <td className="p-space-3 text-right">
                    {canWrite && !r.is_system && (
                      <button
                        type="button"
                        title="Duplicate"
                        aria-label={`Duplicate ${r.name}`}
                        disabled={duplicate.isPending}
                        onClick={() => copy(r)}
                        className="rounded-md p-1 text-ink-400 hover:bg-black/[0.04] hover:text-ink-900"
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && roles.data && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-space-4 text-center text-ink-400"
                  >
                    No roles match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {catalogue.data && (
        <>
          <Tabs<"pages" | "till">
            tabs={[
              { key: "pages", label: "Portal pages" },
              { key: "till", label: "Till (Point of Sale)" },
            ]}
            value={overview}
            onChange={setOverview}
          />
          {overview === "pages" ? (
            <AccessOverview
              title="Page access overview"
              rowHeader="Page"
              hint="Which store roles can open each page (the View permission). Point of Sale roles work on the till only: see the Till tab."
              roles={storeRoles}
              rows={catalogue.data.pages.map((p) => ({
                key: p.key,
                label: p.label,
                allowed: (r: Role) => canView(r, p.view),
              }))}
            />
          ) : (
            <AccessOverview
              title="Till access overview"
              rowHeader="Permission"
              hint="What each Point of Sale role may do on the till."
              roles={tillRoles}
              rows={catalogue.data.pos.map((x) => ({
                key: x,
                label: tillLabel(x),
                allowed: (r: Role) => holds(r, x),
              }))}
            />
          )}
        </>
      )}
    </PortalShell>
  );
}

/** A grid of roles (columns) against pages or till permissions (rows), ticked where the role has it. */
function AccessOverview({
  title,
  rowHeader,
  hint,
  roles,
  rows,
}: {
  title: string;
  rowHeader: string;
  hint: string;
  roles: Role[];
  rows: { key: string; label: string; allowed: (r: Role) => boolean }[];
}) {
  return (
    <Card className="no-scrollbar overflow-x-auto p-space-4">
      <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
      <p className="mb-space-3 text-[12px] text-ink-400">{hint}</p>
      <table className="w-full min-w-[480px] text-[13px]">
        <thead>
          <tr className="text-left text-[11px] tracking-wide text-ink-400 uppercase">
            <th className="py-space-2 font-semibold">{rowHeader}</th>
            {roles.map((r) => (
              <th key={r.id} className="py-space-2 text-center font-semibold">
                {r.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-line">
              <td className="py-space-2 text-ink-900">{row.label}</td>
              {roles.map((r) => (
                <td key={r.id} className="py-space-2 text-center">
                  {row.allowed(r) ? (
                    <Check
                      size={14}
                      className="mx-auto text-success"
                      aria-label="Allowed"
                    />
                  ) : (
                    <Minus
                      size={14}
                      className="mx-auto text-ink-300"
                      aria-label="Not allowed"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
