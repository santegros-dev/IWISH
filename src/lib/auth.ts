import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { User } from "@/db/schema";
import { SESSION_COOKIE, SESSION_TTL_DAYS, cookieOptions } from "./cookies";
import { createSession, deleteSession, findSessionUser } from "./sessions";
import { linkGuestToUser } from "./guests";

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findSessionUser(getDb(), token);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Вызывать только из Server Actions и Route Handlers (там можно ставить cookie).
export async function signIn(userId: string): Promise<void> {
  const store = await cookies();
  const token = await createSession(getDb(), userId);
  store.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_DAYS));
  // Если человек уже бронировал как гость на этом устройстве, привязываем брони к аккаунту.
  await linkGuestToUser(userId);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(getDb(), token);
  store.delete(SESSION_COOKIE);
}
