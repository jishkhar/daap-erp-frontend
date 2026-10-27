"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckboxRow } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useBranches } from "@/hooks/useBranches";
import {
  useDistrictSearch,
  useSaveZone,
  useZonePreview,
  type DeliveryZone,
  type RuleKind,
  type ZoneInput,
  type ZoneRule,
} from "@/hooks/useDeliveryZones";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { useDebounced } from "@/lib/useDebounced";

type Area = RuleKind;
/** A new zone can start from a template (see DeliveryZones): its area kind and promise. */
export type ZoneStart = Partial<
  Pick<DeliveryZone, "fee_minor" | "min_days" | "max_days">
> & { area: Area };

const AREAS: { kind: Area; label: string; hint: string }[] = [
  { kind: "all", label: "All of India", hint: "Every pincode" },
  { kind: "state", label: "States", hint: "Whole states" },
  {
    kind: "district",
    label: "Districts",
    hint: "Cities and their surroundings",
  },
  { kind: "pincode", label: "Pincodes", hint: "An exact list" },
];
/** What may be left out of each kind of area: always something narrower. */
const EXCEPT: Record<Area, Exclude<RuleKind, "all">[]> = {
  all: ["state", "district", "pincode"],
  state: ["district", "pincode"],
  district: ["pincode"],
  pincode: [],
};
const KIND_WORD: Record<Exclude<RuleKind, "all">, string> = {
  state: "States",
  district: "Districts",
  pincode: "Pincodes",
};

const rupees = (m: number | null | undefined) =>
  m == null ? "" : String(m / 100);
const minor = (v: string) =>
  v.trim() === "" ? null : Math.round(Number(v) * 100);
const days = (v: string) => (v.trim() === "" ? null : Math.floor(Number(v)));
const PIN = /^[1-9]\d{5}$/;

/** The kind of area a saved zone uses: "all" if it includes all of India, otherwise the kind most of its places are. */
function areaOf(rules: ZoneRule[], fallback: Area): Area {
  const inc = rules.filter((r) => !r.exclude);
  if (inc.some((r) => r.kind === "all")) return "all";
  const counts = inc.reduce<Record<string, number>>(
    (m, r) => ({ ...m, [r.kind]: (m[r.kind] ?? 0) + 1 }),
    {},
  );
  return (
    (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Area) ??
    fallback
  );
}

