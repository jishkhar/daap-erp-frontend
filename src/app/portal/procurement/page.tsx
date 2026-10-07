"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewPurchaseOrder } from "@/components/erp/procurement/NewPurchaseOrder";
import { SupplierPanel } from "@/components/erp/procurement/SupplierPanel";
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
import { Tabs } from "@/components/ui/Tabs";
import { useActiveBranch } from "@/lib/branch";
import {
  PO_STATUS_TONE,
  erp,
  formatDateTime,
  formatMoney,
  humanize,
  qs,
  useErpQuery,
  type PurchaseOrder,
  type PurchaseRequest,
  type Supplier,
} from "@/lib/erp";
import {
  hasGrant,
  hasPermission,
  hasTenantWide,
  useStaffSession,
} from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Tab = "orders" | "requests" | "suppliers";
const REQUEST_TONE = {
  SUBMITTED: "warning",
  APPROVED: "clay",
  REJECTED: "neutral",
  CONVERTED: "success",
  CANCELLED: "neutral",
} as const;

export default function ProcurementPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [status, setStatus] = useState("");
  const { branchId: activeBranch } = useActiveBranch();
  const pos = useErpQuery<PurchaseOrder[]>(
    `/api/v1/purchase-orders${qs({ status, branch_id: activeBranch })}`,
  );
  const requests = useErpQuery<PurchaseRequest[]>(
    tab === "requests"
      ? `/api/v1/purchase-requests${qs({ branch_id: activeBranch })}`
      : null,
  );
  const suppliers = useErpQuery<Supplier[]>("/api/v1/suppliers");
  const [newPo, setNewPo] = useState(false);
  const [openSupplier, setOpenSupplier] = useState<string | null>(null);
  const [addSupplier, setAddSupplier] = useState(false);
  const [form, setForm] = useState({
    name: "",
    gstin: "",
    phone: "",
    email: "",
    state: "",
    terms: "30",
  });
  const [busy, setBusy] = useState(false);
  const cur = tenant?.currency ?? "INR";
  const canCreate = hasGrant(session, "procurement:create");
  const canAddSupplier = hasTenantWide(session, "suppliers:create");
  const supplierName = useMemo(
    () => new Map((suppliers.data ?? []).map((s) => [s.id, s.name])),
    [suppliers.data],
  );
  const branchCode = useMemo(
    () => new Map((session?.branches ?? []).map((b) => [b.id, b.branch_code])),
    [session],
  );

  const poColumns = useMemo<ColumnDef<PurchaseOrder, unknown>[]>(
    () => [
      {
        header: "PO",
        cell: ({ row }) => (
          <span className="font-semibold text-ink-900">
            {row.original.po_number}
          </span>
        ),
      },
      {
        header: "Supplier",
        cell: ({ row }) =>
          supplierName.get(row.original.supplier_id) ??
          `#${row.original.supplier_id}`,
      },
      {
        header: "Branch",
        cell: ({ row }) =>
          branchCode.get(row.original.branch_id) ??
          `#${row.original.branch_id}`,
      },
      {
        header: "Total",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatMoney(row.original.total_minor, row.original.currency)}
          </span>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={PO_STATUS_TONE[row.original.status]}>
            {humanize(row.original.status)}
          </Badge>
        ),
      },
      {
        header: "Created",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
    ],
    [supplierName, branchCode],
  );

  const requestColumns = useMemo<ColumnDef<PurchaseRequest, unknown>[]>(
    () => [
      {
        header: "Request",
        cell: ({ row }) => (
          <span className="font-semibold text-ink-900">
            {row.original.request_number}
          </span>
        ),
      },
      {
        header: "Branch",
        cell: ({ row }) =>
          branchCode.get(row.original.branch_id) ??
          `#${row.original.branch_id}`,
      },
      {
        header: "Notes",
        cell: ({ row }) =>
          row.original.notes ?? <span className="text-ink-400">—</span>,
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={REQUEST_TONE[row.original.status]}>
            {humanize(row.original.status)}
          </Badge>
        ),
      },
      {
        header: "Raised",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        header: "",
        id: "act",
        cell: ({ row }) =>
          row.original.status === "SUBMITTED" &&
          hasPermission(session, "procurement", "write") ? (
            <div
              className="flex justify-end gap-space-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                onClick={() => decide(row.original.id, "approve")}
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                onClick={() => decide(row.original.id, "reject")}
              >
                Reject
              </Button>
            </div>
          ) : null,
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [branchCode, session],
  );

  if (!ready) return null;

  async function decide(id: string, action: "approve" | "reject") {
    const reason =
      action === "reject"
        ? window.prompt("Reason for rejecting this request?")
        : null;
    if (action === "reject" && !reason) return;
    const res = await erp(
      `/api/v1/purchase-requests/${id}/${action}`,
      "POST",
      action === "reject" ? { reason } : undefined,
    );
    if (res.error) return toast.error("Couldn't update the request", res.error);
    toast.success(
      action === "approve" ? "Request approved" : "Request rejected",
    );
    requests.reload();
  }

  async function createSupplier() {
    setBusy(true);
    const res = await erp("/api/v1/suppliers", "POST", {
      name: form.name.trim(),
      gstin: form.gstin.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      state: form.state.trim() || null,
      payment_terms_days: parseInt(form.terms, 10) || 30,
    });
    setBusy(false);
    if (res.error) return toast.error("Couldn't add the supplier", res.error);
    toast.success("Supplier added");
    setAddSupplier(false);
    setForm({
      name: "",
      gstin: "",
      phone: "",
      email: "",
      state: "",
      terms: "30",
    });
    suppliers.reload();
  }

  const supplierColumns: ColumnDef<Supplier, unknown>[] = [
    {
      header: "Supplier",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-ink-900">{row.original.name}</p>
          <p className="text-[12px] text-ink-400">
            {row.original.supplier_code}
          </p>
        </div>
      ),
    },
    {
      header: "GSTIN",
      cell: ({ row }) =>
        row.original.gstin ?? <span className="text-ink-400">—</span>,
    },
    {
      header: "State",
      cell: ({ row }) =>
        row.original.state ?? <span className="text-ink-400">—</span>,
    },
    {
      header: "Terms",
      cell: ({ row }) => `${row.original.payment_terms_days} days`,
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge tone={row.original.status === "active" ? "success" : "neutral"}>
          {row.original.status}
        </Badge>
      ),
    },
  ];

  return (
    <PortalShell tenant={tenant} active="procurement">
      <PageHeader
        scopedToBranch
        icon={<Truck size={20} />}
        title="Procurement"
        description="Buy stock from suppliers: orders, goods receipt with landed cost, returns and what you owe."
        actions={
          <>
            {tab === "suppliers" && canAddSupplier && (
              <Button variant="secondary" onClick={() => setAddSupplier(true)}>
                <Plus size={16} /> Add supplier
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setNewPo(true)}>
                <Plus size={16} /> New purchase order
              </Button>
            )}
          </>
        }
      />
      <Tabs<Tab>
        tabs={[
          { key: "orders", label: "Purchase orders" },
          { key: "requests", label: "Requests" },
          { key: "suppliers", label: "Suppliers" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "orders" && (
        <>
          <Card className="mb-space-4 p-space-3"><Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-52" aria-label="Status"><option value="">Any status</option>{["DRAFT", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></Card>
          {pos.error && <p className="mb-space-3 text-[13px] font-medium text-error">{pos.error}</p>}
          <Card className="p-space-2"><DataTable columns={poColumns} data={pos.data ?? []} getRowId={(o) => String(o.id)} onRowClick={(o) => router.push(`/portal/procurement/orders/${o.id}`)} loading={pos.loading} emptyMessage={pos.loading ? "Loading…" : "No purchase orders yet."} /></Card>
        </>
      )}
      {tab === "requests" && (
        <Card className="p-space-2"><DataTable columns={requestColumns} data={requests.data ?? []} getRowId={(o) => String(o.id)} loading={requests.loading} emptyMessage={requests.loading ? "Loading…" : "No purchase requests."} /></Card>
      )}
      {tab === "suppliers" && (
        <>
          {suppliers.error && <p className="mb-space-3 text-[13px] font-medium text-error">{suppliers.error}</p>}
          <Card className="p-space-2"><DataTable columns={supplierColumns} data={suppliers.data ?? []} getRowId={(o) => String(o.id)} onRowClick={(s) => setOpenSupplier(s.id)} loading={suppliers.loading} emptyMessage={suppliers.loading ? "Loading…" : "No suppliers yet."} /></Card>
        </>
      )}

      <NewPurchaseOrder
        open={newPo}
        currency={cur}
        onClose={() => setNewPo(false)}
        onCreated={(po) => {
          setNewPo(false);
          router.push(`/portal/procurement/orders/${po.id}`);
        }}
      />
      <SupplierPanel
        supplierId={openSupplier}
        currency={cur}
        onClose={() => setOpenSupplier(null)}
      />
      <Modal
        open={addSupplier}
        onClose={() => setAddSupplier(false)}
        title="Add supplier"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddSupplier(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !form.name.trim()}
              onClick={createSupplier}
            >
              Add supplier
            </Button>
          </>
        }
      >
        <div className="grid gap-x-space-4 sm:grid-cols-2">
          <Field
            label="Name"
            htmlFor="s_name"
            required
            className="sm:col-span-2"
          >
            <Input
              id="s_name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="GSTIN" htmlFor="s_gstin">
            <Input
              id="s_gstin"
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
            />
          </Field>
          <Field label="State" htmlFor="s_state">
            <Input
              id="s_state"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </Field>
          <Field label="Phone" htmlFor="s_phone">
            <Input
              id="s_phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email" htmlFor="s_email">
            <Input
              id="s_email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Payment terms (days)" htmlFor="s_terms">
            <Input
              id="s_terms"
              inputMode="numeric"
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </PortalShell>
  );
}
