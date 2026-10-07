"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  demoRequestSchema,
  type DemoRequestErrors,
} from "@/lib/demoRequestSchema";
import { API_BASE_URL } from "@/lib/staffAuth";

type Variant = "button" | "link";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  company_name: "",
  message: "",
  website: "",
};

/** "Request a demo": opens a short form and posts it to the public demo-requests endpoint. `link` renders as a footer-style text link. */
export function DemoRequestButton({
  variant = "button",
  children,
}: {
  variant?: Variant;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<DemoRequestErrors>({});
  const [sent, setSent] = useState<string | null>(null);

  const set =
    (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // phone: digits only, so a pasted "+91 98..." or stray punctuation can't slip through unnoticed
      const value =
        k === "phone"
          ? e.target.value.replace(/\D/g, "").slice(0, 10)
          : e.target.value;
      setForm((f) => ({ ...f, [k]: value }));
      if (k in fieldErrors)
        setFieldErrors((errs) => ({ ...errs, [k]: undefined }));
    };

  function close() {
    setOpen(false);
    if (sent) {
      setSent(null);
      setForm(EMPTY);
    }
    setError(null);
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = demoRequestSchema.safeParse(form);
    if (!parsed.success) {
      const errors: DemoRequestErrors = {};
      for (const issue of parsed.error.issues)
        errors[issue.path[0] as keyof DemoRequestErrors] ??= issue.message;
      return setFieldErrors(errors);
    }
    setFieldErrors({});
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/demo-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          res.status === 429
            ? (body?.error?.message ??
                "Too many requests. Please try again later.")
            : "Please check your details and try again.",
        );
        return;
      }
      setSent((await res.json()).request_number ?? "");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const trigger =
    variant === "link" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:text-brand-600 hover:underline"
      >
        {children}
      </button>
    ) : (
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
    );

  return (
    <>
      {trigger}
      <Modal
        open={open}
        onClose={close}
        title={sent === null ? "Request a product demo" : "Request received"}
        description={
          sent === null
            ? "Tell us a little about you and we'll get in touch to arrange a demo."
            : undefined
        }
        footer={
          sent === null ? (
            <>
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" form="demo-request-form" disabled={busy}>
                {busy ? "Sending…" : "Submit request"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={close}>
              Done
            </Button>
          )
        }
      >
        {sent === null ? (
          <form id="demo-request-form" onSubmit={submit} noValidate>
            <Field
              label="Name"
              htmlFor="dr-name"
              required
              error={fieldErrors.name}
            >
              <Input
                id="dr-name"
                value={form.name}
                onChange={set("name")}
                invalid={!!fieldErrors.name}
                required
                maxLength={120}
                autoComplete="name"
              />
            </Field>
            <Field
              label="Email"
              htmlFor="dr-email"
              required
              error={fieldErrors.email}
            >
              <Input
                id="dr-email"
                type="email"
                value={form.email}
                onChange={set("email")}
                invalid={!!fieldErrors.email}
                required
                maxLength={254}
                autoComplete="email"
              />
            </Field>
            <div className="grid gap-x-space-3 sm:grid-cols-2">
              <Field label="Phone" htmlFor="dr-phone" error={fieldErrors.phone}>
                <Input
                  id="dr-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={set("phone")}
                  invalid={!!fieldErrors.phone}
                  maxLength={10}
                  autoComplete="tel"
                />
              </Field>
              <Field label="Company name" htmlFor="dr-company">
                <Input
                  id="dr-company"
                  value={form.company_name}
                  onChange={set("company_name")}
                  maxLength={160}
                  autoComplete="organization"
                />
              </Field>
            </div>
            <Field label="Message" htmlFor="dr-message" className="mb-0">
              <Textarea
                id="dr-message"
                rows={4}
                value={form.message}
                onChange={set("message")}
                maxLength={2000}
                placeholder="What would you like to see in the demo?"
              />
            </Field>
            {/* honeypot: invisible to people, tempting to bots */}
            <div
              aria-hidden
              className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
            >
              <label>
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={set("website")}
                />
              </label>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-space-3 text-[13px] font-medium text-error"
              >
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="flex flex-col items-center gap-space-2 py-space-4 text-center">
            <CheckCircle2 size={40} className="text-brand-600" />
            <p className="text-[15px] font-semibold text-ink-900">
              Thanks, we have your request.
            </p>
            <p className="text-[13px] text-ink-600">
              Our team will contact you shortly.
              {sent && (
                <>
                  {" "}
                  Your reference is <strong>{sent}</strong>.
                </>
              )}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
