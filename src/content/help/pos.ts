import type { Doc } from "./types";

export const pos: Doc = {
  slug: "pos",
  title: "POS (the till)",
  summary:
    "Pair a terminal to a branch, give cashiers a PIN, and see what the till shares with your store.",
  setup: { label: "Open POS settings", href: "/portal/settings/channels/pos" },
  sections: [
    {
      id: "how-it-works",
      title: "How it works",
      blocks: [
        {
          t: "p",
          text: "The DAAP POS app runs on a till (a tablet or computer in your shop). Each till is **paired to one branch**. After that it sells with that branch's products and stock, and its sales appear in your Orders on the POS channel.",
        },
        {
          t: "list",
          items: [
            "Products, prices, tax rates, stock and customers are the same as your website's.",
            "A sale at the till lowers the same stock your website shows.",
            "The till keeps selling if the internet drops, and sends its sales when it reconnects.",
          ],
        },
      ],
    },
    {
      id: "before-you-start",
      title: "Before you start",
      blocks: [
        {
          t: "steps",
          items: [
            "Open [Settings → Sales channels → POS](/portal/settings/channels/pos).",
            "In **Branches on this channel**, turn on **Takes POS sales** for the branch that has a till. A branch with this off (for example a warehouse) refuses POS sales.",
            "Install the DAAP POS app on the device.",
          ],
        },
      ],
    },
    {
      id: "pair",
      title: "Pair a terminal",
      blocks: [
        {
          t: "steps",
          items: [
            "On the same page, pick the branch. Its **POS terminals** card appears below.",
            "Choose **Generate pairing code**. A large code and a QR appear.",
            "On the till, enter the code in the app, or scan the QR.",
            "The terminal appears in the list as paired.",
          ],
        },
        {
          t: "note",
          tone: "warn",
          text: "A pairing code works once and expires shortly after it is created. For security it is shown only at that moment. If it runs out, generate another.",
        },
        {
          t: "p",
          text: "The POS terminals card lists every paired till with its device details and when it was last seen. You can rename a terminal there.",
        },
      ],
    },
    {
      id: "cashiers",
      title: "Cashiers and PINs",
      blocks: [
        {
          t: "p",
          text: "Cashiers sign in at the till with a **6-digit PIN**, not a password. Set it in the **Cashiers** card for that branch, on the same POS settings page.",
        },
        {
          t: "steps",
          items: [
            "Pick the branch on the POS settings page and find its Cashiers card.",
            "Choose a person and set their PIN. Add people and roles in [Settings → Users](/portal/settings/staff) first if they are not listed.",
            "The till receives the PIN on its next sync.",
          ],
        },
        {
          t: "p",
          text: "You can remove a PIN at any time, which stops that person from signing in at the till.",
        },
      ],
    },
    {
      id: "revoke",
      title: "Lost or retired device",
      blocks: [
        {
          t: "p",
          text: "Revoke the terminal from its row in the POS terminals card. The till is signed out at once and wipes its data. To use that device again it must be paired with a new code.",
        },
      ],
    },
    {
      id: "screen",
      title: "Till screen theme and text",
      blocks: [
        {
          t: "p",
          text: "[Sales channels → POS](/portal/channels/pos) shows where you will arrange the till's dashboard and change its text, like Shopify's POS editor.",
        },
        {
          t: "note",
          tone: "warn",
          text: "This screen is a preview with sample data. Changes are not saved, and the real till does not read them yet.",
        },
      ],
    },
    {
      id: "orders",
      title: "Finding POS sales",
      blocks: [
        {
          t: "p",
          text: "Open [Orders](/portal/orders) and set the **Channel** filter to POS. Tax invoices for POS sales are under Finance.",
        },
      ],
    },
  ],
};
