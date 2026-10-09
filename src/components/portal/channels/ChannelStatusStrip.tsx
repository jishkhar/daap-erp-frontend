"use client";

import Link from "next/link";
import {
  readinessStatus,
  useReadiness,
} from "@/components/portal/channels/ChannelPanels";
import { Badge } from "@/components/ui/Badge";
import { CHANNELS, type Channel } from "@/lib/erp";

const READY_LABEL: Record<Channel, string> = {
  online: "Connected",
  pos: "Ready",
  whatsapp: "Connected",
};

/** One line at the top of a channel's working page: is it set up, and where to manage that. Nothing for people without the channels permission. */
export function ChannelStatusStrip({ channel }: { channel: Channel }) {
  const { data } = useReadiness(channel);
  if (!data) return null;
  const st = readinessStatus(data);
  const label = data.ready ? READY_LABEL[channel] : st.label;
  return (
    <div className="mb-space-4 flex flex-wrap items-center gap-space-3 rounded-md border border-line bg-card px-space-4 py-space-2 text-[13.5px]">
      <Badge tone={data.ready ? "success" : st.tone}>{label}</Badge>
      <span className="min-w-0 flex-1 text-ink-600">
        {data.ready
          ? `${CHANNELS[channel].label} is set up.`
          : data.in_plan
            ? `${CHANNELS[channel].label} isn't fully set up yet.`
            : data.ended
              ? `Your ${CHANNELS[channel].label} plan has ended.`
              : `You haven't bought ${CHANNELS[channel].label} yet.`}
      </span>
      <Link
        href={`/portal/settings/channels/${channel}`}
        className="font-semibold text-brand-600 hover:underline"
      >
        Manage in Settings →
      </Link>
    </div>
  );
}
