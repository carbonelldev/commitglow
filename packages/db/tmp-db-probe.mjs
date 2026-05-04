import { config } from "dotenv";
import postgres from "postgres";

config({ path: "../../.env" });

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: "require",
  connect_timeout: 10
});

try {
  console.log(
    "schemas",
    await sql.unsafe(
      "select schema_name from information_schema.schemata where schema_name in ('public','drizzle') order by schema_name"
    )
  );
  console.log(
    "migration_tables",
    await sql.unsafe(
      "select table_schema, table_name from information_schema.tables where table_name ilike '%migration%' order by table_schema, table_name"
    )
  );
  console.log("drizzle_migrations", await sql.unsafe("select * from drizzle.__drizzle_migrations order by id"));
} catch (error) {
  console.error({ name: error.name, code: error.code, message: error.message });
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 1 });
}
