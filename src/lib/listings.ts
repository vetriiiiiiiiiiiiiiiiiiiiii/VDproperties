import "server-only";
import type { SubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { nameField, phoneField } from "./validation";

/** Next human-readable property ID, e.g. VDP-0013. Owner submissions share the sequence. */
export async function nextReferenceCode() {
  const last = await db.property.findFirst({ where: { referenceCode: { startsWith: "VDP-0" } }, orderBy: { referenceCode: "desc" }, select: { referenceCode: true } });
  const n = last ? Number(last.referenceCode.slice(4)) + 1 : 1;
  return `VDP-${String(n).padStart(4, "0")}`;
}

export async function uniquePropertySlug(base: string, exceptId?: string) {
  let slug = base || "property";
  for (let i = 2; await db.property.findFirst({ where: { slug, ...(exceptId && { id: { not: exceptId } }) }, select: { id: true } }); i++) slug = `${base}-${i}`;
  return slug;
}

/** Statuses in which the seller may still edit, add photos or withdraw. */
export const SELLER_EDITABLE: SubmissionStatus[] = ["SUBMITTED", "CHANGES_REQUESTED"];
export const SELLER_OPEN: SubmissionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "INSPECTED"];
export const MAX_OPEN_SUBMISSIONS = 10;
export const MAX_SELLER_PHOTOS = 12;
export const MAX_SELLER_DOCUMENTS = 5;

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optText = (max: number) => z.preprocess(blank, z.string().trim().max(max, `Keep this under ${max} characters`).optional());
const optNumber = (max: number) => z.preprocess(blank, z.coerce.number({ error: "Enter a number" }).positive("Enter a positive number").max(max).optional());
const optInt = (max: number) => z.preprocess(blank, z.coerce.number({ error: "Enter a number" }).int().min(0).max(max).optional());

export const SELLER_RELATIONS = ["OWNER", "JOINT_OWNER", "POWER_OF_ATTORNEY", "FAMILY_MEMBER"] as const;

/** What a seller can tell us about their property. Validation messages are translated at the boundary. */
export const sellerListingSchema = z
  .object({
    type: z.enum(["RESIDENTIAL_PLOT", "LAND", "HOUSE", "VILLA"]),
    title: z.string().trim().min(8, "Give the listing a short title").max(120, "Keep this under 120 characters"),
    description: optText(4000),
    locationId: z.preprocess(blank, z.string().max(40).optional()),
    sellerLocationText: optText(120),
    localityLabel: optText(120),
    sellerAddress: z.string().trim().min(5, "Enter the property address").max(300),
    landAreaSqft: optNumber(10_000_000),
    plotDimensions: optText(60),
    facing: optText(40),
    builtUpAreaSqft: optNumber(1_000_000),
    bedrooms: optInt(30),
    bathrooms: optInt(30),
    floors: optInt(20),
    accessRoad: optText(120),
    approvalInfo: optText(1000),
    expectedPrice: optNumber(1e11),
    sellerRelation: z.enum(SELLER_RELATIONS),
    phone: phoneField,
    name: nameField,
    declaration: z.literal(true, { error: "Please confirm you own this property or are authorised to sell it" }),
  })
  .refine((v) => v.locationId || v.sellerLocationText, { path: ["sellerLocationText"], message: "Choose a location or type the town or area" });

export type SellerListingInput = z.infer<typeof sellerListingSchema>;

/** Adds an entry to a submission's review trail. */
export function logSubmission(propertyId: string, data: { actorId?: string | null; status?: SubmissionStatus | null; message?: string | null; visibleToSeller?: boolean }) {
  return db.submissionEvent.create({
    data: { propertyId, actorId: data.actorId ?? null, status: data.status ?? null, message: data.message ?? null, visibleToSeller: data.visibleToSeller ?? true },
  });
}
