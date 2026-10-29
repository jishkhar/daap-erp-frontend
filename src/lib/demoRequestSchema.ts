import { z } from "zod";
import { phoneField } from "@/lib/phone";
import { SERVICES } from "@/lib/services";

/** The public "Request a demo" and "Become a partner" form. Mirrors the backend's DemoRequestIn (api/demo_requests.py) and
 * PartnerRequestIn (api/partners.py). */
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
  // Optional: blank is fine (sent as null); a filled-in one must be a valid mobile, sent in E.164.
  phone: phoneField("mobile", { required: false }),
  company_name: z.string().trim().max(160, "Use 160 characters or fewer."),
  message: z.string().trim().max(2000, "Use 2000 characters or fewer."),
  services: z
    .array(z.enum(SERVICES as [string, ...string[]]))
    .min(1, "Choose at least one service."),
  website: z.string(), // honeypot, sent as-is
});

export type DemoRequestForm = z.input<typeof demoRequestSchema>;
export type DemoRequestErrors = Partial<Record<keyof DemoRequestForm, string>>;
