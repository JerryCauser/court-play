import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(url);
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
for (const statement of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log("schema applied");
