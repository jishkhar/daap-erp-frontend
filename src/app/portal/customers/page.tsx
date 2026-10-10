"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { CursorPager } from "@/components/ui/CursorPager";
import { useCreateCustomer, useCustomerList } from "@/hooks/useCustomers";
import { formatDateTime, type Customer } from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

export default function CustomersPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim());
  const customers = useCustomerList(query); // paged and searched on the server
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const createCustomer = useCreateCustomer();
  const busy = createCustomer.isPending;
  const canCreate = hasPermission(session, "customers", "write");

  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      {
        header: "Customer",
        cell: ({ row }) => (
          <span className="font-semibold text-ink-900">
            {row.original.name}
          </span>
        ),
      },
      {
        header: "Phone",
        cell: ({ row }) =>
          row.original.phone ?? <span className="text-ink-400">—</span>,
      },
      {
        header: "Email",
        cell: ({ row }) =>
          row.original.email ?? <span className="text-ink-400">—</span>,
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={row.original.status === "active" ? "success" : "neutral"}
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        header: "Since",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
    ],
    [],
  );

  if (!ready) return null;

  function create() {
    createCustomer.mutate(
      {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Customer added");
          setOpen(false);
          setForm({ name: "", phone: "", email: "" });
        },
        onError: (e) => toast.error("Couldn't add the customer", e.message),
      },
    );
  }

  return (
    <PortalShell tenant={tenant} active="customers">
      <PageHeader
        icon={<Users size={20} />}
        title="Customers"
        description="One record per customer across Online, POS and WhatsApp — matched by phone number."
        actions={
          canCreate && (
            <Button onClick={() => setOpen(true)}>
              <UserPlus size={16} /> Add customer
            </Button>
          )
        }
      />
      <Card className="mb-space-4 p-space-3">
        <Input
          placeholder="Search name, phone or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
          aria-label="Search customers"
        />
      </Card>
      {customers.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {customers.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={customers.rows}
          getRowId={(c) => String(c.id)}
          onRowClick={(c) => router.push(`/portal/customers/${c.id}`)}
          paginate={false}
          loading={customers.isFetching}
          emptyMessage={
            customers.isLoading ? "Loading customers…" : "No customers yet."
          }
        />
        <CursorPager {...customers.pager} />
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add customer"
        description="A phone number or an email is required."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !form.name.trim() ||
                (!form.phone.trim() && !form.email.trim())
              }
              onClick={create}
            >
              Add customer
            </Button>
          </>
        }
      >
        <Field label="Name" htmlFor="c_name" required>
          <Input
            id="c_name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Phone" htmlFor="c_phone">
          <Input
            id="c_phone"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Email" htmlFor="c_email">
          <Input
            id="c_email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
      </Modal>
    </PortalShell>
  );
}
