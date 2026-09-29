import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { gifts, outboundLinks, reservations, wishlists, type Guest, type Wishlist } from "@/db/schema";
import { shortId } from "./crypto";
import { createOutboundLink } from "./links";

export type WishlistInput = {
  title: string;
  occasion: string;
  eventDate: string | null;
  about: string;
};

export type GiftInput = {
  title: string;
  note: string;
  url: URL | null;
  imageUrl: string | null;
  price: string | null;
};

// ---------- Автор ----------

export async function createWishlist(db: Db, ownerId: string, input: WishlistInput): Promise<Wishlist> {
  for (let attempt = 0; ; attempt++) {
    const rows = await db
      .insert(wishlists)
      .values({ ownerId, slug: shortId(8), ...input })
      .onConflictDoNothing({ target: wishlists.slug })
      .returning();
    if (rows[0]) return rows[0];
    if (attempt >= 5) throw new Error("не удалось подобрать код ссылки");
  }
}

export async function updateWishlist(db: Db, ownerId: string, id: string, input: WishlistInput): Promise<boolean> {
  const rows = await db
    .update(wishlists)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(wishlists.id, id), eq(wishlists.ownerId, ownerId)))
    .returning({ id: wishlists.id });
  return rows.length > 0;
}

export async function deleteWishlist(db: Db, ownerId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(wishlists)
    .where(and(eq(wishlists.id, id), eq(wishlists.ownerId, ownerId)))
    .returning({ id: wishlists.id });
  return rows.length > 0;
}

export async function listOwnerWishlists(db: Db, ownerId: string) {
  return db
    .select({
      id: wishlists.id,
      slug: wishlists.slug,
      title: wishlists.title,
      occasion: wishlists.occasion,
      eventDate: wishlists.eventDate,
      giftCount: count(gifts.id),
      reservedCount: count(reservations.id),
    })
    .from(wishlists)
    .leftJoin(gifts, and(eq(gifts.wishlistId, wishlists.id), isNull(gifts.deletedAt)))
    .leftJoin(reservations, eq(reservations.giftId, gifts.id))
    .where(eq(wishlists.ownerId, ownerId))
    .groupBy(wishlists.id)
    .orderBy(desc(wishlists.createdAt));
}

async function giftsWithReservations(db: Db, wishlistId: string) {
  return db
    .select({
      id: gifts.id,
      title: gifts.title,
      note: gifts.note,
      linkId: gifts.linkId,
      targetUrl: outboundLinks.targetUrl,
      imageUrl: gifts.imageUrl,
      price: gifts.price,
      source: gifts.source,
      reservedBy: reservations.guestId,
    })
    .from(gifts)
    .leftJoin(outboundLinks, eq(outboundLinks.id, gifts.linkId))
    .leftJoin(reservations, eq(reservations.giftId, gifts.id))
    .where(and(eq(gifts.wishlistId, wishlistId), isNull(gifts.deletedAt)))
    .orderBy(asc(gifts.position), asc(gifts.createdAt));
}

// Для автора: подарки со статусом «занят» без информации о том, кто занял.
export async function getOwnerWishlist(db: Db, ownerId: string, id: string) {
  const [wishlist] = await db
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.id, id), eq(wishlists.ownerId, ownerId)))
    .limit(1);
  if (!wishlist) return null;
  const rows = await giftsWithReservations(db, id);
  return {
    wishlist,
    gifts: rows.map(({ reservedBy, ...g }) => ({ ...g, reserved: reservedBy !== null })),
  };
}

async function ownedWishlistId(db: Db, ownerId: string, wishlistId: string): Promise<boolean> {
  const rows = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.id, wishlistId), eq(wishlists.ownerId, ownerId)))
    .limit(1);
  return rows.length > 0;
}

