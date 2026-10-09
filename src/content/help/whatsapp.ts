import type { Doc } from "./types";

export const whatsapp: Doc = {
  slug: "whatsapp",
  title: "WhatsApp",
  summary:
    "Connect your own WhatsApp Business number through Meta and receive customer messages.",
  setup: {
    label: "Connect WhatsApp",
    href: "/portal/settings/channels/whatsapp",
  },
  sections: [
    {
      id: "how-it-works",
      title: "How it works",
      blocks: [
        {
          t: "p",
          text: "Each business connects **its own** WhatsApp Business number, one number per business, through Meta's WhatsApp Cloud API. Messages your customers send to that number arrive here, and orders that come through WhatsApp are recorded on the WhatsApp channel.",
        },
        {
          t: "p",
          text: "You will work in two places: your Meta developer account, to get the details, and Settings here, to paste them in. [Settings → Sales channels → WhatsApp](/portal/settings/channels/whatsapp) walks you through it one step at a time, with a screenshot of where to click in Meta at each step.",
        },
      ],
    },
    {
      id: "what-you-need",
      title: "What you need first",
      blocks: [
        {
          t: "list",
          items: [
            "A **Meta Business account** at business.facebook.com, with business verification complete so you can message real customers.",
            "A Meta app with the **WhatsApp** product added, and a WhatsApp Business number on it.",
            "Admin access to that account.",
          ],
        },
      ],
    },
    {
      id: "get-details",
      title: "Get your details from Meta",
      blocks: [
        {
          t: "steps",
          items: [
            "In Business settings → **Users → System users**, add a system user with the Admin role and assign it your app with full control.",
            "Choose **Generate new token** with the permissions **whatsapp_business_messaging** and **whatsapp_business_management**, expiry **Never**. Copy the token at once; Meta shows it only once.",
            "In your app, open **WhatsApp → API Setup**. Copy the **Phone number ID** and the **WhatsApp Business Account ID**.",
            "Open **Settings → Basic**, and under App secret choose **Show**. Copy the app secret.",
          ],
        },
      ],
    },
    {
      id: "connect",
      title: "Connect it here",
      blocks: [
        {
          t: "steps",
          items: [
            "Open [Settings → Sales channels → WhatsApp](/portal/settings/channels/whatsapp) and choose **Connect WhatsApp**.",
            "Paste the Business Account ID, Phone number ID, access token and app secret, then choose **Connect**.",
            "We check them with Meta. If something is wrong you will see what Meta said.",
          ],
        },
        {
          t: "p",
          text: "Your token and app secret are stored encrypted. After connecting you can use **Check connection** at any time, or **Edit details** to change them. Leave a secret field blank to keep the saved one.",
        },
      ],
    },
    {
      id: "webhook",
      title: "Finish in Meta: the webhook",
      blocks: [
        {
          t: "p",
          text: "For messages to reach you, Meta needs to know where to send them. After connecting, the page shows a **Callback URL** and a **Verify token**.",
        },
        {
          t: "steps",
          items: [
            "In your Meta app, open **WhatsApp → Configuration → Webhook**.",
            "Paste the Callback URL and the Verify token, then choose **Verify and save**.",
            "Subscribe to the **messages** field.",
          ],
        },
        {
          t: "note",
          tone: "info",
          text: "The status on this card changes to **Webhook connected** once Meta has verified it or a message has arrived.",
        },
      ],
    },
    {
      id: "templates",
      title: "Message templates",
      blocks: [
        {
          t: "p",
          text: "WhatsApp only lets a business start a conversation, or reply after 24 hours, with an approved message template. Create and submit templates in Meta's WhatsApp Manager. The [WhatsApp page](/portal/channels/whatsapp) in the sidebar lists them and how many are approved.",
        },
      ],
    },
    {
      id: "disconnect",
      title: "Disconnecting",
      blocks: [
        {
          t: "p",
          text: "**Disconnect** stops messages arriving and deletes the saved token and secret. Conversations already received are kept, and you can connect again later.",
        },
      ],
    },
    {
      id: "not-yet",
      title: "What is not built yet",
      blocks: [
        {
          t: "note",
          tone: "info",
          text: "Receiving and recording messages works. Replying to customers from here, a message inbox, and sending templates are still to come.",
        },
      ],
    },
    {
      id: "trouble",
      title: "If it doesn't work",
      blocks: [
        {
          t: "table",
          head: ["What you see", "Likely cause"],
          rows: [
            [
              "Connect fails with a message from Meta",
              "The token was copied wrongly, expired, or lacks the two permissions. Generate a new one.",
            ],
            [
              "Webhook step stays incomplete",
              "The Callback URL or Verify token was not pasted exactly, or the messages field is not subscribed.",
            ],
            [
              "Messages don't arrive",
              "Check the connection, confirm the webhook is verified, and that the number you message is the connected one.",
            ],
          ],
        },
      ],
    },
  ],
};
