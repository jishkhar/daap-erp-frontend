"use client";

import {
  AlertTriangle,
  BarChart3,
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Eye,
  EyeOff,
  FileText,
  Home,
  LayoutGrid,
  Lock,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

/**
 * POS screen editor: one page (the till dashboard), edited like Shopify's POS theme editor
 * (tree on the left, live preview in the middle, settings of the selected item on the right).
 *
 * SAMPLE DATA ONLY. Nothing is read from or saved to the backend yet.
 */

const notWired = () =>
  toast.success(
    "Preview only",
    "The till screen isn't connected to these settings yet.",
  );

type TileId =
  | "sales"
  | "orders"
  | "customers"
  | "inventory"
  | "returns"
  | "lowstock"
  | "trend"
  | "payments"
  | "bills"
  | "top"
  | "sync";
type Tile = { id: TileId; label: string; visible: boolean };
type Selection = "page" | TileId | "checkout" | "lock";

const INITIAL: Tile[] = [
  { id: "sales", label: "Today's Sales", visible: true },
  { id: "orders", label: "Orders", visible: true },
  { id: "customers", label: "Customers", visible: true },
  { id: "inventory", label: "Inventory Value", visible: true },
  { id: "returns", label: "Pending Returns", visible: true },
  { id: "lowstock", label: "Low Stock Alerts", visible: true },
  { id: "trend", label: "Sales Trend", visible: true },
  { id: "payments", label: "Payment Method Breakdown", visible: true },
  { id: "bills", label: "Recent Bills", visible: true },
  { id: "top", label: "Top Selling Products", visible: true },
  { id: "sync", label: "Sync Insight", visible: true },
];

const ACCENTS = [
  { key: "#1d63ed", name: "Blue" },
  { key: "#0f9d58", name: "Green" },
  { key: "#c2410c", name: "Orange" },
  { key: "#7c3aed", name: "Violet" },
];

const NAV = [
  { label: "Dashboard", icon: Home },
  { label: "Billing", icon: ShoppingCart },
  { label: "Products", icon: Box },
  { label: "Customers", icon: Users },
  { label: "Inventory", icon: Package },
  { label: "Purchases", icon: FileText },
  { label: "Suppliers", icon: Truck },
  { label: "Returns", icon: RotateCcw },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

const STATS: {
  id: TileId;
  value: string;
  note: string;
  tone: string;
  icon: typeof Home;
}[] = [
  {
    id: "sales",
    value: "₹1,771.00",
    note: "+12% vs yesterday",
    tone: "bg-blue-50",
    icon: ShoppingCart,
  },
  {
    id: "orders",
    value: "12",
    note: "+3 vs yesterday",
    tone: "bg-sky-50",
    icon: FileText,
  },
  {
    id: "customers",
    value: "9",
    note: "+2 vs yesterday",
    tone: "bg-violet-50",
    icon: Users,
  },
  {
    id: "inventory",
    value: "₹2,48,500.00",
    note: "+5% as on today",
    tone: "bg-orange-50",
    icon: Package,
  },
  {
    id: "returns",
    value: "2",
    note: "View returns",
    tone: "bg-red-50",
    icon: RotateCcw,
  },
  {
    id: "lowstock",
    value: "7",
    note: "View products",
    tone: "bg-red-50",
    icon: AlertTriangle,
  },
];

const BILLS = [
  ["POS-1008", "10:24 AM", "Walk-in Customer", "4", "₹1,771.00", "Cash"],
  ["POS-1007", "09:58 AM", "Rajeev K", "3", "₹850.00", "UPI"],
  ["POS-1006", "09:32 AM", "Walk-in Customer", "2", "₹330.00", "Card"],
  ["POS-1005", "09:15 AM", "Anitha P", "5", "₹1,250.00", "Cash"],
];
const TOP = [
  ["LED Bulb 9W", "28", "₹3,360.00"],
  ["Extension Board 4 Way", "16", "₹5,600.00"],
  ["Ceiling Light 12W", "12", "₹10,200.00"],
  ["Switch 6A", "11", "₹2,970.00"],
];
const PAYMENTS = [
  { label: "Cash", pct: 55, color: "#1d63ed" },
  { label: "Card", pct: 24, color: "#7fb0f5" },
  { label: "UPI", pct: 18, color: "#2bb673" },
  { label: "Split", pct: 2, color: "#c4b5fd" },
];
// conic-gradient stops: each slice starts where the previous one ended.
const DONUT = `conic-gradient(${PAYMENTS.map((p, i) => {
  const from = PAYMENTS.slice(0, i).reduce((n, q) => n + q.pct, 0);
  return `${p.color} ${from}% ${from + p.pct}%`;
}).join(",")})`;
const TREND = [6, 11, 10.5, 16, 23, 17.5, 23.5];

/** Preview widgets. They carry a ring when selected so the tree and the preview point at the same thing. */
function Widget({
  id,
  selected,
  onSelect,
  className,
  children,
}: {
  id: Selection;
  selected: Selection;
  onSelect: (s: Selection) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(id)}
      className={cn(
        "cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 outline-none transition-shadow",
        selected === id && "ring-2 ring-[var(--pos-accent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Trend({ accent }: { accent: string }) {
  const pts = TREND.map(
    (v, i) => `${(i / (TREND.length - 1)) * 100},${100 - (v / 30) * 100}`,
  ).join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-24 w-full"
      aria-hidden
    >
      <polygon points={`0,100 ${pts} 100,100`} fill={accent} opacity="0.12" />
      <polyline
        points={pts}
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Preview({
  tiles,
  sel,
  onSelect,
  accent,
  storeName,
}: {
  tiles: Tile[];
  sel: Selection;
  onSelect: (s: Selection) => void;
  accent: string;
  storeName: string;
}) {
  const t = (id: TileId) => tiles.find((x) => x.id === id)!;
  const on = (id: TileId) => t(id).visible;
  const stats = STATS.filter((s) => on(s.id));
  return (
    <div
      style={{ "--pos-accent": accent } as React.CSSProperties}
      className="overflow-hidden rounded-xl border border-slate-300 bg-slate-100 text-[10px] shadow-[var(--shadow-md)]"
    >
      <div className="flex">
        <aside className="hidden w-[132px] shrink-0 bg-[#0b2447] p-2 text-white sm:block">
          <p className="mb-2 px-1.5 py-1 text-[13px] font-extrabold tracking-wide">
            {storeName}{" "}
            <span style={{ color: accent }} className="brightness-150">
              POS
            </span>
          </p>
          {NAV.map((n, i) => (
            <div
              key={n.label}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1.5",
                i === 0 ? "text-white" : "text-white/75",
              )}
              style={i === 0 ? { background: accent } : undefined}
            >
              <n.icon size={12} /> {n.label}
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1 p-2.5">
          <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-white px-2.5 py-1.5">
            <span className="flex items-center gap-1 font-semibold">
              <Store size={12} style={{ color: accent }} /> Main Branch - Kochi
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
              <Cloud size={11} /> Synced with backend
            </span>
            <span className="ml-auto flex items-center gap-1 font-semibold">
              <User size={12} style={{ color: accent }} /> Rakesh (Cashier)
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <CalendarDays size={12} /> Tue, 14 Jan 2025 · 10:24 AM
            </span>
          </div>

          {stats.length > 0 && (
            <div className="mb-2.5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              {stats.map((s) => (
                <Widget
                  key={s.id}
                  id={s.id}
                  selected={sel}
                  onSelect={onSelect}
                  className={s.tone}
                >
                  <div className="flex items-center gap-1.5">
                    <s.icon size={14} style={{ color: accent }} />
                    <span className="truncate text-slate-600">
                      {t(s.id).label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[13px] font-bold">
                    {s.value}
                  </p>
                  <p className="truncate text-emerald-700">{s.note}</p>
                </Widget>
              ))}
            </div>
          )}

          {(on("trend") || on("payments")) && (
            <div className="mb-2.5 flex flex-col gap-2 md:flex-row">
              {on("trend") && (
                <Widget
                  id="trend"
                  selected={sel}
                  onSelect={onSelect}
                  className="md:flex-[2]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[12px] font-bold">
                        {t("trend").label}
                      </p>
                      <p className="text-slate-500">
                        Daily sales for the last 7 days
                      </p>
                    </div>
                    <span
                      className="rounded px-1.5 py-0.5 text-white"
                      style={{ background: accent }}
                    >
                      7 Days
                    </span>
                  </div>
                  <Trend accent={accent} />
                  <div className="flex justify-between text-slate-500">
                    <span>8 Jan</span>
                    <span>11 Jan</span>
                    <span>14 Jan</span>
                  </div>
                </Widget>
              )}
              {on("payments") && (
                <Widget
                  id="payments"
                  selected={sel}
                  onSelect={onSelect}
                  className="md:flex-1"
                >
                  <p className="flex items-center gap-1 text-[12px] font-bold">
                    <CheckCircle2 size={12} style={{ color: accent }} />{" "}
                    {t("payments").label}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div
                      className="grid size-20 shrink-0 place-items-center rounded-full"
                      style={{ background: DONUT }}
                    >
                      <div className="grid size-12 place-items-center rounded-full bg-white text-center font-bold">
                        ₹1,771
                      </div>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-1">
                      {PAYMENTS.map((p) => (
                        <li key={p.label} className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: p.color }}
                          />{" "}
                          {p.label}
                          <span className="ml-auto text-slate-500">
                            {p.pct}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Widget>
              )}
            </div>
          )}

          {(on("bills") || on("top") || on("sync")) && (
            <div className="flex flex-col gap-2 md:flex-row">
              {on("bills") && (
                <Widget
                  id="bills"
                  selected={sel}
                  onSelect={onSelect}
                  className="md:flex-[3]"
                >
                  <p className="mb-1 flex items-center gap-1 text-[12px] font-bold">
                    <Receipt size={12} style={{ color: accent }} />{" "}
                    {t("bills").label}
                  </p>
                  {BILLS.map((b) => (
                    <div
                      key={b[0]}
                      className="flex items-center gap-2 border-t border-slate-100 py-1"
                    >
                      <span className="font-semibold">{b[0]}</span>
                      <span className="text-slate-500">{b[1]}</span>
                      <span className="truncate">{b[2]}</span>
                      <span className="ml-auto font-semibold">{b[4]}</span>
                      <span className="rounded-full bg-slate-100 px-1.5">
                        {b[5]}
                      </span>
                    </div>
                  ))}
                </Widget>
              )}
              {on("top") && (
                <Widget
                  id="top"
                  selected={sel}
                  onSelect={onSelect}
                  className="md:flex-[3]"
                >
                  <p className="mb-1 text-[12px] font-bold">{t("top").label}</p>
                  {TOP.map((p, i) => (
                    <div
                      key={p[0]}
                      className="flex items-center gap-2 border-t border-slate-100 py-1"
                    >
                      <span className="text-slate-500">{i + 1}</span>
                      <span className="truncate">{p[0]}</span>
                      <span className="ml-auto text-slate-500">{p[1]}</span>
                      <span className="font-semibold">{p[2]}</span>
                    </div>
                  ))}
                </Widget>
              )}
              {on("sync") && (
                <Widget
                  id="sync"
                  selected={sel}
                  onSelect={onSelect}
                  className="md:flex-[2]"
                >
                  <p className="flex items-center justify-between text-[12px] font-bold">
                    <span className="flex items-center gap-1">
                      <Cloud size={12} style={{ color: accent }} />{" "}
                      {t("sync").label}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 text-emerald-700">
                      Online
                    </span>
                  </p>
                  <p className="mt-1 text-slate-600">
                    Your website and POS share the same products, stock,
                    customers and orders in real time.
                  </p>
                </Widget>
              )}
            </div>
          )}
          {stats.length === 0 &&
            !on("trend") &&
            !on("payments") &&
            !on("bills") &&
            !on("top") &&
            !on("sync") && (
              <p className="py-10 text-center text-slate-500">
                Every tile is hidden. Turn some back on from the list on the
                left.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

function TreeRow({
  active,
  onClick,
  icon,
  children,
  trailing,
  dim,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-space-2 rounded-md pr-1",
        active ? "bg-brand-600 text-white" : "hover:bg-black/[0.04]",
        dim && !active && "opacity-50",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-space-2 px-space-2 py-1.5 text-left text-[13px]"
      >
        {icon}
        <span className="truncate">{children}</span>
      </button>
      {trailing}
    </div>
  );
}

export function PosScreenEditor({ storeName }: { storeName: string }) {
  const [tiles, setTiles] = useState<Tile[]>(INITIAL);
  const [sel, setSel] = useState<Selection>("page");
  const [accent, setAccent] = useState(ACCENTS[0].key);
  const [open, setOpen] = useState(true);
  const [checkout, setCheckout] = useState({
    label: "Checkout",
    showTax: true,
    askCustomer: false,
  });
  const [lock, setLock] = useState({ pin: true, timeout: "5" });

  const patch = (id: TileId, p: Partial<Tile>) =>
    setTiles((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const addTile = () => {
    const hidden = tiles.find((t) => !t.visible);
    if (!hidden)
      return toast.success(
        "Nothing to add",
        "Every tile is already on the dashboard.",
      );
    patch(hidden.id, { visible: true });
    setSel(hidden.id);
  };
  const tile = tiles.find((t) => t.id === sel);

  return (
    <>
      <div className="mb-space-3 flex flex-wrap items-center justify-between gap-space-3">
        <Badge tone="warning">Sample data: not connected yet</Badge>
        <div className="flex gap-space-2">
          <Button
            variant="secondary"
            onClick={() => {
              setTiles(INITIAL);
              setAccent(ACCENTS[0].key);
              setSel("page");
            }}
          >
            Reset
          </Button>
          <Button onClick={notWired}>Save</Button>
        </div>
      </div>

      <div className="grid gap-space-4 lg:grid-cols-[250px_minmax(0,1fr)_260px]">
        <aside className="rounded-lg border border-line bg-card p-space-3 shadow-[var(--shadow-sm)]">
          <p className="px-space-2 pb-space-2 text-[13px] font-semibold text-ink-900">
            Point of sale
          </p>
          <TreeRow
            active={sel === "page"}
            onClick={() => setSel("page")}
            icon={<LayoutGrid size={14} />}
            trailing={
              <button
                type="button"
                aria-label={open ? "Collapse" : "Expand"}
                onClick={() => setOpen((o) => !o)}
                className={cn(
                  "rounded p-1",
                  sel === "page" ? "text-white" : "text-ink-600",
                )}
              >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            }
          >
            Dashboard
          </TreeRow>
          {open && (
            <div className="ml-space-4 mt-1 border-l border-line pl-space-2">
              {tiles.map((t) => (
                <TreeRow
                  key={t.id}
                  active={sel === t.id}
                  dim={!t.visible}
                  onClick={() => setSel(t.id)}
                  trailing={
                    <button
                      type="button"
                      aria-label={
                        t.visible ? `Hide ${t.label}` : `Show ${t.label}`
                      }
                      onClick={() => patch(t.id, { visible: !t.visible })}
                      className={cn(
                        "rounded p-1",
                        sel === t.id
                          ? "text-white"
                          : "text-ink-400 hover:text-ink-900",
                      )}
                    >
                      {t.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  }
                >
                  {t.label}
                </TreeRow>
              ))}
              <button
                type="button"
                onClick={addTile}
                className="mt-1 flex items-center gap-space-2 px-space-2 py-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
              >
                <Plus size={14} /> Add tile
              </button>
            </div>
          )}
          <div className="mt-space-3 border-t border-line pt-space-2">
            <TreeRow
              active={sel === "checkout"}
              onClick={() => setSel("checkout")}
              icon={<Receipt size={14} />}
            >
              Checkout
            </TreeRow>
            <TreeRow
              active={sel === "lock"}
              onClick={() => setSel("lock")}
              icon={<Lock size={14} />}
            >
              Lock screen
            </TreeRow>
          </div>
        </aside>

        <div className="min-w-0">
          <Preview
            tiles={tiles}
            sel={sel}
            onSelect={setSel}
            accent={accent}
            storeName={storeName}
          />
        </div>

        <aside className="rounded-lg border border-line bg-card p-space-4 shadow-[var(--shadow-sm)]">
          {sel === "page" && (
            <>
              <p className="mb-space-3 text-[14px] font-semibold text-ink-900">
                Dashboard
              </p>
              <Field
                label="Accent colour"
                hint="Used for highlights on the till."
              >
                <div className="flex gap-space-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      aria-label={a.name}
                      title={a.name}
                      onClick={() => setAccent(a.key)}
                      className={cn(
                        "size-8 rounded-full border-2",
                        accent === a.key
                          ? "border-ink-900"
                          : "border-transparent",
                      )}
                      style={{ background: a.key }}
                    />
                  ))}
                </div>
              </Field>
              <p className="text-[12.5px] text-ink-600">
                The till has a single page. Pick a tile on the left or in the
                preview to change it.
              </p>
            </>
          )}
          {tile && (
            <>
              <p className="mb-space-3 text-[14px] font-semibold text-ink-900">
                {INITIAL.find((i) => i.id === tile.id)!.label}
              </p>
              <Field label="Heading" htmlFor="tile-label">
                <Input
                  id="tile-label"
                  value={tile.label}
                  onChange={(e) => patch(tile.id, { label: e.target.value })}
                />
              </Field>
              <label className="flex items-center justify-between gap-space-3 text-[13.5px] text-ink-900">
                Show on dashboard
                <Switch
                  checked={tile.visible}
                  onChange={() => patch(tile.id, { visible: !tile.visible })}
                />
              </label>
            </>
          )}
          {sel === "checkout" && (
            <>
              <p className="mb-space-3 text-[14px] font-semibold text-ink-900">
                Checkout
              </p>
              <Field label="Button label" htmlFor="co-label">
                <Input
                  id="co-label"
                  value={checkout.label}
                  onChange={(e) =>
                    setCheckout({ ...checkout, label: e.target.value })
                  }
                />
              </Field>
              <label className="mb-space-3 flex items-center justify-between gap-space-3 text-[13.5px] text-ink-900">
                Show tax line
                <Switch
                  checked={checkout.showTax}
                  onChange={() =>
                    setCheckout({ ...checkout, showTax: !checkout.showTax })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-space-3 text-[13.5px] text-ink-900">
                Ask for a customer
                <Switch
                  checked={checkout.askCustomer}
                  onChange={() =>
                    setCheckout({
                      ...checkout,
                      askCustomer: !checkout.askCustomer,
                    })
                  }
                />
              </label>
            </>
          )}
          {sel === "lock" && (
            <>
              <p className="mb-space-3 text-[14px] font-semibold text-ink-900">
                Lock screen
              </p>
              <label className="mb-space-4 flex items-center justify-between gap-space-3 text-[13.5px] text-ink-900">
                Require staff PIN
                <Switch
                  checked={lock.pin}
                  onChange={() => setLock({ ...lock, pin: !lock.pin })}
                />
              </label>
              <Field label="Lock after" htmlFor="lock-timeout">
                <Select
                  id="lock-timeout"
                  value={lock.timeout}
                  onChange={(e) =>
                    setLock({ ...lock, timeout: e.target.value })
                  }
                >
                  <option value="1">1 minute idle</option>
                  <option value="5">5 minutes idle</option>
                  <option value="15">15 minutes idle</option>
                  <option value="0">Never</option>
                </Select>
              </Field>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
