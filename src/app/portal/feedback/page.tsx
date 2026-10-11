"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MessageSquareText, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
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
import { usePagedQuery } from "@/hooks/usePagedQuery";
import { useActiveBranch } from "@/lib/branch";
import { formatDateTime, humanize } from "@/lib/erp";
import { useDebounced } from "@/lib/useDebounced";

import type { Feedback } from "@/lib/feedback";
const feedbackKey = (params: Record<string, unknown>) =>
  ["feedback", params] as const;

export default function FeedbackPage() {
  const { tenant, ready } = usePortalGuard();
  const { branchId, branches, setBranch } = useActiveBranch();
  const [rating, setRating] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const feedback = usePagedQuery<Feedback>(
    feedbackKey,
    "/api/v1/feedback",
    { branch_id: branchId, rating, q },
    ready,
  );
  const columns = useMemo<ColumnDef<Feedback, unknown>[]>(
    () => [
      {
        header: "Product",
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.product_name ?? "Order feedback"}
          </span>
        ),
      },
      {
        header: "Rating",
        cell: ({ row }) =>
          row.original.rating ? (
            <Badge tone={row.original.rating <= 2 ? "warning" : "success"}>
              <span aria-label={`${row.original.rating} out of 5 stars`}>
                {"★".repeat(row.original.rating)}
                {"☆".repeat(5 - row.original.rating)} · {row.original.rating}/5
              </span>
            </Badge>
          ) : (
            "—"
          ),
      },
      {
        header: "Review",
        cell: ({ row }) => (
          <Link
            href={`/portal/feedback/${row.original.id}`}
            className="block w-56 truncate text-brand-600 hover:underline focus-visible:underline"
            aria-label={`Read full review for ${row.original.product_name ?? "order"} by ${row.original.customer_name ?? "customer"}`}
          >
            {row.original.comment || "View review"}
          </Link>
        ),
      },
      {
        header: "Customer",
        cell: ({ row }) => row.original.customer_name ?? "—",
      },
      {
        header: "Order",
        cell: ({ row }) =>
          row.original.order_id ? (
            <Link
              className="font-medium text-brand-600 underline"
              href={`/portal/orders/${row.original.order_id}`}
            >
              {row.original.order_number}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        header: "Branch",
        cell: ({ row }) =>
          row.original.branch_name ?? row.original.branch_code ?? "—",
      },
      {
        header: "Channel",
        cell: ({ row }) =>
          row.original.channel ? humanize(row.original.channel) : "—",
      },
      {
        header: "Received",
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
    ],
    [],
  );
  if (!ready) return null;
  return (
    <PortalShell tenant={tenant} active="feedback">
      <PageHeader
        scopedToBranch
        icon={<MessageSquareText size={20} />}
        title="Feedback"
        description="Product ratings and reviews from customers who have placed orders. Ratings of 1 or 2 stars are highlighted."
        actions={
          <Button
            variant="secondary"
            disabled={feedback.isFetching}
            onClick={() => void feedback.refetch()}
          >
            <RefreshCw size={16} /> Refresh
          </Button>
        }
      />
      <Card className="mb-space-4 flex flex-wrap items-center gap-space-3 p-space-3">
        <Input
          aria-label="Search feedback"
          placeholder="Search product, customer or order…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          aria-label="Filter feedback by branch"
          value={branchId ?? ""}
          onChange={(e) => setBranch(e.target.value || null)}
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.branch_name} ({b.branch_code})
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter feedback by rating"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} star{r === 1 ? "" : "s"}
            </option>
          ))}
        </Select>
      </Card>
      {feedback.error && (
        <p role="alert" className="mb-space-3 text-[13px] text-error">
          {feedback.error.message}
        </p>
      )}
      <Card className="p-space-2">
        <DataTable
          columns={columns}
          data={feedback.rows}
          getRowId={(r) => r.id}
          paginate={false}
          loading={feedback.isFetching}
          emptyMessage={
            q || rating || branchId
              ? "No feedback matches these filters."
              : "No reviews yet. Customers can review products on the storefront after placing an order."
          }
        />
        <CursorPager {...feedback.pager} />
      </Card>
    </PortalShell>
  );
}
