"use client";

import { useEffect, useRef } from "react";
import { StateSelect } from "@/components/portal/StateSelect";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { usePincodePlace, type PincodePlace } from "@/hooks/usePincodePlace";
import { digitsOnly } from "@/lib/branchSchema";

export type AddressValue = { city: string; state: string; pincode: string };

/** Pincode, city and state, pincode first (docs/address_entry_plan.md): the pincode fills the state (locked, or a choice of two for a
 * border pincode) and an empty city (from the district, still editable). A pincode India Post does not list is allowed with a warning,
 * and then the state is picked from the list. Renders three Fields, so the form's own grid lays them out. */
export function AddressFields({
  idPrefix,
  value,
  onChange,
  errors = {},
  required = false,
  lockedState,
  onPlace,
}: {
  idPrefix: string;
  value: AddressValue;
  onChange: (patch: Partial<AddressValue>) => void;
  errors?: Partial<Record<keyof AddressValue, string>>;
  required?: boolean;
  /** A state something else decides, `by` naming it ("your GSTIN"): shown locked; a pincode in another state only warns. */
  lockedState?: { name: string; by: string } | null;
  /** Once per pincode found, e.g. to put a new branch at the pincode's centre. */
  onPlace?: (place: PincodePlace) => void;
}) {
  const { place, unknown, checking } = usePincodePlace(value.pincode);
  const applied = useRef<{ pincode: string; district: string } | null>(null);

  useEffect(() => {
    if (!place || applied.current?.pincode === place.pincode) return;
    const filledCity = applied.current?.district; // a city this form filled from the previous pincode follows the new one
    applied.current = { pincode: place.pincode, district: place.district };
    const patch: Partial<AddressValue> = {};
    if (!lockedState && !place.states.some((s) => s.name === value.state))
      patch.state = place.state;
    if (!value.city.trim() || value.city === filledCity)
      patch.city = place.district;
    if (Object.keys(patch).length) onChange(patch);
    onPlace?.(place);
  }, [place, lockedState, value.state, value.city, onChange, onPlace]);

  const id = (f: string) => `${idPrefix}_${f}`;
  const border = !!place && place.states.length > 1;
  const clash =
    lockedState &&
    place &&
    !place.states.some((s) => s.name === lockedState.name)
      ? `This pincode is in ${place.state}, but ${lockedState.by} is registered in ${lockedState.name}. Check both.`
      : undefined;

  return (
    <>
      <Field
        label="Pincode"
        htmlFor={id("pin")}
        required={required}
        error={
          errors.pincode ??
          clash ??
          (unknown
            ? "India Post doesn't list this pincode. Check it, or choose the state yourself."
            : undefined)
        }
        hint={
          checking
            ? "Looking up…"
            : place
              ? `${place.district}, ${border ? place.states.map((s) => s.name).join(" / ") : place.state}`
              : "Fills the city and state"
        }
      >
        <Input
          id={id("pin")}
          inputMode="numeric"
          autoComplete="postal-code"
          invalid={!!errors.pincode}
          value={value.pincode}
          onChange={(e) => onChange({ pincode: digitsOnly(e.target.value, 6) })}
        />
      </Field>
      <Field
        label="City"
        htmlFor={id("city")}
        required={required}
        error={errors.city}
      >
        <Input
          id={id("city")}
          invalid={!!errors.city}
          value={value.city}
          maxLength={100}
          list={place ? id("places") : undefined}
          onChange={(e) => onChange({ city: e.target.value })}
        />
        {place && (
          <datalist id={id("places")}>
            {[place.district, ...place.localities]
              .filter((n, i, all) => all.indexOf(n) === i)
              .map((n) => (
                <option key={n} value={n} />
              ))}
          </datalist>
        )}
      </Field>
      <Field
        label="State"
        htmlFor={id("state")}
        required={required}
        error={errors.state}
        hint={
          lockedState
            ? `Taken from ${lockedState.by}.`
            : border
              ? "This pincode reaches two states. Choose the right one."
              : place
                ? "From the pincode"
                : undefined
        }
      >
        <StateSelect
          id={id("state")}
          value={lockedState ? lockedState.name : value.state}
          disabled={!!lockedState || (!!place && !border)}
          options={border ? place.states : undefined}
          invalid={!!errors.state}
          onChange={(state) => onChange({ state })}
        />
      </Field>
    </>
  );
}
