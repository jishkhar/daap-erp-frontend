"use client";

import { Select } from "@/components/ui/Select";
import { STATES } from "@/lib/states";

/** A state or union territory picked from the GST list, never typed: the state decides IGST vs CGST + SGST, and the server refuses any
 * name not on the list. `value` and `onChange` use the state's name. `options` narrows the list (a border pincode's two states). A value
 * saved before the list was enforced ("Kolkata") stays visible, marked, until a real state is picked. */
export function StateSelect({
  id,
  value,
  onChange,
  options = STATES,
  disabled,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (name: string) => void;
  options?: { code: string; name: string }[];
  disabled?: boolean;
  invalid?: boolean;
}) {
  const stray = value && !options.some((s) => s.name === value);
  return (
    <Select
      id={id}
      value={value}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onValueChange={onChange}
    >
      <option value="">Choose a state…</option>
      {stray && (
        <option value={value} disabled>
          {value} (not a state, choose again)
        </option>
      )}
      {options.map((s) => (
        <option key={s.code} value={s.name}>
          {s.name}
        </option>
      ))}
    </Select>
  );
}
