import { Globe, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Dashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/erp";
import type { Service, ServiceInfo } from "@/lib/services";

function Row({
  icon,
  title,
  href,
  ok,
  children,
}: {
  icon: ReactNode;
  title: string;
  href: string;
  ok: boolean | null;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-space-3 rounded-md border border-line p-space-3 hover:bg-black/[0.02]"
    >
      <span className="mt-0.5 text-ink-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-space-2 text-[13.5px] font-semibold text-ink-900">
          {title}
          {ok !== null && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                ok
                  ? "bg-success-tint text-success"
                  : "bg-warning-tint text-warning",
              )}
            >
              {ok ? "Online" : "Attention"}
            </span>
          )}
        </span>
        <span className="block text-[12.5px] text-ink-600">{children}</span>
      </span>
    </Link>
  );
}

/** The state of the sales channels: the online store, the POS tills and WhatsApp. A channel the business hasn't bought isn't shown. */
export function ChannelsCard({
  data,
  services,
}: {
  data: Dashboard | undefined;
  services: Record<Service, ServiceInfo> | undefined;
}) {
  const has = (s: Service) =>
    !services || (services[s]?.state ?? "none") !== "none";
  const tills = data?.channels.tills;
  const wa = data?.channels.whatsapp;
  return (
    <Card className="p-space-4">
      <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
        Connected channels
      </h2>
      {!data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid gap-space-2 md:grid-cols-3">
          {has("online") && (
            <Row
              icon={<Globe size={18} />}
              title="Online store"
              href="/portal/channels"
              ok={null}
            >
              Orders from your website appear here as they arrive.
            </Row>
          )}
          {has("pos") && (
            <Row
              icon={<Store size={18} />}
              title="POS tills"
              href="/portal/settings/branches"
              ok={
                tills
                  ? tills.paired > 0 &&
                    tills.online > 0 &&
                    tills.waiting_bills === 0
                  : null
              }
            >
              {tills
                ? `${tills.online} of ${tills.paired} till${tills.paired === 1 ? "" : "s"} online${tills.waiting_bills ? ` · ${tills.waiting_bills} bill${tills.waiting_bills === 1 ? "" : "s"} waiting to sync` : ""}${tills.last_seen_at ? ` · last seen ${formatDateTime(tills.last_seen_at)}` : ""}`
                : "Your tills share this catalog, stock and customers."}
            </Row>
          )}
          {has("whatsapp") && (
            <Row
              icon={<MessageCircle size={18} />}
              title="WhatsApp"
              href="/portal/whatsapp-inbox"
              ok={wa ? wa.connected : null}
            >
              {wa
                ? wa.connected
                  ? wa.last_message_at
                    ? `Last message ${formatDateTime(wa.last_message_at)}`
                    : "Connected"
                  : "Not connected yet"
                : "Orders and chats arrive in the inbox."}
            </Row>
          )}
        </div>
      )}
    </Card>
  );
}
