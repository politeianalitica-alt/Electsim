/**
 * Drizzle Kit config — sólo se usa con la CLI offline:
 *   npx drizzle-kit generate
 *   npx drizzle-kit migrate
 *
 * Nadie en el bundle de Next importa este archivo.
 */
import type { Config } from "drizzle-kit";

export default {
  schema: "./drizzle/schema.ts",
  out:    "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict:  true,
  verbose: true,
} satisfies Config;
