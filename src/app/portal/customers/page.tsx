"use client";

import {
  CrownIcon,
  RepeatIcon,
  ShoppingCart01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnalyticsTab } from "@/components/crm/AnalyticsTab";
import { CampaignsTab } from "@/components/crm/CampaignsTab";
import { CommunicationTab } from "@/components/crm/CommunicationTab";
import { CustomersTab } from "@/components/crm/CustomersTab";
import { LoyaltyTab } from "@/components/crm/LoyaltyTab";
import { SegmentsTab } from "@/components/crm/SegmentsTab";
import { KpiTile } from "@/components/crm/shared";
import { TagsTab } from "@/components/crm/TagsTab";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import type { CrmSummary, Segment } from "@/lib/crm";
import { erp, formatMoney, useErpQuery } from "@/lib/erp";
import { hasPermission, hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";

type Tab = "customers" | "segments" | "tags" | "campaigns" | "communication" | "loyalty" | "analytics";
const TABS: { key: Tab; label: string }[] = [
  { key: "customers", label: "All Customers" },
  { key: "segments", label: "Segments" },
  { key: "tags", label: "Tags" },
  { key: "campaigns", label: "Campaigns" },
  { key: "communication", label: "Communication" },
  { key: "loyalty", label: "Loyalty" },
  { key: "analytics", label: "Analytics" },
];

export default function CustomersPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const router = useRouter();
  const summary = useErpQuery<CrmSummary>("/api/v1/crm/summary");
  const [tab, setTab] = useState<Tab>("customers");
  const [filter, setFilter] = useState({ segment: "", tag: "" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const canCreate = hasPermission(session, "customers", "write");
  const canConfigure = hasTenantWide(session, "customers:update");
  const currency = tenant?.currency ?? "INR";
  const s = summary.data;

  if (!ready) return null;

  const changed = () => {
    summary.reload();
    setVersion((v) => v + 1);
  };
  const openCustomer = (id: string) => router.push(`/portal/customers/${id}`);

  async function create() {
    setBusy(true);
    const res = await erp("/api/v1/customers", "POST", {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
    });
    setBusy(false);
    if (res.error) return toast.error("Couldn't add the customer", res.error);
    toast.success("Customer added");
    setOpen(false);
    setForm({ name: "", phone: "", email: "" });
    changed();
  }

  return (
    <PortalShell tenant={tenant} active="customers">
      <PageHeader
        icon={<HugeiconsIcon icon={UserGroupIcon} size={20} />}
        title="CRM"
        description="Manage your customers, build relationships and increase repeat sales."
        actions={
          canCreate && (
            <Button onClick={() => setOpen(true)}>
              <HugeiconsIcon icon={UserAdd01Icon} size={16} /> Add customer
            </Button>
          )
        }
      />
      {summary.error && <p className="mb-space-3 text-[13px] font-medium text-error">{summary.error}</p>}
      <div className="mb-space-4 grid grid-cols-2 gap-space-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Total customers" value={s?.total_customers ?? "—"} icon={<HugeiconsIcon icon={UserGroupIcon} size={20} />} />
        <KpiTile label="Active customers" value={s?.active_customers ?? "—"} hint="purchased in last 6 months" icon={<HugeiconsIcon icon={UserCheck01Icon} size={20} />} />
        <KpiTile label="VIP customers" value={s?.vip_customers ?? "—"} icon={<HugeiconsIcon icon={CrownIcon} size={20} />} />
        <KpiTile label="New customers" value={s?.new_this_month ?? "—"} hint="this month" icon={<HugeiconsIcon icon={UserAdd01Icon} size={20} />} />
        <KpiTile label="Avg. purchase value" value={s ? formatMoney(s.avg_purchase_value_minor, currency) : "—"} icon={<HugeiconsIcon icon={ShoppingCart01Icon} size={20} />} />
        <KpiTile label="Repeat customers" value={s ? `${s.repeat_rate_pct}%` : "—"} hint={s ? `${s.repeat_customers} customers` : undefined} icon={<HugeiconsIcon icon={RepeatIcon} size={20} />} />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "customers" && (
        <CustomersTab
          key={version}
          currency={currency}
          canEdit={canCreate}
          segment={filter.segment}
          tag={filter.tag}
          onFilterChange={(f) => setFilter((cur) => ({ ...cur, ...f }))}
          onChanged={changed}
        />
      )}
      {tab === "segments" && (
        <SegmentsTab
          currency={currency}
          canConfigure={canConfigure}
          onChanged={changed}
          onOpenSegment={(seg: Segment) => {
            setFilter({ segment: seg, tag: "" });
            setTab("customers");
          }}
        />
      )}
      {tab === "tags" && (
        <TagsTab
          onOpenTag={(t) => {
            setFilter({ segment: "", tag: t });
            setTab("customers");
          }}
        />
      )}
      {tab === "campaigns" && <CampaignsTab canEdit={canCreate} onChanged={changed} />}
      {tab === "communication" && <CommunicationTab canEdit={canCreate} onChanged={changed} onOpenCustomer={openCustomer} />}
      {tab === "loyalty" && <LoyaltyTab canConfigure={canConfigure} onOpenCustomer={openCustomer} onChanged={changed} />}
      {tab === "analytics" && <AnalyticsTab currency={currency} repeatRate={s?.repeat_rate_pct ?? 0} />}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add customer"
        description="A phone number or an email is required."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy || !form.name.trim() || (!form.phone.trim() && !form.email.trim())} onClick={create}>Add customer</Button>
          </>
        }
      >
        <Field label="Name" htmlFor="c_name" required><Input id="c_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="c_phone"><Input id="c_phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Email" htmlFor="c_email"><Input id="c_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      </Modal>
    </PortalShell>
  );
}
