// Starts a real PostgreSQL server for local development and tests, without Docker.
// Data lives in .data/postgres. Production should use a managed PostgreSQL instance instead.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const port = Number(process.env.LOCAL_DB_PORT ?? 5434);
const databaseDir = path.resolve(".data/postgres");
const fresh = !existsSync(databaseDir);

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "vdp",
  password: "vdp_local_only",
  port,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (fresh) await pg.initialise();
await pg.start();
if (fresh) {
  await pg.createDatabase("vdp_app");
  await pg.createDatabase("vd_properties_test");
}
console.log(`PostgreSQL ready on postgresql://vdp:***@localhost:${port}`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
