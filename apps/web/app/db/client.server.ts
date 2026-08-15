import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

export function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for this operation");
  }
  database ??= createDatabase(databaseUrl);
  return database;
}

export type Database = ReturnType<typeof getDatabase>;
