import type { Doc } from "./types";

export const gst: Doc = {
  slug: "gst",
  title: "GST and taxes",
  summary:
    "Add your GST registrations, set prices and rates, and read the GST reports.",
  setup: { label: "Open Taxes and duties", href: "/portal/settings/taxes" },
  sections: [
    {
      id: "how-it-works",
      title: "How it works",
      blocks: [
        {
          t: "p",
          text: "Every sale and purchase is taxed using three things: **where you sell from** (your registration's state), **where the customer is** (the delivery state), and **the product's tax rate**.",
        },
        {
          t: "table",
          head: ["Situation", "Tax charged"],
          rows: [
            [
              "Your state and the customer's state are the same",
              "CGST + SGST, half each",
            ],
            ["They are different states", "IGST, the full rate"],
          ],
        },
        {
          t: "p",
          text: "Example: a ₹1,000 item at 5%. Within the same state it is ₹25 CGST + ₹25 SGST. To another state it is ₹50 IGST. The total tax is the same.",
        },
      ],
    },
    {
      id: "registrations",
      title: "Add your GST registrations",
      blocks: [
        {
          t: "steps",
          items: [
            "Open [Settings → Taxes and duties](/portal/settings/taxes).",
            "Under GST registrations, choose to add one and enter the GSTIN, legal name, registration type and registered address.",
            "Mark one as the **default**.",
          ],
        },
        {
          t: "p",
          text: "If you gave a GSTIN at sign-up, your first registration already exists. A business with branches in different states has one registration per state.",
        },
      ],
    },
    {
      id: "branches",
      title: "Link a branch to a registration",
      blocks: [
        {
          t: "p",
          text: "Each branch sells under one registration. Open the branch in [Settings → Locations](/portal/settings/branches) and pick its **GST registration**. The branch's invoices then carry that GSTIN and that state decides CGST/SGST or IGST.",
        },
      ],
    },
    {
      id: "prices",
      title: "Prices: with or without tax",
      blocks: [
        {
          t: "p",
          text: "In the Prices card you choose whether your prices **include tax** or tax is **added on top**. It applies to the whole business.",
        },
        {
          t: "table",
          head: ["Setting", "A ₹105 price at 5% means"],
          rows: [
            [
              "Prices include tax",
              "The customer pays ₹105, of which ₹5 is tax.",
            ],
            [
              "Tax added on top",
              "₹105 is the price before tax; the customer pays ₹110.25.",
            ],
          ],
        },
        {
          t: "note",
          tone: "warn",
          text: "Switching this changes what customers pay on new orders. Existing orders and invoices are not changed.",
        },
      ],
    },
    {
      id: "rates",
      title: "Tax rates for products",
      blocks: [
        {
          t: "p",
          text: "Each product has its own rate and HSN code, set on the product. The Tax rates card on the Taxes page shows the rates in use.",
        },
        {
          t: "p",
          text: "Some goods, such as clothing, change rate with the price. Use **price bands** for those: for example 5% up to ₹1,000 per piece, and 12% above. Set bands from the tax rate's row on the Taxes page.",
        },
      ],
    },
    {
      id: "invoices",
      title: "Invoices",
      blocks: [
        {
          t: "p",
          text: "Invoices are created from orders and show who sold (your registration and GSTIN), the HSN, the place of supply and the tax split. They cannot be edited afterwards. A return creates a credit note that repeats the original invoice's details.",
        },
      ],
    },
    {
      id: "reports",
      title: "GST reports",
      blocks: [
        {
          t: "p",
          text: "Open [Finance → Reports](/portal/finance) for the GST views.",
        },
        {
          t: "list",
          items: [
            "**GST summary:** tax collected on sales and tax paid on purchases (input credit), filterable by registration and branch.",
            "**GSTR-1 style view:** your outward sales laid out the way the return asks for them, with a CSV download for your accountant.",
          ],
        },
        {
          t: "p",
          text: "Your accountant will want to know how tax is treated. A plain-language explanation with worked examples for them is in the repository as taxes_and_duties_for_ca.",
        },
      ],
    },
  ],
};
