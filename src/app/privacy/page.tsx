import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Privacy Policy — ERP" };

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. What we process",
    body: "On behalf of each tenant we process the business data the tenant enters or receives through its channels: staff accounts, customer names and contact details, orders, payments (references only — never raw card data), inventory and audit records.",
  },
  {
    title: "2. Roles",
    body: "The tenant is the controller of its customers' data; DAAPrime Technologies acts as the processor and handles it only on the tenant's instructions and to operate the service.",
  },
  {
    title: "3. Security",
    body: "Data is encrypted in transit and at rest. Access is controlled by role and branch, sensitive actions are recorded in an immutable audit trail, and secrets are held outside source code. Payment-gateway credentials are stored encrypted.",
  },
  {
    title: "4. Retention and deletion",
    body: "Data is kept for as long as the tenant's account is active or as the tenant configures. Backups are retained for a limited period. Tenants can request export or deletion of their data.",
  },
  {
    title: "5. Sub-processors",
    body: "We use infrastructure and payment providers to deliver the service (for example our managed database and hosting providers, and each tenant's own payment gateway).",
  },
  {
    title: "6. Contact",
    body: "For privacy questions or requests, contact your company's ERP administrator or DAAPrime Technologies.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-space-4 py-space-6">
        <Link href="/">
          <Logo />
        </Link>
        <h1 className="text-display mt-space-6 mb-space-2">Privacy Policy</h1>
        <p className="mb-space-5 rounded-md border border-warning/40 bg-warning-tint p-space-3 text-[13px] text-warning">
          Draft for review — this policy is a working summary and must be
          reviewed by legal counsel before it is relied on.
        </p>
        {SECTIONS.map((s) => (
          <section key={s.title} className="mb-space-5">
            <h2 className="mb-1 text-[16px] font-bold text-ink-900">
              {s.title}
            </h2>
            <p className="text-[14.5px] leading-relaxed text-ink-700">
              {s.body}
            </p>
          </section>
        ))}
        <p className="text-[13px] text-ink-400">
          See also our{" "}
          <Link href="/terms" className="text-brand-600 hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
