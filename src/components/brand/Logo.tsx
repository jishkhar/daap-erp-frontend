import { cn } from "@/lib/cn";

/** The ERP mark: a rounded square with the "E" glyph built from three bars. */
export function LogoMark({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="ERP"
      className={className}
    >
      <rect width="32" height="32" rx="8" className="fill-brand-600" />
      <rect x="9" y="8" width="14" height="3.2" rx="1.6" fill="#fff" />
      <rect x="9" y="14.4" width="10" height="3.2" rx="1.6" fill="#fff" />
      <rect x="9" y="20.8" width="14" height="3.2" rx="1.6" fill="#fff" />
    </svg>
  );
}

/** Mark + wordmark. `tone="light"` is for the dark sidebar. */
export function Logo({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-space-2", className)}>
      <LogoMark />
      <span className="leading-tight">
        <span
          className={cn(
            "block text-[17px] font-extrabold tracking-tight",
            tone === "light" ? "text-white" : "text-ink-900",
          )}
        >
          ERP
        </span>
        <span
          className={cn(
            "block text-[10.5px] font-medium tracking-wide uppercase",
            tone === "light" ? "text-white/60" : "text-ink-400",
          )}
        >
          DAAP Commerce Cloud
        </span>
      </span>
    </span>
  );
}
