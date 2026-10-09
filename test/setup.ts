import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll } from "vitest";

if (process.env.PGDATABASE !== "test") {
  throw new Error("Tests must run against the test database");
}

const schema = `test_${randomUUID().replaceAll("-", "")}`;
const admin = new Client();
await admin.connect();

try {
  const sql = (await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"))
    .split("\n")
    .filter((line) => !line.startsWith("\\"))
    .join("\n")
    .replaceAll("giveffektivt", schema);
  await admin.query(sql);
} catch (error) {
  await admin.end();
  throw error;
}

const previousOptions = process.env.PGOPTIONS;
process.env.PGOPTIONS = `${previousOptions ?? ""} -c search_path=${schema}`;

afterAll(async () => {
  try {
    await admin.query(`drop schema "${schema}" cascade`);
  } finally {
    if (previousOptions === undefined) {
      delete process.env.PGOPTIONS;
    } else {
      process.env.PGOPTIONS = previousOptions;
    }
    await admin.end();
  }
});
