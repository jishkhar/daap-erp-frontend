import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import {
  SERVICE_LABEL,
  SERVICE_TONE,
  SERVICES,
  type Service,
} from "@/lib/services";

// Service and plan badges, kept separate so a screen shows only what it needs: a table whose column already names the service shows just
// the plan; a list that mixes services shows both. A copy of this file lives in shopconnect-admin (components/ui/ServicePlanBadge.tsx) -- keep the two in step.

/** A service in its own colour: Website blue, POS teal, WhatsApp green. */
export function ServiceBadge({
  service,
  className,
}: {
  service: Service;
  className?: string;
}) {
  return (
    <Badge tone={SERVICE_TONE[service]} className={className}>
      {SERVICE_LABEL[service]}
    </Badge>
  );
}

/** Each plan tier's own colour, whatever the service. A plan outside the three tiers (a custom one) is neutral. */
const TIER_TONE = {
  starter: "rose",
  growth: "indigo",
  enterprise: "slate",
} as const;
type Tier = keyof typeof TIER_TONE;

/** The tier from the plan code (`<service>-<tier>`, e.g. "pos-growth"), else from the plan's name. */
function tierOf(code: string | null | undefined, name: string): Tier | null {
  const fromCode = code?.split("-").pop()?.toLowerCase();
  const key =
    fromCode && fromCode in TIER_TONE ? fromCode : name.trim().toLowerCase();
  return key in TIER_TONE ? (key as Tier) : null;
}

/** A plan in its tier's colour: Starter rose, Growth indigo, Enterprise slate. */
export function PlanBadge({
  name,
  code,
  className,
}: {
  name: string;
  code?: string | null;
  className?: string;
}) {
  const tier = tierOf(code, name);
  return (
    <Badge tone={tier ? TIER_TONE[tier] : "neutral"} className={className}>
      {name}
    </Badge>
  );
}

/** Every service a business is on right now (not ended, not never-subscribed), as a service badge and its plan badge; `empty` when none. */
export function ServicePlanBadges({
  services,
  empty = "—",
  className,
}: {
  services: Partial<
    Record<
      Service,
      | { state: string; plan_name?: string | null; plan_code?: string | null }
      | undefined
    >
  >;
  empty?: React.ReactNode;
  className?: string;
}) {
  const live = SERVICES.filter((s) => {
    const v = services[s];
    return v?.plan_name && !["none", "ended"].includes(v.state);
  });
  if (live.length === 0) return <span className="text-ink-400">{empty}</span>;
  return (
    <span
      className={cn("inline-flex flex-wrap gap-x-space-3 gap-y-1", className)}
    >
      {live.map((s) => (
        <span key={s} className="inline-flex gap-1">
          <ServiceBadge service={s} />
          <PlanBadge
            name={services[s]!.plan_name!}
            code={services[s]?.plan_code}
          />
        </span>
      ))}
    </span>
  );
}
