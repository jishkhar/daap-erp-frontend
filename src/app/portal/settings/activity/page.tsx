"use client";

import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime, qs, useErpQuery } from "@/lib/erp";

type Entry = { id: string; action: string; entity_type: string; entity_id: string | null; actor_type: string; actor_id: string | null; branch_id: string | null; after: Record<string, unknown> | null; created_at: string };

export default function ActivityPage() {
  const { tenant, ready } = usePortalGuard();
  const [entity, setEntity] = useState("");
  const log = useErpQuery<Entry[]>(`/api/v1/audit-logs${qs({ entity_type: entity, limit: 200 })}`);
  if (!ready) return null;

  return (
    <PortalShell tenant={tenant} active="activity">
      <PageHeader icon={<ClipboardList size={20} />} title="Activity log" description="A permanent record of sensitive actions: approvals, stock adjustments, refunds and permission changes." />
      <Card className="mb-space-4 p-space-3"><Input placeholder="Filter by type, e.g. order, payment, inventory, user…" value={entity} onChange={(e) => setEntity(e.target.value.trim())} className="max-w-md" aria-label="Filter by entity type" /></Card>
      {log.error && <p className="mb-space-3 text-[13px] font-medium text-error">{log.error}</p>}
      <Card className="overflow-x-auto p-space-2">
        <table className="w-full min-w-[640px] text-[13.5px]">
          <thead><tr className="text-left text-[12px] tracking-wide text-ink-400 uppercase"><th className="p-space-3">When</th><th className="p-space-3">Action</th><th className="p-space-3">On</th><th className="p-space-3">By</th><th className="p-space-3">Details</th></tr></thead>
          <tbody>
            {(log.data ?? []).map((e) => (
              <tr key={e.id} className="border-t border-line align-top">
                <td className="p-space-3 whitespace-nowrap text-ink-600">{formatDateTime(e.created_at)}</td>
                <td className="p-space-3 font-medium text-ink-900">{e.action}</td>
                <td className="p-space-3 text-ink-600">{e.entity_type}{e.entity_id ? ` #${e.entity_id}` : ""}</td>
                <td className="p-space-3 text-ink-600">{e.actor_type.replace("_", " ")}{e.actor_id ? ` #${e.actor_id}` : ""}</td>
                <td className="max-w-xs p-space-3 break-words text-[12px] text-ink-400">{e.after ? JSON.stringify(e.after) : ""}</td>
              </tr>
            ))}
            {log.data?.length === 0 && <tr><td colSpan={5} className="p-space-4 text-center text-ink-400">Nothing recorded yet.</td></tr>}
            {!log.data && !log.error && <tr><td colSpan={5} className="p-space-4 text-center text-ink-400">Loading…</td></tr>}
          </tbody>
        </table>
      </Card>
    </PortalShell>
  );
}
