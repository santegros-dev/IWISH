import "server-only";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import type { Guest, User } from "@/db/schema";
import { GUEST_COOKIE, GUEST_TTL_DAYS, cookieOptions } from "./cookies";
import { attachGuestToUser, createGuest, findGuestByToken, findViewerGuests } from "./guest-store";

export async function getViewerGuests(user: User | null): Promise<Guest[]> {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  return findViewerGuests(getDb(), token, user?.id);
}

// Гость, от имени которого делается бронь. Создаёт нового, если в браузере его ещё нет.
// Вызывать только из Server Actions.
export async function getOrCreateActingGuest(
  user: User | null,
  name: string | null,
): Promise<Guest | null> {
  const db = getDb();
  const store = await cookies();
  const token = store.get(GUEST_COOKIE)?.value;
  if (token) {
    const existing = await findGuestByToken(db, token);
    if (existing) return existing;
  }
  const guestName = name?.trim() || user?.name || "";
  if (!guestName) return null;
  const created = await createGuest(db, guestName.slice(0, 60), user?.id ?? null);
  store.set(GUEST_COOKIE, created.token, cookieOptions(GUEST_TTL_DAYS));
  return created.guest;
}

export async function linkGuestToUser(userId: string): Promise<void> {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  if (token) await attachGuestToUser(getDb(), token, userId);
}
