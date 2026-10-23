"use client";

import { Modal } from "@/components/ui/Modal";
import { formatDateTime, formatMoney } from "@/lib/erp";
import { useSupplierStatement } from "@/hooks/useProcurement";
import { SkeletonLines } from "@/components/ui/Skeleton";

/** One supplier's account: what we bought, returned and paid, and the balance. Payments are made bill by bill from the purchase order
 * or the Bills tab, not here. */
export function SupplierPanel({
  supplierId,
  currency,
  onClose,
}: {
  supplierId: string | null;
  currency: string;
  onClose: () => void;
}) {
  const statement = useSupplierStatement(supplierId ?? "");
  const d = statement.data;

  return (
    <Modal
      open={supplierId !== null}
      onClose={onClose}
      width="lg"
      title={d?.supplier.name ?? "Supplier"}
      description={
        d
          ? `${d.supplier.supplier_code}${d.supplier.gstin ? ` · GSTIN ${d.supplier.gstin}` : ""} · ${d.supplier.payment_terms_days}-day terms`
          : undefined
      }
    >
      {statement.error && (
        <p className="text-[13px] font-medium text-error">
          {statement.error.message}
        </p>
      )}
      {!d && !statement.error && <SkeletonLines rows={5} />}
      {d && (
        <>
          <div className="mb-space-4 grid grid-cols-1 gap-space-3 @min-[420px]:grid-cols-3">
            {[
              ["Billed", d.balance.billed],
              ["Returned + paid", d.balance.returned + d.balance.paid],
              ["We owe", d.balance.outstanding_minor],
            ].map(([label, v]) => (
              <div
                key={label as string}
                className="flex min-w-0 items-center justify-between gap-space-2 rounded-md border border-line p-space-3 @min-[420px]:flex-col @min-[420px]:justify-center"
              >
                <p className="min-w-0 text-[12px] text-ink-600 @min-[420px]:text-center">
                  {label}
                </p>
                <p className="min-w-0 text-right text-[18px] font-bold text-ink-900 [overflow-wrap:anywhere] @min-[420px]:text-center">
                  {formatMoney(v as number, currency)}
                </p>
              </div>
            ))}
          </div>
          <ul className="min-w-0 divide-y divide-line text-[13.5px]">
            {d.entries.length === 0 && (
              <li className="py-2 text-ink-400">No activity yet.</li>
            )}
            {d.entries.map((e) => (
              <li
                key={`${e.kind}-${e.number}`}
                className="flex min-w-0 flex-col items-start justify-between gap-1 py-space-2 @min-[420px]:flex-row @min-[420px]:items-center @min-[420px]:gap-space-3"
              >
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  <strong>{e.number}</strong>{" "}
                  <span className="text-ink-400">
                    {e.kind === "GRN"
                      ? "goods received"
                      : e.kind === "RETURN"
                        ? "returned"
                        : "payment"}{" "}
                    · {formatDateTime(e.at)}
                  </span>
                </span>
                <span
                  className={`min-w-0 max-w-full self-end text-right font-medium [overflow-wrap:anywhere] ${e.amount_minor < 0 ? "text-success" : "text-ink-900"}`}
                >
                  {formatMoney(Math.abs(e.amount_minor), currency)}
                  {e.amount_minor < 0 ? " cr" : ""}
                </span>
              </li>
            ))}
          </ul>
          {d.balance.outstanding_minor > 0 && (
            <p className="mt-space-4 border-t border-line pt-space-3 text-[13px] text-ink-600">
              To pay, open the purchase order (or Procurement &gt; Bills) and
              use Pay: each payment is recorded against the bills it settles.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
