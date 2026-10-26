import { describe, expect, it } from "vitest";
import { localePath, splitLocale } from "@/i18n/config";
import { DICTS } from "@/i18n/dict";
import { makeFormat } from "@/i18n/format";
import { requestLocale, translateMessage } from "@/i18n/messages";
import { checkVisitDate } from "@/lib/validation";

/** Every leaf path in a dictionary, with its value. */
function leaves(o: unknown, prefix = ""): [string, unknown][] {
  if (o && typeof o === "object" && !Array.isArray(o)) return Object.entries(o).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  return [[prefix, o]];
}

describe("dictionaries", () => {
  const en = new Map(leaves(DICTS.en));
  const ta = new Map(leaves(DICTS.ta));

  it("Tamil has every English key, and no extras", () => {
    expect([...en.keys()].filter((k) => !ta.has(k))).toEqual([]);
    expect([...ta.keys()].filter((k) => !en.has(k))).toEqual([]);
  });

  it("no Tamil string is empty, and values keep the same shape", () => {
    // Sentence fragments around a link can be empty where Tamil word order moves the text.
    const fragment = /(A|B|Tail|Or)$/;
    for (const [k, v] of ta) {
      const e = en.get(k);
      expect(typeof v, k).toBe(typeof e);
      if (typeof v === "string" && e && !fragment.test(k)) expect(v.trim().length, k).toBeGreaterThan(0);
      if (Array.isArray(v)) expect(v.length, k).toBe((e as unknown[]).length);
    }
  });

  it("most user-facing strings are actually translated", () => {
    const strings = [...ta].filter(([, v]) => typeof v === "string") as [string, string][];
    const tamil = strings.filter(([, v]) => /[஀-௿]/.test(v));
    // Brand names, codes and units (PlotFit, BuildTrace, ₹…) legitimately stay in Latin script.
    expect(tamil.length / strings.length).toBeGreaterThan(0.85);
  });
});

describe("locale routing", () => {
  it("prefixes Tamil paths and leaves English and system paths alone", () => {
    expect(localePath("en", "/plots")).toBe("/plots");
    expect(localePath("ta", "/plots")).toBe("/ta/plots");
    expect(localePath("ta", "/")).toBe("/ta");
    expect(localePath("ta", "/plotfit/results?budget=1")).toBe("/ta/plotfit/results?budget=1");
    expect(localePath("ta", "/admin")).toBe("/admin");
    expect(localePath("ta", "/media/x.jpg")).toBe("/media/x.jpg");
    expect(localePath("ta", "/ta/plots")).toBe("/ta/plots");
    expect(localePath("ta", "/?q=1")).toBe("/ta?q=1");
  });

  it("splits a Tamil path back into locale and route", () => {
    expect(splitLocale("/ta/plots/x")).toEqual({ locale: "ta", path: "/plots/x" });
    expect(splitLocale("/ta")).toEqual({ locale: "ta", path: "/" });
    expect(splitLocale("/tamil-nadu")).toEqual({ locale: "en", path: "/tamil-nadu" });
  });

  it("reads an API request's language from the form, then the referring page", () => {
    const req = (ref?: string) => new Request("http://x/api/enquiries", { headers: ref ? { referer: ref } : {} });
    expect(requestLocale(req(), { locale: "ta" })).toBe("ta");
    expect(requestLocale(req("http://x/ta/contact"))).toBe("ta");
    expect(requestLocale(req("http://x/contact"))).toBe("en");
    expect(requestLocale(req(), { locale: "fr" })).toBe("en");
  });
});

describe("server messages", () => {
  it("translates validation messages, including numbered ones", () => {
    expect(translateMessage("Please enter your name", "ta")).toBe(DICTS.ta.server.v.name);
    expect(translateMessage("Keep this under 2000 characters", "ta")).toBe(DICTS.ta.server.v.tooLong(2000));
    expect(translateMessage(checkVisitDate("2020-01-01", "2026-01-01", { closedWeekdays: [], blackoutDates: [] })!, "ta")).toBe(DICTS.ta.server.v.fromTomorrow);
    expect(translateMessage("Something new", "ta")).toBe("Something new");
    expect(translateMessage("Please enter your name", "en")).toBe("Please enter your name");
  });
});

describe("formatting", () => {
  it("formats prices and areas with Indian grouping and translated units", () => {
    expect(makeFormat("en").price(2_500_000)).toBe("₹25 lakh");
    expect(makeFormat("ta").price(2_500_000)).toBe("₹25 லட்சம்");
    expect(makeFormat("en").price(12_000_000)).toBe("₹1.2 crore");
    expect(makeFormat("ta").area(1200)).toBe("1,200 ச.அடி");
  });
});
