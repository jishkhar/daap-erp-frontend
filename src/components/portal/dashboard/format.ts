/** Whole-number % change from `previous` to `current`; null when there is nothing to compare with (no invented trend from a zero). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

const compact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** "₹1.2K" / "₹3.4L" for chart axes; the exact amount is always in the tooltip. */
export const compactMoney = (minor: number) =>
  `₹${compact.format(minor / 100)}`;

export const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  wallet: "Wallet",
  netbanking: "Net banking",
  cod: "Cash on delivery",
  other: "Other",
};

export const RANGE_LABEL = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "3m": "Last 3 months",
  "1y": "Last year",
} as const;
