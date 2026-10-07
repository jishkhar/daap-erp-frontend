import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const PAGE_SIZES = [25, 50, 100];

/** Footer for cursor-paged lists: Prev / Next (no page count: the server only knows what comes before and after) and a "N per page" size. */
export function CursorPager({
  page,
  shown,
  size,
  onSize,
  hasNext,
  onPrev,
  onNext,
}: {
  page: number;
  shown: number;
  size: number;
  onSize: (n: number) => void;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (page === 1 && !hasNext && size === PAGE_SIZES[0]) return null; // everything fits on one page of the smallest size
  return (
    <div className="mt-space-3 flex flex-col items-center justify-between gap-space-2 border-t border-line pt-space-3 sm:flex-row">
      <p className="text-[12px] text-ink-400">
        Page {page} · {shown} {shown === 1 ? "entry" : "entries"}
      </p>
      <div className="flex items-center gap-space-2">
        <Button
          size="md"
          variant="secondary"
          onClick={onPrev}
          disabled={page === 1}
        >
          <ArrowLeft size={13} /> Prev
        </Button>
        <Button
          size="md"
          variant="secondary"
          onClick={onNext}
          disabled={!hasNext}
        >
          Next <ArrowRight size={13} />
        </Button>
        <select
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
          aria-label="Rows per page"
          className="h-8 rounded-md border border-line bg-card px-space-2 text-[12px] text-ink-900"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
