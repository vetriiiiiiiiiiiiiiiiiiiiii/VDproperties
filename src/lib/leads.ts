import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { db } from "./db";
import { ENQUIRY_TYPE_LABEL } from "./labels";
import { notifyNewLead } from "./mail";
import { rateLimit } from "./rate-limit";
import { getSettings } from "./settings";
import { DUPLICATE_WINDOW_MS, hashIp, looksLikeLinkSpam, spamReason, submissionFingerprint } from "./spam";
import { checkVisitDate, enquirySchema, fieldErrors, siteVisitSchema, todayInIndia } from "./validation";

const MAX_BODY_BYTES = 20_000;

type Fail = { ok?: false; status: number; message: string; errors?: Record<string, string> };

/** JSON for the enhanced form; a 303 redirect to a confirmation page for a plain HTML form post. */
function respond(req: Request, kind: "enquiry" | "visit", result: { ok: true; message: string; reference: string } | Fail) {
  if (isNativeForm(req)) {
    const url = new URL("/thank-you", req.url);
    url.searchParams.set("kind", kind);
    if (result.ok) url.searchParams.set("ref", result.reference);
    else url.searchParams.set("error", String(result.status));
    return NextResponse.redirect(url, 303);
  }
  if (result.ok) return NextResponse.json({ ok: true, message: result.message, reference: result.reference }, { status: 201 });
  return NextResponse.json({ ok: false, message: result.message, errors: result.errors }, { status: result.status });
}

function isNativeForm(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  return type.startsWith("application/x-www-form-urlencoded") || type.startsWith("multipart/form-data");
}

function ipOf(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Common checks for every public form: same-origin, size, rate limit, JSON parsing. */
async function readSubmission(req: Request, bucket: string): Promise<{ body: unknown; ip: string } | Fail> {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return { status: 403, message: "This form can only be sent from our website." };

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return { status: 413, message: "Your message is too long. Please shorten it and try again." };

  const ip = ipOf(req);
  const limit = rateLimit(`${bucket}:${ip}`, Number(process.env.FORM_RATE_LIMIT ?? 6), 10 * 60 * 1000);
  if (!limit.ok) return { status: 429, message: `Too many requests from this connection. Please try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` };

  try {
    if (isNativeForm(req)) {
      const fd = await req.formData();
      const body: Record<string, unknown> = {};
      for (const [k, v] of fd.entries()) if (typeof v === "string") body[k] = v;
      body.consent = body.consent === "on" || body.consent === "true";
      // The site-visit picker posts "p:<id>" or "j:<id>".
      if (typeof body.subject === "string" && !body.propertyId && !body.projectId) {
        const [kind, id] = body.subject.split(":");
        if (kind === "p") body.propertyId = id;
        if (kind === "j") body.projectId = id;
      }
      return { body, ip };
    }
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return { status: 413, message: "Your message is too long. Please shorten it and try again." };
    return { body: JSON.parse(text), ip };
  } catch {
    return { status: 400, message: "We couldn't read your submission. Please try again." };
  }
}

const SPAM_MESSAGE = "We couldn't verify this submission. Please wait a few seconds and send it again, or call us directly.";
const DUPLICATE_MESSAGE = "We've already received this request in the last few minutes, so there's no need to send it again. Our team will be in touch.";

async function isDuplicate(model: "enquiry" | "siteVisit", fingerprint: string) {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const where = { fingerprint, createdAt: { gte: since } };
  const n = model === "enquiry" ? await db.enquiry.count({ where }) : await db.siteVisit.count({ where });
  return n > 0;
}

export async function handleEnquiry(req: Request) {
  const read = await readSubmission(req, "enquiry");
  if ("status" in read) return respond(req, "enquiry", read);

  const parsed = enquirySchema.safeParse(read.body);
  if (!parsed.success) return respond(req, "enquiry", { status: 422, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) });
  const input = parsed.data;
  if (spamReason(input) || looksLikeLinkSpam(input.message)) return respond(req, "enquiry", { status: 400, message: SPAM_MESSAGE });

  // Attach the listing only if it is actually public; never trust a client-supplied label.
  let propertyLabel: string | null = null;
  let propertyId: string | null = null;
  let projectId: string | null = null;
  if (input.propertyId) {
    const p = await db.property.findFirst({ where: { id: input.propertyId, publication: "PUBLISHED" }, select: { id: true, title: true, referenceCode: true } });
    if (!p) return respond(req, "enquiry", { status: 422, message: "This property is no longer listed. Please send a general enquiry instead." });
    propertyId = p.id;
    propertyLabel = `${p.referenceCode} · ${p.title}`;
  }
  if (input.projectId) {
    const j = await db.project.findFirst({ where: { id: input.projectId, publication: "PUBLISHED" }, select: { id: true, name: true } });
    if (!j) return respond(req, "enquiry", { status: 422, message: "This project is no longer listed. Please send a general enquiry instead." });
    projectId = j.id;
    propertyLabel ??= j.name;
  }

  const fingerprint = submissionFingerprint(["enquiry", input.type, input.phone.replace(/\D/g, ""), propertyId, projectId, input.message?.slice(0, 200)]);
  if (await isDuplicate("enquiry", fingerprint)) return respond(req, "enquiry", { status: 409, message: DUPLICATE_MESSAGE });

  const viewer = await getCurrentUser();
  const enquiry = await db.enquiry.create({
    data: {
      customerId: viewer?.role === "CUSTOMER" ? viewer.id : null,
      type: input.type === "PROPERTY" && !propertyId ? "GENERAL" : input.type,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      message: input.message ?? null,
      propertyId,
      projectId,
      propertyLabel,
      siteLocation: input.siteLocation ?? null,
      plotAreaSqft: input.plotAreaSqft ?? null,
      houseSizeSqft: input.houseSizeSqft ?? null,
      budgetRange: input.budgetRange ?? null,
      startTimeframe: input.startTimeframe ?? null,
      hasLand: input.hasLand ?? null,
      consent: true,
      sourcePath: input.sourcePath ?? null,
      ipHash: hashIp(read.ip),
      fingerprint,
    },
  });

  await notifyNewLead(ENQUIRY_TYPE_LABEL[enquiry.type].toLowerCase(), propertyLabel ?? "the website", `/admin/enquiries/${enquiry.id}`);
  return respond(req, "enquiry", { ok: true, message: "Thank you — your enquiry has been received.", reference: enquiry.id.slice(-8).toUpperCase() });
}

