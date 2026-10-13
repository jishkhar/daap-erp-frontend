import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Wraps a block that is being re-fetched: the old figures stay but fade, and a spinner sits over them so a click visibly does something. */
export function Refreshing({
  active,
  children,
  className,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)} aria-busy={active}>
      <div
        className={cn(
          "h-full transition-opacity duration-150",
          active && "pointer-events-none opacity-40",
        )}
      >
        {children}
      </div>
      {active && (
        <div
          role="status"
          aria-label="Loading"
          className="absolute inset-0 flex items-center justify-center"
        >
          <Loader2 size={28} className="animate-spin text-brand-600" />
        </div>
      )}
    </div>
  );
}
