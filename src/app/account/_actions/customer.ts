"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { plotFromProperty } from "@/lib/platform";
import { criteriaSchema } from "@/lib/plotfit";
import { estimateBudget, LINE_KEYS } from "@/lib/studio/estimate";
import { clampInputs, generateLayout, HOUSE_STYLES, type PlotGeometry } from "@/lib/studio/layout";
import { findCostCard } from "@/lib/platform";
import { type ActionResult } from "@/lib/admin";
import { actionMessages, runLocalised } from "@/i18n/server";

export async function toggleSavedProperty(propertyId: string): Promise<ActionResult> {
  const m = await actionMessages();
  return runLocalised(async () => {
    const me = await requireCustomer();
    const property = await db.property.findFirst({ where: { id: propertyId, publication: "PUBLISHED" }, select: { id: true } });
    if (!property) return { ok: false, message: m.propertyGone };
    const existing = await db.savedProperty.findUnique({ where: { userId_propertyId: { userId: me.id, propertyId } } });
    if (existing) await db.savedProperty.delete({ where: { id: existing.id } });
    else await db.savedProperty.create({ data: { userId: me.id, propertyId } });
    revalidatePath("/", "layout");
    return { ok: true, message: existing ? m.removed : m.saved };
  });
}

const scenarioSchema = z.object({
  name: z.string().trim().min(2, "Give the scenario a name").max(80),
  propertyId: z.string().max(40).nullable(),
  inputs: z.object({
    bedrooms: z.number(),
    floors: z.number(),
    builtUpSqft: z.number(),
    style: z.enum(Object.keys(HOUSE_STYLES) as [keyof typeof HOUSE_STYLES, ...(keyof typeof HOUSE_STYLES)[]]),
    parkingSlots: z.number(),
    garden: z.boolean(),
    study: z.boolean(),
    finish: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
    targetBudget: z.number().min(0).max(1e11).nullable().optional(),
  }),
  /** Only used for illustrative plots; listing plots always come from the database. */
  illustrativePlot: z
    .object({ widthFt: z.number().min(10).max(1000), depthFt: z.number().min(10).max(1000), price: z.number().min(0).max(1e11).nullable() })
    .nullable(),
  setbacks: z.object({ front: z.number().min(0).max(100), rear: z.number().min(0).max(100), side: z.number().min(0).max(50) }).nullable(),
  maxCoveragePct: z.number().min(10).max(100).nullable(),
  overrides: z.partialRecord(z.enum(LINE_KEYS), z.number().min(0).max(1e11)),
});
export type ScenarioPayload = z.infer<typeof scenarioSchema>;

/**
 * Saves a planning scenario. The layout and estimate are recomputed on the server from stored
 * property data, so saved results never depend on what the browser sent.
 */
