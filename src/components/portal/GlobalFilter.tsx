"use client";

import { Popover } from "@base-ui/react/popover";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CHANNEL_ORDER, CHANNELS, type Channel } from "@/lib/erp";
import {
  formatSpan,
  PERIOD_LABEL,
  PERIODS,
  periodDates,
  todayIso,
  useGlobalFilter,
  type PeriodKey,
} from "@/lib/globalFilter";

const dateInput =
  "h-9 w-full rounded-md border border-line bg-card px-space-2 text-[13px] text-ink-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none";

/** The header's period + channel filter for the pages that follow it (FILTER_PAGES). A preset applies at once; a custom range applies
 * when both dates are set. */
export function GlobalFilter() {
  const { filter, setFilter } = useGlobalFilter();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const span = periodDates(filter);
  const today = todayIso();

  const openChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      // start the custom fields from what is showing now
      setCustom(filter.period === "custom");
      setFrom(span.from);
      setTo(span.to);
    }
  };
  const pick = (period: PeriodKey) => {
    if (period === "custom") return setCustom(true);
    setFilter({ ...filter, period, from: null, to: null });
    setOpen(false);
  };
  const channel = (c: Channel | null) => setFilter({ ...filter, channel: c });
  const customOk = !!from && !!to && from <= to;

  return (
    <Popover.Root open={open} onOpenChange={openChange}>
      <Popover.Trigger
        aria-label={`Showing ${PERIOD_LABEL[filter.period]}${filter.channel ? `, ${CHANNELS[filter.channel].label} only` : ""}. Change`}
        className="mr-space-2 flex h-9 items-center gap-space-2 rounded-md border border-line px-space-2 text-[13px] font-medium text-ink-600 hover:bg-paper focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none md:px-space-3"
      >
        <CalendarDays size={15} className="shrink-0 text-ink-400" />
        <span className="hidden items-center gap-space-1 md:flex">
          <span className="font-semibold text-ink-900">
            {PERIOD_LABEL[filter.period]}
          </span>
          {/* by the browser's clock: the server and the browser can be on different days for a moment */}
          <span suppressHydrationWarning className="hidden lg:inline">
            · {formatSpan(span.from, span.to)}
          </span>
        </span>
        {filter.channel && (
          <span className="rounded-full bg-brand-50 px-space-2 py-px text-[11.5px] font-semibold text-brand-700">
            {CHANNELS[filter.channel].label}
          </span>
        )}
        <ChevronDown size={15} className="hidden text-ink-400 md:block" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup
            aria-label="Period and channel"
            className="w-[340px] max-w-[calc(100vw-16px)] rounded-lg border border-line bg-card p-space-3 text-ink-900 shadow-[var(--shadow-md)] outline-none"
          >
            <p className="mb-space-2 text-[11.5px] font-semibold tracking-wide text-ink-400 uppercase">
              Period
            </p>
            <div className="grid grid-cols-2 gap-1">
              {PERIODS.map((p) => {
                const on = custom
                  ? p.key === "custom"
                  : filter.period === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(p.key)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-space-2 py-1.5 text-left text-[13px]",
                      on
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-ink-600 hover:bg-paper",
                    )}
                  >
                    {p.label}
                    {on && <Check size={14} />}
                  </button>
                );
              })}
            </div>

            {custom && (
              <form
                className="mt-space-2 rounded-md border border-line bg-paper p-space-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!customOk) return;
                  setFilter({ ...filter, period: "custom", from, to });
                  setOpen(false);
                }}
              >
                <div className="grid grid-cols-2 gap-space-2">
                  <label className="text-[12px] font-medium text-ink-600">
                    From
                    <input
                      type="date"
                      value={from}
                      max={to || today}
                      onChange={(e) => setFrom(e.target.value)}
                      className={dateInput}
                    />
                  </label>
                  <label className="text-[12px] font-medium text-ink-600">
                    To
                    <input
                      type="date"
                      value={to}
                      min={from || undefined}
                      max={today}
                      onChange={(e) => setTo(e.target.value)}
                      className={dateInput}
                    />
                  </label>
                </div>
                {from && to && from > to && (
                  <p className="mt-1 text-[12px] text-error">
                    The start date must be on or before the end date.
                  </p>
                )}
                <Button
                  type="submit"
                  className="mt-space-2 w-full"
                  disabled={!customOk}
                >
                  Apply
                </Button>
              </form>
            )}

            <p className="mt-space-3 mb-space-2 text-[11.5px] font-semibold tracking-wide text-ink-400 uppercase">
              Sales channel
            </p>
            <div className="flex flex-wrap gap-1">
              {[null, ...CHANNEL_ORDER].map((c) => (
                <button
                  key={c ?? "all"}
                  type="button"
                  aria-pressed={filter.channel === c}
                  onClick={() => channel(c)}
                  className={cn(
                    "rounded-full border px-space-3 py-1 text-[12.5px] font-semibold",
                    filter.channel === c
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line text-ink-600 hover:bg-paper",
                  )}
                >
                  {c ? CHANNELS[c].label : "All channels"}
                </button>
              ))}
            </div>

            <p
              suppressHydrationWarning
              className="mt-space-3 border-t border-line pt-space-2 text-[12px] text-ink-400"
            >
              Showing {formatSpan(span.from, span.to)}
              {filter.channel
                ? ` · ${CHANNELS[filter.channel].label} only`
                : ""}
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
