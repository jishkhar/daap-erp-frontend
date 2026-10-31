import type { PriceMode } from "./billing-types";

/** How a plan price is labelled: "+ 18% GST" when GST is added on top, "incl. 18% GST" when it is inside the price. */
export function gstNote(mode: PriceMode | undefined, rate: number | undefined) {
  if (rate === undefined || Number(rate) === 0) return "";
  return mode === "inclusive"
    ? `incl. ${Number(rate)}% GST`
    : `+ ${Number(rate)}% GST`;
}
