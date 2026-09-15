import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations run against the DIRECT endpoint. Neon's pooled connection is
    // PgBouncer, which does not support the advisory locks and session state
    // that `prisma migrate` depends on.
    url: env("DIRECT_URL"),
  },
});
