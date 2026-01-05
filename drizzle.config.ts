import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.NEON_DATABASE_URL || "postgresql://neondb_owner:npg_2kbywqLm3NGu@ep-sweet-shadow-acg1mnat-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
