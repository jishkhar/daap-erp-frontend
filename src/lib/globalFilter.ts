"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { CHANNELS as CHANNEL_INFO, type Channel } from "@/lib/erp";
import { notifyStorageChange, useStorageValue } from "@/lib/useStorageValue";

/** The portal's global filter (the header control): a period and a sales channel. Pages listed in FILTER_PAGES follow it; the server
 * works the dates out in the business's time zone (services/periods.py), so what is computed here only labels the header button. */

export type PeriodKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "6m"
  | "1y"
  | "fy"
  | "custom";

export type GlobalFilter = {
  period: PeriodKey;
  /** yyyy-mm-dd, only for "custom" */
  from: string | null;
  to: string | null;
  channel: Channel | null;
};

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "6m", label: "Last 6 months" },
  { key: "1y", label: "Last 1 year" },
  { key: "fy", label: "This financial year" },
  { key: "custom", label: "Custom range" },
];

export const PERIOD_LABEL = Object.fromEntries(
  PERIODS.map((p) => [p.key, p.label]),
) as Record<PeriodKey, string>;

/** Portal pages that follow the filter; every other page keeps the plain date in the header. */
export const FILTER_PAGES = [
  "/portal/dashboard",
  "/portal/analytics",
  "/portal/orders",
  "/portal/returns",
];

// A part of a page (e.g. one tab) that follows the filter turns the header control on while it is on screen.
let mounted = 0;
const listeners = new Set<() => void>();
function subscribeMounted(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Show the header filter while the calling component is mounted (for a tab, where FILTER_PAGES would cover the whole page). */
export function useGlobalFilterHere() {
  useEffect(() => {
    mounted += 1;
    listeners.forEach((fn) => fn());
    return () => {
      mounted -= 1;
      listeners.forEach((fn) => fn());
    };
  }, []);
}

/** True when some mounted component asked for the header filter. */
export function useGlobalFilterRequested() {
  return useSyncExternalStore(
    subscribeMounted,
    () => mounted > 0,
    () => false,
  );
}

const KEY = "erp_global_filter";
const DEFAULT: GlobalFilter = {
  period: "7d",
  from: null,
  to: null,
  channel: null,
};
const CHANNELS: Channel[] = ["online", "pos", "whatsapp"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parse(raw: string | null): GlobalFilter {
  if (!raw) return DEFAULT;
  try {
    const v = JSON.parse(raw) as Partial<GlobalFilter>;
    const period = PERIODS.some((p) => p.key === v.period)
      ? (v.period as PeriodKey)
      : DEFAULT.period;
    const channel = CHANNELS.includes(v.channel as Channel)
      ? (v.channel as Channel)
      : null;
    const from = typeof v.from === "string" && ISO.test(v.from) ? v.from : null;
    const to = typeof v.to === "string" && ISO.test(v.to) ? v.to : null;
    // a custom range missing either end falls back to the default
    if (period === "custom" && (!from || !to || from > to))
      return { ...DEFAULT, channel };
    return { period, from, to, channel };
  } catch {
    return DEFAULT;
  }
}

function save(f: GlobalFilter) {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    // storage blocked: the choice lasts until the page reloads
  }
  notifyStorageChange();
}

/** The current filter, its query-string form for the API, and a setter. A shared link (?period=…&from=…&to=…&channel=…) wins over the
 * remembered choice, once, when the page opens. */
export function useGlobalFilter() {
  const raw = useStorageValue(KEY);
  const filter = useMemo(() => parse(raw), [raw]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (!sp.has("period") && !sp.has("channel")) return;
    const current = parse(localStorage.getItem(KEY));
    const next = parse(
      JSON.stringify({
        period: sp.get("period") ?? current.period,
        from: sp.get("from"),
        to: sp.get("to"),
        channel: sp.has("channel") ? sp.get("channel") : current.channel,
      }),
    );
    save(next);
  }, []);

  const setFilter = useCallback((next: GlobalFilter) => {
    save(next);
    // keep a shared link in step with what is on screen
    const url = new URL(window.location.href);
    if (url.searchParams.has("period") || url.searchParams.has("channel")) {
      url.searchParams.set("period", next.period);
      for (const [k, v] of [
        ["from", next.period === "custom" ? next.from : null],
        ["to", next.period === "custom" ? next.to : null],
        ["channel", next.channel],
      ] as const)
        if (v) url.searchParams.set(k, v);
        else url.searchParams.delete(k);
      window.history.replaceState(null, "", url);
    }
  }, []);

  const params = useMemo(
    () => ({
      period: filter.period,
      date_from: filter.period === "custom" ? filter.from : null,
      date_to: filter.period === "custom" ? filter.to : null,
      channel: filter.channel,
    }),
    [filter],
  );

  return { filter, params, setFilter };
}