export async function addGift(db: Db, ownerId: string, wishlistId: string, input: GiftInput): Promise<string | null> {
  if (!(await ownedWishlistId(db, ownerId, wishlistId))) return null;
  const linkId = input.url ? await createOutboundLink(db, input.url) : null;
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${gifts.position}), -1) + 1` })
    .from(gifts)
    .where(eq(gifts.wishlistId, wishlistId));
  const [gift] = await db
    .insert(gifts)
    .values({
      wishlistId,
      title: input.title,
      note: input.note,
      linkId,
      imageUrl: input.imageUrl,
      price: input.price,
      position: Number(next),
    })
    .returning({ id: gifts.id });
  return gift.id;
}

export async function updateGift(
  db: Db,
  ownerId: string,
  giftId: string,
  input: { title: string; note: string; price: string | null },
): Promise<boolean> {
  const rows = await db
    .update(gifts)
    .set(input)
    .where(
      and(
        eq(gifts.id, giftId),
        isNull(gifts.deletedAt),
        inArray(gifts.wishlistId, db.select({ id: wishlists.id }).from(wishlists).where(eq(wishlists.ownerId, ownerId))),
      ),
    )
    .returning({ id: gifts.id });
  return rows.length > 0;
}

// Мягкое удаление: гость, забронировавший подарок, увидит, что автор его убрал.
export async function deleteGift(db: Db, ownerId: string, giftId: string): Promise<boolean> {
  const rows = await db
    .update(gifts)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(gifts.id, giftId),
        isNull(gifts.deletedAt),
        inArray(gifts.wishlistId, db.select({ id: wishlists.id }).from(wishlists).where(eq(wishlists.ownerId, ownerId))),
      ),
    )
    .returning({ id: gifts.id });
  return rows.length > 0;
}

// ---------- Гость ----------

export type GiftStatus = "free" | "mine" | "taken";

export async function getPublicWishlist(db: Db, slug: string, viewerGuestIds: string[]) {
  const [wishlist] = await db.select().from(wishlists).where(eq(wishlists.slug, slug)).limit(1);
  if (!wishlist) return null;
  const mine = new Set(viewerGuestIds);
  const rows = await giftsWithReservations(db, wishlist.id);
  return {
    wishlist,
    gifts: rows.map(({ reservedBy, targetUrl, ...g }) => ({
      ...g,
      hasLink: targetUrl !== null,
      // Гости видят только «свободно» / «занято»; свою бронь человек видит как «моя».
      status: (reservedBy === null ? "free" : mine.has(reservedBy) ? "mine" : "taken") as GiftStatus,
    })),
  };
}

export type ReserveResult = "ok" | "taken" | "not_found" | "own_list";

export async function reserveGift(db: Db, giftId: string, guest: Guest): Promise<ReserveResult> {
  const [gift] = await db
    .select({ ownerId: wishlists.ownerId })
    .from(gifts)
    .innerJoin(wishlists, eq(wishlists.id, gifts.wishlistId))
    .where(and(eq(gifts.id, giftId), isNull(gifts.deletedAt)))
    .limit(1);
  if (!gift) return "not_found";
  if (guest.userId && guest.userId === gift.ownerId) return "own_list";
  const inserted = await db
    .insert(reservations)
    .values({ giftId, guestId: guest.id })
    .onConflictDoNothing({ target: reservations.giftId })
    .returning({ id: reservations.id });
  return inserted.length > 0 ? "ok" : "taken";
}

// Снять бронь может только тот, кто её поставил.
export async function cancelReservation(db: Db, giftId: string, guestIds: string[]): Promise<boolean> {
  if (guestIds.length === 0) return false;
  const rows = await db
    .delete(reservations)
    .where(and(eq(reservations.giftId, giftId), inArray(reservations.guestId, guestIds)))
    .returning({ id: reservations.id });
  return rows.length > 0;
}

export async function listGuestReservations(db: Db, guestIds: string[]) {
  if (guestIds.length === 0) return [];
  return db
    .select({
      giftId: gifts.id,
      giftTitle: gifts.title,
      linkId: gifts.linkId,
      imageUrl: gifts.imageUrl,
      price: gifts.price,
      deleted: sql<boolean>`${gifts.deletedAt} is not null`,
      wishlistTitle: wishlists.title,
      wishlistSlug: wishlists.slug,
      eventDate: wishlists.eventDate,
      reservedAt: reservations.createdAt,
    })
    .from(reservations)
    .innerJoin(gifts, eq(gifts.id, reservations.giftId))
    .innerJoin(wishlists, eq(wishlists.id, gifts.wishlistId))
    .where(inArray(reservations.guestId, guestIds))
    .orderBy(desc(reservations.createdAt));
}
