"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductPicker } from "@/components/erp/ProductPicker";
import { AccountSelect } from "@/components/erp/wholesale/AccountSelect";
import { CreditSummary } from "@/components/erp/wholesale/CreditSummary";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  useCreateSalesOrder,
  useQuote,
  type SoLineInput,
} from "@/hooks/useWholesale";
import { formatMoney, fromMinor, toMinor } from "@/lib/erp";
import { activeBranches, hasGrantAt, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";
import type { CustomerAccount, SalesOrder } from "@/lib/wholesale";

type Row = {
  key: string;
  variant_id: string;
  sku: string;
  name: string;
  qty: string;
  /** Typed only to change the price list's price (needs permission); empty = the list's price. */
  price: string;
  discount: string;
};

const SOURCE_LABEL = {
  price_list: "Price list",
  product: "Normal price",
  override: "Changed",
} as const;

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** New quotation or sales order for a business customer: prices come from their price list (quantity breaks applied as you type),
 * GST is worked out by the server's own rule, and their credit position is shown beside it. */
export function NewSalesOrder({
  open,
  kind,
  currency,
  onClose,
  onCreated,
}: {
  open: boolean;
  kind: "quotation" | "order";
  currency: string;
  onClose: () => void;
  onCreated: (so: SalesOrder) => void;
}) {
  const session = useStaffSession();
  const branches = activeBranches(session);
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [validUntil, setValidUntil] = useState(inDays(15));
  const [expected, setExpected] = useState("");
  const [poRef, setPoRef] = useState("");
  const [notes, setNotes] = useState("");
  const create = useCreateSalesOrder();
  const branch = branchId || (branches.length === 1 ? branches[0]!.id : "");
  const canOverride =
    !!branch && hasGrantAt(session, "wholesale:override_price", branch);

  const lines: SoLineInput[] = useMemo(
    () =>
      rows
        .filter((r) => Number.isInteger(Number(r.qty)) && Number(r.qty) > 0)
        .map((r) => ({
          variant_id: r.variant_id,
          quantity: Number(r.qty),
          discount_minor: toMinor(r.discount || "0") ?? 0,
          unit_price_minor: r.price.trim() ? toMinor(r.price) : null,
        })),
    [rows],
  );
  const quoted = useQuote(account?.id ?? "", useDebounced(lines));
  const byVariant = new Map(
    (quoted.data?.lines ?? []).map((l) => [l.variant_id, l]),
  );

  const badRows = rows.some(
    (r) =>
      !Number.isInteger(Number(r.qty)) ||
      Number(r.qty) < 1 ||
      (r.price.trim() !== "" && toMinor(r.price) === null) ||
      (r.discount.trim() !== "" && toMinor(r.discount) === null),
  );
  const invalid = !account || !branch || rows.length === 0 || badRows;

  function reset() {
    setAccount(null);
    setRows([]);
    setPoRef("");
    setNotes("");
    setExpected("");
    setValidUntil(inDays(15));
  }

  function submit() {
    if (!account) return;
    create.mutate(
      {
        kind,
        branch_id: branch,
        customer_account_id: account.id,
        lines: lines.map((l) => {
          const listed = byVariant.get(l.variant_id)?.unit_price_minor;
          // only send a typed price that actually differs from the list's; the server prices everything else
          return l.unit_price_minor != null && l.unit_price_minor !== listed
            ? l
            : { ...l, unit_price_minor: null };
        }),
        valid_until: kind === "quotation" ? validUntil || null : null,
        expected_date: expected || null,
        customer_po_ref: poRef.trim() || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (so) => {
          toast.success(
            kind === "quotation" ? "Quotation created" : "Sales order created",
          );
          reset();
          onCreated(so);
        },
        onError: (e) => toast.error("Couldn't save", e.message),
      },
    );
  }

  const q = quoted.data;
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      title={kind === "quotation" ? "New quotation" : "New sales order"}
      description={
        kind === "quotation"
          ? "Prices you offer a business customer, valid until a date. Confirm it to make it an order."
          : "An order from a business customer. It holds stock once confirmed."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={invalid || create.isPending} onClick={submit}>
            {create.isPending
              ? "Saving…"
              : kind === "quotation"
                ? "Create quotation"
                : "Create sales order"}
          </Button>
        </>
      }
    >
      <div className="grid gap-x-space-4 @min-[400px]:grid-cols-2">
        <Field
          label="Business customer"
          htmlFor="so_account"
          required
          className="@min-[400px]:col-span-2"
        >
          <AccountSelect
            id="so_account"
            value={account}
            onChange={setAccount}
          />
        </Field>
        {account && (
          <div className="mb-space-3 @min-[400px]:col-span-2">
            <CreditSummary accountId={account.id} currency={currency} compact />
          </div>
        )}
        {branches.length > 1 && (
          <Field label="Dispatch from" htmlFor="so_branch" required>
            <Select
              id="so_branch"
              value={branchId}
              onValueChange={(value) => setBranchId(value)}
            >
              <option value="">Choose a branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branch_name} ({b.branch_code})
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field
          label="Their PO number"
          htmlFor="so_po"
          hint="The customer's own order reference, if any."
        >
          <Input
            id="so_po"
            maxLength={60}
            value={poRef}
            onChange={(e) => setPoRef(e.target.value)}
          />
        </Field>
        {kind === "quotation" ? (
          <Field label="Valid until" htmlFor="so_valid">
            <Input
              id="so_valid"
              type="date"
              value={validUntil}
              min={inDays(0)}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </Field>
        ) : (
          <Field label="Expected delivery" htmlFor="so_expected">
            <Input
              id="so_expected"
              type="date"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
            />
          </Field>
        )}
      </div>

      <Field label="Add a product" htmlFor="so_pick">
        <ProductPicker
          id="so_pick"
          serialized={false}
          exclude={rows.map((r) => r.variant_id)}
          onPick={(p) =>
            setRows([
              ...rows,
              {
                key: crypto.randomUUID(),
                variant_id: p.id,
                sku: p.sku,
                name: p.name,
                qty: "1",
                price: "",
                discount: "",
              },
            ])
          }
        />
      </Field>
      {rows.length > 0 && (
        <div className="min-w-0 max-w-full overflow-x-auto">
          <table className="min-w-[640px] w-full text-[13.5px] [&_td]:[overflow-wrap:anywhere]">
            <thead>
              <tr className="text-left text-label">
                <th className="py-space-2 pr-space-2">Product</th>
                <th className="w-20 pr-space-2">Qty</th>
                <th className="w-32 pr-space-2">Price (₹)</th>
                {canOverride && (
                  <th className="w-28 pr-space-2">Discount (₹)</th>
                )}
                <th className="w-28 pr-space-2 text-right">Line total</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ql = byVariant.get(r.variant_id);
                const set = (patch: Partial<Row>) =>
                  setRows(
                    rows.map((x) => (x.key === r.key ? { ...x, ...patch } : x)),
                  );
                return (
                  <tr key={r.key} className="border-t border-line align-top">
                    <td className="py-space-2 pr-space-2">
                      <p className="font-medium text-ink-900">{r.name}</p>
                      <p className="text-[12px] text-ink-400">
                        {r.sku}
                        {ql ? ` · ${SOURCE_LABEL[ql.price_source]}` : ""}
                        {ql && ql.unit_price_minor !== ql.product_price_minor
                          ? ` (normally ${formatMoney(ql.product_price_minor, currency)})`
                          : ""}
                      </p>
                    </td>
                    <td className="py-space-1 pr-space-2">
                      <Input
                        aria-label={`Quantity of ${r.sku}`}
                        inputMode="numeric"
                        value={r.qty}
                        invalid={
                          !Number.isInteger(Number(r.qty)) || Number(r.qty) < 1
                        }
                        onChange={(e) => set({ qty: e.target.value })}
                      />
                    </td>
                    <td className="py-space-1 pr-space-2">
                      {canOverride ? (
                        <Input
                          aria-label={`Price of ${r.sku}`}
                          inputMode="decimal"
                          placeholder={ql ? fromMinor(ql.unit_price_minor) : ""}
                          value={r.price}
                          invalid={
                            r.price.trim() !== "" && toMinor(r.price) === null
                          }
                          onChange={(e) => set({ price: e.target.value })}
                        />
                      ) : (
                        <p className="py-space-2">
                          {ql
                            ? formatMoney(ql.unit_price_minor, currency)
                            : "…"}
                        </p>
                      )}
                    </td>
                    {canOverride && (
                      <td className="py-space-1 pr-space-2">
                        <Input
                          aria-label={`Discount on ${r.sku}`}
                          inputMode="decimal"
                          placeholder="0"
                          value={r.discount}
                          invalid={
                            r.discount.trim() !== "" &&
                            toMinor(r.discount) === null
                          }
                          onChange={(e) => set({ discount: e.target.value })}
                        />
                      </td>
                    )}
                    <td className="py-space-2 pr-space-2 text-right font-medium">
                      {ql && !r.price.trim()
                        ? formatMoney(ql.line_total_minor, currency)
                        : "—"}
                    </td>
                    <td className="py-space-1">
                      <button
                        type="button"
                        aria-label={`Remove ${r.sku}`}
                        className="p-2 text-ink-400 hover:text-error"
                        onClick={() =>
                          setRows(rows.filter((x) => x.key !== r.key))
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {q && (
            <dl className="mt-space-3 ml-auto max-w-xs space-y-1 text-[13.5px] [&>div]:gap-space-2 [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:[overflow-wrap:anywhere]">
              <div className="flex justify-between">
                <dt className="text-ink-600">Before GST</dt>
                <dd>
                  {formatMoney(q.subtotal_minor - q.discount_minor, currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">GST</dt>
                <dd>{formatMoney(q.tax_minor, currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-semibold text-ink-900">
                <dt>Total</dt>
                <dd>{formatMoney(q.total_minor, currency)}</dd>
              </div>
              {rows.some((r) => r.price.trim()) && (
                <p className="text-[12px] text-ink-400">
                  Changed prices are applied when you save.
                </p>
              )}
            </dl>
          )}
        </div>
      )}
      <Field label="Notes" htmlFor="so_notes">
        <Textarea
          id="so_notes"
          rows={2}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
    </Modal>
  );
}
