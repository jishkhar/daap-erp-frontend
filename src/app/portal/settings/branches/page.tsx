"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Building03Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BranchEditModal } from "@/components/portal/BranchEditModal";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { displayPhone, type BranchRow } from "@/lib/branchSchema";
import { useErpQuery } from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";

export default function BranchesPage() {
  const { tenant, ready } = usePortalGuard();
  const router = useRouter();
  const session = useStaffSession();
  const branches = useErpQuery<BranchRow[]>("/api/v1/branches");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<BranchRow | null>(null);
  const canWrite = hasPermission(session, "branches", "write");

  // Cells don't wrap (whitespace-nowrap), so a narrow window scrolls the table sideways instead of squeezing the columns.
  const columns = useMemo<ColumnDef<BranchRow, unknown>[]>(
    () => [
      {
        header: "Branch",
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <p className="font-semibold text-ink-900">
              {row.original.branch_name}
              {row.original.is_default && (
                <Badge tone="brand" className="ml-1.5">
                  Default
                </Badge>
              )}
            </p>
            <p className="text-[12px] text-ink-400">
              {row.original.branch_code}
              {row.original.phone
                ? ` · ${displayPhone(row.original.phone)}`
                : ""}
            </p>
          </div>
        ),
      },
      {
        header: "Location",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {[row.original.city, row.original.state]
              .filter(Boolean)
              .join(", ") || <span className="text-ink-400">—</span>}
          </span>
        ),
      },
      {
        header: "POS",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.accepts_pos ? (
              "Takes POS sales"
            ) : (
              <span className="text-ink-400">No counter</span>
            )}
          </span>
        ),
      },
      {
        header: "Online orders",
        cell: ({ row }) => {
          const o = [
            row.original.fulfilment_enabled &&
              `Delivers (priority ${row.original.fulfilment_priority})`,
            row.original.pickup_enabled && "Pickup",
          ].filter(Boolean);
          return (
            <span className="whitespace-nowrap">
              {o.length ? (
                o.join(" · ")
              ) : (
                <span className="text-ink-400">None</span>
              )}
            </span>
          );
        },
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
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/portal/settings/branches/${row.original.id}`}
              aria-label={`View ${row.original.branch_name}`}
            >
              <Button variant="ghost" tabIndex={-1}>
                <HugeiconsIcon icon={ViewIcon} size={15} /> View
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  if (!ready) return null;

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<HugeiconsIcon icon={Building03Icon} size={20} />}
        title="Branches"
        description="Your stores and locations. Use the branch switcher at the top to filter the portal by branch."
        actions={
          canWrite && (
            <Button onClick={() => setAdding(true)}>
              <HugeiconsIcon icon={Add01Icon} size={16} /> Add branch
            </Button>
          )
        }
      />
      {added && (
        <Card className="mb-space-4 border-brand-200 bg-brand-50 p-space-4">
          <p className="text-[14px] font-semibold text-ink-900">
            {added.branch_name} ({added.branch_code}) is ready. Next steps:
          </p>
          <ul className="mt-space-2 list-disc space-y-1 pl-space-5 text-[14px] text-ink-600">
            <li>
              <Link
                className="font-semibold text-brand-700 underline"
                href={`/portal/settings/branches/${added.id}`}
              >
                Set opening hours, delivery pincodes, staff, terminals and
                cashiers
              </Link>{" "}
              on its page.
            </li>
            <li>
              <Link
                className="font-semibold text-brand-700 underline"
                href="/portal/inventory"
              >
                Receive opening stock
              </Link>{" "}
              into it.
            </li>
          </ul>
          <button
            type="button"
            className="mt-space-2 text-[12.5px] text-ink-400 underline"
            onClick={() => setAdded(null)}
          >
            Dismiss
          </button>
        </Card>
      )}
      {branches.error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {branches.error}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={branches.data ?? []}
          getRowId={(b) => b.id}
          onRowClick={(b) => router.push(`/portal/settings/branches/${b.id}`)}
          emptyMessage={
            branches.loading ? "Loading branches…" : "No branches yet."
          }
        />
      </Card>
      <p className="mt-space-3 text-[12.5px] text-ink-400">
        Branches are never deleted, because orders, stock and the books refer to
        them. Deactivate a branch to retire it.
      </p>

      {adding && (
        <BranchEditModal
          branch={null}
          onClose={() => setAdding(false)}
          onSaved={(saved) => {
            setAdding(false);
            if (saved) setAdded(saved);
            branches.reload();
          }}
        />
      )}
    </PortalShell>
  );
}
