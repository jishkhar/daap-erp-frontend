import Link from "next/link";

/** Inline text for the Help docs: **bold** and [label](/portal/path) links, nothing else. */
const TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)/g;

export function RichText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      m[1] !== undefined ? (
        <strong key={m.index} className="font-semibold text-ink-900">
          {m[1]}
        </strong>
      ) : (
        <Link
          key={m.index}
          href={m[3]}
          className="font-semibold text-brand-600 hover:underline"
        >
          {m[2]}
        </Link>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
