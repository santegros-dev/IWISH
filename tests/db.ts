import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Db } from "@/db";
import { TEST_DB_URL } from "./global-setup";

export const client = postgres(TEST_DB_URL, { max: 5, onnotice: () => {} });
export const db: Db = drizzle(client, { schema });

export async function resetDb() {
  await db.execute(
    sql`truncate users, sessions, login_codes, guests, wishlists, outbound_links, clicks, gifts, reservations cascade`,
  );
}

export async function makeUser(email: string) {
  const [u] = await db.insert(schema.users).values({ email, name: email.split("@")[0] }).returning();
  return u;
}
