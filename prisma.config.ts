import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations prefer the DIRECT endpoint: Neon's pooled connection is
    // PgBouncer, which does not support the advisory locks and session state
    // that `prisma migrate` depends on.
    //
    // Resolved with a plain fallback rather than prisma's env() helper, which
    // THROWS on a missing variable. `prisma generate` runs during the Vercel
    // build, where no database URL is set at all, and the throw failed the
    // whole build before Next.js started. Generate only parses the schema, so
    // an unreachable placeholder is fine there.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
