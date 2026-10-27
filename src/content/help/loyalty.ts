import type { Doc } from "./types";

export const loyalty: Doc = {
  slug: "loyalty",
  title: "Loyalty rules",
  summary:
    "How customers earn and redeem points, qualify for Regular, Silver, Gold and Platinum membership, and get points back after cancellations or refunds.",
  setup: { label: "Open Customers", href: "/portal/customers" },
  sections: [
    {
      id: "join-membership",
      title: "Become a member",
      blocks: [
        {
          t: "p",
          text: "Signing in does not automatically create membership. In **My Account → Profile**, customers submit their **name, date of birth, phone number and email** using **Become a member**. All four are required. Only enrolled members can earn or redeem loyalty points; customers can still shop without joining.",
        },
        {
          t: "note",
          tone: "info",
          text: "Existing points are preserved and become usable after enrollment. New purchases made before joining do not earn points. Customer Management shows **Not a member** until enrollment is complete.",
        },
      ],
    },
    {
      id: "point-rules",
      title: "Earning and using points",
      blocks: [
        {
          t: "cards",
          items: [
            {
              title: "Earn points on orders",
              text: "Points are calculated from a customer's total eligible order spend, after completed refunds. By default, each complete **₹100 earns 1 point**. Cancelled orders do not earn points. Purchases must be linked to an enrolled member.",
            },
            {
              title: "Redeem at storefront checkout",
              text: "Signed-in, enrolled members can exchange points for an order discount. The default conversion is **100 points = ₹1 off**. Redeem in complete conversion blocks, within the available balance and the checkout limit shown for that order.",
            },
            {
              title: "Cancellations and refunds",
              text: "Cancelling an order restores all points redeemed on it. Completed refunds restore redeemed points proportionally, up to the amount originally used. Refunds also reduce the spend used to calculate earned points.",
            },
            {
              title: "Staff adjustments",
              text: "Staff with the required permission can add or deduct points from a customer's profile and must enter a reason. Adjustments and checkout redemptions affect the customer's current balance and membership eligibility.",
            },
          ],
        },
        {
          t: "note",
          tone: "info",
          text: "These numbers are the defaults. Your workspace's configured earning rate, membership thresholds, inactivity window and redemption conversion may differ. Check **Customers → Loyalty** for the earning rate and recent adjustments.",
        },
      ],
    },
    {
      id: "customer-tiers",
      title: "Membership: Regular, Silver, Gold, Platinum and Inactive",
      blocks: [
        {
          t: "cards",
          items: [
            {
              title: "Regular",
              text: "The starting membership for customers below the Silver threshold, including newly joined customers. There is no separate New membership.",
            },
            {
              title: "Silver",
              text: "Current points meet the Silver threshold, but are below Gold. The default threshold is **25 points**.",
            },
            {
              title: "Gold",
              text: "Current points meet the Gold threshold, but are below Platinum. The default threshold is **50 points**.",
            },
            {
              title: "Platinum",
              text: "The highest membership, starting at **100 points by default**. Existing VIP thresholds are kept as the Platinum threshold; Silver and Gold initially use one quarter and one half of that value. Adjustments, redemptions and refunds can move a customer between memberships.",
            },
            {
              title: "Inactive",
              text: "A customer who has ordered before but has no order within the inactivity window is Inactive, regardless of points. The default window is **180 days**. A recent order restores the membership that matches the current point balance.",
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
            "Open a customer's profile to see their current points, membership and adjustment history.",
            "Open **Customer Management → Membership** to configure Silver, Gold and Platinum point thresholds, the inactivity window and the points-to-money conversion. Set thresholds in ascending order. Regular applies below Silver.",
            "With configuration permission, change **Points per ₹100 spent** in the Loyalty tab. Setting the rate to **0** stops points being earned from order spend.",
          ],
        },
        {
          t: "note",
          tone: "warn",
          text: "Earned points are calculated using the current earning rate across eligible order spend. Changing that rate can change existing balances and customer memberships; it applies to more than just future orders.",
        },
      ],
    },
  ],
};
