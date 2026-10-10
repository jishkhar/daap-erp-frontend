"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Delete02Icon,
  ShoppingCart01Icon,
} from "@hugeicons/core-free-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CustomerSelect } from "@/components/erp/CustomerSelect";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useActiveBranch } from "@/lib/branch";
import { useStockFor } from "@/hooks/useInventory";
import { useCreateOrder } from "@/hooks/useOrders";
import { useProductSearch, type ProductWithTax } from "@/hooks/useProducts";
import { useTaxBands, type TaxBands } from "@/hooks/useTaxes";
import {
  CHANNELS,
  CHANNEL_ORDER,
  formatMoney,
  type Channel,
  type Customer,
  type Product,
} from "@/lib/erp";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";

type Line = { product: Product; quantity: number; serials: string };

const COUNTER_METHODS = [
  ["cash", "Cash"],
  ["card", "Card"],
  ["upi", "UPI"],
] as const;

/** Same rules as the server, per line, round-half-up. Exclusive prices: tax = amount x rate, added on top. Inclusive prices: the amount is what
 * the customer pays and tax is carved out of it (amount - amount x 100 / (100 + rate)). The server recomputes everything; this is a preview. */
const lineTax = (l: Line, inclusive: boolean, bands: TaxBands) => {
  const code = (l.product as ProductWithTax).tax_code ?? "";
  const band = [...(bands[code] ?? [])]
    .sort((a, b) => (a.up_to_minor ?? Infinity) - (b.up_to_minor ?? Infinity))
    .find(
      (b) => b.up_to_minor === null || l.product.price_minor <= b.up_to_minor,
    );
  const rate = band
    ? band.rate_bps
    : ((l.product as ProductWithTax).tax_rate_bps ?? 0);
  const amount = l.product.price_minor * l.quantity;
  if (!inclusive) return Math.floor((amount * rate + 5000) / 10000);
  const divisor = 10000 + rate;
  return (
    amount - Math.floor((amount * 10000 + Math.floor(divisor / 2)) / divisor)
  );
};

