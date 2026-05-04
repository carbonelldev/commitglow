import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(currentDir, "../../.env") });
config({ path: resolve(currentDir, ".env"), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Add it to the repo root .env file before running Drizzle commands.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const ssl = ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname) ? false : "require";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl
  }
});
