"use client";

import { useEffect, useRef } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

/** Native input events preview locally; native change commits once instead of redrawing the product table while dragging. */
export function ProductColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const hex = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (hex.current) hex.current.value = value;
    if (picker.current) picker.current.value = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  }, [value]);

  useEffect(() => {
    const input = picker.current;
    if (!input) return;
    const commit = () => {
      if (!dirty.current) return;
      dirty.current = false;
      onChange(input.value.toUpperCase());
    };
    input.addEventListener("change", commit);
    input.addEventListener("blur", commit);
    return () => {
      input.removeEventListener("change", commit);
      input.removeEventListener("blur", commit);
    };
  }, [onChange]);

  return <Field label="Color (hex code)" htmlFor="p_color" hint="Use # followed by six hex digits, e.g. #FF5733. Leave empty for none.">
    <div className="flex items-center gap-space-2">
      <input ref={picker} type="color" aria-label="Choose product color"
        defaultValue={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onInput={(event) => {
          dirty.current = true;
          if (hex.current) hex.current.value = event.currentTarget.value.toUpperCase();
        }}
        className="h-10 w-12 shrink-0 cursor-pointer rounded border border-line" />
      <Input ref={hex} id="p_color" placeholder="#FF5733" maxLength={7} defaultValue={value}
        onChange={(event) => { dirty.current = false; onChange(event.target.value); }} />
    </div>
  </Field>;
}
