"use client";

import { ClipboardCheck } from "lucide-react";
import { useState } from "react";
import {
  ProgressBar,
  sendStepAction,
  SetupStatusRow,
  useGuide,
  type GuideStep,
} from "@/components/portal/onboarding/guide";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { erp } from "@/lib/erp";
import { toast } from "@/lib/toast";

const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Your business",
    keys: ["profile", "gst", "prices", "locations", "team"],
  },
  { title: "Selling", keys: ["products", "stock", "channels"] },
  { title: "Account", keys: ["plan"] },
];

/** Settings → Setup: what is configured, what is not, and where to change it. A reference, not a to-do list: nothing here blocks you. */
export default function SetupPage() {
  const { tenant, ready } = usePortalGuard();
  const { data, error, loading, reload, allowed } = useGuide();
  const [busy, setBusy] = useState(false);
  if (!ready) return null;

  async function act(key: string, action: "skip" | "unskip" | "confirm") {
    setBusy(true);
    await sendStepAction(key, action, reload);
    setBusy(false);
  }
  async function setDismissed(dismissed: boolean) {
    const res = await erp("/api/v1/onboarding/dismissed", "PUT", { dismissed });
    if (res.error) return toast.error("Couldn't update", res.error);
    reload();
  }

  return (
    <PortalShell tenant={tenant} active="settings">
      <PageHeader
        icon={<ClipboardCheck size={20} />}
        title="Setup"
        description="What is configured and what you can still configure. Nothing here stops you from using the system."
      />
      {!allowed && (
        <p className="text-[13.5px] text-ink-600">
          Setup is for the people who manage the business settings.
        </p>
      )}
      {error && (
        <p className="mb-space-3 text-[13px] font-medium text-error">{error}</p>
      )}
      {data && (
        <div className="space-y-space-4">
          <Card className="p-space-4">
            <ProgressBar done={data.done} total={data.total} />
          </Card>
          {GROUPS.map((g) => {
            const steps = g.keys
              .map((k) => data.steps.find((s) => s.key === k))
              .filter((s): s is GuideStep => Boolean(s));
            if (steps.length === 0) return null;
            return (
              <section key={g.title}>
                <h2 className="mb-space-2 text-[13px] font-semibold text-ink-600">
                  {g.title}
                </h2>
                <Card>
                  <ul className="divide-y divide-line">
                    {steps.map((s) => (
                      <SetupStatusRow
                        key={s.key}
                        step={s}
                        onAction={(a) => act(s.key, a)}
                        busy={busy}
                      />
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}
          <div className="text-right">
            {data.dismissed ? (
              <Button variant="ghost" onClick={() => setDismissed(false)}>
                Show the getting-started list on my dashboard
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setDismissed(true)}>
                Hide the getting-started list from my dashboard
              </Button>
            )}
          </div>
        </div>
      )}
      {!data && loading && <p className="text-ink-400">Loading…</p>}
    </PortalShell>
  );
}
