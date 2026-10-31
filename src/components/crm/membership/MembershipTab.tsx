"use client";

import { useState } from "react";
import { BenefitsView } from "@/components/crm/membership/BenefitsView";
import { MembersView } from "@/components/crm/membership/MembersView";
import { MembershipsView } from "@/components/crm/membership/MembershipsView";
import { RulesView } from "@/components/crm/membership/RulesView";
import { Tabs } from "@/components/ui/Tabs";

type View = "memberships" | "benefits" | "members" | "rules";
const VIEWS: { key: View; label: string }[] = [
  { key: "memberships", label: "All Memberships" },
  { key: "benefits", label: "Benefits" },
  { key: "members", label: "Members" },
  { key: "rules", label: "Rules" },
];

/** Customers > Membership: the plans, their benefits, the members and the rules, as four views. */
export function MembershipTab({
  currency,
  canEdit,
  canConfigure,
  onChanged,
}: {
  currency: string;
  canEdit: boolean;
  canConfigure: boolean;
  onChanged: () => void;
}) {
  const [view, setView] = useState<View>("memberships");
  const [tier, setTier] = useState("");
  return (
    <div>
      <Tabs tabs={VIEWS} value={view} onChange={setView} />
      {view === "memberships" && (
        <MembershipsView
          currency={currency}
          canConfigure={canConfigure}
          onChanged={onChanged}
          onOpenSegment={(t) => {
            setTier(t);
            setView("members");
          }}
        />
      )}
      {view === "benefits" && (
        <BenefitsView canConfigure={canConfigure} onChanged={onChanged} />
      )}
      {view === "members" && (
        <MembersView
          currency={currency}
          canEdit={canEdit}
          tierFilter={tier}
          onTierFilter={setTier}
          onChanged={onChanged}
        />
      )}
      {view === "rules" && (
        <RulesView
          currency={currency}
          canConfigure={canConfigure}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