// ----------------------------------------------------------------------------------------- dates, for the header label only
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** The same day n months earlier, clamped to the end of a shorter month. */
function monthsBack(d: Date, n: number) {
  const last = new Date(d.getFullYear(), d.getMonth() - n + 1, 0).getDate();
  return new Date(
    d.getFullYear(),
    d.getMonth() - n,
    Math.min(d.getDate(), last),
  );
}

export function todayIso() {
  return iso(new Date());
}

/** The dates a filter covers, by the browser's clock (the server's answer is the one the figures use). */
export function periodDates(f: GlobalFilter): { from: string; to: string } {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const range = (a: Date, b: Date) => ({ from: iso(a), to: iso(b) });
  switch (f.period) {
    case "today":
      return range(t, t);
    case "yesterday":
      return range(addDays(t, -1), addDays(t, -1));
    case "7d":
      return range(addDays(t, -6), t);
    case "30d":
      return range(addDays(t, -29), t);
    case "this_month":
      return range(new Date(t.getFullYear(), t.getMonth(), 1), t);
    case "last_month":
      return range(
        new Date(t.getFullYear(), t.getMonth() - 1, 1),
        new Date(t.getFullYear(), t.getMonth(), 0),
      );
    case "6m":
      return range(addDays(monthsBack(t, 6), 1), t);
    case "1y":
      return range(addDays(monthsBack(t, 12), 1), t);
    case "fy":
      return range(
        new Date(
          t.getMonth() >= 3 ? t.getFullYear() : t.getFullYear() - 1,
          3,
          1,
        ),
        t,
      );
    case "custom":
      return { from: f.from ?? iso(t), to: f.to ?? iso(t) };
  }
}

const dayMonth = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const full = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "27 Oct 2026", or "21 Oct – 27 Oct 2026" / "1 Dec 2025 – 10 Jan 2026" for a range. */
export function formatSpan(from: string, to: string) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (from === to) return full.format(b);
  return `${a.getFullYear() === b.getFullYear() ? dayMonth.format(a) : full.format(a)} – ${full.format(b)}`;
}

/** The period as a server endpoint worked it out (services/periods.py `as_dict`). */
export type ServerPeriod = {
  key: string;
  from: string;
  to: string;
  prev_from: string;
  prev_to: string;
  days: number;
  channel: string | null;
};

/** "Last 7 days · 21 Oct – 27 Oct 2026 · POS", from the period the server worked out. */
export function periodText(p: ServerPeriod | undefined): string {
  if (!p) return " ";
  const name = PERIOD_LABEL[p.key as PeriodKey] ?? "Custom range";
  const channel = p.channel
    ? ` · ${CHANNEL_INFO[p.channel as Channel]?.label ?? p.channel}`
    : "";
  return `${name} · ${formatSpan(p.from, p.to)}${channel}`;
}

/** "vs 14 Oct – 20 Oct 2026": what the change arrows compare with. */
export function prevText(p: ServerPeriod | undefined): string {
  return p ? `vs ${formatSpan(p.prev_from, p.prev_to)}` : "";
}
