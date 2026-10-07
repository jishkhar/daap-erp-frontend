import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Terms of Service — ERP" };

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. The service",
    body: "ERP is a multi-tenant commerce and back-office platform provided by DAAPrime Technologies. A tenant is the customer organisation; each tenant manages its own branches, users, products, customers, orders, inventory and payments inside its own isolated workspace.",
  },
  {
    title: "2. Accounts and access",
    body: "Accounts are created by the tenant's administrator. You are responsible for keeping your credentials confidential and for activity under your account. Administrators decide who in their organisation can access which branches and modules.",
  },
  {
    title: "3. Your data",
    body: "The tenant owns the business data it enters. We process it only to provide the service. Tenant data is logically isolated from other tenants, and cross-tenant access is limited to audited platform operations.",
  },
  {
    title: "4. Acceptable use",
    body: "You must not attempt to access another tenant's data, interfere with the service, or use it for unlawful activity. We may suspend a tenant that breaches these terms or that poses a security risk.",
  },
  {
    title: "5. Payments",
    body: "Online payments are processed by the tenant's own payment gateway. We do not store raw card data. Fees charged by gateways are between the tenant and the gateway.",
  },
  {
    title: "6. Availability and changes",
    body: "We work to keep the service available but do not guarantee uninterrupted operation. We may update the service and these terms; material changes will be communicated to tenant administrators.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-space-4 py-space-6">
        <Link href="/">
          <Logo />
        </Link>
        <h1 className="text-display mt-space-6 mb-space-2">Terms of Service</h1>
        <p className="mb-space-5 rounded-md border border-warning/40 bg-warning-tint p-space-3 text-[13px] text-warning">
          Draft for review — these terms are a working summary and must be
          reviewed by legal counsel before they are relied on.
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
          <Link href="/privacy" className="text-brand-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
