"use client";

import { History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ChangeList } from "@/components/portal/ChangeList";
import { actionLabel } from "@/lib/audit";
import { formatDateTime, humanize, qs, useErpQuery } from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";

type Entry = {
  id: string;
  action: string;
  entity_type: string;
  actor_type: string;
  actor_label: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

/** The audit trail of one record (entity_type + entity_id) or of one branch (branch_id), newest first. Hidden without the audit permission. */
export function RecordActivity({
  entityType,
  entityId,
  branchId,
  title = "Activity",
}: {
  entityType?: string;
  entityId?: string;
  branchId?: string;
  title?: string;
}) {
  const session = useStaffSession();
  const allowed = hasPermission(session, "audit", "view");
  const log = useErpQuery<Entry[]>(
    allowed
      ? `/api/v1/audit-logs${qs({ entity_type: entityType, entity_id: entityId, branch_id: branchId, limit: 50 })}`
      : null,
  );
  if (!allowed || log.error) return null;
  const rows = log.data ?? [];

  return (
    <Card className="mt-space-4 p-space-4">
      <h2 className="mb-space-3 flex items-center gap-space-2 text-[15px] font-bold text-ink-900">
        <History size={16} /> {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-[13.5px] text-ink-400">
          {log.loading ? "Loading…" : "Nothing recorded yet."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((e) => (
            <li key={e.id} className="py-space-2 text-[13.5px]">
              <p className="flex flex-wrap items-baseline justify-between gap-space-2">
                <span className="font-medium text-ink-900">
                  {actionLabel(e.action)}
                </span>
                <span className="text-[12.5px] text-ink-600">
                  {e.actor_label ?? humanize(e.actor_type)} ·{" "}
                  {formatDateTime(e.created_at)}
                </span>
              </p>
              <ChangeList before={e.before} after={e.after} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
