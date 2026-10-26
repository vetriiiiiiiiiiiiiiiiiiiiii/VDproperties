import { z } from "zod";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const nameField = z.string().trim().min(2, "Please enter your name").max(80, "Name is too long");

export const phoneField = z
  .string()
  .trim()
  .max(20, "Phone number is too long")
  .refine((v) => /^\+?[\d\s()-]+$/.test(v), "Use digits only, with an optional + country code")
  .refine((v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  }, "Enter a valid phone number, e.g. 98765 43210");

export const optionalEmail = z.preprocess(blank, z.email("Enter a valid email address").max(120).optional());

const optionalText = (max: number) => z.preprocess(blank, z.string().trim().max(max, `Keep this under ${max} characters`).optional());

const optionalArea = z.preprocess(blank, z.coerce.number({ error: "Enter a number" }).positive("Enter a positive number").max(1e8).optional());

/** Fields every public form sends for spam protection. */
const antiSpam = {
  /** Honeypot: hidden from people; bots tend to fill it. */
  company_website: z.string().max(0).optional().or(z.literal("")),
  /** Milliseconds since epoch when the form was rendered. */
  startedAt: z.coerce.number().int().positive(),
};

const consent = z.literal(true, { error: "Please confirm we may contact you about this request" });

export const ENQUIRY_TYPES = ["GENERAL", "PROPERTY", "PLOT", "HOUSE", "CONSTRUCTION", "PROJECT"] as const;

export const enquirySchema = z.object({
  type: z.enum(ENQUIRY_TYPES),
  name: nameField,
  phone: phoneField,
  email: optionalEmail,
  message: optionalText(2000),
  propertyId: z.preprocess(blank, z.string().max(40).optional()),
  projectId: z.preprocess(blank, z.string().max(40).optional()),
  siteLocation: optionalText(160),
  plotAreaSqft: optionalArea,
  houseSizeSqft: optionalArea,
  budgetRange: optionalText(60),
  startTimeframe: optionalText(60),
  hasLand: z.preprocess((v) => (v === "yes" ? true : v === "no" ? false : undefined), z.boolean().optional()),
  sourcePath: optionalText(200),
  consent,
  ...antiSpam,
});
export type EnquiryInput = z.infer<typeof enquirySchema>;

export const TIME_SLOTS = ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"] as const;

export const siteVisitSchema = z
  .object({
    propertyId: z.preprocess(blank, z.string().max(40).optional()),
    projectId: z.preprocess(blank, z.string().max(40).optional()),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a preferred date"),
    timeSlot: z.enum(TIME_SLOTS, { error: "Choose a preferred time" }),
    name: nameField,
    phone: phoneField,
    email: optionalEmail,
    message: optionalText(1000),
    consent,
    ...antiSpam,
  })
  .refine((v) => v.propertyId || v.projectId, { path: ["propertyId"], message: "Choose the property or project you would like to visit" });
export type SiteVisitInput = z.infer<typeof siteVisitSchema>;

export const VISIT_WINDOW_DAYS = 90;

export type VisitRules = { closedWeekdays: number[]; blackoutDates: string[] };

/** Returns an error message if the date can't be requested, otherwise null. `today` is YYYY-MM-DD in IST. */
export function checkVisitDate(date: string, today: string, rules: VisitRules): string | null {
  const d = new Date(`${date}T00:00:00Z`);
  const t = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "Choose a valid date";
  const diffDays = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (diffDays < 1) return "Please choose a date from tomorrow onwards";
  if (diffDays > VISIT_WINDOW_DAYS) return `Please choose a date within the next ${VISIT_WINDOW_DAYS} days`;
  if (rules.closedWeekdays.includes(d.getUTCDay())) return "Site visits aren't available on this day of the week";
  if (rules.blackoutDates.includes(date)) return "Site visits aren't available on this date";
  return null;
}

export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

export const loginSchema = z.object({
  email: z.email().max(120).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(200),
});

export const passwordPolicy = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "Include upper-case, lower-case letters and a number");

/** Flattens zod issues into { field: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
