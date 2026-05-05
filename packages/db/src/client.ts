import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const databaseUrl = new URL(connectionString);
const ssl = ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname) ? false : "require";
const max = Number(process.env.DATABASE_POOL_MAX ?? (process.env.NODE_ENV === "production" ? "5" : "2"));

const globalForDb = globalThis as typeof globalThis & {
  commitglowPostgres?: {
    connectionString: string;
    client: ReturnType<typeof postgres>;
  };
};

const client =
  globalForDb.commitglowPostgres?.connectionString === connectionString
    ? globalForDb.commitglowPostgres.client
    : postgres(connectionString, { prepare: false, ssl, max });

globalForDb.commitglowPostgres = { connectionString, client };

export const db = drizzle(client, { schema });
export type Database = typeof db;
