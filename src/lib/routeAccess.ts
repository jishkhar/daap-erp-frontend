import { hasPermission, type StaffSession } from "@/lib/staffAuth";

// URL prefix -> the page key whose View permission opens it. Most specific first. A path that matches none (Help, Workforce pages, the
// settings "coming soon" pages' shell ...) is open to every signed-in person. The backend's 403 is the real enforcement; this is
// what stops a hidden page from rendering when someone types its address.
const ROUTES: [prefix: string, pageKey: string][] = [
  ["/portal/dashboard", "dashboard"],
  ["/portal/orders", "orders"],
  ["/portal/returns", "orders"],
  ["/portal/products", "products"],
  ["/portal/customers", "customers"],
  ["/portal/whatsapp-inbox", "whatsapp"],
  ["/portal/whatsapp-automation", "whatsapp"],
  ["/portal/feedback", "feedback"],
  ["/portal/discounts", "discounts"],
  ["/portal/growth", "growth"],
  ["/portal/analytics", "reports"],
  ["/portal/channels", "channels"],
  ["/portal/procurement", "procurement"],
  ["/portal/wholesale", "wholesale"],
  ["/portal/settings/wholesale", "settings"],
  ["/portal/inventory", "inventory"],
  ["/portal/transfers", "transfers"],
  ["/portal/finance", "finance"],
  ["/portal/settings/staff", "staff"],
  ["/portal/settings/roles", "roles"],
  ["/portal/settings/billing", "billing"],
  ["/portal/settings/activity", "activity"],
  ["/portal/settings/branches", "branches"],
  ["/portal/settings/channels", "channels"],
  ["/portal/settings", "settings"],
];

const under = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

export function pageKeyForPath(path: string): string | null {
  return ROUTES.find(([prefix]) => under(path, prefix))?.[1] ?? null;
}

export function canOpenPath(session: StaffSession, path: string): boolean {
  const key = pageKeyForPath(path);
  return key === null || hasPermission(session, key, "view");
}

/** Where to send someone who cannot open the page they landed on (e.g. right after sign-in): the first sidebar page they can use. */
export function landingPath(session: StaffSession): string {
  const first = ROUTES.find(
    ([prefix]) =>
      prefix !== "/portal/growth" && // a placeholder that redirects to the dashboard
      prefix !== "/portal/settings" &&
      !prefix.startsWith("/portal/settings/") &&
      hasPermission(session, pageKeyForPath(prefix)!, "view"),
  );
  return first ? first[0] : "/portal/attendance";
}
