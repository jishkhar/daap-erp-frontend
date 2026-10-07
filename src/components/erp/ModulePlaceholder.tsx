import { Hourglass } from "lucide-react";
import { Card } from "@/components/ui/Card";

/** A module that is in the navigation but whose backend is not built yet. It says so, and lists what it will do —
 * it never shows invented data. */
export function ModulePlaceholder({
  title,
  summary,
  planned,
  phase,
}: {
  title: string;
  summary: string;
  planned: string[];
  phase: string;
}) {
  return (
    <Card className="mx-auto max-w-2xl p-space-6 text-center">
      <span className="mx-auto mb-space-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Hourglass size={22} />
      </span>
      <h2 className="text-[18px] font-bold text-ink-900">
        {title} isn&apos;t available yet
      </h2>
      <p className="mx-auto mt-space-2 max-w-lg text-[14px] text-ink-600">
        {summary}
      </p>
      <ul className="mx-auto mt-space-4 max-w-md space-y-1.5 text-left text-[13.5px] text-ink-700">
        {planned.map((p) => (
          <li key={p} className="flex gap-space-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-space-4 text-[12px] font-semibold tracking-wide text-ink-400 uppercase">
        Planned: {phase}
      </p>
    </Card>
  );
}
