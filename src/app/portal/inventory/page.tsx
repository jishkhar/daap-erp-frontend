"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import { PackageReceiveIcon, WarehouseIcon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";
import { ProductPicker } from "@/components/erp/ProductPicker";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CursorPager } from "@/components/ui/CursorPager";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { useActiveBranch } from "@/lib/branch";
import { useDebounced } from "@/lib/useDebounced";
import {
  useAdjustStock,
  useReceiveStock,
  useSetReorderLevel,
  useStockLevels,
  useStockMovements,
  type StockLevel as Level,
  type StockMovement as LedgerRow,
} from "@/hooks/useInventory";
import { formatDateTime, humanize, type Product } from "@/lib/erp";
import { toast } from "@/lib/toast";

type Target = {
  branch_id: string;
  variant_id: string;
  name: string;
  sku: string;
  tracked: boolean;
};

const serialList = (text: string) =>
  text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export default function InventoryPage() {
  const { tenant, ready } = usePortalGuard();
  const { branchId, branches } = useActiveBranch();
  const [tab, setTab] = useState<"stock" | "movements">("stock");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  // Both lists are searched and paged on the server.
  const query = useDebounced(search.trim());
  const levels = useStockLevels({
    branch_id: branchId,
    low_stock: lowOnly,
    q: query,
  });
  const ledger = useStockMovements(
    { branch_id: branchId },
    tab === "movements",
  );
  const receiveStock = useReceiveStock();
  const adjustStock = useAdjustStock();
  const setReorderLevel = useSetReorderLevel();

  const [receive, setReceive] = useState<{
    branch_id: string;
    product: Product | null;
    qty: string;
    serials: string;
  } | null>(null);
  const [adjust, setAdjust] = useState<
    | (Target & {
        delta: string;
        reason: string;
        serials: string;
        write_off: boolean;
      })
    | null
  >(null);
  const [reorder, setReorder] = useState<(Target & { level: string }) | null>(
    null,
  );
  const busy =
    receiveStock.isPending ||
    adjustStock.isPending ||
    setReorderLevel.isPending;

  const rows = levels.rows;

  const columns = useMemo<ColumnDef<Level, unknown>[]>(
    () => [
      {
        header: "Product",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.product_name}
            </p>
            <p className="text-[12px] text-ink-400">
              {row.original.sku}
              {row.original.serialization_type !== "NONE" &&
                ` · ${row.original.serialization_type}`}
            </p>
          </div>
        ),
      },
      ...(branchId
        ? []
        : [
            {
              header: "Branch",
              cell: ({ row }: { row: { original: Level } }) =>
                row.original.branch_code,
            } as ColumnDef<Level, unknown>,
          ]),
      {
        header: "Available",
        cell: ({ row }) => {
          const l = row.original;
          const low =
            l.reorder_level !== null && l.available_qty <= l.reorder_level;
          return (
            <span className="flex items-center gap-space-2 font-semibold">
              {l.available_qty}
              {low && <Badge tone="warning">low</Badge>}
            </span>
          );
        },
      },
      { header: "Reserved", cell: ({ row }) => row.original.reserved_qty },
      { header: "In transit", cell: ({ row }) => row.original.in_transit_qty },
      {
        header: "Reorder at",
        cell: ({ row }) =>
          row.original.reorder_level ?? <span className="text-ink-400">—</span>,
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => {
          const l = row.original;
          const t: Target = {
            branch_id: l.branch_id,
            variant_id: l.variant_id,
            name: l.product_name,
            sku: l.sku,
            tracked: l.serialization_type !== "NONE",
          };
          return (
            <div className="flex justify-end gap-space-1">
              <Button
                variant="ghost"
                onClick={() =>
                  setAdjust({
                    ...t,
                    delta: "",
                    reason: "",
                    serials: "",
                    write_off: false,
                  })
                }
              >
                Adjust
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setReorder({
                    ...t,
                    level:
                      l.reorder_level === null ? "" : String(l.reorder_level),
                  })
                }
              >
                Reorder level
              </Button>
            </div>
          );
        },
      },
    ],
    [branchId],
  );

  const ledgerColumns = useMemo<ColumnDef<LedgerRow, unknown>[]>(
    () => [
      {
        header: "When",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        header: "Product",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink-900">
              {row.original.product_name}
            </p>
            <p className="text-[12px] text-ink-400">{row.original.sku}</p>
          </div>
        ),
      },
      { header: "Branch", cell: ({ row }) => row.original.branch_code },
      {
        header: "Movement",
        cell: ({ row }) => (
          <Badge tone="neutral">{humanize(row.original.movement_type)}</Badge>
        ),
      },
      {
        header: "Change",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span
              className={
                r.available_delta < 0
                  ? "font-semibold text-error"
                  : r.available_delta > 0
                    ? "font-semibold text-success"
                    : "text-ink-600"
              }
            >
              {r.available_delta !== 0
                ? signed(r.available_delta)
                : r.reserved_delta !== 0
                  ? `${signed(r.reserved_delta)} reserved`
                  : `${signed(r.in_transit_delta)} in transit`}
            </span>
          );
        },
      },
      { header: "Balance", cell: ({ row }) => row.original.available_after },
      {
        header: "Note",
        cell: ({ row }) => (
          <span className="text-ink-600">
            {row.original.reason ?? row.original.ref_type ?? ""}
          </span>
        ),
      },
    ],
    [],
  );

  if (!ready) return null;

  function submitReceive() {
    if (!receive?.product) return;
    const qty = parseInt(receive.qty, 10);
    if (!qty || qty <= 0) return toast.error("Enter a quantity");
    const tracked = receive.product.serialization_type !== "NONE";
    receiveStock.mutate(
      {
        branch_id: receive.branch_id,
        lines: [
          {
            variant_id: receive.product.id,
            quantity: qty,
            ...(tracked ? { serial_numbers: serialList(receive.serials) } : {}),
          },
        ],
      },
      {
        onSuccess: () => {
          toast.success(`${qty} unit(s) received`);
          setReceive(null);
        },
        onError: (e) => toast.error("Couldn't receive stock", e.message),
      },
    );
  }

  function submitAdjust() {
    if (!adjust) return;
    const delta = parseInt(adjust.delta, 10);
    if (!delta)
      return toast.error(
        "Enter how many units to add (positive) or remove (negative)",
      );
    if (!adjust.reason.trim()) return toast.error("A reason is required");
    adjustStock.mutate(
      {
        branch_id: adjust.branch_id,
        variant_id: adjust.variant_id,
        delta,
        reason: adjust.reason.trim(),
        serial_numbers: adjust.tracked ? serialList(adjust.serials) : [],
        write_off: delta < 0 && adjust.write_off,
      },
      {
        onSuccess: () => {
          toast.success("Stock adjusted");
          setAdjust(null);
        },
        onError: (e) => toast.error("Couldn't adjust stock", e.message),
      },
    );
  }

  function submitReorder() {
    if (!reorder) return;
    const level =
      reorder.level.trim() === "" ? null : parseInt(reorder.level, 10);
    if (level !== null && (Number.isNaN(level) || level < 0))
      return toast.error("Enter a whole number, or leave empty for none");
    setReorderLevel.mutate(
      {
        branch_id: reorder.branch_id,
        variant_id: reorder.variant_id,
        reorder_level: level,
      },
      {
        onSuccess: () => {
          toast.success("Reorder level saved");
          setReorder(null);
        },
        onError: (e) => toast.error("Couldn't save", e.message),
      },
    );
  }

  return (
    <PortalShell tenant={tenant} active="inventory">
      <PageHeader
        scopedToBranch
        icon={<HugeiconsIcon icon={WarehouseIcon} size={20} />}
        title="Inventory"
        description={`Stock ${branchId ? "at the selected branch" : "across all your branches"}.`}
        actions={
          <Button
            onClick={() =>
              setReceive({
                branch_id: branchId ?? branches[0]?.id ?? "",
                product: null,
                qty: "",
                serials: "",
              })
            }
          >
            <HugeiconsIcon icon={PackageReceiveIcon} size={16} /> Receive stock
          </Button>
        }
      />
      <Tabs
        tabs={[
          { key: "stock", label: "Stock levels" },
          { key: "movements", label: "Movements" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "stock" ? (
        <>
          <Card className="mb-space-4 flex flex-wrap items-center gap-space-3 p-space-3">
            <Input
              placeholder="Search name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              aria-label="Search stock"
            />
            <label className="flex items-center gap-space-2 text-[14px] text-ink-900">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
              />{" "}
              Low stock only
            </label>
          </Card>
          {levels.error && (
            <p className="mb-space-3 text-[13px] font-medium text-error">
              {levels.error.message}
            </p>
          )}
          <Card className="p-space-2">
            <DataTable
              columns={columns}
              data={rows}
              getRowId={(l) => `${l.branch_id}-${l.variant_id}`}
              paginate={false}
              loading={levels.isFetching}
              emptyMessage={
                levels.isLoading
                  ? "Loading stock…"
                  : "No stock recorded yet. Use Receive stock to add some."
              }
            />
            <CursorPager {...levels.pager} />
          </Card>
        </>
      ) : (
        <Card className="p-space-2">
          <DataTable
            columns={ledgerColumns}
            data={ledger.rows}
            getRowId={(r) => String(r.id)}
            paginate={false}
            loading={ledger.isFetching}
            emptyMessage={
              ledger.isLoading
                ? "Loading movements…"
                : "No stock movements yet."
            }
          />
          <CursorPager {...ledger.pager} />
        </Card>
      )}

      <Modal
        open={receive !== null}
        onClose={() => setReceive(null)}
        title="Receive stock"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReceive(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !receive?.product ||
                !receive?.qty ||
                !receive?.branch_id
              }
              onClick={submitReceive}
            >
              Receive
            </Button>
          </>
        }
      >
        {receive && (
          <>
            <Field label="Branch" htmlFor="rc_branch">
              <Select
                id="rc_branch"
                value={receive.branch_id}
                onChange={(e) =>
                  setReceive({ ...receive, branch_id: e.target.value })
                }
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name} ({b.branch_code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product" htmlFor="rc_product">
              {receive.product ? (
                <div className="flex items-center justify-between rounded-md border border-line p-space-3 text-[14px]">
                  <span>
                    <strong>{receive.product.name}</strong>{" "}
                    <span className="text-ink-400">{receive.product.sku}</span>
                  </span>
                  <button
                    type="button"
                    className="text-[13px] font-semibold text-brand-600"
                    onClick={() =>
                      setReceive({ ...receive, product: null, serials: "" })
                    }
                  >
                    Change
                  </button>
                </div>
              ) : (
                <ProductPicker
                  id="rc_product"
                  onPick={(p) => setReceive({ ...receive, product: p })}
                />
              )}
            </Field>
            <Field label="Quantity" htmlFor="rc_qty">
              <Input
                id="rc_qty"
                inputMode="numeric"
                value={receive.qty}
                onChange={(e) =>
                  setReceive({
                    ...receive,
                    qty: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </Field>
            {receive.product &&
              receive.product.serialization_type !== "NONE" && (
                <Field
                  label={
                    receive.product.serialization_type === "IMEI"
                      ? "IMEI numbers"
                      : "Serial numbers"
                  }
                  htmlFor="rc_serials"
                  required
                  hint="One per line (or comma separated), exactly as many as the quantity."
                >
                  <Textarea
                    id="rc_serials"
                    rows={4}
                    value={receive.serials}
                    onChange={(e) =>
                      setReceive({ ...receive, serials: e.target.value })
                    }
                  />
                </Field>
              )}
          </>
        )}
      </Modal>

      <Modal
        open={adjust !== null}
        onClose={() => setAdjust(null)}
        title={`Adjust stock — ${adjust?.name ?? ""}`}
        description="Corrects the count after a stock-take, damage or loss. It's recorded in the movements log."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdjust(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={submitAdjust}>
              Apply adjustment
            </Button>
          </>
        }
      >
        {adjust && (
          <>
            <Field
              label="Change in units"
              htmlFor="ad_delta"
              hint="Use a minus sign to remove stock, e.g. -2."
            >
              <Input
                id="ad_delta"
                inputMode="numeric"
                value={adjust.delta}
                onChange={(e) =>
                  setAdjust({
                    ...adjust,
                    delta: e.target.value.replace(/[^\d-]/g, ""),
                  })
                }
              />
            </Field>
            <Field label="Reason" htmlFor="ad_reason" required>
              <Input
                id="ad_reason"
                value={adjust.reason}
                onChange={(e) =>
                  setAdjust({ ...adjust, reason: e.target.value })
                }
              />
            </Field>
            {adjust.tracked && (
              <Field
                label="Serial / IMEI numbers"
                htmlFor="ad_serials"
                hint="The exact units being added or removed."
              >
                <Textarea
                  id="ad_serials"
                  rows={3}
                  value={adjust.serials}
                  onChange={(e) =>
                    setAdjust({ ...adjust, serials: e.target.value })
                  }
                />
              </Field>
            )}
            {parseInt(adjust.delta, 10) < 0 && (
              <label className="flex items-center gap-space-2 text-[14px]">
                <input
                  type="checkbox"
                  checked={adjust.write_off}
                  onChange={(e) =>
                    setAdjust({ ...adjust, write_off: e.target.checked })
                  }
                />{" "}
                Record as a write-off (damaged or lost)
              </label>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={reorder !== null}
        onClose={() => setReorder(null)}
        title={`Reorder level — ${reorder?.name ?? ""}`}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReorder(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={submitReorder}>
              Save
            </Button>
          </>
        }
      >
        {reorder && (
          <Field
            label="Flag as low stock at or below"
            htmlFor="ro_level"
            hint="Leave empty for no alert."
          >
            <Input
              id="ro_level"
              inputMode="numeric"
              value={reorder.level}
              onChange={(e) =>
                setReorder({
                  ...reorder,
                  level: e.target.value.replace(/\D/g, ""),
                })
              }
            />
          </Field>
        )}
      </Modal>
    </PortalShell>
  );
}
