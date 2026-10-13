"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { SkeletonLines } from "@/components/ui/Skeleton";
import {
  useDecideHandoverBill,
  useHandoverBills,
  type HandoverBill,
} from "@/hooks/useBranches";
import { formatDateTime, formatMoney } from "@/lib/erp";
import { toast } from "@/lib/toast";

const TABS: { id: HandoverBill["status"]; label: string }[] = [
  { id: "held", label: "Waiting for you" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "refused", label: "Could not be booked" },
];

const TONE = {
  held: "warning",
  approved: "success",
  rejected: "neutral",
  refused: "error",
} as const;

/**
 * Bills a revoked till handed over (it had not uploaded them when it was revoked). They are NOT in the books: a manager looks at each one and
 * approves it (it is then booked like any till sale, flagged as coming from a revoked terminal) or rejects it. `canDecide` is the right to
 * manage this branch's terminals.
 */
export function HandoverBillsModal({
  terminal,
  canDecide,
  onClose,
}: {
  terminal: { id: string; name: string; code: string };
  canDecide: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<HandoverBill["status"]>("held");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const q = useHandoverBills(tab, terminal.id);
  const decide = useDecideHandoverBill();
  const bills = q.data?.bills ?? [];

  function approve(b: HandoverBill) {
    decide.mutate(
      { id: b.id, decision: "approve" },
      {
        onSuccess: (r) =>
          r.status === "approved"
            ? toast.success(
                `Bill ${b.invoice_number ?? ""} booked${r.order_number ? ` as order ${r.order_number}` : ""}`,
              )
            : toast.error("The bill could not be booked", r.error),
        onError: (e) => toast.error("Couldn't approve the bill", e.message),
      },
    );
  }
  function reject(b: HandoverBill) {
    decide.mutate(
      { id: b.id, decision: "reject", note: note.trim() },
      {
        onSuccess: () => {
          toast.success("Bill rejected");
          setRejecting(null);
          setNote("");
        },
        onError: (e) => toast.error("Couldn't reject the bill", e.message),
      },
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="lg"
      title={`Handed-over bills: ${terminal.name}`}
      description="This terminal was revoked before it uploaded these bills. Nothing here is in your books yet. Check each one, then approve it (it is booked like any till sale) or reject it."
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="mb-space-3 flex flex-wrap gap-space-1">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "secondary" : "ghost"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {q.error && <p className="text-[13px] text-error">{q.error.message}</p>}
      {q.isFetching && !q.data && <SkeletonLines rows={3} />}
      {q.data && bills.length === 0 && (
        <p className="text-[13.5px] text-ink-400">
          {tab === "held" ? "No bills are waiting." : "Nothing here yet."}
        </p>
      )}
      <ul className="divide-y divide-line">
        {bills.map((b) => (
          <li key={b.id} className="py-space-3 text-[13.5px]">
            <div className="flex flex-wrap items-center justify-between gap-space-2">
              <span className="font-semibold text-ink-900">
                {b.invoice_number ?? "(no bill number)"}{" "}
                <Badge tone={TONE[b.status]}>{b.status}</Badge>
              </span>
              <span className="font-semibold text-ink-900">
                {b.total_minor !== null ? formatMoney(b.total_minor) : ""}
              </span>
            </div>
            <p className="text-[12.5px] text-ink-400">
              Sold{" "}
              {b.occurred_at ? formatDateTime(b.occurred_at) : "(time unknown)"}
              {b.cashier_name ? ` by ${b.cashier_name}` : ""} · handed over{" "}
              {formatDateTime(b.received_at)}
              {b.customer?.name || b.customer?.phone
                ? ` · customer ${[b.customer?.name, b.customer?.phone].filter(Boolean).join(" ")}`
                : ""}
            </p>
            <ul className="mt-space-1 text-[13px] text-ink-600">
              {b.items.map((i, n) => (
                <li key={`${i.variant_id}-${n}`}>
                  {i.quantity} × {i.name ?? i.sku ?? "unknown product"}
                  {i.line_total_minor !== null
                    ? ` · ${formatMoney(i.line_total_minor)}`
                    : ""}
                </li>
              ))}
            </ul>
            <p className="mt-space-1 text-[12.5px] text-ink-400">
              Paid:{" "}
              {b.payments
                .map(
                  (p) =>
                    `${p.method ?? "?"} ${p.amount_minor !== null ? formatMoney(p.amount_minor) : ""}${p.reference ? ` (ref ${p.reference})` : ""}`,
                )
                .join(", ") || "—"}
            </p>
            {b.status !== "held" && (
              <p className="mt-space-1 text-[12.5px] text-ink-600">
                {b.decided_by_name ? `Decided by ${b.decided_by_name}` : ""}
                {b.decided_at ? ` on ${formatDateTime(b.decided_at)}` : ""}
                {b.order_number ? ` · order ${b.order_number}` : ""}
                {b.decision_note ? ` · “${b.decision_note}”` : ""}
              </p>
            )}
            {b.status === "refused" && b.error_message && (
              <p className="mt-space-1 text-[13px] text-error">
                {b.error_message}
              </p>
            )}
            {b.status === "held" && canDecide && (
              <div className="mt-space-2 flex flex-wrap items-center gap-space-2">
                {rejecting === b.id ? (
                  <>
                    <Input
                      aria-label="Why reject this bill"
                      className="min-w-48 flex-1"
                      placeholder="Why? (optional)"
                      maxLength={300}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <Button
                      disabled={decide.isPending}
                      onClick={() => reject(b)}
                    >
                      Confirm reject
                    </Button>
                    <Button variant="ghost" onClick={() => setRejecting(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      disabled={decide.isPending}
                      onClick={() => approve(b)}
                    >
                      Approve and book
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-error"
                      onClick={() => {
                        setRejecting(b.id);
                        setNote("");
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
