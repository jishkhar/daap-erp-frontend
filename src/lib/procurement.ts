/** Supplier bills and payments. A goods receipt (GRN) is the supplier's bill: what we owe for that delivery. Each payment says which
 * bills it paid; returns against a bill reduce it. Due = the receipt date + the order's payment terms. */

export type BillState = "paid" | "part_paid" | "unpaid" | "overdue";

export const BILL_STATE_LABEL: Record<BillState, string> = {
  paid: "Paid",
  part_paid: "Part paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
};

export const BILL_STATE_TONE: Record<
  BillState,
  "success" | "warning" | "neutral" | "error"
> = {
  paid: "success",
  part_paid: "warning",
  unpaid: "neutral",
  overdue: "error",
};

export type SupplierBill = {
  id: string; // the goods receipt
  grn_number: string;
  supplier_invoice_number: string | null;
  po_id: string;
  po_number: string;
  branch_id: string;
  branch_code: string | null;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  total_minor: number;
  returned_minor: number;
  paid_minor: number;
  owed_minor: number;
  received_at: string;
  due_date: string;
  payment_state: BillState;
  /** Where the shop labels this delivery asked the branch's till for stand (on a purchase order's receipts only). */
  labels?: ReceiptLabels | null;
  cursor?: string;
};

/** A goods receipt's shop labels: the till prints them, then marks them printed (or dismisses them). */
export type ReceiptLabels = {
  status: "open" | "printed" | "dismissed";
  part_printed: boolean;
  labels: number;
  printed: number;
  closed_at: string | null;
  closed_by_name: string | null;
};

/** One line saying where a receipt's labels stand. */
export function receiptLabelsText(l: ReceiptLabels): string {
  if (l.status === "printed")
    return `Labels printed${l.closed_by_name ? ` by ${l.closed_by_name}` : ""}`;
  if (l.status === "dismissed")
    return `Labels dismissed${l.closed_by_name ? ` by ${l.closed_by_name}` : ""}`;
  if (l.part_printed)
    return `Labels: ${l.printed} of ${l.labels} printed on the till`;
  return `Labels: ${l.labels} waiting to print on the till`;
}

/** A purchase order's bills added up. */
export type PoBilling = {
  billed_minor: number;
  returned_minor: number;
  paid_minor: number;
  owed_minor: number;
  overdue: boolean;
};

export type SupplierPaymentMethod = "CASH" | "BANK_TRANSFER" | "UPI" | "CARD";

export const SUPPLIER_PAYMENT_METHOD_LABEL: Record<
  SupplierPaymentMethod,
  string
> = {
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CARD: "Card",
  CASH: "Cash",
};

export type SupplierPayment = {
  id: string;
  payment_number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  branch_id: string | null;
  amount_minor: number;
  method: SupplierPaymentMethod;
  reference: string | null;
  paid_on: string;
  notes: string | null;
  created_at: string;
  allocations: {
    grn_id: string;
    grn_number: string;
    supplier_invoice_number: string | null;
    po_id: string;
    po_number: string;
    amount_minor: number;
  }[];
  cursor?: string;
};

/** How a bill is named to a person: the supplier's own invoice number when there is one, else our receipt number. */
export function billName(b: {
  grn_number: string;
  supplier_invoice_number: string | null;
}): string {
  return b.supplier_invoice_number
    ? `${b.supplier_invoice_number} (${b.grn_number})`
    : b.grn_number;
}
