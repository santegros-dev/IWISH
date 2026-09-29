import { and, desc, eq, gt } from "drizzle-orm";
import type { Db } from "@/db";
import { loginCodes, users, type User } from "@/db/schema";
import { randomCode, safeEqualHex, sha256 } from "./crypto";

const CODE_TTL_MS = 10 * 60_000;
const RESEND_INTERVAL_MS = 60_000;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

export type RequestCodeResult =
  | { ok: true; code: string }
  | { ok: false; error: "too_soon" | "too_many" };

export async function requestLoginCode(db: Db, email: string, now = new Date()): Promise<RequestCodeResult> {
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const recent = await db
    .select({ createdAt: loginCodes.createdAt })
    .from(loginCodes)
    .where(and(eq(loginCodes.email, email), gt(loginCodes.createdAt, hourAgo)))
    .orderBy(desc(loginCodes.createdAt));
  if (recent.length >= MAX_CODES_PER_HOUR) return { ok: false, error: "too_many" };
  if (recent[0] && now.getTime() - recent[0].createdAt.getTime() < RESEND_INTERVAL_MS) {
    return { ok: false, error: "too_soon" };
  }
  const code = randomCode();
  await db.insert(loginCodes).values({
    email,
    codeHash: sha256(`${email}:${code}`),
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    createdAt: now,
  });
  return { ok: true, code };
}

export type VerifyCodeResult = { ok: true; user: User } | { ok: false; error: "invalid" | "expired" };

export async function verifyLoginCode(db: Db, email: string, code: string, now = new Date()): Promise<VerifyCodeResult> {
  const [row] = await db
    .select()
    .from(loginCodes)
    .where(eq(loginCodes.email, email))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);
  if (!row || row.expiresAt <= now || row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "expired" };

  if (!safeEqualHex(row.codeHash, sha256(`${email}:${code.trim()}`))) {
    await db.update(loginCodes).set({ attempts: row.attempts + 1 }).where(eq(loginCodes.id, row.id));
    return { ok: false, error: "invalid" };
  }

  await db.delete(loginCodes).where(eq(loginCodes.email, email));
  const user = await findOrCreateUserByEmail(db, email);
  return { ok: true, user };
}

async function findOrCreateUserByEmail(db: Db, email: string): Promise<User> {
  await db.insert(users).values({ email, name: email.split("@")[0] }).onConflictDoNothing();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}
