import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/csv";
import { formatPrice, slugify, whatsappHref } from "@/lib/format";
import { can } from "@/lib/rbac";
import { parseFaqs, parseSocialLinks, parseTitledBlocks } from "@/lib/settings-format";
import { looksLikeLinkSpam, spamReason, submissionFingerprint } from "@/lib/spam";
import { checkVisitDate, enquirySchema, passwordPolicy, siteVisitSchema } from "@/lib/validation";

const base = { type: "GENERAL", name: "Asha Kumar", phone: "+91 98765 43210", consent: true, startedAt: Date.now() - 10_000 };

describe("enquiry validation", () => {
  it("accepts a minimal valid enquiry", () => {
    expect(enquirySchema.safeParse(base).success).toBe(true);
  });
  it("rejects missing consent, short names and bad phones", () => {
    const r = enquirySchema.safeParse({ ...base, consent: false, name: "A", phone: "123" });
    expect(r.success).toBe(false);
    const fields = r.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["consent", "name", "phone"]));
  });
  it("treats blank optional fields as absent", () => {
    const r = enquirySchema.parse({ ...base, email: "  ", message: "", plotAreaSqft: "" });
    expect(r.email).toBeUndefined();
    expect(r.plotAreaSqft).toBeUndefined();
  });
  it("rejects a filled honeypot", () => {
    expect(enquirySchema.safeParse({ ...base, company_website: "http://spam" }).success).toBe(false);
  });
});

describe("site visit validation", () => {
  const rules = { closedWeekdays: [0], blackoutDates: ["2026-11-14"] };
  it("requires a property or project", () => {
    expect(siteVisitSchema.safeParse({ ...base, preferredDate: "2026-11-10", timeSlot: "MORNING" }).success).toBe(false);
  });
  it("enforces the booking window, closed days and blackout dates", () => {
    expect(checkVisitDate("2026-10-25", "2026-10-25", rules)).toMatch(/tomorrow/);
    expect(checkVisitDate("2027-06-01", "2026-10-25", rules)).toMatch(/within/);
    expect(checkVisitDate("2026-11-01", "2026-10-25", rules)).toMatch(/day of the week/); // a Sunday
    expect(checkVisitDate("2026-11-14", "2026-10-25", rules)).toMatch(/this date/);
    expect(checkVisitDate("2026-11-10", "2026-10-25", rules)).toBeNull();
  });
});

describe("spam protection", () => {
  it("flags honeypots, instant submissions and stale forms", () => {
    const now = 1_000_000_000;
    expect(spamReason({ company_website: "x", startedAt: now - 10_000 }, now)).toBe("honeypot");
    expect(spamReason({ startedAt: now - 500 }, now)).toBe("too-fast");
    expect(spamReason({ startedAt: now - 2 * 86_400_000 }, now)).toBe("stale-form");
    expect(spamReason({ startedAt: now - 8_000 }, now)).toBeNull();
  });
  it("detects link-stuffed messages", () => {
    expect(looksLikeLinkSpam("see http://a.com http://b.com www.c.com")).toBe(true);
    expect(looksLikeLinkSpam("Is the plot near the main road?")).toBe(false);
  });
  it("fingerprints ignore case and spacing", () => {
    expect(submissionFingerprint(["A B", "9876"])).toBe(submissionFingerprint(["ab", " 98 76 "]));
  });
});

describe("roles", () => {
  it("separates property and enquiry responsibilities", () => {
    expect(can("PROPERTY_MANAGER", "properties:manage")).toBe(true);
    expect(can("PROPERTY_MANAGER", "leads:manage")).toBe(false);
    expect(can("ENQUIRY_MANAGER", "leads:export")).toBe(true);
    expect(can("ENQUIRY_MANAGER", "properties:manage")).toBe(false);
    expect(can("ENQUIRY_MANAGER", "settings:manage")).toBe(false);
    expect(can("SUPER_ADMIN", "users:manage")).toBe(true);
  });
  it("enforces a password policy", () => {
    expect(passwordPolicy.safeParse("short").success).toBe(false);
    expect(passwordPolicy.safeParse("alllowercase123").success).toBe(false);
    expect(passwordPolicy.safeParse("Sufficiently-Long-1").success).toBe(true);
  });
});

describe("formatting & content helpers", () => {
  it("formats rupees in lakh and crore", () => {
    expect(formatPrice(2450000)).toBe("₹24.5 lakh");
    expect(formatPrice(16500000)).toBe("₹1.65 crore");
    expect(formatPrice(85000)).toBe("₹85,000");
  });
  it("makes clean slugs and WhatsApp links", () => {
    expect(slugify("  Corner Plot — Phase II! ")).toBe("corner-plot-phase-ii");
    expect(whatsappHref("+91 98765-43210", "Hi")).toBe("https://wa.me/919876543210?text=Hi");
  });
  it("neutralises spreadsheet formulas in CSV exports", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell('say "hi"')).toBe(`"say ""hi"""`);
  });
  it("parses settings text blocks and keeps only https social links", () => {
    expect(parseTitledBlocks("One\nfirst body\n\nTwo\nsecond")).toEqual([
      { title: "One", body: "first body" },
      { title: "Two", body: "second" },
    ]);
    expect(parseFaqs("Q?\nA.")).toEqual([{ question: "Q?", answer: "A." }]);
    expect(parseSocialLinks("Instagram | https://instagram.com/x\nBad | javascript:alert(1)")).toEqual([{ label: "Instagram", url: "https://instagram.com/x" }]);
  });
});
