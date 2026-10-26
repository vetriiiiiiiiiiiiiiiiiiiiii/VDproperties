import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AuthError } from "./auth";
import { fieldErrors } from "./validation";

export type ActionResult = { ok: boolean; message: string; errors?: Partial<Record<string, string>>; redirectTo?: string };

/** Wraps a server action body so auth, validation and unique-constraint failures become form messages. */
export async function runAction(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, message: err.message };
    if (err instanceof z.ZodError) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(err) };
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const field = String((err.meta?.target as string[] | undefined)?.[0] ?? "form");
      return { ok: false, message: "That value is already in use.", errors: { [field]: "Already in use — choose another" } };
    }
    // Next's redirect() throws a special error that must propagate.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
    console.error("Admin action failed", err);
    return { ok: false, message: "Something went wrong and the change was not saved." };
  }
}

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
export const optStr = (max = 500) => z.preprocess(blank, z.string().trim().max(max).optional());
export const optLongText = (max = 20000) => z.preprocess(blank, z.string().trim().max(max).optional());
export const optNum = (max = 1e12) => z.preprocess(blank, z.coerce.number({ error: "Enter a number" }).min(0, "Must be zero or more").max(max).optional());
export const optInt = (max = 100) => z.preprocess(blank, z.coerce.number({ error: "Enter a whole number" }).int("Enter a whole number").min(0).max(max).optional());
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
export const optHttpsUrl = z.preprocess(blank, z.url({ protocol: /^https$/, error: "Enter a full https:// link" }).max(500).optional());
export const optId = z.preprocess(blank, z.string().max(40).optional());

/** FormData → plain object, keeping repeated keys (e.g. multi-select checkboxes) as arrays. */
export function formObject(fd: FormData, arrays: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    if (key.startsWith("$ACTION")) continue;
    out[key] = arrays.includes(key) ? fd.getAll(key).map(String) : fd.get(key);
  }
  for (const a of arrays) out[a] ??= [];
  return out;
}

export const nullify = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === undefined ? null : v])) as {
    [K in keyof T]-?: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K];
  };
