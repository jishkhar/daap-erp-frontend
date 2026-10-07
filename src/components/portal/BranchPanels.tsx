"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CashiersPanel,
  TerminalsPanel,
} from "@/components/portal/BranchTerminals";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { BranchRow } from "@/lib/branchSchema";
import { erp, fromMinor, humanize, toMinor, useErpQuery } from "@/lib/erp";
import { toast } from "@/lib/toast";
import { SkeletonLines } from "@/components/ui/Skeleton";

type Hour = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  channel: string | null;
};
type Area = { pincode: string; delivery_fee_minor: number | null };
type StaffRow = {
  user_id: string;
  name: string;
  email: string;
  status: string;
  role_name: string;
  scope: "all" | "branch";
};
const areasToText = (areas: Area[]) =>
  areas
    .map((a) =>
      a.delivery_fee_minor === null
        ? a.pincode
        : `${a.pincode}, ${fromMinor(a.delivery_fee_minor)}`,
    )
    .join("\n");
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function BranchPanels({
  branch,
  canWrite,
  currency,
}: {
  branch: BranchRow;
  canWrite: boolean;
  currency: string;
}) {
  const schedule = useErpQuery<{ hours: Hour[]; areas: Area[] }>(
    `/api/v1/branches/${branch.id}/schedule`,
  );
  const staff = useErpQuery<StaffRow[]>(`/api/v1/branches/${branch.id}/staff`);
  const [hours, setHours] = useState<Hour[] | null>(null); // null = not edited yet: show what the server has
  const [pins, setPins] = useState<string | null>(null);
  const [slot, setSlot] = useState({
    weekday: "1",
    opens_at: "09:00",
    closes_at: "18:00",
  });
  const [dirtyHours, setDirtyHours] = useState(false);
  const [dirtyPins, setDirtyPins] = useState(false);
  const [busy, setBusy] = useState(false);

  const shownHours = hours ?? schedule.data?.hours ?? [];
  const shownPins = pins ?? areasToText(schedule.data?.areas ?? []);
  const loadingSchedule = schedule.loading && !schedule.data;

  function addSlot() {
    if (slot.opens_at >= slot.closes_at)
      return toast.error("Closing time must be after opening time");
    setDirtyHours(true);
    setHours(
      [
        ...shownHours,
        {
          weekday: Number(slot.weekday),
          opens_at: slot.opens_at,
          closes_at: slot.closes_at,
          channel: null,
        },
      ].sort(
        (a, b) => a.weekday - b.weekday || a.opens_at.localeCompare(b.opens_at),
      ),
    );
  }

  async function saveHours() {
    setBusy(true);
    const res = await erp<Hour[]>(
      `/api/v1/branches/${branch.id}/hours`,
      "PUT",
      { hours: shownHours },
    );
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the hours", res.error);
    toast.success("Opening hours saved");
    setHours(res.data ?? shownHours); // keep showing what was saved; don't fall back to the stale copy while reloading
    setDirtyHours(false);
    schedule.reload();
  }

  async function savePins() {
    const areas: Area[] = [];
    for (const line of shownPins
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)) {
      const [pincode, fee] = line.split(",").map((x) => x.trim());
      const minor = fee ? toMinor(fee) : null;
      if (fee && minor === null)
        return toast.error(
          `Check the fee on “${line}”`,
          "Use a plain amount like 49 or 49.50.",
        );
      areas.push({ pincode, delivery_fee_minor: minor });
    }
    setBusy(true);
    const res = await erp<Area[]>(
      `/api/v1/branches/${branch.id}/serviceable-areas`,
      "PUT",
      { areas },
    );
    setBusy(false);
    if (res.error) return toast.error("Couldn't save the pincodes", res.error);
    toast.success("Serviceable pincodes saved");
    setPins(areasToText(res.data ?? areas));
    setDirtyPins(false);
    schedule.reload();
  }

  return (
    <div className="flex flex-col gap-space-4">
      {schedule.error && <p className="mb-space-3 text-[13px] text-error">{schedule.error}</p>}
      <Card className="p-space-4"><h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Opening hours</h2>
        {shownHours.length === 0 && (schedule.loading ? <SkeletonLines rows={2} /> : <p className="mb-space-3 text-[13.5px] text-ink-400">{"No opening hours set yet."}</p>)}
        <ul className="mb-space-3 divide-y divide-line">{shownHours.map((h, i) => (
          <li key={`${h.weekday}-${h.opens_at}-${i}`} className="flex items-center justify-between py-space-2 text-[14px]">
            <span><strong className="text-ink-900">{DAYS[h.weekday]}</strong> {h.opens_at} – {h.closes_at}{h.channel && <span className="text-ink-400"> · {humanize(h.channel)} only</span>}</span>
            {canWrite && <button type="button" className="text-[13px] font-semibold text-error" onClick={() => { setDirtyHours(true); setHours(shownHours.filter((_, j) => j !== i)); }}>Remove</button>}
          </li>))}
        </ul>
        {canWrite && (
          <>
            <div className="mb-space-3 flex flex-wrap items-end gap-space-2">
              <Select
                aria-label="Day"
                value={slot.weekday}
                onChange={(e) => setSlot({ ...slot, weekday: e.target.value })}
                className="w-40"
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Opens at"
                type="time"
                value={slot.opens_at}
                onChange={(e) => setSlot({ ...slot, opens_at: e.target.value })}
                className="w-32"
              />
              <Input
                aria-label="Closes at"
                type="time"
                value={slot.closes_at}
                onChange={(e) =>
                  setSlot({ ...slot, closes_at: e.target.value })
                }
                className="w-32"
              />
              <Button variant="secondary" onClick={addSlot}>
                Add
              </Button>
            </div>
            <Button disabled={busy || !dirtyHours} onClick={saveHours}>
              Save hours
            </Button>
          </>
        )}
      </Card>
      <Card className="p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
          Delivery pincodes
        </h2>
        <Field
          label="Pincodes this branch delivers to"
          htmlFor="b_pins"
          hint={`One per line. Add a delivery fee after a comma if it differs, e.g. “560001, 49” (${currency}). Online orders to a listed pincode are fulfilled from this branch first when the ordering branch can't supply them.`}
        >
          <Textarea
            id="b_pins"
            rows={8}
            disabled={!canWrite || loadingSchedule}
            placeholder={loadingSchedule ? "Loading…" : "560001\n560002, 49"}
            value={shownPins}
            onChange={(e) => {
              setDirtyPins(true);
              setPins(e.target.value);
            }}
          />
        </Field>
        {canWrite && (
          <Button disabled={busy || !dirtyPins} onClick={savePins}>
            Save pincodes
          </Button>
        )}
      </Card>
      <Card className="p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
          POS terminals
        </h2>
        <TerminalsPanel branchId={branch.id} />
      </Card>
      <Card className="p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
          Cashiers
        </h2>
        <CashiersPanel branchId={branch.id} />
      </Card>
      <Card className="p-space-4">
        <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Staff</h2>
        {staff.error && <p className="text-[13px] text-error">{staff.error}</p>}
        {(staff.data ?? []).length === 0 && (staff.loading ? <SkeletonLines rows={2} /> : <p className="text-[13.5px] text-ink-400">{"Nobody is assigned to this branch yet."}</p>)}
        <ul className="divide-y divide-line">{(staff.data ?? []).map((m, i) => (
          <li key={`${m.user_id}-${i}`} className="flex items-center justify-between gap-space-3 py-space-2 text-[14px]">
            <span><strong className="text-ink-900">{m.name}</strong> <span className="text-ink-400">{m.email}</span></span>
            <span className="flex items-center gap-space-2"><Badge tone="neutral">{humanize(m.role_name)}</Badge><Badge tone={m.scope === "all" ? "violet" : "brand"}>{m.scope === "all" ? "all branches" : "this branch"}</Badge></span>
          </li>))}
        </ul>
        <p className="mt-space-3 text-[12.5px] text-ink-400">
          Change assignments under{" "}
          <Link className="underline" href="/portal/settings/staff">
            Team &amp; Access
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
