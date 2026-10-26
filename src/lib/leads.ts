import "server-only";
import { NextResponse } from "next/server";
import { localePath, type Locale } from "@/i18n/config";
import { DICTS } from "@/i18n/dict";
import { requestLocale, translateErrors, translateMessage } from "@/i18n/messages";
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
function respond(req: Request, kind: "enquiry" | "visit", result: { ok: true; message: string; reference: string } | Fail, locale: Locale = "en") {
  if (isNativeForm(req)) {
    const url = new URL(localePath(locale, "/thank-you"), req.url);
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
async function readSubmission(req: Request, bucket: string, locale: Locale): Promise<{ body: unknown; ip: string } | Fail> {
  const m = DICTS[locale].server;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return { status: 403, message: m.otherSite };

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return { status: 413, message: m.tooLong };

  const ip = ipOf(req);
  const limit = rateLimit(`${bucket}:${ip}`, Number(process.env.FORM_RATE_LIMIT ?? 6), 10 * 60 * 1000);
  if (!limit.ok) return { status: 429, message: m.tooMany(Math.ceil(limit.retryAfter / 60)) };

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
    if (text.length > MAX_BODY_BYTES) return { status: 413, message: m.tooLong };
    return { body: JSON.parse(text), ip };
  } catch {
    return { status: 400, message: m.unreadable };
  }
}


async function isDuplicate(model: "enquiry" | "siteVisit", fingerprint: string) {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const where = { fingerprint, createdAt: { gte: since } };
  const n = model === "enquiry" ? await db.enquiry.count({ where }) : await db.siteVisit.count({ where });
  return n > 0;
}

export async function handleEnquiry(req: Request) {
  const read = await readSubmission(req, "enquiry", requestLocale(req));
  if ("status" in read) return respond(req, "enquiry", read, requestLocale(req));
  const L = requestLocale(req, read.body);
  const m = DICTS[L].server;
  const reply = (r: Parameters<typeof respond>[2]) => respond(req, "enquiry", r, L);

  const parsed = enquirySchema.safeParse(read.body);
  if (!parsed.success) return reply({ status: 422, message: m.checkFields, errors: translateErrors(fieldErrors(parsed.error), L) });
  const input = parsed.data;
  if (spamReason(input) || looksLikeLinkSpam(input.message)) return reply({ status: 400, message: m.spam });

  // Attach the listing only if it is actually public; never trust a client-supplied label.
  let propertyLabel: string | null = null;
  let propertyId: string | null = null;
  let projectId: string | null = null;
  if (input.propertyId) {
    const p = await db.property.findFirst({ where: { id: input.propertyId, publication: "PUBLISHED" }, select: { id: true, title: true, referenceCode: true } });
    if (!p) return reply({ status: 422, message: m.propertyGone });
    propertyId = p.id;
    propertyLabel = `${p.referenceCode} · ${p.title}`;
  }
  if (input.projectId) {
    const j = await db.project.findFirst({ where: { id: input.projectId, publication: "PUBLISHED" }, select: { id: true, name: true } });
    if (!j) return reply({ status: 422, message: m.projectGone });
    projectId = j.id;
    propertyLabel ??= j.name;
  }

  const fingerprint = submissionFingerprint(["enquiry", input.type, input.phone.replace(/\D/g, ""), propertyId, projectId, input.message?.slice(0, 200)]);
  if (await isDuplicate("enquiry", fingerprint)) return reply({ status: 409, message: m.duplicate });

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
  return reply({ ok: true, message: m.enquiryOk, reference: enquiry.id.slice(-8).toUpperCase() });
}

export async function handleSiteVisit(req: Request) {
  const read = await readSubmission(req, "visit", requestLocale(req));
  if ("status" in read) return respond(req, "visit", read, requestLocale(req));
  const L = requestLocale(req, read.body);
  const m = DICTS[L].server;
  const reply = (r: Parameters<typeof respond>[2]) => respond(req, "visit", r, L);

  const parsed = siteVisitSchema.safeParse(read.body);
  if (!parsed.success) return reply({ status: 422, message: m.checkFields, errors: translateErrors(fieldErrors(parsed.error), L) });
  const input = parsed.data;
  if (spamReason(input) || looksLikeLinkSpam(input.message)) return reply({ status: 400, message: m.spam });

  const s = await getSettings();
  const dateError = checkVisitDate(input.preferredDate, todayInIndia(), { closedWeekdays: s.visitClosedWeekdays, blackoutDates: s.visitBlackoutDates });
  if (dateError) {
    const msg = translateMessage(dateError, L);
    return reply({ status: 422, message: msg, errors: { preferredDate: msg } });
  }

  let subjectLabel: string;
  let propertyId: string | null = null;
  let projectId: string | null = null;
  if (input.propertyId) {
    const p = await db.property.findFirst({
      where: { id: input.propertyId, publication: "PUBLISHED" },
      select: { id: true, title: true, referenceCode: true, availability: true },
    });
    if (!p) return reply({ status: 422, message: m.propertyGone, errors: { propertyId: m.chooseAnother } });
    if (p.availability === "SOLD" || p.availability === "UNAVAILABLE")
      return reply({ status: 422, message: m.visitClosed, errors: { propertyId: m.chooseAnother } });
    propertyId = p.id;
    subjectLabel = `${p.referenceCode} · ${p.title}`;
  } else {
    const j = await db.project.findFirst({ where: { id: input.projectId!, publication: "PUBLISHED" }, select: { id: true, name: true } });
    if (!j) return reply({ status: 422, message: m.projectGone, errors: { propertyId: m.chooseAnotherProject } });
    projectId = j.id;
    subjectLabel = j.name;
  }

  const fingerprint = submissionFingerprint(["visit", input.phone.replace(/\D/g, ""), propertyId, projectId, input.preferredDate]);
  if (await isDuplicate("siteVisit", fingerprint)) return reply({ status: 409, message: m.duplicate });

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
  return reply({ ok: true, message: m.visitOk, reference: visit.id.slice(-8).toUpperCase() });
}

