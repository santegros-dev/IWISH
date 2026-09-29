import { createHash, createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { users, type User } from "@/db/schema";
import { safeEqualHex } from "./crypto";

export type TelegramAuthData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const MAX_AGE_SECONDS = 24 * 60 * 60;

// Проверка подписи данных от Telegram Login Widget:
// https://core.telegram.org/widgets/login#checking-authorization
export function verifyTelegramAuth(
  params: Record<string, string>,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): TelegramAuthData | null {
  const { hash, ...rest } = params;
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!safeEqualHex(expected, hash)) return null;

  const authDate = Number(rest.auth_date);
  const id = Number(rest.id);
  if (!Number.isSafeInteger(id) || !Number.isFinite(authDate)) return null;
  if (nowSeconds - authDate > MAX_AGE_SECONDS) return null;

  return { ...rest, id, auth_date: authDate, hash } as TelegramAuthData;
}

export async function findOrCreateUserByTelegram(db: Db, data: TelegramAuthData): Promise<User> {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || "";
  await db.insert(users).values({ telegramId: data.id, name }).onConflictDoNothing();
  const [user] = await db.select().from(users).where(eq(users.telegramId, data.id)).limit(1);
  return user;
}
