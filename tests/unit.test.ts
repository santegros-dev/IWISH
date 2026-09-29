import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyTelegramAuth } from "@/lib/telegram";
import { isPrivateIp, parseUserUrl } from "@/lib/urls";
import { parseProductHtml } from "@/lib/preview";

function signTelegram(data: Record<string, string>, token: string) {
  const dcs = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join("\n");
  const secret = createHash("sha256").update(token).digest();
  return createHmac("sha256", secret).update(dcs).digest("hex");
}

describe("Telegram", () => {
  const token = "123:ABC";
  const now = 1_800_000_000;
  const data = { id: "42", first_name: "Илья", auth_date: String(now - 60) };

  it("принимает корректную подпись", () => {
    const res = verifyTelegramAuth({ ...data, hash: signTelegram(data, token) }, token, now);
    expect(res?.id).toBe(42);
  });

  it("отклоняет подделку и старые данные", () => {
    const hash = signTelegram(data, token);
    expect(verifyTelegramAuth({ ...data, id: "43", hash }, token, now)).toBeNull();
    expect(verifyTelegramAuth({ ...data, hash }, "другой", now)).toBeNull();
    expect(verifyTelegramAuth({ ...data, hash }, token, now + 2 * 86400)).toBeNull();
  });
});

describe("ссылки", () => {
  it("разбирает ссылки пользователя", () => {
    expect(parseUserUrl("ozon.ru/product/1")?.href).toBe("https://ozon.ru/product/1");
    expect(parseUserUrl("javascript:alert(1)")).toBeNull();
    expect(parseUserUrl("https://user:pass@site.ru")).toBeNull();
    expect(parseUserUrl("http://localhost")).toBeNull();
  });

  it("распознаёт внутренние адреса", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    expect(isPrivateIp("93.158.134.3")).toBe(false);
  });
});

describe("превью товара", () => {
  it("достаёт название, картинку и цену", () => {
    const html = `<html><head><title>Fallback</title>
      <meta property="og:title" content="Катушка &quot;Pro&quot;">
      <meta content="/img/1.jpg" property="og:image">
      <meta property="product:price:amount" content="2 499">
    </head></html>`;
    expect(parseProductHtml(html, new URL("https://shop.ru/p/1"))).toEqual({
      title: 'Катушка "Pro"',
      imageUrl: "https://shop.ru/img/1.jpg",
      price: "2 499",
    });
  });

  it("берёт <title>, если нет og", () => {
    expect(parseProductHtml("<title> Книга </title>", new URL("https://a.ru")).title).toBe("Книга");
  });
});
