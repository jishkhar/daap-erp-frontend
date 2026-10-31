"use client";

/**
 * Razorpay's Checkout window, opened over the portal's own checkout page for a subscription (docs/service_subscriptions.md, "Checkout").
 * The business never leaves the page; Razorpay's signed answer goes to the billing API, which checks it before the plan goes live.
 */

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayInstance = { open: () => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

export type SubscriptionPaid = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

let loading: Promise<RazorpayCtor> | null = null;

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  loading ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () =>
      w.Razorpay
        ? resolve(w.Razorpay)
        : reject(new Error("Razorpay did not load."));
    s.onerror = () => {
      loading = null;
      reject(
        new Error(
          "Couldn't reach Razorpay. Check your connection and try again.",
        ),
      );
    };
    document.body.appendChild(s);
  });
  return loading;
}

/** Opens Checkout on a Razorpay subscription. Resolves with the signed answer once paid, or null if the window was closed. A failed
 * attempt keeps the window open so the business can try another way. */
export async function paySubscription(opts: {
  keyId: string;
  subscriptionId: string;
  name: string;
  description: string;
  prefill: {
    name?: string | null;
    email?: string | null;
    contact?: string | null;
  };
  colour?: string;
}): Promise<SubscriptionPaid | null> {
  const Razorpay = await loadCheckout();
  return new Promise((resolve) => {
    new Razorpay({
      key: opts.keyId,
      subscription_id: opts.subscriptionId,
      name: opts.name,
      description: opts.description,
      prefill: {
        name: opts.prefill.name ?? undefined,
        email: opts.prefill.email ?? undefined,
        contact: opts.prefill.contact ?? undefined,
      },
      theme: { color: opts.colour ?? "#43262b" },
      handler: (paid: SubscriptionPaid) => resolve(paid),
      modal: { ondismiss: () => resolve(null), confirm_close: true },
      retry: { enabled: true },
    }).open();
  });
}
