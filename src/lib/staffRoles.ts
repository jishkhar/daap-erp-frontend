/** Only the administrator is built in; every other role is created by the business (Settings > Roles). */
export const ROLE_LABEL: Record<string, string> = {
  tenant_admin: "Administrator",
};

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
