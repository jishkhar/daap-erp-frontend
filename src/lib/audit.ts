import { humanize } from "@/lib/erp";

export type ChangeItem = { field: string; from: string | null; to: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A uuid is unreadable in a table: show its first block. Anything else (a settings key) is shown whole. */
export const shortRef = (ref: string | null) =>
  ref && UUID.test(ref) ? ref.slice(0, 8) : ref;

/** "order.status_changed" -> "Order Status Changed" (used where a sentence reads better than the code). */
export const actionLabel = (action: string) =>
  action.split(".").map(humanize).join(" ");

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const show = (v: unknown) =>
  v === null || v === undefined || v === ""
    ? "—"
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);
const label = (key: string) => key.split(".").pop() ?? key;

function collect(
  value: unknown,
  key: string,
  before: unknown,
  out: ChangeItem[],
) {
  if (isObject(value) && "from" in value && "to" in value)
    return void out.push({
      field: label(key),
      from: show(value.from),
      to: show(value.to),
    });
  if (isObject(value)) {
    const prior = isObject(before) ? before : {};
    return void Object.entries(value).forEach(([k, v]) =>
      collect(v, k, prior[k], out),
    );
  }
  if (key)
    out.push({
      field: label(key),
      from: before === undefined ? null : show(before),
      to: show(value),
    });
}

/** What an entry changed, one item per field: recorded before → after values, `{from, to}` pairs, or just the new value when nothing was recorded before. */
export function changeItems(before: unknown, after: unknown): ChangeItem[] {
  const out: ChangeItem[] = [];
  const prior = isObject(before) ? before : {};
  if (isObject(after))
    Object.entries(after).forEach(([k, v]) => collect(v, k, prior[k], out));
  else if (isObject(before))
    Object.entries(before).forEach(([k, v]) =>
      out.push({ field: label(k), from: show(v), to: "—" }),
    );
  return out.filter(
    (c) => c.from !== c.to && !(c.from === null && c.to === "—"),
  ); // a field saved with the value it already had is not a change
}

const stamp = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
export const formatTimestamp = (iso: string) => stamp.format(new Date(iso));

export type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_type: string;
  actor_id: string | null;
  actor_label: string | null;
  branch_id: string | null;
  branch_name: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
  level: "platform" | "portal";
};

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
/** CSV of the rows as shown (one line per entry, changes joined with "; "), ready to download. */
export function auditCsv(rows: AuditEntry[]): string {
  const head = [
    "Date",
    "Action",
    "Level",
    "Actor",
    "Entity",
    "Branch",
    "IP",
    "Changes",
  ];
  const lines = rows.map((r) =>
    [
      new Date(r.created_at).toISOString(),
      r.action,
      r.level,
      r.actor_label ?? humanize(r.actor_type),
      `${r.entity_type}${r.entity_id ? ` #${r.entity_id}` : ""}`,
      r.branch_name ?? "",
      r.ip ?? "",
      changeItems(r.before, r.after)
        .map((c) => `${c.field}: ${c.from === null ? "—" : c.from} -> ${c.to}`)
        .join("; "),
    ]
      .map(cell)
      .join(","),
  );
  return [head.map(cell).join(","), ...lines].join("\n");
}
