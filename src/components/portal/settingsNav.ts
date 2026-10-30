import {
  Activity,
  Bell,
  Boxes,
  CreditCard,
  FileText,
  Globe,
  Lock,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UserCircle,
  Users,
  Wallet,
  Percent,
  CalendarClock,
  Tag,
  ToggleRight,
  type LucideIcon,
} from "lucide-react";

export type SettingsNavItem = {
  slug: string;
  label: string;
  icon: LucideIcon;
  href: string;
  soon?: boolean;
  /** an optional module's settings: listed only while the module is on (session.modules) */
  module?: "transfers" | "workforce";
};

const soon = (
  slug: string,
  label: string,
  icon: LucideIcon,
): SettingsNavItem => ({
  slug,
  label,
  icon,
  href: `/portal/settings/${slug}`,
  soon: true,
});

export const SETTINGS_NAV: SettingsNavItem[] = [
  { slug: "general", label: "General", icon: Store, href: "/portal/settings" },
  {
    slug: "billing",
    label: "Plan and billing",
    icon: Wallet,
    href: "/portal/settings/billing",
  },
  {
    slug: "modules",
    label: "Modules",
    icon: ToggleRight,
    href: "/portal/settings/modules",
  },
  {
    slug: "staff",
    label: "Users",
    icon: Users,
    href: "/portal/settings/staff",
  },
  {
    slug: "roles",
    label: "Roles and permissions",
    icon: ShieldCheck,
    href: "/portal/settings/roles",
  },
  {
    slug: "payments",
    label: "Payments",
    icon: CreditCard,
    href: "/portal/settings/payments",
  },
  soon("checkout", "Checkout", ShoppingCart),
  soon("customer-accounts", "Customer accounts", UserCircle),
  {
    slug: "shipping",
    label: "Shipping and delivery",
    icon: Truck,
    href: "/portal/settings/shipping",
  },
  {
    slug: "labels",
    label: "Barcode labels",
    icon: Tag,
    href: "/portal/settings/labels",
  },
  {
    slug: "taxes",
    label: "Taxes and duties",
    icon: Percent,
    href: "/portal/settings/taxes",
  },
  {
    slug: "branches",
    label: "Locations",
    icon: MapPin,
    href: "/portal/settings/branches",
  },
  {
    slug: "attendance",
    label: "Attendance and holidays",
    icon: CalendarClock,
    href: "/portal/settings/attendance",
    module: "workforce",
  },
  // soon("apps", "Apps", AppWindow),
  {
    slug: "channels",
    label: "Sales channels",
    icon: Boxes,
    href: "/portal/settings/channels",
  },
  {
    slug: "domains",
    label: "Domains",
    icon: Globe,
    href: "/portal/settings/domains",
  },
  // soon("customer-events", "Customer events", Sparkles),
  soon("notifications", "Notifications", Bell),
  // soon("metafields", "Metafields and metaobjects", Layers),
  // soon("languages", "Languages", Languages),
  soon("customer-privacy", "Customer privacy", Lock),
  {
    slug: "policies",
    label: "Policies",
    icon: FileText,
    href: "/portal/settings/policies",
  },
  {
    slug: "activity",
    label: "Activity log",
    icon: Activity,
    href: "/portal/settings/activity",
  },
];
