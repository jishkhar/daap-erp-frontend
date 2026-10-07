import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { DemoRequestButton } from "@/components/marketing/DemoRequestButton";
import { PlansView } from "@/components/marketing/PlansView";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Plans & pricing — ERP" };

export default function PlansPage() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-space-3 px-space-4 py-space-4 md:px-space-7 lg:px-space-9">
        <Link href="/" aria-label="ERP home">
          <Logo />
        </Link>
        <Button href="/portal/login" variant="secondary" size="md">
          Sign in
        </Button>
      </header>

      <main className="px-space-4 pt-space-7 pb-space-9 md:px-space-7">
        <div className="mb-space-6 text-center">
          <p className="mb-space-2 text-[12px] font-bold tracking-[0.12em] text-brand-600 uppercase">
            Plans
          </p>
          <h1 className="text-display-lg mb-space-3">
            Choose a plan for your business
          </h1>
          <p className="mx-auto max-w-[520px] text-[14px] text-ink-400">
            Flexible plans for businesses of all sizes. Switch or cancel any
            time.
          </p>
        </div>
        <PlansView />
        <p className="mt-space-8 text-center text-[14px] text-ink-600">
          Not sure which plan fits?{" "}
          <DemoRequestButton variant="link">Request a demo</DemoRequestButton>
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
