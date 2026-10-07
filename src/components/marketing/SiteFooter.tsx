import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { DemoRequestButton } from "@/components/marketing/DemoRequestButton";
import { CONTACT, supportMailto } from "@/utils/contact";

/** The footer of the public pages (landing, plans). */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="px-space-4 py-space-7 md:px-space-7 lg:px-space-9">
        <div className="flex flex-col gap-space-6 md:flex-row md:justify-between">
          <div className="max-w-[320px]">
            <Logo />
            <p className="mt-space-3 text-[13px] text-ink-600">
              Orders, inventory, customers and payments across every branch and
              channel, managed from one dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-space-6 md:flex md:gap-space-9">
            <div>
              <p className="text-eyebrow mb-space-2">Product</p>
              <ul className="space-y-space-2 text-[13.5px] text-ink-600">
                <li>
                  <Link
                    href="/auth"
                    className="hover:text-brand-600 hover:underline"
                  >
                    Set up your business
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portal/login"
                    className="hover:text-brand-600 hover:underline"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <DemoRequestButton variant="link">
                    Request a demo
                  </DemoRequestButton>
                </li>
                <li>
                  <Link
                    href="/plans"
                    className="hover:text-brand-600 hover:underline"
                  >
                    Plan and pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-eyebrow mb-space-2">Contact</p>
              <ul className="space-y-space-2 text-[13.5px] text-ink-600">
                <li>
                  <a
                    href={supportMailto}
                    className="hover:text-brand-600 hover:underline"
                  >
                    {CONTACT.supportEmail}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-eyebrow mb-space-2">Legal</p>
              <ul className="space-y-space-2 text-[13.5px] text-ink-600">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-brand-600 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-brand-600 hover:underline"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-space-6 border-t border-line pt-space-4 text-[12.5px] text-ink-400">
          © {new Date().getFullYear()} DAAPrime Technologies. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
