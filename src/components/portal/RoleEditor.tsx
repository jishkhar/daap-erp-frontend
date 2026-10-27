"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PermissionGrid,
  PosPermissionList,
} from "@/components/portal/PermissionGrid";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  useCreateRole,
  useDeleteRole,
  useRoleCatalogue,
  useUpdateRole,
  type Role,
} from "@/hooks/useTeam";
import { Skeleton } from "@/components/ui/Skeleton";
import { hasPermission, hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

const CATEGORY_LABEL = {
  store: "Store",
  pos: "Point of Sale",
  organization: "Administrator",
};

/** Add a role (no `role`) or edit one. Built-in roles open read-only. */
export function RoleEditor({ role }: { role?: Role }) {
  const router = useRouter();
  const session = useStaffSession();
  const catalogue = useRoleCatalogue();
  const create = useCreateRole();
  const update = useUpdateRole();
  const remove = useDeleteRole();
  const builtIn = role?.is_system ?? false;
  const canWrite = hasPermission(session, "roles", "write") && !builtIn;
  const canDelete =
    hasPermission(session, "roles", "delete") && !!role && !builtIn;

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [category, setCategory] = useState<"store" | "pos" | "">(
    role && role.category !== "organization" ? role.category : "",
  );
  const [selected, setSelected] = useState<Set<string>>(
    new Set(role?.permissions ?? []),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  // You can only hand out what you hold yourself, tenant-wide: anything else is shown but locked.
  const locked = useMemo(() => {
    const all = new Set<string>();
    (catalogue.data?.pages ?? []).forEach((p) =>
      [...p.view, ...p.write, ...p.delete, ...p.other].forEach((x) =>
        all.add(x),
      ),
    );
    (catalogue.data?.pos ?? []).forEach((x) => all.add(x));
    return new Set([...all].filter((x) => !hasTenantWide(session, x)));
  }, [catalogue.data, session]);

  // Pages of an optional module that is off for the business aren't offered (a role keeps what it already holds, unchanged).
  const pages = useMemo(() => {
    const off = (m: string) => session?.modules?.[m] === false;
    const MODULE_PAGES: Record<string, string> = {
      wholesale: "wholesale",
      customer_accounts: "wholesale",
      price_lists: "wholesale",
      transfers: "transfers",
    };
    return (catalogue.data?.pages ?? []).filter(
      (p) =>
        !(p.group === "Workforce" && off("workforce")) &&
        !(MODULE_PAGES[p.key] && off(MODULE_PAGES[p.key])),
    );
  }, [catalogue.data, session]);

  const busy = create.isPending || update.isPending || remove.isPending;
  const shown =
    category || (role?.category === "organization" ? "organization" : "");

  async function save() {
    if (!name.trim()) return toast.error("Give the role a name.");
    if (!role && !category) return toast.error("Pick a role category.");
    if (selected.size === 0)
      return toast.error("Pick at least one permission.");
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      permissions: [...selected],
    };
    try {
      if (role) await update.mutateAsync({ id: role.id, ...body });
      else
        await create.mutateAsync({
          ...body,
          category: category as "store" | "pos",
        });
      toast.success(role ? "Role saved" : "Role created");
      router.push("/portal/settings/roles");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function del() {
    try {
      await remove.mutateAsync(role!.id);
      toast.success("Role deleted");
      router.push("/portal/settings/roles");
    } catch (e) {
      setConfirmDelete(false);
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <Link
        href="/portal/settings/roles"
        className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={14} /> Roles
      </Link>
      <h1 className="mb-space-4 text-[22px] font-bold text-ink-900">
        {role ? role.name : "Add role"}
      </h1>
      {builtIn && (
        <p className="mb-space-3 rounded-md border border-line bg-paper px-space-3 py-space-2 text-[13px] text-ink-600">
          The Administrator role has every permission, always. It cannot be
          changed.
        </p>
      )}

      <Card className="mb-space-5 p-space-4">
        <Field label="Name" htmlFor="role_name">
          <Input
            id="role_name"
            value={name}
            maxLength={255}
            disabled={!canWrite}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="role_desc" className="mb-0">
          <Input
            id="role_desc"
            value={description}
            maxLength={255}
            disabled={!canWrite}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </Card>

      <h2 className="text-[15px] font-bold text-ink-900">Permissions</h2>
      <p className="mb-space-2 text-[13px] text-ink-600">
        Role category determines available permissions.
      </p>
      <Card className="mb-space-5 p-space-4">
        {!role ? (
          <Field label="Category" htmlFor="role_cat" className="mb-space-3">
            <Select
              id="role_cat"
              value={category}
              onValueChange={(value) => {
                setCategory(value as "store" | "pos" | "");
                setSelected(new Set());
              }}
            >
              <option value="">Select a role category</option>
              <option value="store">
                Store: permissions within the portal
              </option>
              <option value="pos">
                Point of Sale: permissions on the till
              </option>
            </Select>
          </Field>
        ) : (
          <p className="mb-space-3 text-[13px] text-ink-600">
            Category:{" "}
            <strong className="text-ink-900">
              {CATEGORY_LABEL[role.category]}
            </strong>{" "}
            (fixed once a role is created)
          </p>
        )}
        {catalogue.isLoading && <Skeleton className="h-40 w-full" />}
        {catalogue.error && (
          <p className="text-[13px] text-error">{catalogue.error.message}</p>
        )}
        {catalogue.data && shown === "store" && (
          <PermissionGrid
            pages={pages}
            selected={selected}
            onChange={setSelected}
            locked={locked}
            readOnly={!canWrite}
          />
        )}
        {catalogue.data && shown === "pos" && (
          <PosPermissionList
            permissions={catalogue.data.pos}
            selected={selected}
            onChange={setSelected}
            locked={locked}
            readOnly={!canWrite}
          />
        )}
        {shown === "organization" && (
          <p className="text-[13px] text-ink-600">
            Everything, on every page and at every branch.
          </p>
        )}
        {locked.size > 0 && canWrite && shown && shown !== "organization" && (
          <p className="mt-space-3 text-[12px] text-ink-400">
            Greyed-out permissions are ones you do not hold yourself, so you
            cannot hand them out.
          </p>
        )}
      </Card>

      {canWrite && (
        <div className="mobile-page-actions flex items-center gap-space-2">
          <Button onClick={save} disabled={busy}>
            {role ? "Save changes" : "Create role"}
          </Button>
          <Button href="/portal/settings/roles" variant="secondary">
            Cancel
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              className="ml-auto"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Delete role
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this role?"
        message={
          role && role.user_count > 0
            ? `${role.user_count} user(s) still hold it. Move them to another role first.`
            : "The role will be removed. This cannot be undone."
        }
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={del}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
