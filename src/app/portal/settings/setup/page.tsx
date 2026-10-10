"use client";

import { ClipboardCheck } from "lucide-react";
import {
  ProgressBar,
  useStepAction,
  SetupStatusRow,
  useGuide,
  type GuideStep,
} from "@/components/portal/onboarding/guide";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDismissOnboarding } from "@/hooks/useTenantSettings";
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
  const { data, error, isFetching: loading, allowed } = useGuide();
  const { busy, send: act } = useStepAction();
  const dismiss = useDismissOnboarding();
  if (!ready) return null;

  function setDismissed(dismissed: boolean) {
    dismiss.mutate(dismissed, {
      onError: (e) => toast.error("Couldn't update", e.message),
    });
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
        <p className="mb-space-3 text-[13px] font-medium text-error">
          {error.message}
        </p>
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
