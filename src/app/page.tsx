import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, TaskDone01Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import { Logo } from "@/components/brand/Logo";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  { title: "One source of truth", desc: "Orders, stock and customers in one system", icon: CheckmarkCircle02Icon },
  { title: "Every channel", desc: "Online, POS and WhatsApp, branch-aware", icon: TaskDone01Icon },
  { title: "Role-based access", desc: "Each manager sees only their branch", icon: Tag01Icon },
];

const DEMO_MAIL = "mailto:info@daaprimeprojects.com?subject=Product%20Demo%20Request";

export default function HomePage() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-space-3 px-space-4 py-space-4 md:px-space-7 lg:px-space-9">
        <Link href="/" aria-label="ERP home"><Logo /></Link>
        <Button href="/portal/login" variant="secondary" size="md">Sign in</Button>
      </header>

      <main className="relative isolate overflow-hidden">
        <Image src="/home-bg.svg" alt="" fill priority aria-hidden className="-z-10 object-cover object-right" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-paper via-paper/75 to-paper/10 md:from-paper/95 md:via-paper/55 md:to-transparent"
        />

        <div className="px-space-4 pt-space-2 pb-space-8 sm:pt-space-4 md:px-space-7 lg:px-space-9 lg:pt-space-5 lg:pb-space-9">
          <div className="grid grid-cols-1 items-center gap-space-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-space-9">
            <div>
              <p className="mb-space-3 text-[14.5px] text-ink-600">
                Omnichannel Commerce ERP for Multi-Branch Businesses
              </p>

              <h1 className="text-display-lg mb-space-5 max-w-[650px]">
                Sell on <span className="text-brand-600">WhatsApp</span>, online and POS. Managed from one ERP dashboard.
              </h1>

              <p className="text-body mb-space-6 max-w-[620px]">
                Run every branch and every sales channel on a single system for orders, inventory, customers and
                payments. One company, many branches, one source of truth.
              </p>

              <div className="mb-space-7 flex flex-wrap gap-space-5">
                {FEATURES.map(({ title, desc, icon }) => (
                  <div key={title} className="flex flex-1 basis-40 items-start gap-space-3 py-space-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-success-tint text-success">
                      <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <strong className="block text-[15px] text-ink-900">{title}</strong>
                      <span className="mt-space-1 block text-[13px] text-ink-600">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-space-3">
                <Button href="/auth" variant="primary" size="lg">Set up your business</Button>
                <Button href={DEMO_MAIL} variant="secondary" size="lg">Request a product demo</Button>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="px-space-4 py-space-7 md:px-space-7 lg:px-space-9">
          <div className="flex flex-col gap-space-6 md:flex-row md:justify-between">
            <div className="max-w-[320px]">
              <Logo />
              <p className="mt-space-3 text-[13px] text-ink-600">
                Orders, inventory, customers and payments across every branch and channel, managed from one dashboard.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-space-6 md:flex md:gap-space-9">
              <div>
                <p className="text-eyebrow mb-space-2">Product</p>
                <ul className="space-y-space-2 text-[13.5px] text-ink-600">
                  <li><Link href="/auth" className="hover:text-brand-600 hover:underline">Set up your business</Link></li>
                  <li><Link href="/portal/login" className="hover:text-brand-600 hover:underline">Sign in</Link></li>
                  <li><a href={DEMO_MAIL} className="hover:text-brand-600 hover:underline">Request a demo</a></li>
                </ul>
              </div>
              <div>
                <p className="text-eyebrow mb-space-2">Contact</p>
                <ul className="space-y-space-2 text-[13.5px] text-ink-600">
                  <li><a href="mailto:info@daaprimeprojects.com" className="hover:text-brand-600 hover:underline">info@daaprimeprojects.com</a></li>
                </ul>
              </div>
              <div>
                <p className="text-eyebrow mb-space-2">Legal</p>
                <ul className="space-y-space-2 text-[13.5px] text-ink-600">
                  <li><Link href="/privacy" className="hover:text-brand-600 hover:underline">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-brand-600 hover:underline">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-space-6 border-t border-line pt-space-4 text-[12.5px] text-ink-400">
            © {new Date().getFullYear()} DAAPrime Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
