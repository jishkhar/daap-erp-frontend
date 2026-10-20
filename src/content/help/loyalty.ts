import type { Doc } from "./types";

export const loyalty: Doc = {
  slug: "loyalty",
  title: "Loyalty rules",
  summary:
    "How customers earn and redeem points, qualify for VIP, and get points back after cancellations or refunds.",
  setup: { label: "Open Customers", href: "/portal/customers" },
  sections: [
    {
      id: "point-rules",
      title: "Earning and using points",
      blocks: [
        {
          t: "cards",
          items: [
            {
              title: "Earn points on orders",
              text: "Points are calculated from a customer's total eligible order spend, after completed refunds. By default, each complete **₹100 earns 1 point**. Cancelled orders do not earn points. Purchases must be linked to the customer.",
            },
            {
              title: "Redeem at storefront checkout",
              text: "Signed-in customers can exchange points for an order discount. The default conversion is **100 points = ₹1 off**. Redeem in complete conversion blocks, within the available balance and the checkout limit shown for that order.",
            },
            {
              title: "Cancellations and refunds",
              text: "Cancelling an order restores all points redeemed on it. Completed refunds restore redeemed points proportionally, up to the amount originally used. Refunds also reduce the spend used to calculate earned points.",
            },
            {
              title: "Staff adjustments",
              text: "Staff with the required permission can add or deduct points from a customer's profile and must enter a reason. Adjustments and checkout redemptions affect the customer's current balance and VIP eligibility.",
            },
          ],
        },
        {
          t: "note",
          tone: "info",
          text: "These numbers are the defaults. Your workspace's configured earning rate, VIP threshold, inactivity window and redemption conversion may differ. Check **Customers → Loyalty** for the earning rate and recent adjustments.",
        },
      ],
    },
    {
      id: "customer-tiers",
      title: "Customer tiers: New, Regular, VIP and Inactive",
      blocks: [
        {
          t: "cards",
          items: [
            {
              title: "VIP",
              text: "Current loyalty balance meets the VIP threshold: **100 points by default**. VIP is checked first, even for a new or inactive customer. Redeeming points, refunds or staff deductions can move the balance below the threshold.",
            },
            {
              title: "New",
              text: "Below the VIP threshold, joined within the last **30 days**, and has **at most one order**. A second order or the end of the new-customer window can change this tier.",
            },
            {
              title: "Inactive",
              text: "Does not qualify as VIP or New, has ordered before, and has no recent order within the inactivity window: **180 days by default**.",
            },
            {
              title: "Regular",
              text: "Any customer who does not currently qualify as VIP, New or Inactive. Tiers are calculated automatically from the current point balance, account age and order history.",
            },
          ],
        },
      ],
    },
    {
      id: "manage-loyalty",
      title: "Manage loyalty and view customer balances",
      blocks: [
        {
          t: "steps",
          items: [
            "Open [Customers](/portal/customers), then the **Loyalty** tab to see the earning rate, top members and recent adjustments.",
            "Open a customer's profile to see their current points, tier and adjustment history.",
            "With configuration permission, change **Points per ₹100 spent** in the Loyalty tab. Setting the rate to **0** stops points being earned from order spend.",
          ],
        },
        {
          t: "note",
          tone: "warn",
          text: "Earned points are calculated using the current earning rate across eligible order spend. Changing that rate can change existing balances and customer tiers; it applies to more than just future orders.",
        },
      ],
    },
  ],
};
