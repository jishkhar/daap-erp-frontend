/**
 * Help centre content. Docs are plain data so they need no markdown tooling: edit a file here and the page updates.
 * Inline text understands **bold** and [label](/portal/path) links.
 */
export type Block =
  | { t: "p"; text: string }
  | { t: "h3"; text: string }
  | { t: "steps"; items: string[] }
  | { t: "list"; items: string[] }
  | { t: "note"; tone: "info" | "warn"; text: string }
  | { t: "table"; head: string[]; rows: string[][] };

export type Section = { id: string; title: string; blocks: Block[] };

export type Doc = {
  slug: string;
  title: string;
  summary: string;
  /** Where the "Set this up" button goes. */
  setup?: { label: string; href: string };
  sections: Section[];
};
