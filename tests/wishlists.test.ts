import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { client, db, makeUser, resetDb } from "./db";
import { createGuest } from "@/lib/guest-store";
import {
  addGift,
  cancelReservation,
  createWishlist,
  deleteGift,
  getOwnerWishlist,
  getPublicWishlist,
  listGuestReservations,
  reserveGift,
  updateGift,
} from "@/lib/wishlists";
import { resolveOutboundLink } from "@/lib/links";

const input = { title: "ДР", occasion: "День рождения", eventDate: "2026-12-01", about: "рыбалка, настолки" };

async function setup() {
  const author = await makeUser("author@example.com");
  const list = await createWishlist(db, author.id, input);
  const giftId = (await addGift(db, author.id, list.id, {
    title: "Катушка",
    note: "",
    url: new URL("https://www.ozon.ru/product/123"),
    imageUrl: null,
    price: "2500",
  }))!;
  return { author, list, giftId };
}

beforeEach(resetDb);
afterAll(() => client.end());

describe("бронирование", () => {
  it("второй гость не может забронировать занятый подарок", async () => {
    const { list, giftId } = await setup();
    const { guest: a } = await createGuest(db, "Аня");
    const { guest: b } = await createGuest(db, "Боря");

    expect(await reserveGift(db, giftId, a)).toBe("ok");
    expect(await reserveGift(db, giftId, b)).toBe("taken");

    const forA = await getPublicWishlist(db, list.slug, [a.id]);
    const forB = await getPublicWishlist(db, list.slug, [b.id]);
    expect(forA!.gifts[0].status).toBe("mine");
    expect(forB!.gifts[0].status).toBe("taken");
  });

  it("одновременные брони: успешна ровно одна", async () => {
    const { giftId } = await setup();
    const guests = await Promise.all(
      Array.from({ length: 8 }, (_, i) => createGuest(db, `Гость ${i}`).then((r) => r.guest)),
    );
    const results = await Promise.all(guests.map((g) => reserveGift(db, giftId, g)));
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
  });

  it("снять бронь может только тот, кто бронировал", async () => {
    const { giftId } = await setup();
    const { guest: a } = await createGuest(db, "Аня");
    const { guest: b } = await createGuest(db, "Боря");
    await reserveGift(db, giftId, a);

    expect(await cancelReservation(db, giftId, [b.id])).toBe(false);
    expect(await cancelReservation(db, giftId, [a.id])).toBe(true);
    expect(await reserveGift(db, giftId, b)).toBe("ok");
  });

  it("автор не может бронировать подарки из своего списка", async () => {
    const { author, giftId } = await setup();
    const { guest } = await createGuest(db, "Я", author.id);
    expect(await reserveGift(db, giftId, guest)).toBe("own_list");
  });

  it("автор видит только факт брони, без гостя", async () => {
    const { author, list, giftId } = await setup();
    const { guest } = await createGuest(db, "Аня");
    await reserveGift(db, giftId, guest);
    const view = await getOwnerWishlist(db, author.id, list.id);
    expect(view!.gifts[0].reserved).toBe(true);
    expect(JSON.stringify(view)).not.toContain(guest.id);
    expect(JSON.stringify(view)).not.toContain("Аня");
  });

  it("гость видит свои брони, в том числе удалённые автором подарки", async () => {
    const { author, giftId } = await setup();
    const { guest } = await createGuest(db, "Аня");
    await reserveGift(db, giftId, guest);
    await deleteGift(db, author.id, giftId);
    const mine = await listGuestReservations(db, [guest.id]);
    expect(mine).toHaveLength(1);
    expect(mine[0].deleted).toBe(true);
  });

  it("удалённый подарок нельзя забронировать", async () => {
    const { author, giftId } = await setup();
    await deleteGift(db, author.id, giftId);
    const { guest } = await createGuest(db, "Аня");
    expect(await reserveGift(db, giftId, guest)).toBe("not_found");
  });
});

describe("права автора", () => {
  it("чужой пользователь не может менять и удалять подарки", async () => {
    const { list, giftId } = await setup();
    const stranger = await makeUser("x@example.com");
    expect(await updateGift(db, stranger.id, giftId, { title: "взлом", note: "", price: null })).toBe(false);
    expect(await deleteGift(db, stranger.id, giftId)).toBe(false);
    expect(await addGift(db, stranger.id, list.id, { title: "a", note: "", url: null, imageUrl: null, price: null })).toBeNull();
    expect(await getOwnerWishlist(db, stranger.id, list.id)).toBeNull();
  });
});

describe("ссылки", () => {
  it("переход по /go ведёт на исходную ссылку и считается", async () => {
    const { author, list } = await setup();
    const view = await getOwnerWishlist(db, author.id, list.id);
    const linkId = view!.gifts[0].linkId!;
    expect(await resolveOutboundLink(db, linkId)).toBe("https://www.ozon.ru/product/123");
    expect(await resolveOutboundLink(db, "nope")).toBeNull();
  });
});
