import { Badge } from "@/components/ui/Badge";
import {
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  type SupportPriority,
  type SupportStatus,
} from "@/lib/support";

export const StatusBadge = ({ status }: { status: SupportStatus }) => (
  <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
);

export const PriorityBadge = ({ priority }: { priority: SupportPriority }) => (
  <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>
);
