import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  BatteryFullIcon,
  Camera01Icon,
  CheckmarkBadge01Icon,
  Mic01Icon,
  MoreVerticalIcon,
  SignalIcon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";

const MENU_ITEMS = [
  "Browse products",
  "Place an order",
  "Track my order",
  "Return or exchange",
  "My orders",
  "FAQ / Support",
];

export function PhoneMockup() {
  return (
    <div
      className="mx-auto w-full max-w-70 rounded-[36px] bg-[#0E0E10] p-space-2 shadow-lg transition-transform duration-150 ease-(--ease-standard) hover:-translate-y-1 sm:max-w-78"
      aria-hidden="true"
    >
      <div className="flex aspect-312/600 flex-col overflow-hidden rounded-[26px] bg-[#EDE6DA]">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-brand-600 px-space-4 pt-space-2 pb-1 text-[11px] font-semibold text-white">
          <span>11:41</span>
          <div className="flex items-center gap-1">
            <HugeiconsIcon icon={SignalIcon} size={12} strokeWidth={2.5} />
            <HugeiconsIcon icon={Wifi01Icon} size={12} strokeWidth={2.5} />
            <HugeiconsIcon icon={BatteryFullIcon} size={14} strokeWidth={2} />
          </div>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-space-2 bg-brand-600 px-space-3 pb-space-2 text-white">
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={18}
            strokeWidth={2}
            className="shrink-0 text-white/90"
          />
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-extrabold text-brand-600">
            A
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <span className="flex items-center gap-1">
              <strong className="truncate text-[13.5px]">ABC Store</strong>
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                size={13}
                className="shrink-0 text-white"
              />
            </span>
            <span className="block text-[10px] tracking-wide text-white/75 uppercase">
              Business Account
            </span>
          </div>
          <HugeiconsIcon
            icon={MoreVerticalIcon}
            size={18}
            strokeWidth={2}
            className="shrink-0 text-white/90"
          />
        </div>

        <div className="flex-1 overflow-hidden p-space-3">
          <div className="max-w-[92%] rounded-[10px] bg-white p-space-3 text-[12.5px] leading-relaxed font-semibold text-ink-900 shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
            Hi! Welcome to ABC Store.
            <br />
            How can we help you today?
            <br />
            Please choose an option below.
            <ol className="mt-space-1 list-decimal space-y-0.5 pl-space-4">
              {MENU_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <span className="mt-space-1 block text-right text-[10px] font-normal text-ink-400">
              10:30 AM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-2 border-t border-line bg-[#F7F5F0] px-space-3 py-space-2">
          <div className="flex flex-1 items-center justify-between rounded-full bg-white px-space-3 py-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
            <span className="text-[12.5px] text-ink-400">Type a message</span>
            <HugeiconsIcon
              icon={Camera01Icon}
              size={16}
              strokeWidth={2}
              className="shrink-0 text-ink-400"
            />
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
            <HugeiconsIcon icon={Mic01Icon} size={14} strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
