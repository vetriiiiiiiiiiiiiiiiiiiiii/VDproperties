import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { E2E_DB } from "../../playwright.config";
import { USERS } from "./fixtures";

export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E_DB };
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  const db = new PrismaClient({ datasources: { db: { url: E2E_DB } } });
  // Start every run from an empty test database.
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  const hash = (p: string) => bcrypt.hash(p, 10);
  await db.user.createMany({
    data: [
      { email: USERS.admin.email, name: "E2E Admin", role: "SUPER_ADMIN", passwordHash: await hash(USERS.admin.password) },
      { email: USERS.property.email, name: "E2E Manager", role: "ADMIN", passwordHash: await hash(USERS.property.password) },
      { email: USERS.enquiry.email, name: "E2E Staff", role: "STAFF", passwordHash: await hash(USERS.enquiry.password) },
      { email: USERS.pm.email, name: "E2E PM", role: "STAFF", passwordHash: await hash(USERS.pm.password) },
      { email: USERS.zonal.email, name: "E2E Zonal", role: "ZONAL_OFFICER", passwordHash: await hash(USERS.zonal.password) },
    ],
  });
  await db.$disconnect();
  execSync("npx tsx prisma/seed.ts", { env: { ...env, SEED_ADMIN_EMAIL: "", SEED_ADMIN_PASSWORD: "", SEED_SAMPLE_CONTENT: "true" }, stdio: "inherit" });
}
