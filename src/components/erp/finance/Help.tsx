import { InfoTip } from "@/components/ui/InfoTip";

/** Plain-language meaning of the terms used across the Finance screens, so a non-accountant can read them. */
const GLOSSARY: Record<string, string> = {
  // Overview
  "Net revenue":
    "Sales this month minus returns: what you actually earned from selling.",
  "Gross profit":
    "Net revenue minus what the goods cost you. The percentage is the margin: gross profit as a share of net revenue.",
  "Net profit":
    "What is left after all costs: gross profit minus stock write-offs and operating expenses, plus other income.",
  "Cash & bank":
    "Money in your cash drawers and bank accounts. The amount with the gateway is money customers paid online that the payment provider hasn't transferred to you yet.",
  "Customers owe us":
    "Orders already delivered but not fully paid yet, for example cash on delivery. Amounts are grouped by how many days overdue they are; 'Not due' is not yet late.",
  "We owe customers":
    "Money you owe back to customers: returns not yet refunded and advances or credits they hold with you.",
  "We owe suppliers":
    "Goods you have received from suppliers but haven't paid for yet. Amounts are grouped by how many days past the bill's due date they are; 'Not due' is not yet late.",
  "Stock value":
    "What the stock you hold is worth at your purchase cost, including stock currently in transit between branches.",
  "GST payable":
    "GST you collected on sales (output tax) minus the GST you paid on purchases (input credit). This is what you owe the government.",
  "GST credit":
    "You paid more GST on purchases than you collected on sales, so the difference carries forward as credit.",
  "Close the books":
    "Locks a period so nobody can add or change manual journal entries dated on or before the chosen date. It protects figures you have already reported or filed.",
  // Balance sheet
  Assets:
    "Everything the business owns: cash, bank balances, stock, and money customers owe you.",
  Liabilities:
    "Everything the business owes: suppliers, GST payable, and customer credits.",
  Equity:
    "The owners' share: what is left of the assets after all liabilities are paid.",
  "Retained earnings":
    "Profit the business has made to date and kept, rather than paid out.",
  // GST
  "Taxable sales":
    "The value of your sales before GST, after subtracting credit notes for returns.",
  CGST: "Central GST. On a sale within the same state, half of the GST goes to the Centre as CGST.",
  SGST: "State GST. On a sale within the same state, the other half of the GST goes to the state as SGST.",
  IGST: "Integrated GST. Charged instead of CGST and SGST when the sale is to a customer in another state.",
  "Output tax":
    "GST you charged your customers (CGST + SGST + IGST). You pass it on to the government.",
  "Input credit":
    "GST you paid on purchases and expenses. You can subtract it from the GST you owe.",
  "Net GST payable":
    "Output tax minus input credit. The amount to pay with your GST return.",
  "By tax rate":
    "Your sales split by GST rate (5%, 12%, 18% and so on), with invoices and credit notes shown separately.",
  "By GST registration":
    "GST is filed separately for each GSTIN (a registration in one state). Input credit can only be set off against tax under the same GSTIN.",
  Tax: "The GST amount on these documents.",
  // Product margin
  Sold: "Units sold in the selected period.",
  Revenue: "Sales value of those units, before cost.",
  Margin:
    "Gross profit on these sales and, in brackets, as a percentage of revenue.",
  Returns: "Share of units sold that customers sent back.",
  "In stock": "Units on hand right now.",
  Turn: "Stock turn: how many times you sell through your average stock in a year. A higher number means stock sells faster; blank means there is nothing to compare yet.",
  "Last receipt":
    "Days since you last received this stock from a supplier. A long gap can mean slow-moving stock.",
  // Receivables & payables
  Ageing:
    "Groups unpaid amounts by how overdue they are. 'Not due' is not yet past its due date; the other columns show days overdue.",
  "Not due": "Not yet past the due date.",
  // Tax invoices
  Type: "Invoice is issued when goods are delivered. A credit note reverses part or all of an invoice after a return.",
  Taxable: "The value of the sale before GST.",
  GST: "Total GST on the document: CGST + SGST + IGST.",
  // Expenses
  "Expense status":
    "Submitted: waiting for approval. Approved: accepted but not yet paid. Paid: settled and posted to the books. Rejected: declined.",
  // Reconciliation
  "Import a settlement report":
    "A settlement is a payout from your payment gateway. Importing it lets the system tick off each customer payment it covers and record the gateway's fee as an expense.",
  "Paid by customers, not yet settled":
    "Payments customers have made that the gateway hasn't paid out to you yet. They clear once a settlement report containing them is imported.",
  Settlements:
    "Payouts imported from your payment gateway. Matched means every line was found against a customer payment; anything unmatched needs checking.",
  Fee: "What the payment gateway kept from the payout for processing the payments.",
  // GSTR-1 view
  "B2B invoices":
    "Business-to-business sales: invoices to buyers who gave a GSTIN. The buyer claims input credit on these, so each invoice is reported on its own line.",
  "B2C sales":
    "Business-to-consumer sales: sales to buyers without a GSTIN. They are reported in bulk, summed by place of supply and tax rate, not invoice by invoice.",
  "Credit notes: registered buyers":
    "Returns or price reductions against B2B invoices. They reduce the tax you report for the period and are shown as negatives.",
  "Credit notes: consumers":
    "Returns against B2C sales, summed by place of supply and tax rate. Shown as negatives.",
  "HSN summary":
    "Quantity and value of what you sold, grouped by HSN code (the standard goods classification) and GST rate. GSTR-1 requires this summary.",
  "Documents issued":
    "The range of invoice and credit note numbers you issued in the period, with how many. Used to show that your numbering has no gaps.",
  "Customer GSTIN": "The buyer's 15-character GST registration number.",
  "Place of supply":
    "The state where the sale is treated as taking place. It decides whether CGST + SGST (same state) or IGST (other state) applies.",
  Supply:
    "Intra-state: buyer in the same state, so CGST + SGST apply. Inter-state: buyer in another state, so IGST applies.",
  Rate: "The GST rate charged on the sale, for example 5%, 12% or 18%.",
  HSN: "Harmonised System code: the standard code that classifies the goods being sold. It sets the GST rate.",
  Qty: "Units sold under this HSN code and rate, net of returns.",
  Total: "Taxable value plus all GST on the document.",
  Count: "How many documents were issued in this number range.",
  // Journal
  Entry:
    "One accounting record. Every entry has debits and credits that must add up to the same total.",
  Source:
    "What created the entry: automatic ones come from sales, payments, returns and so on; manual ones are entered by your team.",
  Debit:
    "Left side of an entry. Increases assets and expenses, decreases liabilities and income.",
  Credit:
    "Right side of an entry. Increases liabilities and income, decreases assets and expenses. Debits and credits must be equal.",
};

export function Help({
  term,
  title,
  above,
  align,
}: {
  term: string;
  title?: string;
  above?: boolean;
  align?: "left" | "right";
}) {
  const text = GLOSSARY[term];
  if (!text) return null;
  return (
    <InfoTip title={title ?? term} above={above} align={align}>
      {text}
    </InfoTip>
  );
}
