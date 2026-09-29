"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateActingGuest, getViewerGuests } from "@/lib/guests";
import { cancelReservation, reserveGift } from "@/lib/wishlists";

export type ReserveState = { error?: string; needName?: boolean };

export async function reserveAction(_prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const giftId = String(formData.get("giftId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!z.uuid().safeParse(giftId).success) return { error: "Подарок не найден" };
  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || null;

  const user = await getCurrentUser();
  const guest = await getOrCreateActingGuest(user, name);
  if (!guest) return { needName: true };

  const result = await reserveGift(getDb(), giftId, guest);
  revalidatePath(`/w/${slug}`);
  switch (result) {
    case "ok":
      return {};
    case "taken":
      return { error: "Этот подарок уже забронировал кто-то другой" };
    case "own_list":
      return { error: "Это ваш список: бронировать в нём нельзя" };
    default:
      return { error: "Подарок не найден, возможно его удалили" };
  }
}

export async function cancelAction(formData: FormData) {
  const giftId = String(formData.get("giftId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!z.uuid().safeParse(giftId).success) return;
  const guests = await getViewerGuests(await getCurrentUser());
  await cancelReservation(
    getDb(),
    giftId,
    guests.map((g) => g.id),
  );
  if (slug) revalidatePath(`/w/${slug}`);
  revalidatePath("/my");
}
