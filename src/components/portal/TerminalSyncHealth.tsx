"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { formatDateTime, formatMoney, useErpQuery } from "@/lib/erp";

type Flag = { code: string; message: string };
type Upload = {
  id: string;
  event_id: string;
  status: "accepted" | "rejected";
  occurred_at: string;
  received_at: string;
  invoice_number: string | null;
  total_minor: number | null;
  cashier_name: string | null;
  order_number: string | null;
  flags: Flag[];
  error_code: string | null;
  error_message: string | null;
};
type Health = {
  summary: {
    accepted: number;
    rejected: number;
    flagged: number;
    last_received_at: string | null;
  };
  missing_invoice_numbers: string[];
  uploads: Upload[];
};

const PAGE = 25;

function ago(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 129600) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "error" | "warning";
}) {
  return (
    <div className="rounded-lg border border-line bg-paper p-space-3">
      <p className="text-label">{label}</p>
      <p
        className={`text-[20px] font-bold ${tone === "error" ? "text-error" : tone === "warning" ? "text-warning" : "text-ink-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

/** One till's sync health: how many bills the server has taken, which it refused and why, which it took but a person should look at
 * (stock that was not there, a changed price ...), and bill numbers missing from the till's series. */
export function SyncHealthModal({
  terminal,
  onClose,
}: {
  terminal: {
    id: string;
    name: string;
    code: string;
    last_sync_at: string | null;
  };
  onClose: () => void;
}) {
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const q = useErpQuery<Health>(
    `/api/v1/terminals/${terminal.id}/uploads?problems_only=${onlyProblems}&limit=${limit}`,
  );
  const h = q.data;
  const rows = h?.uploads ?? [];
  return (
    <Modal
      open
      onClose={onClose}
      width="lg"
      title={`Sync health: ${terminal.name}`}
      description="What this till has sent to the server. A bill is kept here even when the server could not accept it."
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      {q.error && <p className="text-[13px] text-error">{q.error}</p>}
      {!h && q.loading && <SkeletonLines rows={4} />}
      {h && (
        <>
          <div className="grid grid-cols-2 gap-space-2 sm:grid-cols-4">
            <Tile label="Bills received" value={String(h.summary.accepted)} />
            <Tile
              label="Not accepted"
              value={String(h.summary.rejected)}
              tone={h.summary.rejected > 0 ? "error" : undefined}
            />
            <Tile
              label="To review"
              value={String(h.summary.flagged)}
              tone={h.summary.flagged > 0 ? "warning" : undefined}
            />
            <Tile
              label="Last bill received"
              value={ago(h.summary.last_received_at)}
            />
          </div>
          <p className="mt-space-2 text-[12.5px] text-ink-400">
            Last synced {ago(terminal.last_sync_at)}.
          </p>

          {h.missing_invoice_numbers.length > 0 && (
            <div className="mt-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-ink-900">
              <p className="font-semibold">Bill numbers that never arrived</p>
              <p className="mt-space-1 break-words">
                {h.missing_invoice_numbers.join(", ")}. They may still be
                waiting on the till, or the bill was lost or cancelled. Ask the
                cashier, and keep a note of what happened to each number.
              </p>
            </div>
          )}

          <div className="mt-space-4 flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-ink-900">Bills</h4>
            <label className="flex items-center gap-space-2 text-[13px] text-ink-600">
              <input
                type="checkbox"
                checked={onlyProblems}
                onChange={(e) => {
                  setOnlyProblems(e.target.checked);
                  setLimit(PAGE);
                }}
              />
              Only bills that need attention
            </label>
          </div>
          {rows.length === 0 && !q.loading && (
            <p className="mt-space-2 text-[13.5px] text-ink-400">
              {onlyProblems
                ? "Nothing needs attention."
                : "This till has not sent any bills yet."}
            </p>
          )}
          <ul className="mt-space-2 divide-y divide-line">
            {rows.map((u) => (
              <li key={u.id} className="py-space-2 text-[13.5px]">
                <div className="flex flex-wrap items-center justify-between gap-space-2">
                  <span className="font-semibold text-ink-900">
                    {u.invoice_number ?? "(no bill number)"}{" "}
                    {u.status === "rejected" ? (
                      <Badge tone="error">Not accepted</Badge>
                    ) : u.flags.length > 0 ? (
                      <Badge tone="warning">To review</Badge>
                    ) : (
                      <Badge tone="success">Received</Badge>
                    )}
                  </span>
                  <span className="text-ink-600">
                    {u.total_minor !== null ? formatMoney(u.total_minor) : ""}
                  </span>
                </div>
                <p className="text-[12.5px] text-ink-400">
                  Sold {formatDateTime(u.occurred_at)}
                  {u.cashier_name ? ` by ${u.cashier_name}` : ""} · received{" "}
                  {formatDateTime(u.received_at)}
                  {u.order_number ? ` · order ${u.order_number}` : ""}
                </p>
                {u.status === "rejected" && (
                  <p className="mt-space-1 text-[13px] text-error">
                    {u.error_message}
                  </p>
                )}
                {u.flags.map((f) => (
                  <p
                    key={f.code + f.message}
                    className="mt-space-1 text-[13px] text-warning"
                  >
                    {f.message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          {rows.length >= limit && (
            <div className="mt-space-2 text-center">
              <Button variant="ghost" onClick={() => setLimit(limit + PAGE)}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
