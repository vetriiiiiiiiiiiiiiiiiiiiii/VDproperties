import { cache } from "react";
import type { SiteSettings } from "@prisma/client";
import { db } from "./db";

export type TitledItem = { title: string; body: string };
export type FaqItem = { question: string; answer: string };
export type SocialLink = { label: string; url: string };

export type Settings = Omit<SiteSettings, "socialLinks" | "constructionServices" | "constructionStages" | "strengths" | "faqs"> & {
  socialLinks: SocialLink[];
  constructionServices: TitledItem[];
  constructionStages: TitledItem[];
  strengths: TitledItem[];
  faqs: FaqItem[];
};

function list<T>(value: unknown, keys: (keyof T)[]): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is T => typeof v === "object" && v !== null && keys.every((k) => typeof (v as Record<string, unknown>)[k as string] === "string"),
  );
}

export const getSettings = cache(async (): Promise<Settings> => {
  const row = (await db.siteSettings.findUnique({ where: { id: 1 } })) ?? (await db.siteSettings.create({ data: { id: 1 } }));
  return {
    ...row,
    socialLinks: list<SocialLink>(row.socialLinks, ["label", "url"]).filter((s) => /^https:\/\//.test(s.url)),
    constructionServices: list<TitledItem>(row.constructionServices, ["title", "body"]),
    constructionStages: list<TitledItem>(row.constructionStages, ["title", "body"]),
    strengths: list<TitledItem>(row.strengths, ["title", "body"]),
    faqs: list<FaqItem>(row.faqs, ["question", "answer"]),
  };
});

export function officeAddress(s: Settings) {
  return [s.addressLine, s.city, s.state, s.postalCode].filter(Boolean).join(", ");
}

/** Items the company still needs to supply before launch. Shown on the admin dashboard. */
export function launchChecklist(s: Settings) {
  return [
    { label: "Official phone number", done: !!s.phone },
    { label: "Official email address", done: !!s.email },
    { label: "Office address", done: !!s.addressLine },
    { label: "WhatsApp number", done: !!s.whatsapp },
    { label: "Company introduction (About page)", done: !!s.aboutIntro },
    { label: "Confirmed construction services", done: s.constructionServices.length > 0 },
    { label: "Company strengths for “Why V D Properties”", done: s.strengths.length > 0 },
    { label: "Privacy policy reviewed", done: !!s.privacyPolicy },
    { label: "Terms & conditions reviewed", done: !!s.termsConditions },
    { label: "Hero photograph", done: !!s.heroImageUrl },
  ];
}
