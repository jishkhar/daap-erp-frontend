/** The ERP's system roles, in display order. Names/codes match backend/auth/permissions.py. */
export const ROLE_OPTIONS: { value: string; label: string; blurb: string }[] = [
  {
    value: "tenant_admin",
    label: "Tenant Admin",
    blurb:
      "Every branch: masters, finance controls, settings and integrations.",
  },
  {
    value: "regional_manager",
    label: "Regional Manager",
    blurb: "Operational dashboards and approvals for assigned branches.",
  },
  {
    value: "branch_manager",
    label: "Branch Manager",
    blurb:
      "Branch orders, inventory, staff, expenses, returns and local reporting.",
  },
  {
    value: "retail_cashier",
    label: "Retail Cashier",
    blurb: "Create POS sales, take payments and perform permitted returns.",
  },
  {
    value: "inventory_staff",
    label: "Inventory / Procurement Staff",
    blurb: "Stock movement, receiving, transfers and procurement.",
  },
  {
    value: "finance_user",
    label: "Finance User",
    blurb: "Invoices, payments, reconciliation, expenses and reports.",
  },
];

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

type Tone = "brand" | "clay" | "neutral" | "violet" | "warning" | "success";
const TONES: Tone[] = [
  "brand",
  "clay",
  "neutral",
  "violet",
  "warning",
  "success",
];

export function roleLabel(role: string): string {
  if (role in ROLE_LABEL) return ROLE_LABEL[role];
  return role
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function roleTone(role: string): Tone {
  if (role === "tenant_admin") return "brand";
  let hash = 0;
  for (let i = 0; i < role.length; i++)
    hash = (hash * 31 + role.charCodeAt(i)) >>> 0;
  return TONES[1 + (hash % (TONES.length - 1))];
}

export function roleDescription(role: string): string {
  return (
    ROLE_OPTIONS.find((r) => r.value === role)?.blurb ??
    "Custom role -- access set from its permission grid."
  );
}

export const BUILT_IN_ROLES = ROLE_OPTIONS.map((r) => r.value);

export function orderedRoles(matrix: Record<string, unknown> | null): string[] {
  if (!matrix) return [];
  const known = BUILT_IN_ROLES.filter((r) => r in matrix);
  const custom = Object.keys(matrix)
    .filter((r) => !BUILT_IN_ROLES.includes(r))
    .sort();
  return [...known, ...custom];
}
