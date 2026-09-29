import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { randomToken, sha256 } from "./crypto";
import { SESSION_TTL_DAYS } from "./cookies";

// Логика сессий без привязки к Next.js, чтобы её можно было тестировать.

export async function createSession(db: Db, userId: string): Promise<string> {
  const token = randomToken();
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000),
  });
  return token;
}

export async function findSessionUser(db: Db, token: string): Promise<User | null> {
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}
