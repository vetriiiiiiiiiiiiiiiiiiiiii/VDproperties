import { PrismaClient } from "@prisma/client";
import { overlay } from "./translations";

/** The page's language, when called during a request; English for scripts and the admin. */
async function requestLocale() {
  try {
    const { headers } = await import("next/headers");
    return (await headers()).get("x-vdp-locale") ?? "en";
  } catch {
    return "en";
  }
}

function createClient() {
  const base = new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
  // Reads on public pages come back in the visitor's language wherever editors supplied a translation.
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          const result = await query(args);
          if (!operation.startsWith("find")) return result;
          return overlay(result, await requestLocale());
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
