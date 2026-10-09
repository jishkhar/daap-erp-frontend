import { CircleHelp } from "lucide-react";
import Link from "next/link";

/** Header shortcut to the Help centre. Shown to everyone: the docs contain nothing sensitive. */
export function HelpButton() {
  return (
    <Link
      href="/portal/help"
      aria-label="Help"
      title="Help"
      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-600 hover:bg-paper hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
    >
      <CircleHelp size={19} />
    </Link>
  );
}

/** "Learn more" link for a screen, pointing at its doc (optionally a section of it). */
export function LearnMore({
  doc,
  section,
  className,
}: {
  doc: string;
  section?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/portal/help/${doc}${section ? `#${section}` : ""}`}
      className={
        className ??
        "inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"
      }
    >
      <CircleHelp size={14} /> Learn more
    </Link>
  );
}
