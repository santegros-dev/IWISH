"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { fetchProductPreview, type ProductPreview } from "@/lib/preview";
import { parseUserUrl } from "@/lib/urls";
import {
  addGift,
  createWishlist,
  deleteGift,
  deleteWishlist,
  updateGift,
  updateWishlist,
  type WishlistInput,
} from "@/lib/wishlists";

export type FormState = { error?: string; ok?: boolean };

const wishlistSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(120),
  occasion: z.string().trim().max(80),
  eventDate: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Неверная дата"),
  about: z.string().trim().max(2000),
});

function parseWishlist(formData: FormData): WishlistInput | string {
  const res = wishlistSchema.safeParse({
    title: formData.get("title") ?? "",
    occasion: formData.get("occasion") ?? "",
    eventDate: formData.get("eventDate") ?? "",
    about: formData.get("about") ?? "",
  });
  return res.success ? res.data : res.error.issues[0].message;
}

export async function createWishlistAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const input = parseWishlist(formData);
  if (typeof input === "string") return { error: input };
  const list = await createWishlist(getDb(), user.id, input);
  redirect(`/dashboard/${list.id}`);
}

export async function updateWishlistAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const input = parseWishlist(formData);
  if (typeof input === "string") return { error: input };
  if (!z.uuid().safeParse(id).success || !(await updateWishlist(getDb(), user.id, id, input))) {
    return { error: "Список не найден" };
  }
  revalidatePath(`/dashboard/${id}`);
  return { ok: true };
}

export async function deleteWishlistAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (z.uuid().safeParse(id).success) await deleteWishlist(getDb(), user.id, id);
  redirect("/dashboard");
}

const giftSchema = z.object({
  title: z.string().trim().min(1, "Введите название подарка").max(200),
  note: z.string().trim().max(1000),
  price: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v || null),
});

export async function addGiftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const wishlistId = String(formData.get("wishlistId") ?? "");
  if (!z.uuid().safeParse(wishlistId).success) return { error: "Список не найден" };
  const parsed = giftSchema.safeParse({
    title: formData.get("title") ?? "",
    note: formData.get("note") ?? "",
    price: formData.get("price") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rawUrl = String(formData.get("url") ?? "").trim();
  const url = rawUrl ? parseUserUrl(rawUrl) : null;
  if (rawUrl && !url) return { error: "Ссылка выглядит неправильно" };

  const rawImage = String(formData.get("imageUrl") ?? "").trim();
  const image = rawImage ? parseUserUrl(rawImage) : null;

  const id = await addGift(getDb(), user.id, wishlistId, { ...parsed.data, url, imageUrl: image?.href ?? null });
  if (!id) return { error: "Список не найден" };
  revalidatePath(`/dashboard/${wishlistId}`);
  return { ok: true };
}

export async function updateGiftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const giftId = String(formData.get("giftId") ?? "");
  const parsed = giftSchema.safeParse({
    title: formData.get("title") ?? "",
    note: formData.get("note") ?? "",
    price: formData.get("price") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!z.uuid().safeParse(giftId).success || !(await updateGift(getDb(), user.id, giftId, parsed.data))) {
    return { error: "Подарок не найден" };
  }
  revalidatePath("/dashboard/[id]", "page");
  return { ok: true };
}

export async function deleteGiftAction(formData: FormData) {
  const user = await requireUser();
  const giftId = String(formData.get("giftId") ?? "");
  if (z.uuid().safeParse(giftId).success) await deleteGift(getDb(), user.id, giftId);
  revalidatePath("/dashboard/[id]", "page");
}

// Подтягивает название, картинку и цену по ссылке на товар.
export async function previewAction(rawUrl: string): Promise<ProductPreview> {
  await requireUser();
  const url = parseUserUrl(rawUrl);
  return url ? fetchProductPreview(url) : {};
}