/** "Kerala", "Kerala and Goa", "Ernakulam +2 more", "3 pincodes" — a name for the zone from its area, until the person types one. */
function suggestName(area: Area, places: ZoneRule[]) {
  if (area === "all") return "All India";
  if (!places.length) return "";
  if (area === "pincode")
    return places.length <= 3
      ? places.map((p) => p.value).join(", ")
      : `${places.length} pincodes`;
  const names = places.map((p) => p.label ?? p.value);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} +${names.length - 1} more`;
}

/** Add or edit a delivery zone, as four plain questions: which area, what shoppers there pay, how long it takes, and cash on delivery.
 * Minimum order, which branches send it and switching it off are under "More options". */
export function ZoneEditor({
  zone,
  start,
  states,
  onClose,
}: {
  zone: DeliveryZone | null;
  start?: ZoneStart;
  states: { code: string; name: string }[];
  onClose: () => void;
}) {
  const save = useSaveZone();
  const branches = useBranches();
  const stateName = (code: string) =>
    states.find((s) => s.code === code)?.name ?? code;
  const labelled = (zone?.rules ?? []).map((r) =>
    r.kind === "state" ? { ...r, label: stateName(r.value) } : r,
  );
  const [area, setArea] = useState<Area>(
    zone ? areaOf(zone.rules, "district") : (start?.area ?? "district"),
  );
  const [rules, setRules] = useState<ZoneRule[]>(labelled);
  const [exceptOpen, setExceptOpen] = useState(labelled.some((r) => r.exclude));
  const [exceptKind, setExceptKind] = useState<Exclude<RuleKind, "all">>(
    EXCEPT[area][0] ?? "pincode",
  );
  const [fee, setFee] = useState(
    rupees(zone?.fee_minor ?? start?.fee_minor ?? 0),
  );
  const [freeAbove, setFreeAbove] = useState(rupees(zone?.free_above_minor));
  const [minDays, setMinDays] = useState(
    (zone?.min_days ?? start?.min_days)?.toString() ?? "",
  );
  const [maxDays, setMaxDays] = useState(
    (zone?.max_days ?? start?.max_days)?.toString() ?? "",
  );
  const [cod, setCod] = useState(zone?.cod_allowed ?? true);
  const [codMax, setCodMax] = useState(rupees(zone?.cod_max_minor));
  const [more, setMore] = useState(false);
  const [active, setActive] = useState(zone?.is_active ?? true);
  const [minOrder, setMinOrder] = useState(rupees(zone?.min_order_minor));
  const [allBranches, setAllBranches] = useState(zone?.all_branches ?? true);
  const [branchIds, setBranchIds] = useState<string[]>(zone?.branch_ids ?? []);
  const [name, setName] = useState(zone?.name ?? "");
  const [nameTyped, setNameTyped] = useState(!!zone);
  const [error, setError] = useState<string | null>(null);

  const included = rules.filter((r) => !r.exclude && r.kind === area);
  const excluded = rules.filter((r) => r.exclude);
  const effective =
    area === "all"
      ? [{ kind: "all" as const, value: "", exclude: false }, ...excluded]
      : [...included, ...excluded];
  // debounce the rules as text: a new array every render would restart the timer forever
  const settled = useDebounced(JSON.stringify(effective), 400);
  const preview = useZonePreview(
    useMemo(() => JSON.parse(settled) as ZoneRule[], [settled]),
    zone?.id,
    active,
  );
  const shownName = nameTyped ? name : suggestName(area, included);

  const chooseArea = (next: Area) => {
    setArea(next);
    setRules((cur) =>
      cur.filter((r) =>
        r.exclude
          ? EXCEPT[next].includes(r.kind as Exclude<RuleKind, "all">)
          : r.kind === next,
      ),
    );
    setExceptKind(EXCEPT[next][0] ?? "pincode");
  };
  const add = (r: ZoneRule) =>
    setRules((cur) => [
      ...cur.filter((x) => !(x.kind === r.kind && x.value === r.value)),
      r,
    ]);
  const remove = (r: ZoneRule) =>
    setRules((cur) =>
      cur.filter(
        (x) =>
          !(
            x.kind === r.kind &&
            x.value === r.value &&
            x.exclude === r.exclude
          ),
      ),
    );

  const submit = () => {
    const lo = days(minDays);
    const hi = days(maxDays);
    if (area !== "all" && !included.length)
      return setError("Choose where this zone delivers (step 1).");
    if (!shownName.trim()) return setError("Give the zone a name.");
    if (
      (lo == null) !== (hi == null) ||
      (lo != null && hi != null && !(lo >= 1 && lo <= hi && hi <= 60))
    )
      return setError(
        "Delivery takes 1 to 60 days, fewest first. Leave both empty to show no time.",
      );
    if (!allBranches && branchIds.length === 0)
      return setError(
        "Choose the branches that send this zone's orders (More options).",
      );
    setError(null);
    const body: ZoneInput & { id?: string } = {
      id: zone?.id,
      name: shownName.trim(),
      is_active: active,
      fee_minor: minor(fee) ?? 0,
      free_above_minor: minor(freeAbove),
      min_order_minor: minor(minOrder),
      min_days: lo,
      max_days: hi,
      cod_allowed: cod,
      cod_max_minor: cod ? minor(codMax) : null,
      all_branches: allBranches,
      branch_ids: allBranches ? [] : branchIds,
      rules: effective.map(({ kind, value, exclude }) => ({
        kind,
        value,
        exclude,
      })),
    };
    save.mutate(body, {
      onSuccess: (saved) => {
        toast.success(zone ? "Zone saved" : "Zone added", saved.name);
        onClose();
      },
      onError: (e: Error) => setError(e.message),
    });
  };

  const money = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    hint?: string,
  ) => (
    <Field label={label} htmlFor={id} hint={hint} className="mb-0">
      <div className="flex items-center gap-space-2">
        <span className="text-[13px] text-ink-600">₹</span>
        <Input
          id={id}
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => set(e.target.value)}
        />
      </div>
    </Field>
  );

  return (
    <Modal
      open
      width="lg"
      title={zone ? `Edit “${zone.name}”` : "Add a delivery zone"}
      description="An area that gets its own delivery price and time. Shoppers in it see these instead of your other zones'."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save zone"}
          </Button>
        </>
      }
    >
      <Step n={1} title="Which area?">
        <div
          className="mb-space-3 grid grid-cols-2 gap-space-2 sm:grid-cols-4"
          role="radiogroup"
          aria-label="Area"
        >
          {AREAS.map((a) => (
            <button
              key={a.kind}
              type="button"
              role="radio"
              aria-checked={area === a.kind}
              onClick={() => chooseArea(a.kind)}
              className={cn(
                "rounded-md border px-space-2 py-space-2 text-left",
                area === a.kind
                  ? "border-brand-500 bg-brand-50"
                  : "border-line hover:border-brand-300",
              )}
            >
              <span className="block text-[13.5px] font-semibold text-ink-900">
                {a.label}
              </span>
              <span className="block text-[11.5px] text-ink-500">{a.hint}</span>
            </button>
          ))}
        </div>

        {area === "state" && (
          <StatePicker
            states={states}
            chosen={included}
            onPick={(code) =>
              add({
                kind: "state",
                value: code,
                exclude: false,
                label: stateName(code),
              })
            }
          />
        )}
        {area === "district" && (
          <DistrictPicker
            onPick={(d) =>
              add({
                kind: "district",
                value: d.key,
                exclude: false,
                label: d.label,
              })
            }
          />
        )}
        {area === "pincode" && (
          <PincodeAdder
            onAdd={(pins) =>
              pins.forEach((p) =>
                add({ kind: "pincode", value: p, exclude: false, label: p }),
              )
            }
            onError={setError}
          />
        )}
        <Chips rules={included} onRemove={remove} />

        {EXCEPT[area].length > 0 && (
          <div className="mt-space-3">
            {!exceptOpen ? (
              <button
                type="button"
                className="text-[13px] font-semibold text-brand-700 hover:underline"
                onClick={() => setExceptOpen(true)}
              >
                + Except some places (optional)
              </button>
            ) : (
              <div className="rounded-md bg-paper p-space-3">
                <div className="mb-space-2 flex flex-wrap items-center gap-space-2">
                  <span className="text-[13px] font-semibold text-ink-800">
                    Leave out:
                  </span>
                  {EXCEPT[area].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setExceptKind(k)}
                      className={cn(
                        "rounded-full border px-space-3 py-0.5 text-[12.5px]",
                        exceptKind === k
                          ? "border-brand-500 bg-brand-50 text-brand-800"
                          : "border-line text-ink-700",
                      )}
                    >
                      {KIND_WORD[k]}
                    </button>
                  ))}
                </div>
                {exceptKind === "state" && (
                  <StatePicker
                    states={states}
                    chosen={excluded}
                    onPick={(code) =>
                      add({
                        kind: "state",
                        value: code,
                        exclude: true,
                        label: stateName(code),
                      })
                    }
                  />
                )}
                {exceptKind === "district" && (
                  <DistrictPicker
                    onPick={(d) =>
                      add({
                        kind: "district",
                        value: d.key,
                        exclude: true,
                        label: d.label,
                      })
                    }
                  />
                )}
                {exceptKind === "pincode" && (
                  <PincodeAdder
                    onAdd={(pins) =>
                      pins.forEach((p) =>
                        add({
                          kind: "pincode",
                          value: p,
                          exclude: true,
                          label: p,
                        }),
                      )
                    }
                    onError={setError}
                  />
                )}
                <Chips rules={excluded} onRemove={remove} />
              </div>
            )}
          </div>
        )}

        <Coverage
          preview={preview.data}
          loading={preview.isFetching}
          empty={area !== "all" && !included.length}
        />
      </Step>

      <Step n={2} title="What do shoppers here pay for delivery?">
        <div className="grid gap-space-3 sm:grid-cols-2">
          {money(
            "z-fee",
            "Delivery fee",
            fee,
            setFee,
            "Includes GST. 0 = free delivery.",
          )}
          {money(
            "z-free",
            "Free if the order is at least",
            freeAbove,
            setFreeAbove,
            "Optional. Counted after coupons.",
          )}
        </div>
      </Step>

      <Step n={3} title="How long does delivery take?">
        <div className="flex flex-wrap items-center gap-space-2 text-[13px] text-ink-700">
          <Input
            type="number"
            min={1}
            max={60}
            value={minDays}
            onChange={(e) => setMinDays(e.target.value)}
            aria-label="At least (days)"
            className="w-20"
          />
          <span>to</span>
          <Input
            type="number"
            min={1}
            max={60}
            value={maxDays}
            onChange={(e) => setMaxDays(e.target.value)}
            aria-label="At most (days)"
            className="w-20"
          />
          <span>business days</span>
        </div>
        <p className="mt-1 text-[12px] text-ink-500">
          Shown on product pages and at checkout. Leave empty to show no time.
        </p>
      </Step>

      <Step n={4} title="Cash on delivery?">
        <div className="flex flex-wrap items-center gap-space-3">
          <Switch
            checked={cod}
            onChange={() => setCod((c) => !c)}
            aria-label="Cash on delivery"
          />
          <span className="text-[13px] text-ink-700">
            {cod
              ? "Offered"
              : "Not offered: shoppers here pay through the website"}
          </span>
        </div>
        {cod && (
          <div className="mt-space-2 max-w-xs">
            {money(
              "z-codmax",
              "Only for orders up to",
              codMax,
              setCodMax,
              "Optional. Above this, shoppers pay through the website.",
            )}
          </div>
        )}
      </Step>

      <div className="mb-space-4 border-t border-line pt-space-3">
        <button
          type="button"
          className="flex items-center gap-1 text-[13px] font-semibold text-ink-700"
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
        >
          <ChevronDown
            size={14}
            className={cn("transition-transform", more && "rotate-180")}
          />{" "}
          More options
          <span className="font-normal text-ink-500">
            (minimum order, which branches send it, switch off)
          </span>
        </button>
        {more && (
          <div className="mt-space-3 space-y-space-3">
            <div className="max-w-xs">
              {money(
                "z-min",
                "Minimum order for delivery",
                minOrder,
                setMinOrder,
                "Optional. Smaller orders can't be delivered here.",
              )}
            </div>
            <div>
              <div className="flex items-center gap-space-3">
                <Switch
                  checked={allBranches}
                  onChange={() => setAllBranches((a) => !a)}
                  aria-label="Any branch sends it"
                />
                <span className="text-[13px] text-ink-700">
                  {allBranches
                    ? "Any branch that delivers website orders sends it (the nearest one with every item)"
                    : "Only these branches send it:"}
                </span>
              </div>
              {!allBranches && (
                <div className="mt-space-2 grid gap-1 sm:grid-cols-2">
                  {(branches.data ?? []).map((b) => (
                    <CheckboxRow
                      key={b.id}
                      checked={branchIds.includes(b.id)}
                      onChange={(on) =>
                        setBranchIds((cur) =>
                          on ? [...cur, b.id] : cur.filter((x) => x !== b.id),
                        )
                      }
                    >
                      {b.branch_name}
                    </CheckboxRow>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-space-3">
              <Switch
                checked={active}
                onChange={() => setActive((a) => !a)}
                aria-label="Zone switched on"
              />
              <span className="text-[13px] text-ink-700">
                {active ? "Zone is on" : "Zone is off (kept, but not used)"}
              </span>
            </div>
          </div>
        )}
      </div>

      <Field
        label="Zone name"
        htmlFor="z-name"
        hint="For you, and shown to shoppers next to the delivery time."
        className="mb-0"
      >
        <Input
          id="z-name"
          maxLength={60}
          value={shownName}
          placeholder="e.g. Kochi city"
          onChange={(e) => {
            setNameTyped(true);
            setName(e.target.value);
          }}
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="mt-space-3 text-[13px] font-medium text-error"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-space-4">
      <h3 className="mb-space-2 flex items-center gap-space-2 text-[14px] font-bold text-ink-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[12px] text-white">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chips({
  rules,
  onRemove,
}: {
  rules: ZoneRule[];
  onRemove: (r: ZoneRule) => void;
}) {
  if (!rules.length) return null;
  const pins = rules.filter((r) => r.kind === "pincode");
  const many = pins.length > 30;
  const shown = many ? rules.filter((r) => r.kind !== "pincode") : rules;
  return (
    <ul className="mt-space-2 flex flex-wrap gap-space-1">
      {shown.map((r) => (
        <li
          key={`${r.kind}:${r.value}:${r.exclude}`}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12.5px]",
            r.exclude
              ? "border-error/40 bg-error-tint text-error"
              : "border-line bg-card text-ink-800",
          )}
        >
          {r.exclude && <span className="font-semibold">not</span>}
          {r.label ?? r.value}
          <button
            type="button"
            aria-label={`Remove ${r.label ?? r.value}`}
            onClick={() => onRemove(r)}
          >
            <X size={12} />
          </button>
        </li>
      ))}
      {many && (
        <li className="flex items-center gap-1 rounded-full border border-line bg-card px-2 py-0.5 text-[12.5px]">
          {pins.length} pincodes
          <button
            type="button"
            aria-label="Remove all these pincodes"
            onClick={() => pins.forEach(onRemove)}
          >
            <X size={12} />
          </button>
        </li>
      )}
    </ul>
  );
}

/** Type to find, click to add. */
function Finder({
  q,
  setQ,
  placeholder,
  options,
  onPick,
  loading,
  emptyText,
}: {
  q: string;
  setQ: (q: string) => void;
  placeholder: string;
  options: { key: string; label: string; sub?: string }[];
  onPick: (key: string) => void;
  loading?: boolean;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="flex h-10 items-center gap-space-2 rounded-md border border-line bg-card px-space-3 text-ink-400 focus-within:border-brand-400">
        <Search size={15} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400"
        />
      </label>
      {open && q.trim().length >= 1 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-card py-1 shadow-[var(--shadow-md)]">
          {options.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-space-2 px-space-3 py-1.5 text-left text-[13.5px] hover:bg-brand-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(o.key);
                  setQ("");
                }}
              >
                <span className="text-ink-900">{o.label}</span>
                {o.sub && (
                  <span className="text-[12px] text-ink-500">{o.sub}</span>
                )}
              </button>
            </li>
          ))}
          {!options.length && (
            <li className="px-space-3 py-1.5 text-[13px] text-ink-400">
              {loading ? "Searching…" : emptyText}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function StatePicker({
  states,
  chosen,
  onPick,
}: {
  states: { code: string; name: string }[];
  chosen: ZoneRule[];
  onPick: (code: string) => void;
}) {
  const [q, setQ] = useState("");
  return (
    <Finder
      q={q}
      setQ={setQ}
      placeholder="Type a state, e.g. Kerala"
      emptyText="No state by that name."
      options={states
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q.trim().toLowerCase()) &&
            !chosen.some((c) => c.kind === "state" && c.value === s.code),
        )
        .map((s) => ({ key: s.code, label: s.name }))}
      onPick={onPick}
    />
  );
}

function DistrictPicker({
  onPick,
}: {
  onPick: (d: { key: string; label: string }) => void;
}) {
  const [q, setQ] = useState("");
  const search = useDistrictSearch(useDebounced(q, 250));
  const hits = q.trim().length >= 2 ? (search.data?.items ?? []) : [];
  return (
    <Finder
      q={q}
      setQ={setQ}
      placeholder="Type a district or city, e.g. Ernakulam"
      emptyText={
        q.trim().length < 2
          ? "Type at least two letters."
          : "No district by that name."
      }
      loading={search.isFetching}
      options={hits.map((d) => ({
        key: d.key,
        label: d.name,
        sub: `${d.state} · ${d.pincodes} pincodes`,
      }))}
      onPick={(key) => {
        const d = hits.find((x) => x.key === key);
        if (d) onPick({ key: d.key, label: d.name });
      }}
    />
  );
}

function PincodeAdder({
  onAdd,
  onError,
}: {
  onAdd: (pins: string[]) => void;
  onError: (e: string | null) => void;
}) {
  const [text, setText] = useState("");
  const addAll = () => {
    const found = Array.from(new Set(text.split(/[\s,;]+/).filter(Boolean)));
    const bad = found.filter((p) => !PIN.test(p));
    if (bad.length)
      return onError(
        `These aren't 6-digit pincodes: ${bad.slice(0, 5).join(", ")}${bad.length > 5 ? "…" : ""}`,
      );
    onError(null);
    onAdd(found);
    setText("");
  };
  return (
    <div className="flex items-start gap-space-2">
      <Textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste pincodes, e.g. 682001 682002 682016"
        aria-label="Pincodes"
      />
      <Button variant="secondary" onClick={addAll} disabled={!text.trim()}>
        Add
      </Button>
    </div>
  );
}

