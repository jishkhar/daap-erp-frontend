"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { erp, formatDateTime, useErpQuery } from "@/lib/erp";
import { roleLabel, roleTone } from "@/lib/staffRoles";
import { activeBranches, hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Assignment = { id: string; branch_id: string | null; role_id: string; role_code: string; role_name: string };
type User = { id: string; email: string; name: string; phone: string | null; status: "active" | "disabled"; last_login_at: string | null; roles: Assignment[] };
type Role = { id: string; code: string; name: string; permissions: string[] };

export default function TeamAccessPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const users = useErpQuery<User[]>("/api/v1/users");
  const roles = useErpQuery<Role[]>("/api/v1/roles");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role_id: "", branch_id: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grant, setGrant] = useState({ role_id: "", branch_id: "" });
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const canManage = hasPermission(session, "staff", "write");
  const branches = useMemo(() => session?.branches ?? [], [session]);
  const openBranches = useMemo(() => activeBranches(session), [session]);
  const branchName = (id: string | null) => (id === null ? "All branches" : branches.find((b) => b.id === id)?.branch_name ?? `Branch #${id}`);
  const selected = users.data?.find((u) => u.id === selectedId) ?? null;

  const columns = useMemo<ColumnDef<User, unknown>[]>(() => [
    { header: "Person", cell: ({ row }) => (<div><p className="font-semibold text-ink-900">{row.original.name}</p><p className="text-[12px] text-ink-400">{row.original.email}</p></div>) },
    { header: "Access", cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">{row.original.roles.length === 0 ? <span className="text-ink-400">No access</span> : row.original.roles.map((r) => (
        <Badge key={r.id} tone={roleTone(r.role_code)}>{roleLabel(r.role_code)} · {r.branch_id === null ? "all" : branches.find((b) => b.id === r.branch_id)?.branch_code ?? `#${r.branch_id}`}</Badge>))}</div>) },
    { header: "Status", cell: ({ row }) => <Badge tone={row.original.status === "active" ? "success" : "neutral"}>{row.original.status}</Badge> },
    { header: "Last sign-in", cell: ({ row }) => <span className="text-ink-600">{row.original.last_login_at ? formatDateTime(row.original.last_login_at) : "Never"}</span> },
  ], [branches]);

  if (!ready) return null;

  async function run(call: () => Promise<{ error: string | null }>, message: string, after?: () => void) {
    setBusy(true);
    const res = await call();
    setBusy(false);
    if (res.error) return toast.error("Couldn't complete that", res.error);
    toast.success(message);
    after?.();
    users.reload();
  }

  const createUser = () => run(() => erp("/api/v1/users", "POST", {
    name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null, password: form.password,
    roles: form.role_id ? [{ role_id: form.role_id, branch_id: form.branch_id || null }] : [],
  }), "Person added", () => { setAdding(false); setForm({ name: "", email: "", phone: "", password: "", role_id: "", branch_id: "" }); });

  return (
    <PortalShell tenant={tenant} active="staff">
      <PageHeader icon={<Users size={20} />} title="Team & Access" description="Who can sign in, and what they can do in which branch."
        actions={canManage && <Button onClick={() => setAdding(true)}><UserPlus size={16} /> Add person</Button>} />
      {(users.error || roles.error) && <p className="mb-space-3 text-[13px] font-medium text-error">{users.error ?? roles.error}</p>}
      <Card className="p-space-2"><DataTable columns={columns} data={users.data ?? []} getRowId={(u) => String(u.id)} onRowClick={(u) => { setSelectedId(u.id); setGrant({ role_id: "", branch_id: "" }); setNewPassword(""); }} emptyMessage={users.loading ? "Loading…" : "No people yet."} /></Card>

      <Modal open={adding} onClose={() => setAdding(false)} width="lg" title="Add a person" description="They sign in with your company code and this email."
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={busy || !form.name.trim() || !form.email.trim() || form.password.length < 10} onClick={createUser}>Add person</Button></>}>
        <div className="grid gap-x-space-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="u_name" required><Input id="u_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" htmlFor="u_email" required><Input id="u_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone" htmlFor="u_phone"><Input id="u_phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Temporary password" htmlFor="u_pw" hint="At least 10 characters." required><Input id="u_pw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Role" htmlFor="u_role"><Select id="u_role" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}><option value="">No access yet</option>{(roles.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
          <Field label="Branch" htmlFor="u_branch" hint="“All branches” gives the role everywhere."><Select id="u_branch" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}><option value="">All branches</option>{openBranches.map((b) => <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>)}</Select></Field>
        </div>
      </Modal>

      <Modal open={selected !== null} onClose={() => setSelectedId(null)} width="lg" title={selected?.name ?? ""} description={selected?.email}>
        {selected && (
          <div className="space-y-space-4">
            <div>
              <h3 className="mb-space-2 text-[14px] font-bold text-ink-900">Access</h3>
              {selected.roles.length === 0 && <p className="text-[13px] text-ink-400">No access granted.</p>}
              <ul className="divide-y divide-line">
                {selected.roles.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-[14px]">
                    <span><strong>{r.role_name}</strong> <span className="text-ink-600">— {branchName(r.branch_id)}</span></span>
                    {canManage && <Button variant="ghost" disabled={busy} onClick={() => run(() => erp(`/api/v1/users/${selected.id}/roles/${r.id}`, "DELETE"), "Access removed")}>Remove</Button>}
                  </li>
                ))}
              </ul>
              {canManage && (
                <div className="mt-space-3 flex flex-wrap items-end gap-space-2">
                  <Select aria-label="Role to add" value={grant.role_id} onChange={(e) => setGrant({ ...grant, role_id: e.target.value })} className="w-56"><option value="">Add a role…</option>{(roles.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
                  <Select aria-label="Branch" value={grant.branch_id} onChange={(e) => setGrant({ ...grant, branch_id: e.target.value })} className="w-56"><option value="">All branches</option>{openBranches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</Select>
                  <Button variant="secondary" disabled={busy || !grant.role_id} onClick={() => run(() => erp(`/api/v1/users/${selected.id}/roles`, "POST", { role_id: grant.role_id, branch_id: grant.branch_id || null }), "Access granted", () => setGrant({ role_id: "", branch_id: "" }))}>Grant</Button>
                </div>
              )}
            </div>
            {canManage && (
              <div className="flex flex-wrap items-end justify-between gap-space-3 border-t border-line pt-space-3">
                <div className="flex items-end gap-space-2">
                  <Field label="Reset password" htmlFor="u_reset" className="!mb-0"><Input id="u_reset" type="password" placeholder="New password (10+ characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-64" /></Field>
                  <Button variant="secondary" disabled={busy || newPassword.length < 10} onClick={() => run(() => erp(`/api/v1/users/${selected.id}/password`, "POST", { new_password: newPassword }), "Password reset — they have been signed out", () => setNewPassword(""))}><KeyRound size={15} /> Reset</Button>
                </div>
                {selected.status === "active"
                  ? <Button variant="destructive" disabled={busy || selected.id === session?.id} onClick={() => run(() => erp(`/api/v1/users/${selected.id}`, "PATCH", { status: "disabled" }), "Person disabled — they have been signed out")}>Disable</Button>
                  : <Button disabled={busy} onClick={() => run(() => erp(`/api/v1/users/${selected.id}`, "PATCH", { status: "active" }), "Person re-enabled")}>Re-enable</Button>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </PortalShell>
  );
}
