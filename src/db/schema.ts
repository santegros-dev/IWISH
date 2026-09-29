import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  date,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Зарегистрированные пользователи: авторы вишлистов и гости, привязавшие аккаунт.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  name: text("name").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Сессии входа. В cookie хранится токен, в базе только его хеш.
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// Одноразовые коды входа по почте.
export const loginCodes = pgTable(
  "login_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_codes_email_idx").on(t.email)],
);

// Гости без регистрации. Узнаём по токену в cookie (в базе хеш).
// Если гость вошёл в аккаунт, userId связывает его брони с аккаунтом.
export const guests = pgTable("guests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  name: text("name").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Короткий код для публичной ссылки /w/<slug>
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  occasion: text("occasion").notNull().default(""),
  eventDate: date("event_date"),
  // Увлечения и интересы автора (пригодятся для ИИ-подбора)
  about: text("about").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Все внешние ссылки идут через редирект /go/<id>: так считаем переходы
// и позже подменяем ссылку на партнёрскую без правки старых ссылок.
export const outboundLinks = pgTable("outbound_links", {
  id: text("id").primaryKey(),
  targetUrl: text("target_url").notNull(),
  affiliateUrl: text("affiliate_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clicks = pgTable(
  "clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkId: text("link_id")
      .notNull()
      .references(() => outboundLinks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clicks_link_idx").on(t.linkId)],
);

export const giftSource = pgEnum("gift_source", ["author", "ai", "guest"]);

export const gifts = pgTable(
  "gifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => wishlists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    note: text("note").notNull().default(""),
    linkId: text("link_id").references(() => outboundLinks.id, { onDelete: "set null" }),
    imageUrl: text("image_url"),
    price: text("price"),
    source: giftSource("source").notNull().default("author"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Удалённые автором подарки не пропадают сразу: гость должен узнать, что его бронь снята.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("gifts_wishlist_idx").on(t.wishlistId)],
);

// Одна бронь на подарок: уникальный индекс по gift_id не даст
// забронировать дважды даже при одновременных нажатиях.
export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giftId: uuid("gift_id")
      .notNull()
      .references(() => gifts.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reservations_gift_uq").on(t.giftId), index("reservations_guest_idx").on(t.guestId)],
);

export type User = typeof users.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type Wishlist = typeof wishlists.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
