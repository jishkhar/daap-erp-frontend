import { AlertTriangle, Info } from "lucide-react";
import { RichText } from "@/components/portal/help/RichText";
import { cn } from "@/lib/cn";
import type { Block, Doc } from "@/content/help";

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case "p":
      return (
        <p className="text-[14.5px] leading-relaxed text-ink-600">
          <RichText text={block.text} />
        </p>
      );
    case "h3":
      return (
        <h3 className="pt-space-2 text-[14.5px] font-semibold text-ink-900">
          {block.text}
        </h3>
      );
    case "steps":
      return (
        <ol className="space-y-space-2">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-space-3 text-[14.5px] leading-relaxed text-ink-600"
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700">
                {i + 1}
              </span>
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-space-5 text-[14.5px] leading-relaxed text-ink-600">
          {block.items.map((item, i) => (
            <li key={i}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case "note": {
      const warn = block.tone === "warn";
      const Icon = warn ? AlertTriangle : Info;
      return (
        <div
          className={cn(
            "flex gap-space-3 rounded-md border p-space-3 text-[13.5px] leading-relaxed",
            warn
              ? "border-warning/30 bg-warning-tint text-ink-900"
              : "border-brand-200 bg-brand-50 text-ink-900",
          )}
        >
          <Icon
            size={16}
            className={cn(
              "mt-0.5 shrink-0",
              warn ? "text-warning" : "text-brand-600",
            )}
          />
          <span>
            <RichText text={block.text} />
          </span>
        </div>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-paper text-[12px] font-semibold text-ink-600">
              <tr>
                {block.head.map((h) => (
                  <th key={h} className="px-space-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-line align-top">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        "px-space-3 py-2 text-ink-600",
                        j === 0 && "font-medium text-ink-900",
                      )}
                    >
                      <RichText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** One doc: its sections, in order. Each section has an id so the table of contents and deep links can jump to it. */
export function DocView({ doc }: { doc: Doc }) {
  return (
    <article className="space-y-space-8">
      {doc.sections.map((s) => (
        <section
          key={s.id}
          id={s.id}
          className="scroll-mt-space-6 space-y-space-3"
        >
          <h2 className="text-[19px] font-bold text-ink-900">{s.title}</h2>
          {s.blocks.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </section>
      ))}
    </article>
  );
}
