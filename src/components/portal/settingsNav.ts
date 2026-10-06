import {
  Activity, AppWindow, Bell, Boxes, Clock, CreditCard, FileText, Globe, Languages, Lock, MapPin,
  ShieldCheck, ShoppingCart, Sparkles, Store, Truck, UserCircle, Users, Wallet, Percent, Layers, type LucideIcon,
} from "lucide-react";

export type SettingsNavItem = { slug: string; label: string; icon: LucideIcon; href: string; soon?: boolean };

const soon = (slug: string, label: string, icon: LucideIcon): SettingsNavItem => ({ slug, label, icon, href: `/portal/settings/${slug}`, soon: true });

export const SETTINGS_NAV: SettingsNavItem[] = [
  { slug: "general", label: "General", icon: Store, href: "/portal/settings" },
  { slug: "billing", label: "Plan and billing", icon: Wallet, href: "/portal/settings/billing" },
  { slug: "staff", label: "Users", icon: Users, href: "/portal/settings/staff" },
  { slug: "roles", label: "Roles and permissions", icon: ShieldCheck, href: "/portal/settings/roles" },
  soon("payments", "Payments", CreditCard),
  soon("checkout", "Checkout", ShoppingCart),
  soon("customer-accounts", "Customer accounts", UserCircle),
  soon("shipping", "Shipping and delivery", Truck),
  { slug: "taxes", label: "Taxes and duties", icon: Percent, href: "/portal/settings/taxes" },
  { slug: "branches", label: "Locations", icon: MapPin, href: "/portal/settings/branches" },
  soon("apps", "Apps", AppWindow),
  { slug: "storefront", label: "Sales channels", icon: Boxes, href: "/portal/settings/storefront" },
  soon("domains", "Domains", Globe),
  soon("customer-events", "Customer events", Sparkles),
  soon("notifications", "Notifications", Bell),
  soon("metafields", "Metafields and metaobjects", Layers),
  soon("languages", "Languages", Languages),
  soon("customer-privacy", "Customer privacy", Lock),
  soon("policies", "Policies", FileText),
  { slug: "attendance", label: "Attendance", icon: Clock, href: "/portal/settings/attendance" },
  { slug: "activity", label: "Activity log", icon: Activity, href: "/portal/settings/activity" },
];


