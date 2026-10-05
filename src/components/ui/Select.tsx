import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/** A native <select> styled like <Input>. */
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-line bg-card px-space-3 text-[14px] text-ink-900 shadow-[var(--shadow-sm)]",
        "focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-400",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
