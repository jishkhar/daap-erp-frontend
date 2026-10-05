import { Globe, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

const CHANNELS = [
  { icon: Globe, title: "Online", text: "Your website's orders land in the same system as everything else, reserving stock from the right branch." },
  { icon: Store, title: "POS", text: "Bill at the counter with barcode and IMEI scanning, take payments and handle returns." },
  { icon: MessageCircle, title: "WhatsApp", text: "Let customers browse, order and pay in a conversation, and keep every chat tied to their record." },
];

const POINTS = [
  { title: "Branch-aware inventory", text: "Stock per branch with reservations, transfers and an audit trail for every movement." },
  { title: "One customer, every channel", text: "A single customer record across Online, POS and WhatsApp." },
  { title: "Access by role and branch", text: "A Patna manager sees Patna. The owner sees everything." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-space-4 py-space-4">
        <Logo />
        <Button href="/portal/login" variant="secondary">Sign in</Button>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-space-4 pt-space-8 pb-space-8 text-center">
          <p className="mb-space-3 text-[12px] font-bold tracking-[0.12em] text-brand-600 uppercase">DAAP Commerce Cloud</p>
          <h1 className="text-[40px] leading-[1.1] font-extrabold tracking-tight text-ink-900 sm:text-[52px]">One company. Many branches.<br />One source of truth.</h1>
          <p className="mx-auto mt-space-4 max-w-2xl text-[17px] text-ink-600">
            Run every branch and every sales channel — Online, POS and WhatsApp — on a single ERP for orders, inventory, customers and payments.
          </p>
          <div className="mt-space-6 flex justify-center"><Button href="/portal/login" size="lg">Sign in to your ERP</Button></div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-space-4 px-space-4 pb-space-8 md:grid-cols-3">
          {CHANNELS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-line bg-card p-space-5 shadow-[var(--shadow-sm)]">
              <span className="mb-space-3 flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-600"><Icon size={22} /></span>
              <h2 className="text-[18px] font-bold text-ink-900">{title}</h2>
              <p className="mt-1 text-[14px] text-ink-600">{text}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-line bg-card">
          <div className="mx-auto grid max-w-6xl gap-space-5 px-space-4 py-space-8 md:grid-cols-3">
            {POINTS.map((p) => (
              <div key={p.title}><h3 className="text-[16px] font-bold text-ink-900">{p.title}</h3><p className="mt-1 text-[14px] text-ink-600">{p.text}</p></div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-space-3 px-space-4 py-space-5 text-[13px] text-ink-400">
        <span>© {new Date().getFullYear()} DAAPrime Technologies</span>
        <span className="flex gap-space-4"><Link href="/terms" className="hover:text-ink-700">Terms</Link><Link href="/privacy" className="hover:text-ink-700">Privacy</Link></span>
      </footer>
    </div>
  );
}