export async function saveScenario(payload: ScenarioPayload, scenarioId?: string): Promise<ActionResult> {
  const m = await actionMessages();
  return runLocalised(async () => {
    const me = await requireCustomer();
    const input = scenarioSchema.parse(payload);
    const inputs = clampInputs(input.inputs);

    let plot: PlotGeometry;
    let snapshot: Prisma.InputJsonValue;
    let quotedPrice: number | null = null;
    let locationId: string | null = null;
    let propertyUpdatedAt: Date | null = null;
    if (input.propertyId) {
      const p = await db.property.findFirst({ where: { id: input.propertyId, publication: "PUBLISHED" } });
      if (!p) return { ok: false, message: m.propertyGone };
      const fromRecord = plotFromProperty(p);
      if (!fromRecord) return { ok: false, message: m.noDims };
      plot = { ...fromRecord, ...(input.setbacks && fromRecord.setbackSource !== "RECORD" ? { setbacks: input.setbacks, setbackSource: "USER" as const } : {}) };
      if (!fromRecord.maxCoveragePct && input.maxCoveragePct) plot = { ...plot, maxCoveragePct: input.maxCoveragePct, coverageSource: "USER" };
      quotedPrice = p.publicPrice === null ? null : Number(p.publicPrice);
      locationId = p.locationId;
      propertyUpdatedAt = p.updatedAt;
      snapshot = { referenceCode: p.referenceCode, title: p.title, widthFt: p.plotWidthFt, depthFt: p.plotDepthFt, price: quotedPrice, availability: p.availability, landAreaSqft: p.landAreaSqft };
    } else {
      if (!input.illustrativePlot) return { ok: false, message: m.describe };
      const { widthFt, depthFt, price } = input.illustrativePlot;
      plot = {
        widthFt,
        depthFt,
        setbacks: input.setbacks ?? { front: 5, rear: 3, side: 2 },
        setbackSource: "USER",
        maxCoveragePct: input.maxCoveragePct,
        coverageSource: input.maxCoveragePct ? "USER" : null,
        frontBearing: null,
        illustrative: true,
      };
      if (price !== null) input.overrides.land = price;
      snapshot = { illustrative: true, widthFt, depthFt, price };
    }

    const layout = generateLayout(plot, inputs);
    const card = await findCostCard(inputs.finish, locationId);
    const estimate = estimateBudget({
      quotedLandPrice: quotedPrice,
      builtUpSqft: layout.achievedBuiltUpSqft,
      footprintSqft: layout.footprintSqft,
      gardenSqft: layout.gardenSqft,
      parkingSlots: layout.parking.length,
      card,
      overrides: input.overrides,
    });
    const result = {
      feasible: layout.feasible,
      achievedBuiltUpSqft: layout.achievedBuiltUpSqft,
      footprintSqft: layout.footprintSqft,
      coveragePct: layout.coveragePct,
      plotAreaSqft: layout.plotAreaSqft,
      warnings: layout.warnings,
      estimate: { total: estimate.total, complete: estimate.complete, missing: estimate.missing, lines: estimate.lines },
      card: card ? { name: card.name, source: card.source, effectiveDate: card.effectiveDate, isDemo: card.isDemo } : null,
      setbacks: plot.setbacks,
      setbackSource: plot.setbackSource,
    };
    const data = {
      name: input.name,
      propertyId: input.propertyId,
      inputs: { ...inputs, overrides: input.overrides, setbacks: input.setbacks, maxCoveragePct: input.maxCoveragePct, illustrativePlot: input.illustrativePlot } as Prisma.InputJsonValue,
      plotSnapshot: snapshot,
      result: result as unknown as Prisma.InputJsonValue,
      costAssumptionId: card?.id ?? null,
      propertyUpdatedAt,
    };
    let saved;
    if (scenarioId) {
      const owned = await db.planningScenario.findFirst({ where: { id: scenarioId, userId: me.id } });
      if (!owned) return { ok: false, message: m.notFound };
      saved = await db.planningScenario.update({ where: { id: scenarioId }, data });
    } else {
      if ((await db.planningScenario.count({ where: { userId: me.id } })) >= 50) return { ok: false, message: m.limit };
      saved = await db.planningScenario.create({ data: { ...data, userId: me.id } });
    }
    revalidatePath("/account", "layout");
    return { ok: true, message: m.scenarioSaved, redirectTo: saved.id };
  });
}

export async function deleteScenario(id: string) {
  const m = await actionMessages();
  const me = await requireCustomer();
  await db.planningScenario.deleteMany({ where: { id, userId: me.id } });
  revalidatePath("/account", "layout");
}

export async function saveSearch(name: string, criteria: unknown, alerts: boolean): Promise<ActionResult> {
  const m = await actionMessages();
  return runLocalised(async () => {
    const me = await requireCustomer();
    const parsed = criteriaSchema.parse(criteria);
    const cleanName = z.string().trim().min(2, "Name your search").max(60).parse(name);
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { marketingConsent: true } });
    if (alerts && !user.marketingConsent) return { ok: false, message: m.alertsConsent };
    if ((await db.savedSearch.count({ where: { userId: me.id } })) >= 20) return { ok: false, message: m.searchLimit };
    await db.savedSearch.create({ data: { userId: me.id, name: cleanName, criteria: parsed as Prisma.InputJsonValue, alertsEnabled: alerts } });
    revalidatePath("/account", "layout");
    return { ok: true, message: alerts ? m.searchSavedAlerts : m.searchSaved };
  });
}

export async function toggleSearchAlerts(id: string) {
  const m = await actionMessages();
  const me = await requireCustomer();
  const s = await db.savedSearch.findFirst({ where: { id, userId: me.id }, include: { user: { select: { marketingConsent: true } } } });
  if (!s) return;
  if (!s.alertsEnabled && !s.user.marketingConsent) return;
  await db.savedSearch.update({ where: { id }, data: { alertsEnabled: !s.alertsEnabled } });
  revalidatePath("/account", "layout");
}

export async function deleteSearch(id: string) {
  const m = await actionMessages();
  const me = await requireCustomer();
  await db.savedSearch.deleteMany({ where: { id, userId: me.id } });
  revalidatePath("/account", "layout");
}

export async function askProjectQuestion(projectId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await actionMessages();
  return runLocalised(async () => {
    const me = await requireCustomer();
    const project = await db.buildProject.findFirst({ where: { id: projectId, customerId: me.id }, select: { id: true, code: true } });
    if (!project) return { ok: false, message: m.projectNotFound };
    const body = z.string().trim().min(3, "Write your question").max(2000).parse(fd.get("body"));
    await db.buildQuestion.create({ data: { projectId, authorId: me.id, body } });
    await audit({ actorId: me.id, action: "build.question_asked", entityType: "BuildProject", entityId: projectId, summary: `Customer question on ${project.code}` });
    revalidatePath("/account", "layout");
    return { ok: true, message: m.questionSent };
  });
}
