"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ChangeList } from "@/components/portal/ChangeList";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  auditCsv,
  formatTimestamp,
  shortRef,
  type AuditEntry,
} from "@/lib/audit";
import { useActiveBranch } from "@/lib/branch";
import { erp, humanize, qs, useErpQuery } from "@/lib/erp";
import { useCursorPager } from "@/lib/useCursorPager";

const filterClass = "h-10 text-[13px]";

const columns: ColumnDef<AuditEntry, unknown>[] = [
  {
    header: "Date",
    cell: ({ row }) => (
      <span className="text-[12.5px] whitespace-nowrap text-ink-400">
        {formatTimestamp(row.original.created_at)}
      </span>
    ),
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <span className="font-semibold whitespace-nowrap text-ink-900">
        {row.original.action}
      </span>
    ),
  },
  {
    header: "Level",
    cell: ({ row }) => (
      <Badge
        tone={row.original.level === "platform" ? "brand" : "neutral"}
        className="normal-case"
      >
        {row.original.level === "platform" ? "Platform" : "Portal"}
      </Badge>
    ),
  },
  {
    header: "Actor",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-ink-900">
        {row.original.actor_label ?? humanize(row.original.actor_type)}
      </span>
    ),
  },
  {
    header: "Entity",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.entity_type}
        {row.original.entity_id && (
          <span className="text-ink-600">
            {" "}
            #{shortRef(row.original.entity_id)}
          </span>
        )}
        {row.original.branch_name && (
          <span className="block text-[11.5px] text-ink-400">
            {row.original.branch_name}
          </span>
        )}
      </span>
    ),
  },
  {
    header: "Changes",
    cell: ({ row }) => (
      <ChangeList before={row.original.before} after={row.original.after} />
    ),
  },
  {
    header: "IP",
    cell: ({ row }) => (
      <span className="text-[12.5px] whitespace-nowrap text-ink-600">
        {row.original.ip ?? "—"}
      </span>
    ),
  },
];

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function ActivityPage() {
  const { tenant, ready } = usePortalGuard();
  const { branchId: activeBranch } = useActiveBranch();
  const [f, setF] = useState({
    q: "",
    action: "",
    entity_type: "",
    date_from: "",
    date_to: "",
    level: "",
  });
  const d = useDebounced(f);
  const filters = { ...d, branch_id: activeBranch };
  const pager = useCursorPager(JSON.stringify(filters));
  // One row more than a page tells us whether a next page exists. The cursor is the id of the last entry already seen.
  const log = useErpQuery<AuditEntry[]>(
    `/api/v1/audit-logs${qs({ ...filters, cursor: pager.cursor, limit: pager.size + 1 })}`,
  );
  const rows = (log.data ?? []).slice(0, pager.size);
  const hasNext = (log.data?.length ?? 0) > pager.size;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  if (!ready) return null;

  async function exportCsv() {
    const all = await erp<AuditEntry[]>(
      `/api/v1/audit-logs${qs({ ...filters, limit: 500 })}`,
    ); // up to 500 entries matching the filters, not just this page
    if (!all.data) return;
    const url = URL.createObjectURL(
      new Blob([auditCsv(all.data)], { type: "text/csv" }),
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `activity-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PortalShell tenant={tenant} active="activity">
      <PageHeader
        scopedToBranch
        icon={<ClipboardList size={20} />}
        title="Activity log"
        description="A permanent record of important actions: who did what, on which record, where, and what changed. It can't be edited."
        actions={
          <Button
            variant="secondary"
            onClick={exportCsv}
            disabled={!rows.length}
          >
            <Download size={15} /> Export
          </Button>
        }
      />
      <Card className="mb-space-4 flex flex-wrap gap-space-2 p-space-3">
        <div className="relative min-w-60 flex-1">
          <Search
            size={15}
            className="absolute top-1/2 left-space-3 -translate-y-1/2 text-ink-400"
          />
          <Input
            className={`${filterClass} pl-9`}
            placeholder="Search actor, action, or entity id…"
            value={f.q}
            onChange={set("q")}
            aria-label="Search activity"
          />
        </div>
        <Input
          className={`${filterClass} w-44`}
          placeholder="Action (e.g. order.cancelled)"
          value={f.action}
          onChange={set("action")}
          aria-label="Filter by action"
        />
        <Input
          className={`${filterClass} w-36`}
          placeholder="Entity type"
          value={f.entity_type}
          onChange={set("entity_type")}
          aria-label="Filter by entity type"
        />
        <Input
          type="date"
          className={`${filterClass} w-38`}
          value={f.date_from}
          onChange={set("date_from")}
          aria-label="From date"
        />
        <Input
          type="date"
          className={`${filterClass} w-38`}
          value={f.date_to}
          onChange={set("date_to")}
          aria-label="To date"
        />
        <Select
          className={`${filterClass} w-32`}
          value={f.level}
          onChange={set("level")}
          aria-label="Level"
        >
          <option value="">All levels</option>
          <option value="platform">Platform</option>
          <option value="portal">Portal</option>
        </Select>
      </Card>
      {log.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {log.error}
        </p>
      )}
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(e) => String(e.id)}
        pageSize={100}
        emptyMessage={log.data ? "Nothing recorded yet." : "Loading…"}
      />
      <CursorPager
        page={pager.page}
        shown={rows.length}
        size={pager.size}
        onSize={pager.setSize}
        hasNext={hasNext}
        onPrev={pager.prev}
        onNext={() =>
          rows.length && pager.next(String(rows[rows.length - 1]!.id))
        }
      />
    </PortalShell>
  );
}