function Coverage({
  preview,
  loading,
  empty,
}: {
  preview?: {
    pincodes: number;
    states: string[];
    unknown_pincodes: string[];
    clashes: { name: string; label: string }[];
  };
  loading: boolean;
  empty: boolean;
}) {
  if (empty)
    return (
      <p className="mt-space-3 text-[12.5px] text-ink-500">
        Add at least one place above.
      </p>
    );
  if (!preview)
    return (
      <p className="mt-space-3 text-[12.5px] text-ink-500">
        {loading ? "Counting…" : ""}
      </p>
    );
  const where =
    preview.states.length === 0
      ? ""
      : preview.states.length <= 3
        ? ` in ${preview.states.join(", ")}`
        : ` across ${preview.states.length} states`;
  return (
    <div className="mt-space-3 space-y-1 text-[13px]" aria-live="polite">
      <p className="flex items-center gap-1 text-success">
        <CheckCircle2 size={14} /> Covers{" "}
        {preview.pincodes.toLocaleString("en-IN")} pincode
        {preview.pincodes === 1 ? "" : "s"}
        {where}
        {loading && <span className="text-ink-400"> …</span>}
      </p>
      {preview.clashes.map((c) => (
        <p
          key={`${c.name}-${c.label}`}
          className="flex items-start gap-1 text-warning"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {c.label} is already in your zone “{c.name}”. A place can belong to
            one zone only: remove it there, or pick something narrower here.
          </span>
        </p>
      ))}
      {preview.unknown_pincodes.length > 0 && (
        <p className="flex items-start gap-1 text-warning">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Not in India Post&apos;s list (remove them to save):{" "}
            {preview.unknown_pincodes.slice(0, 10).join(", ")}
          </span>
        </p>
      )}
    </div>
  );
}
