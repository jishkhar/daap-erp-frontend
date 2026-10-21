"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import {
  fieldProblem,
  fieldValues,
  STOREFRONT_URL,
  type ThemeDefinition,
  type ThemeField,
  type Values,
} from "@/lib/themes";

type Collections = ThemeDefinition["collections"];

/** Move item `i` of a list by `by` places (no-op at the ends). */
export function move<T>(list: T[], i: number, by: -1 | 1): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1 text-ink-600 hover:bg-black/[0.05] hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function CollectionsInput({
  id,
  value,
  max,
  collections,
  disabled,
  onChange,
}: {
  id: string;
  value: string[];
  max?: number;
  collections: Collections;
  disabled?: boolean;
  onChange: (v: string[]) => void;
}) {
  const name = (slug: string) =>
    collections.find((c) => c.slug === slug)?.name ?? `${slug} (not found)`;
  const left = collections.filter((c) => !value.includes(c.slug));
  return (
    <div className="space-y-space-2">
      {value.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {value.map((slug, i) => (
            <li
              key={slug}
              className="flex items-center gap-space-2 px-space-3 py-1.5 text-[13.5px]"
            >
              <span className="min-w-0 flex-1 truncate">{name(slug)}</span>
              {!disabled && (
                <>
                  <IconButton
                    label="Move up"
                    disabled={i === 0}
                    onClick={() => onChange(move(value, i, -1))}
                  >
                    <ArrowUp size={14} />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={i === value.length - 1}
                    onClick={() => onChange(move(value, i, 1))}
                  >
                    <ArrowDown size={14} />
                  </IconButton>
                  <IconButton
                    label="Remove"
                    onClick={() => onChange(value.filter((s) => s !== slug))}
                  >
                    <X size={14} />
                  </IconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled &&
        (max === undefined || value.length < max) &&
        left.length > 0 && (
          <Select
            id={id}
            value=""
            onChange={(e) =>
              e.target.value && onChange([...value, e.target.value])
            }
            aria-label="Add a collection"
          >
            <option value="">Add a collection…</option>
            {left.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
    </div>
  );
}

function ListInput({
  field,
  value,
  collections,
  disabled,
  onChange,
}: {
  field: Extract<ThemeField, { type: "list" }>;
  value: Values[];
  collections: Collections;
  disabled?: boolean;
  onChange: (v: Values[]) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const label = field.itemLabel ?? "Item";
  const summary = (item: Values) => {
    const first = field.fields.find((f) => f.type === "text" && item[f.key]);
    return first ? String(item[first.key]) : "";
  };
  return (
    <div className="space-y-space-2">
      {value.map((item, i) => (
        <div key={i} className="rounded-md border border-line">
          <div className="flex items-center gap-space-1 px-space-2 py-1">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="flex min-w-0 flex-1 items-center gap-space-2 py-1 text-left text-[13.5px]"
            >
              {open === i ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span className="font-medium text-ink-900">
                {label} {i + 1}
              </span>
              <span className="truncate text-ink-600">{summary(item)}</span>
            </button>
            {!disabled && (
              <>
                <IconButton
                  label="Move up"
                  disabled={i === 0}
                  onClick={() => {
                    onChange(move(value, i, -1));
                    setOpen(null);
                  }}
                >
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={i === value.length - 1}
                  onClick={() => {
                    onChange(move(value, i, 1));
                    setOpen(null);
                  }}
                >
                  <ArrowDown size={14} />
                </IconButton>
                <IconButton
                  label={`Remove ${label.toLowerCase()}`}
                  onClick={() => {
                    onChange(value.filter((_, k) => k !== i));
                    setOpen(null);
                  }}
                >
                  <X size={14} />
                </IconButton>
              </>
            )}
          </div>
          {open === i && (
            <div className="border-t border-line px-space-3 pt-space-3">
              <ThemeFields
                fields={field.fields}
                values={item}
                collections={collections}
                disabled={disabled}
                onChange={(next) =>
                  onChange(value.map((x, k) => (k === i ? next : x)))
                }
              />
            </div>
          )}
        </div>
      ))}
      {!disabled && (field.max === undefined || value.length < field.max) && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onChange([...value, fieldValues(field.fields, {})]);
            setOpen(value.length);
          }}
        >
          <Plus size={15} /> Add {label.toLowerCase()}
        </Button>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  collections,
  disabled,
  onChange,
}: {
  field: ThemeField;
  value: unknown;
  collections: Collections;
  disabled?: boolean;
  onChange: (v: unknown) => void;
}) {
  const id = useId();
  const problem = fieldProblem(field, value);
  if (field.type === "toggle") {
    return (
      <div className="mb-space-4 flex items-start justify-between gap-space-3">
        <div>
          <p className="text-[13.5px] font-medium text-ink-900">
            {field.label}
          </p>
          {field.help && (
            <p className="text-[12.5px] text-ink-600">{field.help}</p>
          )}
        </div>
        <Switch
          checked={value as boolean}
          disabled={disabled}
          onChange={() => onChange(!value)}
          size="sm"
        />
      </div>
    );
  }
  let control: React.ReactNode;
  switch (field.type) {
    case "text":
    case "url":
    case "image":
      control = (
        <Input
          id={id}
          value={value as string}
          maxLength={field.type === "text" ? field.max : 500}
          disabled={disabled}
          invalid={!!problem}
          placeholder={
            field.type === "url"
              ? "/c/sarees or https://…"
              : field.type === "image"
                ? "https://… or /logo.png"
                : undefined
          }
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "textarea":
      control = (
        <Textarea
          id={id}
          rows={3}
          value={value as string}
          maxLength={field.max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "number":
      control = (
        <Input
          id={id}
          type="number"
          value={String(value)}
          min={field.min}
          max={field.max}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n))
              onChange(
                Math.min(
                  field.max ?? Infinity,
                  Math.max(field.min ?? -Infinity, n),
                ),
              );
          }}
        />
      );
      break;
    case "select":
      control = (
        <Select
          id={id}
          value={value as string}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
      break;
    case "collection":
      control = (
        <Select
          id={id}
          value={value as string}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">None</option>
          {collections.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
          {value && !collections.some((c) => c.slug === value) ? (
            <option value={value as string}>{`${value} (not found)`}</option>
          ) : null}
        </Select>
      );
      break;
    case "collections":
      control = (
        <CollectionsInput
          id={id}
          value={value as string[]}
          max={field.max}
          collections={collections}
          disabled={disabled}
          onChange={onChange}
        />
      );
      break;
    case "list":
      control = (
        <ListInput
          field={field}
          value={value as Values[]}
          collections={collections}
          disabled={disabled}
          onChange={onChange}
        />
      );
      break;
  }
  return (
    <Field
      label={field.label}
      htmlFor={field.type === "list" ? undefined : id}
      hint={field.help}
      error={problem}
    >
      {control}
      {field.type === "image" &&
        typeof value === "string" &&
        value &&
        !problem && (
          // eslint-disable-next-line @next/next/no-img-element -- any https image or storefront path, not optimised here
          <img
            src={value.startsWith("/") ? `${STOREFRONT_URL}${value}` : value}
            alt=""
            className="mt-space-2 h-12 w-12 rounded border border-line object-contain"
          />
        )}
    </Field>
  );
}

/** A form for one group of settings, built from the theme's schema. */
export function ThemeFields({
  fields,
  values,
  collections,
  disabled,
  onChange,
}: {
  fields: ThemeField[];
  values: Values;
  collections: Collections;
  disabled?: boolean;
  onChange: (next: Values) => void;
}) {
  return (
    <>
      {fields.map((f) => (
        <FieldInput
          key={f.key}
          field={f}
          value={values[f.key]}
          collections={collections}
          disabled={disabled}
          onChange={(v) => onChange({ ...values, [f.key]: v })}
        />
      ))}
    </>
  );
}
