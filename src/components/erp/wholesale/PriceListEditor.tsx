"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ProductPicker } from "@/components/erp/ProductPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import {
  usePriceList,
  useSavePrices,
  useUpdatePriceList,
  type PriceRow,
} from "@/hooks/useWholesale";
import { formatMoney, fromMinor, toMinor } from "@/lib/erp";
import { toast } from "@/lib/toast";
import type { PriceListItem } from "@/lib/wholesale";

/** One row of the grid as the person edits it. `key` stays the same while the quantity or price changes. */
type Row = {
  key: string;
  variant_id: string;
  sku: string;
  name: string;
  list_price_minor: number;
  min_qty: string;
  price: string;
};

const toRow = (i: PriceListItem): Row => ({
  key: i.id,
  variant_id: i.variant_id,
  sku: i.sku,
  name: i.name,
  list_price_minor: i.list_price_minor,
  min_qty: String(i.min_qty),
  price: fromMinor(i.price_minor),
});

/** The prices of one price list: a price per product from 1 piece, plus optional quantity breaks (a lower price from N pieces). Saving
 * sends every row (unchanged rows cost nothing) and removes the rows that were deleted. */
export function PriceListEditor({
  listId,
  canManage,
  onClose,
}: {
  listId: string | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const detail = usePriceList(listId ?? "");
  const save = useSavePrices(listId ?? "");
  const update = useUpdatePriceList(listId ?? "");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const d = detail.data;
  if (d && loadedFor !== `${listId}:${d.updated_at}`) {
    setLoadedFor(`${listId}:${d.updated_at}`);
    setRows(d.items.map(toRow));
  }
  const shown = rows ?? [];
  const currency = "INR";

  const badRow = (r: Row) => {
    const q = Number(r.min_qty);
    return !Number.isInteger(q) || q < 1 || toMinor(r.price) === null;
  };
  const dupes = new Set<string>();
  const seen = new Set<string>();
  for (const r of shown) {
    const k = `${r.variant_id}:${Number(r.min_qty)}`;
    if (seen.has(k)) dupes.add(k);
    seen.add(k);
  }
  const invalid = shown.some(badRow) || dupes.size > 0;

  function patch(key: string, change: Partial<Row>) {
    setRows(shown.map((r) => (r.key === key ? { ...r, ...change } : r)));
  }

  function submit() {
    if (!d) return;
    const kept: PriceRow[] = shown.map((r) => ({
      variant_id: r.variant_id,
      min_qty: Number(r.min_qty),
      price_minor: toMinor(r.price) ?? 0,
    }));
    const keptKeys = new Set(kept.map((k) => `${k.variant_id}:${k.min_qty}`));
    const removed: PriceRow[] = d.items
      .filter((i) => !keptKeys.has(`${i.variant_id}:${i.min_qty}`))
      .map((i) => ({
        variant_id: i.variant_id,
        min_qty: i.min_qty,
        remove: true,
      }));
    const all = [...kept, ...removed];
    if (all.length === 0) return onClose();
    save.mutate(all, {
      onSuccess: () => toast.success("Prices saved"),
      onError: (e) => toast.error("Couldn't save the prices", e.message),
    });
  }

  return (
    <Modal
      open={listId !== null}
      onClose={onClose}
      width="lg"
      title={d ? `Price list: ${d.name}` : "Price list"}
      description="A price per product from 1 piece. Add a quantity break for a lower price on bigger orders. Products not listed sell at their normal price."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {canManage && (
            <Button disabled={invalid || save.isPending} onClick={submit}>
              {save.isPending ? "Saving…" : "Save prices"}
            </Button>
          )}
        </>
      }
    >
      {detail.error && (
        <p className="text-[13px] font-medium text-error">
          {detail.error.message}
        </p>
      )}
      {!d && !detail.error && <SkeletonLines rows={5} />}
      {d && (
        <>
          <div className="mb-space-3 flex items-center justify-between gap-space-4 rounded-lg border border-line p-space-3">
            <div>
              <p className="text-[14px] font-semibold text-ink-900">
                Prices include GST
              </p>
              <p className="text-[12.5px] text-ink-600">
                Off (usual for wholesale): GST is added on top of these prices.
              </p>
            </div>
            <Switch
              checked={d.prices_include_tax}
              disabled={!canManage || update.isPending}
              onChange={() =>
                update.mutate(
                  { prices_include_tax: !d.prices_include_tax },
                  {
                    onError: (e) =>
                      toast.error("Couldn't change it", e.message),
                  },
                )
              }
            />
          </div>
          {canManage && (
            <Field label="Add a product" htmlFor="pl_pick">
              <ProductPicker
                id="pl_pick"
                serialized={false}
                onPick={(p) =>
                  setRows([
                    {
                      key: crypto.randomUUID(),
                      variant_id: p.id,
                      sku: p.sku,
                      name: p.name,
                      list_price_minor: p.price_minor,
                      min_qty: shown.some((r) => r.variant_id === p.id)
                        ? ""
                        : "1",
                      price: fromMinor(p.price_minor),
                    },
                    ...shown,
                  ])
                }
              />
            </Field>
          )}
          {shown.length === 0 ? (
            <p className="py-space-4 text-center text-[13.5px] text-ink-400">
              No prices yet. Every product sells at its normal price.
            </p>
          ) : (
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="min-w-[560px] w-full text-[13.5px] [&_td]:[overflow-wrap:anywhere]">
                <thead>
                  <tr className="text-left text-label">
                    <th className="py-space-2 pr-space-2">Product</th>
                    <th className="w-24 pr-space-2">From qty</th>
                    <th className="w-32 pr-space-2">Price (₹)</th>
                    <th className="w-28 pr-space-2 text-right">Normal price</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const dup = dupes.has(
                      `${r.variant_id}:${Number(r.min_qty)}`,
                    );
                    const qtyBad =
                      dup ||
                      !Number.isInteger(Number(r.min_qty)) ||
                      Number(r.min_qty) < 1;
                    const priceBad = toMinor(r.price) === null;
                    return (
                      <tr key={r.key} className="border-t border-line">
                        <td className="py-space-2 pr-space-2">
                          <p className="font-medium text-ink-900">{r.name}</p>
                          <p className="text-[12px] text-ink-400">{r.sku}</p>
                        </td>
                        <td className="pr-space-2">
                          <Input
                            aria-label={`From quantity for ${r.sku}`}
                            inputMode="numeric"
                            disabled={!canManage}
                            invalid={qtyBad}
                            value={r.min_qty}
                            onChange={(e) =>
                              patch(r.key, { min_qty: e.target.value })
                            }
                          />
                        </td>
                        <td className="pr-space-2">
                          <Input
                            aria-label={`Price for ${r.sku}`}
                            inputMode="decimal"
                            disabled={!canManage}
                            invalid={priceBad}
                            value={r.price}
                            onChange={(e) =>
                              patch(r.key, { price: e.target.value })
                            }
                          />
                        </td>
                        <td className="pr-space-2 text-right text-ink-600">
                          {formatMoney(r.list_price_minor, currency)}
                        </td>
                        <td>
                          {canManage && (
                            <div className="flex">
                              <button
                                type="button"
                                title="Add a quantity break"
                                aria-label={`Add a quantity break for ${r.sku}`}
                                className="p-1 text-ink-400 hover:text-ink-900"
                                onClick={() =>
                                  setRows([
                                    ...shown,
                                    {
                                      ...r,
                                      key: crypto.randomUUID(),
                                      min_qty: "",
                                    },
                                  ])
                                }
                              >
                                <Plus size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove ${r.sku} from ${r.min_qty || "?"}`}
                                className="p-1 text-ink-400 hover:text-error"
                                onClick={() =>
                                  setRows(shown.filter((x) => x.key !== r.key))
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {dupes.size > 0 && (
                <p className="mt-space-2 text-[12.5px] text-error">
                  A product has two prices from the same quantity. Change or
                  remove one.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
