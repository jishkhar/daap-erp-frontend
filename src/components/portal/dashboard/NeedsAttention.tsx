import { CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import type { Dashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/erp";

/** What is waiting on a person, each row linking to the page that handles it. Only what the signed-in person may act on. */
export function NeedsAttention({
  data,
  currency,
}: {
  data: Dashboard | undefined;
  currency: string;
}) {
  const items = data?.attention ?? [];
  return (
    <Card className="p-space-4">
      <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
        Needs attention
      </h2>
      {!data ? (
        <SkeletonLines rows={3} />
      ) : items.length === 0 ? (
        <p className="flex items-center gap-space-2 text-[13.5px] text-ink-600">
          <CheckCircle2 size={18} className="text-success" /> Nothing is waiting
          on you.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((a) => (
            <li key={a.key}>
              <Link
                href={a.href}
                className="flex items-center gap-space-3 py-space-2 text-[13.5px] hover:bg-black/[0.02]"
              >
                <span
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[12.5px] font-bold",
                    a.tone === "error"
                      ? "bg-error-tint text-error"
                      : "bg-warning-tint text-warning",
                  )}
                >
                  {a.count}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-ink-900">{a.label}</span>
                  {a.amount_minor !== null && (
                    <span className="text-[12px] text-ink-600">
                      {formatMoney(a.amount_minor, currency)}
                    </span>
                  )}
                </span>
                <ChevronRight size={16} className="shrink-0 text-ink-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
