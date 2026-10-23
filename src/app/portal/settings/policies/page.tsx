"use client";

import {
  ChevronRight,
  Contact,
  ExternalLink,
  FileText,
  Landmark,
  Lock,
  ReceiptText,
  ScrollText,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { useReturnPolicy } from "@/hooks/useReturns";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { SkeletonLines } from "@/components/ui/Skeleton";
import {
  usePolicies,
  useSavePolicy,
  type PolicyKind,
  type StorePolicy,
} from "@/hooks/usePolicies";
import { getPortalTenant } from "@/lib/portalAuth";
import { hasTenantWide, useStaffSession } from "@/lib/staffAuth";
import { useDomains } from "@/hooks/useDomains";
import { primaryStoreUrl } from "@/lib/themes";
import { toast } from "@/lib/toast";

/** Where each policy appears on the shop's website (the footer links there by default; checkout links Terms and Privacy). */
const PAGES: Record<PolicyKind, { path: string; icon: LucideIcon }> = {
  returns: { path: "/help/returns", icon: ReceiptText },
  privacy: { path: "/privacy", icon: Lock },
  terms: { path: "/terms", icon: ScrollText },
  shipping: { path: "/help/shipping", icon: Truck },
  contact: { path: "/contact", icon: Contact },
  legal: { path: "/legal", icon: Landmark },
};

/** Settings > Policies: the shop's written policies, edited with formatting and shown on its website. */
export default function PoliciesSettingsPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const policies = usePolicies();
  const rules = useReturnPolicy();
  const domains = useDomains({ enabled: ready });
  const [open, setOpen] = useState<StorePolicy | null>(null);
  if (!ready) return null;
  const canEdit = hasTenantWide(session, "tenant:update");
  const site = primaryStoreUrl(
    domains.data?.primary_host,
    getPortalTenant()?.code,
  );

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<FileText size={20} />}
        title="Policies"
        description="Written policies appear on your website, linked from the footer, and Terms and Privacy from checkout."
      />
      <div className="max-w-2xl space-y-space-3">
        {rules.data && <ReturnRules {...rules.data} />}
        <h2 className="pt-space-2 text-[15px] font-bold text-ink-900">
          Written policies
        </h2>
        <Card className="divide-y divide-line p-0">
          {policies.isPending ? (
            <div className="p-space-5">
              <SkeletonLines rows={4} />
            </div>
          ) : policies.error ? (
            <p className="p-space-5 text-[14px] text-error">
              Couldn&apos;t load your policies: {policies.error.message}
            </p>
          ) : (
            policies.data.map((p) => {
              const Icon = PAGES[p.kind].icon;
              return (
                <button
                  key={p.kind}
                  type="button"
                  onClick={() => setOpen(p)}
                  className="flex w-full items-center gap-space-3 px-space-4 py-space-3 text-left hover:bg-black/[0.03]"
                >
                  <Icon size={17} className="shrink-0 text-ink-600" />
                  <span className="min-w-0 flex-1 text-[14px] text-ink-900">
                    {p.title}
                  </span>
                  {p.published ? (
                    <Badge tone="success">Published</Badge>
                  ) : (
                    <Badge tone="neutral">No policy set</Badge>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-ink-600" />
                </button>
              );
            })
          )}
        </Card>
        <p className="text-[12.5px] text-ink-600">
          These policies are not legal advice. You are responsible for making
          sure they are accurate and comply with the law.
        </p>
      </div>
      {open && (
        <PolicyEditor
          key={open.kind}
          policy={open}
          canEdit={canEdit}
          liveUrl={`${site}${PAGES[open.kind].path}`}
          onClose={() => setOpen(null)}
        />
      )}
    </PortalShell>
  );
}

const days = (n: number) =>
  n <= 0 ? "no returns" : `${n} ${n === 1 ? "day" : "days"}`;

/** The return rules the till, website and portal enforce (set in Shipping and delivery), next to the written return policy. */
function ReturnRules({
  online_window_days,
  pos_window_days,
  exchanges_enabled,
  store_credit_enabled,
}: {
  online_window_days: number;
  pos_window_days: number;
  exchanges_enabled: boolean;
  store_credit_enabled: boolean;
}) {
  const rows = [
    [
      "Website and WhatsApp orders",
      `${days(online_window_days)} from delivery`,
    ],
    ["Counter (POS) bills", `${days(pos_window_days)} from the bill`],
    ["Exchanges", exchanges_enabled ? "On" : "Off"],
    ["Refund as store credit", store_credit_enabled ? "On" : "Off"],
  ];
  return (
    <>
      <div className="flex items-end justify-between gap-space-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">Return rules</h2>
          <p className="text-[13px] text-ink-600">
            Applied on the till, the website and in the portal. Keep your
            written return policy in line with them.
          </p>
        </div>
        <Link
          href="/portal/settings/shipping"
          className="shrink-0 text-[13px] font-medium text-ink-900 underline"
        >
          Edit
        </Link>
      </div>
      <Card className="divide-y divide-line p-0">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-space-3 px-space-4 py-space-3 text-[14px]"
          >
            <span className="text-ink-900">{label}</span>
            <span className="text-ink-600">{value}</span>
          </div>
        ))}
      </Card>
    </>
  );
}

function PolicyEditor({
  policy,
  canEdit,
  liveUrl,
  onClose,
}: {
  policy: StorePolicy;
  canEdit: boolean;
  liveUrl: string;
  onClose: () => void;
}) {
  const save = useSavePolicy();
  const [html, setHtml] = useState(policy.body_html);
  const changed = html !== policy.body_html;
  return (
    <Modal
      open
      title={policy.title}
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {canEdit && (
            <Button
              disabled={!changed || save.isPending}
              onClick={() =>
                save.mutate(
                  { kind: policy.kind, body_html: html },
                  {
                    onSuccess: (saved) => {
                      toast.success(
                        saved.published
                          ? `${saved.title} saved`
                          : `${saved.title} removed from your website`,
                      );
                      onClose();
                    },
                    onError: (error) =>
                      toast.error("Couldn't save the policy", error.message),
                  },
                )
              }
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-space-3">
        <RichTextEditor value={html} onChange={setHtml} disabled={!canEdit} />
        <p className="flex flex-wrap items-center gap-1 text-[12.5px] text-ink-600">
          Shown on your website at
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            {liveUrl.replace(/^https?:\/\//, "")} <ExternalLink size={12} />
          </a>
          {policy.published ? "" : " once you save some text."}
        </p>
      </div>
    </Modal>
  );
}
