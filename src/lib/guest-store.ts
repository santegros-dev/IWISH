import { eq, or, and, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { guests, type Guest } from "@/db/schema";
import { randomToken, sha256 } from "./crypto";

export async function findGuestByToken(db: Db, token: string): Promise<Guest | null> {
  const rows = await db.select().from(guests).where(eq(guests.tokenHash, sha256(token))).limit(1);
  return rows[0] ?? null;
}

export async function createGuest(
  db: Db,
  name: string,
  userId: string | null = null,
): Promise<{ guest: Guest; token: string }> {
  const token = randomToken();
  const [guest] = await db
    .insert(guests)
    .values({ tokenHash: sha256(token), name, userId })
    .returning();
  return { guest, token };
}

// Все «личности» зрителя: гость из cookie этого браузера и гости, привязанные к его аккаунту.
export async function findViewerGuests(
  db: Db,
  cookieToken: string | undefined,
  userId: string | undefined,
): Promise<Guest[]> {
  const conds = [];
  if (cookieToken) conds.push(eq(guests.tokenHash, sha256(cookieToken)));
  if (userId) conds.push(eq(guests.userId, userId));
  if (conds.length === 0) return [];
  return db.select().from(guests).where(or(...conds));
}

export async function attachGuestToUser(db: Db, cookieToken: string, userId: string): Promise<void> {
  await db
    .update(guests)
    .set({ userId })
    .where(and(eq(guests.tokenHash, sha256(cookieToken)), isNull(guests.userId)));
}
