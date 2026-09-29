import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { client, db, resetDb } from "./db";
import { normalizeEmail, requestLoginCode, verifyLoginCode } from "@/lib/login-codes";
import { createSession, deleteSession, findSessionUser } from "@/lib/sessions";

beforeEach(resetDb);
afterAll(() => client.end());

describe("вход по коду", () => {
  it("правильный код создаёт пользователя и работает один раз", async () => {
    const res = await requestLoginCode(db, "a@example.com");
    expect(res.ok).toBe(true);
    const code = (res as { code: string }).code;
    const first = await verifyLoginCode(db, "a@example.com", code);
    expect(first.ok).toBe(true);
    const second = await verifyLoginCode(db, "a@example.com", code);
    expect(second.ok).toBe(false);
  });

  it("после 5 неверных попыток код сгорает", async () => {
    const res = await requestLoginCode(db, "a@example.com");
    const code = (res as { code: string }).code;
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await verifyLoginCode(db, "a@example.com", wrong);
    expect((await verifyLoginCode(db, "a@example.com", code)).ok).toBe(false);
  });

  it("код нельзя запрашивать чаще раза в минуту", async () => {
    const now = new Date();
    expect((await requestLoginCode(db, "a@example.com", now)).ok).toBe(true);
    expect(await requestLoginCode(db, "a@example.com", new Date(now.getTime() + 10_000))).toEqual({
      ok: false,
      error: "too_soon",
    });
    expect((await requestLoginCode(db, "a@example.com", new Date(now.getTime() + 61_000))).ok).toBe(true);
  });

  it("просроченный код не принимается", async () => {
    const past = new Date(Date.now() - 11 * 60_000);
    const res = await requestLoginCode(db, "a@example.com", past);
    const code = (res as { code: string }).code;
    expect((await verifyLoginCode(db, "a@example.com", code)).ok).toBe(false);
  });

  it("нормализует почту", () => {
    expect(normalizeEmail("  A@Example.COM ")).toBe("a@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
  });
});

describe("сессии", () => {
  it("создаётся, находится и удаляется", async () => {
    const res = await requestLoginCode(db, "s@example.com");
    const v = await verifyLoginCode(db, "s@example.com", (res as { code: string }).code);
    const user = (v as { user: { id: string } }).user;
    const token = await createSession(db, user.id);
    expect((await findSessionUser(db, token))?.id).toBe(user.id);
    await deleteSession(db, token);
    expect(await findSessionUser(db, token)).toBeNull();
  });
});