function NewOrder() {
  const router = useRouter();
  const params = useSearchParams();
  const { tenant, ready } = usePortalGuard();
  const { branchId: activeBranch, branches } = useActiveBranch();

  const initialChannel =
    CHANNEL_ORDER.find((c) => c === params.get("channel")) ?? "pos";
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [branch, setBranch] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null); // an existing customer, searched on the server
  const customerId = customer ? String(customer.id) : "";
  const [walkName, setWalkName] = useState("");
  const [walkPhone, setWalkPhone] = useState("");
  const [orderType, setOrderType] = useState("shipping");
  const [address, setAddress] = useState({ line1: "", city: "", pincode: "" });
  const [payNow, setPayNow] = useState(true);
  const [method, setMethod] = useState("cash");
  const [remoteMethod, setRemoteMethod] = useState("cod");
  const [notes, setNotes] = useState("");
  const createOrder = useCreateOrder();
  const busy = createOrder.isPending;

  const branchId = branch || activeBranch || branches[0]?.id || "";
  const isPos = channel === "pos";
  const cur = tenant?.currency ?? "INR";

  const q = useDebounced(search.trim());
  const products = useProductSearch({
    q,
    lifecycle_status: "active",
    limit: 12,
  });
  // stock of just the products on screen: the search results and the order's lines
  const stock = useStockFor(
    branchId
      ? [
          ...(products.data ?? []).map((p) => p.id),
          ...lines.map((l) => l.product.id),
        ]
      : [],
    branchId,
  );
  const available = useMemo(
    () =>
      new Map((stock.data ?? []).map((s) => [s.variant_id, s.available_qty])),
    [stock.data],
  );

  const inclusive = tenant?.pricesIncludeTax ?? false;
  const bandsQuery = useTaxBands();
  const bands = useMemo<TaxBands>(
    () => bandsQuery.data ?? {},
    [bandsQuery.data],
  );
  const totals = useMemo(() => {
    const amount = lines.reduce(
      (s, l) => s + l.product.price_minor * l.quantity,
      0,
    );
    const tax = lines.reduce((s, l) => s + lineTax(l, inclusive, bands), 0);
    return inclusive
      ? { subtotal: amount - tax, tax, total: amount }
      : { subtotal: amount, tax, total: amount + tax };
  }, [lines, inclusive, bands]);

  function add(product: Product) {
    setLines((ls) =>
      ls.some((l) => l.product.id === product.id)
        ? ls.map((l) =>
            l.product.id === product.id
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          )
        : [...ls, { product, quantity: 1, serials: "" }],
    );
  }
  const patch = (id: string, change: Partial<Line>) =>
    setLines((ls) =>
      ls.map((l) => (l.product.id === id ? { ...l, ...change } : l)),
    );
  const serialList = (l: Line) =>
    l.serials
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  function problem(): string | null {
    if (!branchId) return "Choose a branch.";
    if (lines.length === 0) return "Add at least one product.";
    if (!customerId && walkName.trim() && !walkPhone.trim())
      return "Enter a phone number for the new customer.";
    if (isPos) {
      const bad = lines.find(
        (l) =>
          l.product.serialization_type !== "NONE" &&
          serialList(l).length !== l.quantity,
      );
      if (bad)
        return `Enter ${bad.quantity} serial/IMEI number(s) for ${bad.product.name}.`;
    } else {
      if (!customerId && !walkName.trim())
        return "Choose a customer or enter their name and phone.";
      if (orderType !== "pickup" && !address.line1.trim())
        return "Enter a delivery address.";
    }
    return null;
  }

  function place() {
    const err = problem();
    if (err) return toast.error("Can't place the order yet", err);
    const body: Record<string, unknown> = {
      branch_id: branchId,
      channel,
      notes: notes.trim() || null,
      items: lines.map((l) => ({
        variant_id: l.product.id,
        quantity: l.quantity,
        ...(isPos && l.product.serialization_type !== "NONE"
          ? { serial_numbers: serialList(l) }
          : {}),
      })),
      ...(customerId
        ? { customer_id: customerId }
        : walkName.trim()
          ? {
              customer: {
                name: walkName.trim(),
                phone: walkPhone.trim() || null,
              },
            }
          : {}),
    };
    if (isPos) {
      body.order_type = "takeaway";
      if (payNow) body.payments = [{ method, amount_minor: totals.total }];
    } else {
      body.order_type = orderType;
      body.payment_method = remoteMethod;
      if (orderType !== "pickup") body.delivery_address = { ...address };
    }
    createOrder.mutate(body, {
      onSuccess: (order) => {
        toast.success(`Order ${order.order_number} placed`);
        router.push(`/portal/orders/${order.id}`);
      },
      onError: (e) => toast.error("Couldn't place the order", e.message),
    });
  }

  if (!ready) return null;

  return (
    <PortalShell tenant={tenant} active="orders">
      <PageHeader
        icon={<HugeiconsIcon icon={ShoppingCart01Icon} size={20} />}
        title="New order"
        description="Place an order on behalf of a customer. Prices and tax come from the product master."
      />
      <div className="grid gap-space-4 lg:grid-cols-[1fr_380px]">
        <div>
          <Card className="mb-space-4 p-space-4">
            <div className="grid gap-x-space-4 sm:grid-cols-2">
              <Field label="Channel" htmlFor="o_channel">
                <Select
                  id="o_channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                >
                  {CHANNEL_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CHANNELS[c].label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Branch"
                htmlFor="o_branch"
                hint="Stock is taken from (or reserved at) this branch."
              >
                <Select
                  id="o_branch"
                  value={branchId}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name} ({b.branch_code})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="text-[12.5px] text-ink-400">
              {isPos
                ? "Counter sale: stock leaves immediately and the order completes on the spot."
                : "Remote order: stock is reserved until it's delivered; the customer is required."}
            </p>
          </Card>

          <Card className="mb-space-4 p-space-4">
            <Input
              placeholder="Search products by name, SKU or barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
              className="mb-space-3"
            />
            {products.error && (
              <p className="text-[13px] text-error">{products.error.message}</p>
            )}
            <div className="grid gap-space-2 sm:grid-cols-2">
              {(products.data ?? []).map((pr) => {
                const left = available.get(pr.id) ?? 0;
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => add(pr)}
                    disabled={left <= 0}
                    className="flex items-center justify-between gap-space-2 rounded-md border border-line bg-card p-space-3 text-left transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-ink-900">
                        {pr.name}
                      </span>
                      <span className="block text-[12px] text-ink-400">
                        {pr.sku} ·{" "}
                        {left > 0 ? `${left} in stock` : "out of stock here"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-space-1 text-[13px] font-semibold">
                      {formatMoney(pr.price_minor, cur)}{" "}
                      <HugeiconsIcon icon={Add01Icon} size={16} />
                    </span>
                  </button>
                );
              })}
              {products.data?.length === 0 && (
                <p className="text-[13px] text-ink-400">No products match.</p>
              )}
            </div>
          </Card>

          <Card className="p-space-4">
            <h2 className="mb-space-3 text-[15px] font-semibold text-ink-900">
              {isPos ? "Customer (optional)" : "Customer"}
            </h2>
            <div className="grid gap-x-space-4 sm:grid-cols-3">
              <Field label="Existing customer" htmlFor="o_cust">
                <CustomerSelect
                  id="o_cust"
                  value={customer}
                  onChange={setCustomer}
                  emptyLabel={
                    isPos
                      ? "Walk-in — or search a customer"
                      : "New customer — or search one"
                  }
                />
              </Field>
              <Field label="Name" htmlFor="o_name">
                <Input
                  id="o_name"
                  value={walkName}
                  disabled={!!customerId}
                  onChange={(e) => setWalkName(e.target.value)}
                />
              </Field>
              <Field label="Phone" htmlFor="o_phone">
                <Input
                  id="o_phone"
                  inputMode="tel"
                  value={walkPhone}
                  disabled={!!customerId}
                  onChange={(e) => setWalkPhone(e.target.value)}
                />
              </Field>
            </div>
            {!isPos && (
              <div className="grid gap-x-space-4 sm:grid-cols-2">
                <Field label="Fulfilment" htmlFor="o_type">
                  <Select
                    id="o_type"
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                  >
                    <option value="shipping">Shipping</option>
                    <option value="delivery">Local delivery</option>
                    <option value="pickup">Store pickup</option>
                  </Select>
                </Field>
                {orderType !== "pickup" && (
                  <>
                    <Field
                      label="Address"
                      htmlFor="o_addr"
                      className="sm:col-span-2"
                    >
                      <Input
                        id="o_addr"
                        value={address.line1}
                        onChange={(e) =>
                          setAddress({ ...address, line1: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="City" htmlFor="o_city">
                      <Input
                        id="o_city"
                        value={address.city}
                        onChange={(e) =>
                          setAddress({ ...address, city: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Pincode" htmlFor="o_pin">
                      <Input
                        id="o_pin"
                        inputMode="numeric"
                        value={address.pincode}
                        onChange={(e) =>
                          setAddress({ ...address, pincode: e.target.value })
                        }
                      />
                    </Field>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit p-space-4 lg:sticky lg:top-space-4">
          <h2 className="mb-space-3 text-[15px] font-semibold text-ink-900">
            Order summary
          </h2>
          {lines.length === 0 && (
            <p className="mb-space-3 text-[13px] text-ink-400">
              No products added yet.
            </p>
          )}
          {lines.map((l) => (
            <div key={l.product.id} className="border-b border-line py-space-3">
              <div className="flex items-start justify-between gap-space-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink-900">
                    {l.product.name}
                  </p>
                  <p className="text-[12px] text-ink-400">
                    {formatMoney(l.product.price_minor, cur)} each
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${l.product.name}`}
                  className="text-ink-400 hover:text-error"
                  onClick={() =>
                    setLines((ls) =>
                      ls.filter((x) => x.product.id !== l.product.id),
                    )
                  }
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </button>
              </div>
              <div className="mt-space-2 flex items-center justify-between">
                <Input
                  inputMode="numeric"
                  aria-label="Quantity"
                  className="h-9 w-20"
                  value={l.quantity}
                  onChange={(e) =>
                    patch(l.product.id, {
                      quantity: Math.min(
                        Math.max(
                          parseInt(e.target.value.replace(/\D/g, ""), 10) || 1,
                          1,
                        ),
                        available.get(l.product.id) || 1,
                      ),
                    })
                  }
                />
                <span className="text-[14px] font-semibold">
                  {formatMoney(l.product.price_minor * l.quantity, cur)}
                </span>
              </div>
              {isPos && l.product.serialization_type !== "NONE" && (
                <Textarea
                  rows={2}
                  className="mt-space-2"
                  aria-label="Serial numbers"
                  placeholder={`${l.quantity} ${l.product.serialization_type === "IMEI" ? "IMEI" : "serial"} number(s), one per line`}
                  value={l.serials}
                  onChange={(e) =>
                    patch(l.product.id, { serials: e.target.value })
                  }
                />
              )}
            </div>
          ))}
          <div className="space-y-1 py-space-3 text-[14px]">
            <div className="flex justify-between">
              <span className="text-ink-600">Subtotal</span>
              <span>{formatMoney(totals.subtotal, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Tax</span>
              <span>{formatMoney(totals.tax, cur)}</span>
            </div>
            <div className="flex justify-between text-[16px] font-bold text-ink-900">
              <span>Total</span>
              <span>{formatMoney(totals.total, cur)}</span>
            </div>
            {inclusive && (
              <p className="text-[12px] text-ink-400">
                Prices include GST; the subtotal is shown before tax.
              </p>
            )}
          </div>
          {isPos ? (
            <div className="mb-space-3">
              <Field label="Payment" htmlFor="o_pay" className="mb-0">
                <Select
                  id="o_pay"
                  value={payNow ? method : "later"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPayNow(v !== "later");
                    if (v !== "later") setMethod(v);
                  }}
                >
                  {COUNTER_METHODS.map(([v, label]) => (
                    <option key={v} value={v}>
                      Paid in full — {label}
                    </option>
                  ))}
                  <option value="later">Pay later</option>
                </Select>
              </Field>
            </div>
          ) : (
            <div className="mb-space-3">
              <Field label="Payment" htmlFor="o_rpay" className="mb-0">
                <Select
                  id="o_rpay"
                  value={remoteMethod}
                  onChange={(e) => setRemoteMethod(e.target.value)}
                >
                  <option value="cod">
                    Cash on delivery (confirms the order)
                  </option>
                  <option value="online">Online (awaits payment)</option>
                </Select>
              </Field>
            </div>
          )}
          <Field label="Notes" htmlFor="o_notes">
            <Input
              id="o_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Button
            className="w-full"
            disabled={busy || lines.length === 0}
            onClick={place}
          >
            {busy
              ? "Placing…"
              : `Place order · ${formatMoney(totals.total, cur)}`}
          </Button>
        </Card>
      </div>
    </PortalShell>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrder />
    </Suspense>
  );
}
