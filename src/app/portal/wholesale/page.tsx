"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AccountModal } from "@/components/erp/wholesale/AccountModal";
import { PriceListEditor } from "@/components/erp/wholesale/PriceListEditor";
import { AccountPanel } from "@/components/erp/wholesale/AccountPanel";
import { InvoicesTab } from "@/components/erp/wholesale/InvoicesTab";
import {
  ReceiptsTab,
  ReceivablesTab,
} from "@/components/erp/wholesale/ReceivablesTab";
import { SalesOrdersTab } from "@/components/erp/wholesale/SalesOrdersTab";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import {
  useCreatePriceList,
  useCustomerAccounts,
  usePriceLists,
  useWholesaleSettings,
} from "@/hooks/useWholesale";
import { formatMoney } from "@/lib/erp";
import { hasGrant, hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";
import {
  ACCOUNT_STATUS_LABEL,
  ACCOUNT_STATUS_TONE,
  type CustomerAccount,
  type PriceList,
} from "@/lib/wholesale";

type Tab =
  | "orders"
  | "invoices"
  | "customers"
  | "receivables"
  | "receipts"
  | "price-lists";
const TABS: Tab[] = [
  "orders",
  "invoices",
  "customers",
  "receivables",
  "receipts",
  "price-lists",
];

/** Wholesale (Back office): selling in bulk to retailers, dealers and contractors. Business customers carry a GSTIN, credit terms and
 * a price list; price lists hold wholesale prices with quantity breaks. Shown only when the business has switched Wholesale on. */
export default function WholesalePage() {
  return (
    <Suspense fallback={null}>
      <WholesaleView />
    </Suspense>
  );
}

function WholesaleView() {
  const params = useSearchParams();
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const canOrders = hasGrant(session, "wholesale:view");
  const canAccounts =
    hasGrant(session, "customer_accounts:view") ||
    hasGrant(session, "wholesale:view");
  const canLists =
    hasGrant(session, "price_lists:view") ||
    hasGrant(session, "price_lists:manage") ||
    hasGrant(session, "wholesale:view");
  // the person's choice; until they pick, the first tab they may see (decided once the session has loaded)
  const asked = params.get("tab") as Tab | null; // e.g. the dashboard's "overdue" link opens Receivables
  const [picked, setTab] = useState<Tab | null>(
    asked && TABS.includes(asked) ? asked : null,
  );
  const [openAccount, setOpenAccount] = useState<string | null>(null);
  const tab: Tab =
    picked ??
    (canOrders ? "orders" : canAccounts ? "customers" : "price-lists");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const query = useDebounced(q.trim());
  const on = session?.modules?.wholesale !== false;
  const accounts = useCustomerAccounts(
    { q: query || undefined, status: status || undefined },
    on && canAccounts,
  );
  const lists = usePriceLists(on && canLists);
  const settings = useWholesaleSettings();
  const [editing, setEditing] = useState<CustomerAccount | null>(null);
  const [adding, setAdding] = useState(false);
  const [openList, setOpenList] = useState<string | null>(null);
  const [newList, setNewList] = useState(false);
  const canAddAccount = hasTenantWide(session, "customer_accounts:create");
  const canEditAccount = hasTenantWide(session, "customer_accounts:update");
  const canManageLists = hasTenantWide(session, "price_lists:manage");
  const cur = tenant?.currency ?? "INR";

  const accountColumns = useMemo<ColumnDef<CustomerAccount, unknown>[]>(
    () => [
      {
        header: "Business",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.legal_name}
            </p>
            <p className="text-[12px] text-ink-400">
              {row.original.account_code} · {row.original.customer_name}
              {row.original.phone ? ` · ${row.original.phone}` : ""}
            </p>
          </div>
        ),
      },
      {
        header: "GSTIN",
        cell: ({ row }) =>
          row.original.gstin ?? (
            <span className="text-ink-400">Unregistered</span>
          ),
      },
      {
        header: "State",
        cell: ({ row }) =>
          row.original.billing_state ?? <span className="text-ink-400">—</span>,
      },
      {
        header: "Price list",
        cell: ({ row }) =>
          row.original.price_list_name ?? (
            <span className="text-ink-400">Normal prices</span>
          ),
      },
      {
        header: "Credit",
        cell: ({ row }) =>
          row.original.credit_limit_minor === null ? (
            <span className="text-ink-400">Pays at billing</span>
          ) : (
            <span>
              {formatMoney(row.original.credit_limit_minor, cur)} ·{" "}
              {row.original.credit_days} days
            </span>
          ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={ACCOUNT_STATUS_TONE[row.original.status]}>
            {ACCOUNT_STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
    ],
    [cur],
  );

  const listColumns: ColumnDef<PriceList, unknown>[] = [
    {
      header: "Price list",
      cell: ({ row }) => (
        <span className="font-semibold text-ink-900">{row.original.name}</span>
      ),
    },
    {
      header: "GST",
      cell: ({ row }) =>
        row.original.prices_include_tax ? "Included in prices" : "Added on top",
    },
    { header: "Products", cell: ({ row }) => row.original.product_count },
    { header: "Customers", cell: ({ row }) => row.original.customer_count },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge tone={row.original.status === "active" ? "success" : "neutral"}>
          {row.original.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  if (!ready) return null;
  if (!on)
    return (
      <PortalShell tenant={tenant} active="wholesale">
        <PageHeader icon={<Building2 size={20} />} title="Wholesale" />
        <Card className="max-w-xl p-space-5">
          <p className="text-[15px] font-bold text-ink-900">
            Wholesale is switched off
          </p>
          <p className="mt-space-1 text-[13.5px] text-ink-600">
            Turn it on to sell in bulk to retailers and dealers with their own
            prices and credit terms.
          </p>
          <Button className="mt-space-3" href="/portal/settings/wholesale">
            Open Settings &gt; Wholesale
          </Button>
        </Card>
      </PortalShell>
    );

  const tabs: { key: Tab; label: string }[] = [
    ...(canOrders ? [{ key: "orders" as const, label: "Sales orders" }] : []),
    ...(canOrders ? [{ key: "invoices" as const, label: "Invoices" }] : []),
    ...(canAccounts
      ? [{ key: "customers" as const, label: "Business customers" }]
      : []),
    ...(canAccounts
      ? [{ key: "receivables" as const, label: "Receivables" }]
      : []),
    ...(canAccounts
      ? [{ key: "receipts" as const, label: "Payments received" }]
      : []),
    ...(canLists
      ? [{ key: "price-lists" as const, label: "Price lists" }]
      : []),
  ];

  return (
    <PortalShell tenant={tenant} active="wholesale">
      <PageHeader
        icon={<Building2 size={20} />}
        title="Wholesale"
        description="Sell in bulk to retailers, dealers and contractors: quotations, sales orders, business customers with credit terms, and their prices."
        actions={
          <>
            {tab === "customers" && canAddAccount && (
              <Button onClick={() => setAdding(true)}>
                <Plus size={16} /> Add business customer
              </Button>
            )}
            {tab === "price-lists" && canManageLists && (
              <Button onClick={() => setNewList(true)}>
                <Plus size={16} /> New price list
              </Button>
            )}
          </>
        }
      />
      <Tabs<Tab> tabs={tabs} value={tab} onChange={setTab} />

      {tab === "orders" && <SalesOrdersTab currency={cur} />}
      {tab === "invoices" && <InvoicesTab currency={cur} />}
      {tab === "receivables" && <ReceivablesTab currency={cur} />}
      {tab === "receipts" && <ReceiptsTab currency={cur} />}

      {tab === "customers" && (
        <>
          <Card className="mb-space-4 flex flex-wrap gap-space-3 p-space-3">
            <Input
              aria-label="Search business customers"
              placeholder="Search name, code, GSTIN or phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-72"
            />
            <Select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-44"
            >
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Card>
          {accounts.error && (
            <p className="mb-space-3 text-[13px] font-medium text-error">
              {accounts.error.message}
            </p>
          )}
          <Card className="p-space-2">
            <DataTable
              columns={accountColumns}
              data={accounts.rows}
              getRowId={(a) => a.id}
              onRowClick={(a) => setOpenAccount(a.id)}
              paginate={false}
              loading={accounts.isFetching}
              emptyMessage={
                accounts.isLoading
                  ? "Loading…"
                  : query || status
                    ? "No business customer matches."
                    : "No business customers yet. Add the retailers and dealers who buy from you in bulk."
              }
            />
            <CursorPager {...accounts.pager} />
          </Card>
        </>
      )}

      {tab === "price-lists" && (
        <>
          {lists.error && (
            <p className="mb-space-3 text-[13px] font-medium text-error">
              {lists.error.message}
            </p>
          )}
          <Card className="p-space-2">
            <DataTable
              columns={listColumns}
              data={lists.data ?? []}
              getRowId={(l) => l.id}
              onRowClick={(l) => setOpenList(l.id)}
              loading={lists.isFetching}
              emptyMessage={
                lists.isLoading
                  ? "Loading…"
                  : "No price lists yet. Make one per customer group, e.g. Retailer and Dealer."
              }
            />
          </Card>
        </>
      )}

      <AccountPanel
        accountId={openAccount}
        currency={cur}
        onClose={() => setOpenAccount(null)}
        onEdit={
          canEditAccount
            ? (a) => {
                setOpenAccount(null);
                setEditing(a);
              }
            : undefined
        }
      />
      <AccountModal
        open={adding || editing !== null}
        account={editing}
        defaultCreditDays={settings.data?.default_credit_days ?? 0}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <PriceListEditor
        listId={openList}
        canManage={canManageLists}
        onClose={() => setOpenList(null)}
      />
      <NewPriceList
        open={newList}
        onClose={() => setNewList(false)}
        onCreated={(id) => {
          setNewList(false);
          setOpenList(id);
        }}
      />
    </PortalShell>
  );
}

function NewPriceList({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const create = useCreatePriceList();
  const [name, setName] = useState("");
  const [inclusive, setInclusive] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="sm"
      title="New price list"
      description="One list per group of business customers, e.g. Retailer or Dealer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() =>
              create.mutate(
                { name: name.trim(), prices_include_tax: inclusive },
                {
                  onSuccess: (l) => {
                    toast.success("Price list created");
                    setName("");
                    setInclusive(false);
                    onCreated(l.id);
                  },
                  onError: (e) => toast.error("Couldn't create it", e.message),
                },
              )
            }
          >
            Create
          </Button>
        </>
      }
    >
      <Field label="Name" htmlFor="pl_name" required>
        <Input
          id="pl_name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <div className="flex items-start justify-between gap-space-4">
        <div>
          <p className="text-[14px] font-semibold text-ink-900">
            Prices include GST
          </p>
          <p className="text-[12.5px] text-ink-600">
            Leave off to quote prices before GST, as wholesalers usually do.
          </p>
        </div>
        <Switch checked={inclusive} onChange={() => setInclusive(!inclusive)} />
      </div>
    </Modal>
  );
}
