import { z } from "zod";

/** The public "Request a demo" form. Mirrors the backend's DemoRequestIn (api/demo_requests.py). */
export const demoRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Use 120 characters or fewer."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .max(254, "Use 254 characters or fewer.")
    .pipe(z.email("Enter a valid email address, e.g. name@company.com.")),
  // Optional: blank is fine, but a filled-in number must be 10 digits and not start with 0.
  phone: z
    .string()
    .trim()
    .regex(
      /^([1-9][0-9]{9})?$/,
      "Enter a 10-digit phone number that doesn't start with 0.",
    ),
  company_name: z.string().trim().max(160, "Use 160 characters or fewer."),
  message: z.string().trim().max(2000, "Use 2000 characters or fewer."),
  website: z.string(), // honeypot, sent as-is
});

export type DemoRequestForm = z.input<typeof demoRequestSchema>;
export type DemoRequestErrors = Partial<Record<keyof DemoRequestForm, string>>;