export async function handleSiteVisit(req: Request) {
  const read = await readSubmission(req, "visit");
  if ("status" in read) return respond(req, "visit", read);

  const parsed = siteVisitSchema.safeParse(read.body);
  if (!parsed.success) return respond(req, "visit", { status: 422, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) });
  const input = parsed.data;
  if (spamReason(input) || looksLikeLinkSpam(input.message)) return respond(req, "visit", { status: 400, message: SPAM_MESSAGE });

  const s = await getSettings();
  const dateError = checkVisitDate(input.preferredDate, todayInIndia(), { closedWeekdays: s.visitClosedWeekdays, blackoutDates: s.visitBlackoutDates });
  if (dateError) return respond(req, "visit", { status: 422, message: dateError, errors: { preferredDate: dateError } });

  let subjectLabel: string;
  let propertyId: string | null = null;
  let projectId: string | null = null;
  if (input.propertyId) {
    const p = await db.property.findFirst({
      where: { id: input.propertyId, publication: "PUBLISHED" },
      select: { id: true, title: true, referenceCode: true, availability: true },
    });
    if (!p) return respond(req, "visit", { status: 422, message: "This property is no longer listed.", errors: { propertyId: "Choose another property" } });
    if (p.availability === "SOLD" || p.availability === "UNAVAILABLE")
      return respond(req, "visit", { status: 422, message: "This property is no longer open for site visits.", errors: { propertyId: "Choose another property" } });
    propertyId = p.id;
    subjectLabel = `${p.referenceCode} · ${p.title}`;
  } else {
    const j = await db.project.findFirst({ where: { id: input.projectId!, publication: "PUBLISHED" }, select: { id: true, name: true } });
    if (!j) return respond(req, "visit", { status: 422, message: "This project is no longer listed.", errors: { propertyId: "Choose another project" } });
    projectId = j.id;
    subjectLabel = j.name;
  }

  const fingerprint = submissionFingerprint(["visit", input.phone.replace(/\D/g, ""), propertyId, projectId, input.preferredDate]);
  if (await isDuplicate("siteVisit", fingerprint)) return respond(req, "visit", { status: 409, message: DUPLICATE_MESSAGE });

  const viewer = await getCurrentUser();
  const visit = await db.siteVisit.create({
    data: {
      customerId: viewer?.role === "CUSTOMER" ? viewer.id : null,
      propertyId,
      projectId,
      subjectLabel,
      preferredDate: new Date(`${input.preferredDate}T00:00:00Z`),
      timeSlot: input.timeSlot,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      message: input.message ?? null,
      consent: true,
      ipHash: hashIp(read.ip),
      fingerprint,
    },
  });

  await notifyNewLead("site visit request", subjectLabel, `/admin/site-visits/${visit.id}`);
  return respond(req, "visit", { ok: true, message: "Thank you — your site visit request has been received.", reference: visit.id.slice(-8).toUpperCase() });
}

