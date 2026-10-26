"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDates, parseFaqs, parseSocialLinks, parseTitledBlocks } from "@/lib/settings-format";
import { optEmail } from "@/lib/admin-schemas";
import { formObject, optHttpsUrl, optLongText, optStr, runAction, type ActionResult } from "@/lib/admin";

const phone = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().regex(/^\+?[\d\s()-]{8,20}$/, "Enter a valid phone number").optional(),
);

const schema = z.object({
  businessName: z.string().trim().min(2).max(100),
  tagline: z.string().trim().min(2).max(80),
  phone,
  whatsapp: phone,
  email: optEmail,
  addressLine: optStr(200),
  city: optStr(80),
  state: optStr(80),
  postalCode: optStr(12),
  officeMapUrl: optHttpsUrl,
  businessHours: optStr(300),
  aboutIntro: optLongText(6000),
  aboutApproach: optLongText(6000),
  aboutValues: optLongText(6000),
  aboutServiceArea: optLongText(2000),
  aboutCustomers: optLongText(6000),
  registrationInfo: optLongText(3000),
  constructionNotes: optLongText(1500),
  privacyPolicy: optLongText(30000),
  termsConditions: optLongText(30000),
  socialLinks: z.string().max(5000).default(""),
  constructionServices: z.string().max(20000).default(""),
  constructionStages: z.string().max(20000).default(""),
  strengths: z.string().max(20000).default(""),
  faqs: z.string().max(40000).default(""),
  visitClosedWeekdays: z.array(z.coerce.number().int().min(0).max(6)).max(7),
  visitBlackoutDates: z.string().max(5000).default(""),
});

export async function saveSettings(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("settings:manage");
    const input = schema.parse(formObject(fd, ["visitClosedWeekdays"]));
    if (input.visitClosedWeekdays.length === 7) return { ok: false, message: "At least one weekday must stay open for site visits.", errors: { visitClosedWeekdays: "Leave at least one day open" } };
    const n = <T,>(v: T | undefined) => (v === undefined ? null : v);
    await db.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {
        businessName: input.businessName,
        tagline: input.tagline.toUpperCase(),
        phone: n(input.phone),
        whatsapp: n(input.whatsapp),
        email: n(input.email),
        addressLine: n(input.addressLine),
        city: n(input.city),
        state: n(input.state),
        postalCode: n(input.postalCode),
        officeMapUrl: n(input.officeMapUrl),
        businessHours: n(input.businessHours),
        aboutIntro: n(input.aboutIntro),
        aboutApproach: n(input.aboutApproach),
        aboutValues: n(input.aboutValues),
        aboutServiceArea: n(input.aboutServiceArea),
        aboutCustomers: n(input.aboutCustomers),
        registrationInfo: n(input.registrationInfo),
        constructionNotes: n(input.constructionNotes),
        privacyPolicy: n(input.privacyPolicy),
        termsConditions: n(input.termsConditions),
        socialLinks: parseSocialLinks(input.socialLinks),
        constructionServices: parseTitledBlocks(input.constructionServices),
        constructionStages: parseTitledBlocks(input.constructionStages),
        strengths: parseTitledBlocks(input.strengths),
        faqs: parseFaqs(input.faqs),
        visitClosedWeekdays: input.visitClosedWeekdays,
        visitBlackoutDates: parseDates(input.visitBlackoutDates),
      },
    });
    await audit({ actorId: user.id, action: "settings.updated", entityType: "SiteSettings", entityId: "1", summary: "Company settings updated" });
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved. The website now shows the updated details." };
  });
}

const IMAGE_FIELDS = ["heroImage", "homesImage", "enquiryImage", "aboutImage"] as const;

export async function clearSiteImage(field: (typeof IMAGE_FIELDS)[number]) {
  const user = await requirePermission("settings:manage");
  if (!IMAGE_FIELDS.includes(field)) return;
  await db.siteSettings.update({ where: { id: 1 }, data: { [`${field}Url`]: null, [`${field}Alt`]: null } });
  await audit({ actorId: user.id, action: "settings.image_cleared", entityType: "SiteSettings", entityId: "1", summary: `${field} removed` });
  revalidatePath("/", "layout");
}
