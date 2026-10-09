import type { Doc } from "./types";

export const gettingStarted: Doc = {
  slug: "getting-started",
  title: "Getting started",
  summary:
    "What you get when you sign up, what to set up first, and where everything lives.",
  setup: { label: "Open Settings", href: "/portal/settings" },
  sections: [
    {
      id: "signing-up",
      title: "Signing up",
      blocks: [
        {
          t: "p",
          text: "You sign in with Google, then tell us about your business. Signing up creates your business, your first location and your owner login in one go.",
        },
        {
          t: "table",
          head: ["Asked", "Required?", "Why"],
          rows: [
            ["Business name", "Yes", "Shown on invoices and your store."],
            [
              "Branch name and state",
              "Yes",
              "Your first location. The state decides which GST applies (see the GST doc).",
            ],
            [
              "Legal name",
              "No",
              "Used on tax invoices if different from the business name.",
            ],
            ["Phone", "No", "Becomes your store's contact number."],
            [
              "GSTIN",
              "No",
              "If you have one, we create your first GST registration from it.",
            ],
            [
              "What you will sell through",
              "No",
              "Online, POS, WhatsApp. Only a hint; you can use any channel later.",
            ],
            ["Accept the terms", "Yes", "Required to create the account."],
          ],
        },
        {
          t: "note",
          tone: "info",
          text: "If someone at DAAP created your business for you, you get an email with a link to set your password. The link works once and expires after 7 days; ask for a new one if it runs out.",
        },
      ],
    },
    {
      id: "first-steps",
      title: "Your first steps",
      blocks: [
        {
          t: "p",
          text: "In this order, a store is ready to take its first order in a few minutes:",
        },
        {
          t: "steps",
          items: [
            "**Check your business profile** in [Settings → General](/portal/settings): name, contact details and store defaults.",
            "**Check your location.** Your first branch was created at sign-up. Open [Settings → Locations](/portal/settings/branches) to complete its address, and add more branches if you have them.",
            "**Set up GST** in [Settings → Taxes and duties](/portal/settings/taxes) if you are GST-registered. See the GST doc.",
            "**Add products** in [Products](/portal/products). Give each a price and tax rate.",
            "**Add stock** in [Inventory](/portal/inventory) so orders can be fulfilled.",
            "**Connect a sales channel** from the Sales channels group in the sidebar, or [Settings → Sales channels](/portal/settings/channels).",
          ],
        },
        {
          t: "p",
          text: "You can sell nothing and click around freely. Nothing is published to customers until you connect a channel.",
        },
      ],
    },
    {
      id: "where-things-live",
      title: "Where things live",
      blocks: [
        {
          t: "table",
          head: ["Menu", "What it is for"],
          rows: [
            ["Dashboard", "Today's numbers and low-stock items."],
            [
              "Orders",
              "Every order from every channel. Use the Channel filter to see just Online, POS or WhatsApp.",
            ],
            [
              "Products, Inventory, Transfers",
              "What you sell, how much you have, and moving stock between branches.",
            ],
            ["Customers", "Everyone who has ordered, across all channels."],
            ["Procurement", "Buying from suppliers and receiving stock."],
            [
              "Finance",
              "Invoices, payments and the financial and GST reports.",
            ],
            ["Analytics", "Sales numbers, charts and trends."],
            [
              "Sales channels (sidebar)",
              "How each channel looks: your online store theme, the POS screen, WhatsApp. Orders are not here.",
            ],
            [
              "Settings (bottom of the sidebar)",
              "Business details, locations, taxes, team, plan and channel setup.",
            ],
          ],
        },
      ],
    },
    {
      id: "team",
      title: "Adding your team",
      blocks: [
        {
          t: "steps",
          items: [
            "Open [Settings → Users](/portal/settings/staff) and choose **Add a person**.",
            "Give them a role. Roles decide which menus they see and whether they can view, create, edit or delete.",
            "Adjust what each role can do in [Settings → Roles and permissions](/portal/settings/roles).",
          ],
        },
        {
          t: "p",
          text: "Cashiers sign in at the till with a 6-digit PIN, set in Settings → Sales channels → POS (see the POS doc).",
        },
      ],
    },
    {
      id: "channels",
      title: "Sales channels at a glance",
      blocks: [
        {
          t: "table",
          head: ["Channel", "Where customers buy", "Set up"],
          rows: [
            [
              "Online",
              "Your website",
              "An API key connects your site to this system. See the Online store doc.",
            ],
            [
              "POS",
              "At the till in a branch",
              "Pair a terminal to a branch. See the POS doc.",
            ],
            [
              "WhatsApp",
              "In a WhatsApp chat",
              "Connect your own WhatsApp Business number. See the WhatsApp doc.",
            ],
          ],
        },
        {
          t: "p",
          text: "Stock, customers and orders are shared across all three. A sale on the till lowers the same stock your website shows.",
        },
      ],
    },
    {
      id: "faq",
      title: "Common questions",
      blocks: [
        { t: "h3", text: "I can't see a menu a colleague sees." },
        {
          t: "p",
          text: "Menus follow roles and your plan. Ask an owner to check your role in Settings → Roles and permissions, or your plan in Settings → Plan and billing.",
        },
        { t: "h3", text: "Can I use more than one branch?" },
        {
          t: "p",
          text: "Yes. Add them in Settings → Locations. Each branch has its own stock, and you can limit what you see to one branch with the branch switcher in the header.",
        },
        { t: "h3", text: "How do I sign in?" },
        {
          t: "p",
          text: "With Google, using the email your business was created with, or with the email and password you set from your invite link.",
        },
      ],
    },
  ],
};
