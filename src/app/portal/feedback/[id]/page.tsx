"use client";

import { ArrowLeft, MessageSquareText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { hasGrantAt, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { erpSend, formatDateTime, humanize, useErpQuery } from "@/lib/erp";
import type { Feedback } from "@/lib/feedback";

export default function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const {
    data: review,
    error,
    loading,
  } = useErpQuery<Feedback>(ready ? `/api/v1/feedback/${id}` : null);
  const router = useRouter();
  const session = useStaffSession();
  const cache = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canDelete =
    !!review && hasGrantAt(session, "customers:update", review.branch_id ?? "");

  async function remove() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await erpSend(`/api/v1/feedback/${id}`, "DELETE");
      await cache.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Feedback deleted");
      router.push("/portal/feedback");
    } catch (e) {
      setDeleteError((e as Error).message);
      setDeleting(false);
    }
  }
  if (!ready) return null;

  return (
    <PortalShell tenant={tenant} active="feedback">
      <Link
        href="/portal/feedback"
        className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft size={14} /> All feedback
      </Link>
      <PageHeader
        icon={<MessageSquareText size={20} />}
        title="Review details"
        actions={
          canDelete && !error ? (
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteError(null);
                setConfirm(true);
              }}
            >
              <Trash2 size={16} /> Delete feedback
            </Button>
          ) : undefined
        }
      />
      {error ? (
        <p role="alert" className="text-error">
          {error}
        </p>
      ) : loading || !review ? (
        <p role="status">Loading review…</p>
      ) : (
        <Card className="max-w-4xl p-space-4">
          <h2 className="text-lg font-semibold">
            {review.product_name ?? "Order feedback"}
          </h2>
          {review.rating !== null && (
            <div className="mt-space-3">
              <Badge tone={review.rating <= 2 ? "warning" : "success"}>
                <span aria-label={`${review.rating} out of 5 stars`}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)} · {review.rating}/5
                </span>
              </Badge>
            </div>
          )}
          <dl className="my-space-4 grid gap-space-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-400">Customer</dt>
              <dd>{review.customer_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Order</dt>
              <dd>
                {review.order_id ? (
                  <Link
                    className="text-brand-600 underline"
                    href={`/portal/orders/${review.order_id}`}
                  >
                    {review.order_number ?? "View order"}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-ink-400">Branch</dt>
              <dd>{review.branch_name ?? review.branch_code ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Channel</dt>
              <dd>{review.channel ? humanize(review.channel) : "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Received</dt>
              <dd>{formatDateTime(review.created_at)}</dd>
            </div>
          </dl>
          <h3 className="border-t border-line pt-space-4 font-semibold">
            Full review
          </h3>
          <p className="mt-space-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {review.comment ?? "No written review."}
          </p>
        </Card>
      )}
      <Modal
        open={confirm}
        onClose={() => {
          if (!deleting) setConfirm(false);
        }}
        dismissible={!deleting}
        width="sm"
        title="Delete feedback?"
        description="This permanently removes the review from ERP Feedback and the storefront, including its rating."
        footer={
          <>
            <Button
              variant="ghost"
              disabled={deleting}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void remove()}
            >
              {deleting ? "Deleting…" : "Delete feedback"}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {review?.product_name ?? "Order feedback"} ·{" "}
          {review?.customer_name ?? "Customer"}
        </p>
        {deleteError && (
          <p role="alert" className="mt-space-3 text-error">
            {deleteError}
          </p>
        )}
      </Modal>
    </PortalShell>
  );
}
