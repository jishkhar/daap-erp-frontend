"use client";

import { ArrowLeft } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building03Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { BranchEditModal, type GstRegistration } from "@/components/portal/BranchEditModal";
import { BranchPanels } from "@/components/portal/BranchPanels";
import { PageHeader } from "@/components/ui/PageHeader";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { displayPhone, type BranchRow } from "@/lib/branchSchema";
import { formatMoney, useErpQuery } from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";

/** One full-width card per topic, like Settings > General: a bold title with its action on the right, then the facts in a bordered box. */
function Section({ title, onEdit, children }: { title: string; onEdit?: () => void; children: ReactNode }) {
  return (
    <Card className="p-space-4">
      <div className="mb-space-3 flex items-center justify-between gap-space-3">
        <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
        {onEdit && <Button variant="secondary" onClick={onEdit}>Edit</Button>}
      </div>
      <dl className="divide-y divide-line rounded-md border border-line">{children}</dl>
    </Card>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-space-4 gap-y-0.5 px-space-3 py-space-3 sm:grid-cols-[200px_1fr]">
      <dt className="text-[13px] text-ink-600">{label}</dt>
      <dd className="whitespace-pre-line break-words text-[14px] font-medium text-ink-900">{children || <span className="font-normal text-ink-400">Not set</span>}</dd>
    </div>
  );
}

const onOff = (v: boolean) => <Badge tone={v ? "success" : "neutral"}>{v ? "On" : "Off"}</Badge>;

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const branch = useErpQuery<BranchRow>(`/api/v1/branches/${id}`);
  const canWrite = hasPermission(session, "branches", "write");
  const canViewGst = hasPermission(session, "settings", "view");
  const canViewUsers = hasPermission(session, "staff", "view");
  const gst = useErpQuery<{ registrations: GstRegistration[] }>(canViewGst ? "/api/v1/tenant/gst-registrations" : null);
  const team = useErpQuery<{ id: string; name: string }[]>(canViewUsers ? "/api/v1/users" : null);
  const [editing, setEditing] = useState(false);
  const edit = canWrite ? () => setEditing(true) : undefined;
  if (!ready) return null;
  const b = branch.data;
  const currency = tenant?.currency ?? "INR";
  const registration = b?.gst_registration_id ? gst.data?.registrations.find((r) => r.id === b.gst_registration_id) : undefined;
  const manager = b?.manager_user_id ? team.data?.find((u) => u.id === b.manager_user_id)?.name : undefined;

  return (
    <PortalShell tenant={tenant} active="settings">
      <Link href="/portal/settings/branches" className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"><ArrowLeft size={14} /> All branches</Link>
      {branch.error && <p className="text-[14px] font-medium text-error">{branch.error}</p>}
      {!b && !branch.error && <p className="text-ink-400">Loading branch…</p>}
      {b && (
        <>
          <PageHeader icon={<HugeiconsIcon icon={Building03Icon} size={20} />} title={b.branch_name}
            description={<>{b.branch_code} <Badge tone={b.status === "active" ? "success" : "neutral"} className="ml-1.5">{b.status}</Badge>{b.is_default && <Badge tone="brand" className="ml-1.5">Default</Badge>}</>} />

          <div className="flex flex-col gap-space-4">
            <Section title="Contact" onEdit={edit}>
              <Item label="Phone">{displayPhone(b.phone)}</Item>
              <Item label="Email">{b.email}</Item>
              <Item label="Manager">{manager ?? (b.manager_user_id && canViewUsers ? "" : b.manager_user_id ? "Assigned" : "")}</Item>
            </Section>
            <Section title="Address" onEdit={edit}>
              <Item label="Address">{[b.address_line, b.address_line2].filter(Boolean).join("\n")}</Item>
              <Item label="City">{b.city}</Item>
              <Item label="State">{b.state}</Item>
              <Item label="Pincode">{b.pincode}</Item>
              <Item label="Coordinates">{b.latitude != null && b.longitude != null ? `${b.latitude}, ${b.longitude}` : ""}</Item>
            </Section>
            {canViewGst && (
              <Section title="Tax" onEdit={edit}>
                <Item label="GST registration">{registration ? `${registration.gstin} — ${registration.state_name ?? registration.state_code}` : b.gst_registration_id ? "Linked" : ""}</Item>
              </Section>)}
            <Section title="Channels & fulfilment" onEdit={edit}>
              <Item label="Online orders">{onOff(b.accepts_online)}</Item>
              <Item label="POS sales">{onOff(b.accepts_pos)}</Item>
              <Item label="WhatsApp orders">{onOff(b.accepts_whatsapp)}</Item>
              <Item label="Fulfils online orders">{b.fulfilment_enabled ? `Yes, priority ${b.fulfilment_priority}` : "No"}</Item>
              <Item label="Pickup">{onOff(b.pickup_enabled)}</Item>
              <Item label="Open or closed">{b.is_open_override === null ? "Follows opening hours" : b.is_open_override ? "Forced open" : "Forced closed"}</Item>
              <Item label="Delivery radius">{b.delivery_radius_km != null ? `${Number(b.delivery_radius_km)} km` : ""}</Item>
              <Item label="Minimum order">{b.min_order_minor ? formatMoney(b.min_order_minor, currency) : ""}</Item>
              <Item label="Delivery fee">{b.delivery_fee_minor ? formatMoney(b.delivery_fee_minor, currency) : ""}</Item>
              <Item label="Shipping origin pincode">{b.shipping_origin_pincode}</Item>
              <Item label="Time zone">{b.timezone ?? "Same as the business"}</Item>
            </Section>
            <Section title="Receipt" onEdit={edit}>
              <Item label="Header">{b.receipt_header}</Item>
              <Item label="Footer">{b.receipt_footer}</Item>
            </Section>

            <BranchPanels branch={b} canWrite={canWrite} currency={currency} />
          </div>

          {editing && <BranchEditModal branch={b} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); branch.reload(); }} />}
        </>
      )}
    </PortalShell>
  );
}
