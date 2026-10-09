import type { Doc } from "./types";

export const onlineStore: Doc = {
  slug: "online-store",
  title: "Online store",
  summary:
    "Connect your website, how orders reach the right branch, and delivery and pickup.",
  setup: {
    label: "Set up the online channel",
    href: "/portal/settings/channels/online",
  },
  sections: [
    {
      id: "how-it-works",
      title: "How it works",
      blocks: [
        {
          t: "p",
          text: "Your website talks to this system with an **API key**. When a shopper places an order, the website sends it here. The order is recorded on the **Online** channel, stock is reserved at the right branch, and it appears in Orders and Customers like any other sale.",
        },
        {
          t: "p",
          text: "The shopper never picks a branch. The system chooses one for them based on delivery pincode and stock (see Delivery and pickup below).",
        },
      ],
    },
    {
      id: "connect",
      title: "Connect your website",
      blocks: [
        {
          t: "steps",
          items: [
            "Open [Settings → Sales channels → Online](/portal/settings/channels/online).",
            "Choose **New API key**. You can tie the key to one branch, or leave it open to all.",
            "Copy the key straight away. It is shown only once.",
            "Give the key to whoever builds or hosts your website, to use when placing orders.",
          ],
        },
        {
          t: "note",
          tone: "warn",
          text: "Treat an API key like a password. If it leaks, revoke it on the same page and create a new one.",
        },
        {
          t: "p",
          text: "The top of the [Online store page](/portal/channels/online) shows whether the channel is set up, and links back here when it is not. Setup needs a branch that delivers online orders and an API key.",
        },
      ],
    },
    {
      id: "delivery-pickup",
      title: "Delivery and pickup",
      blocks: [
        {
          t: "p",
          text: "Set these per branch, in [Settings → Locations](/portal/settings/branches), under each branch's channel and delivery settings.",
        },
        {
          t: "table",
          head: ["Setting", "What it does"],
          rows: [
            [
              "Delivers online and WhatsApp orders",
              "Lets the branch supply delivery orders. At least one branch needs this on.",
            ],
            [
              "Delivery priority",
              "When more than one branch could serve an order, the lower number is tried first.",
            ],
            [
              "Serviceable pincodes",
              "A branch delivers only to the pincodes it lists. Until any branch lists one, delivery is not limited by pincode.",
            ],
            ["Minimum order", "Orders below this are refused for that branch."],
            [
              "Customers can pick up here",
              "Offers the branch as a pickup point.",
            ],
            [
              "Open or closed",
              "A branch forced to closed gets no online orders.",
            ],
          ],
        },
        {
          t: "p",
          text: "A delivery order goes to **one** branch that delivers online, serves the pincode, is open, meets the minimum, and has **every item** in stock. The order is never split across branches. If no branch qualifies, the order is refused with the reason (not deliverable, below the minimum, or out of stock).",
        },
      ],
    },
    {
      id: "prices-tax",
      title: "Prices and tax",
      blocks: [
        {
          t: "p",
          text: "Whether prices include tax, and each product's rate, come from [Settings → Taxes and duties](/portal/settings/taxes). The same rules apply online and on the till. See the GST doc.",
        },
      ],
    },
    {
      id: "payments",
      title: "Payments",
      blocks: [
        {
          t: "note",
          tone: "info",
          text: "Cash on delivery works today. Online card and UPI payments are not set up yet; each business will connect its own payment gateway in a later release.",
        },
      ],
    },
    {
      id: "theme",
      title: "Theme and website text",
      blocks: [
        {
          t: "p",
          text: "[Sales channels → Online](/portal/channels/online) shows where you will choose a theme and edit the text on your website: announcement bar, hero heading, footer and so on.",
        },
        {
          t: "note",
          tone: "warn",
          text: "This screen is a preview with sample data. Changes are not saved or shown on your website yet.",
        },
      ],
    },
    {
      id: "orders",
      title: "Finding your online orders",
      blocks: [
        {
          t: "p",
          text: "Open [Orders](/portal/orders) and set the **Channel** filter to Online. The same page lists POS and WhatsApp orders.",
        },
      ],
    },
  ],
};
