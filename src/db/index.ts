import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { iwishDb?: Db };

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL не задан");
  return drizzle(postgres(url, { max: 10 }), { schema });
}

// Одно подключение на процесс (в dev-режиме модули перезагружаются).
export function getDb(): Db {
  if (!globalForDb.iwishDb) globalForDb.iwishDb = createDb();
  return globalForDb.iwishDb;
}
