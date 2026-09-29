import { lookup } from "node:dns/promises";
import { isPrivateIp } from "./urls";

export type ProductPreview = { title?: string; imageUrl?: string; price?: string };

const MAX_BYTES = 600_000;
const TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;

async function assertPublicHost(url: URL): Promise<void> {
  const addrs = await lookup(url.hostname, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("private address");
  }
}

// Пытаемся достать название, картинку и цену со страницы товара.
// Маркетплейсы часто закрываются от роботов, поэтому любая ошибка = пустой результат,
// и автор просто вводит название сам.
export async function fetchProductPreview(start: URL): Promise<ProductPreview> {
  try {
    let url = start;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      await assertPublicHost(url);
      const res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; IWISHBot/1.0)",
          accept: "text/html",
          "accept-language": "ru,en;q=0.8",
        },
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        url = new URL(location, url);
        if (url.protocol !== "http:" && url.protocol !== "https:") return {};
        continue;
      }
      if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return {};
      return parseProductHtml(await readLimited(res), url);
    }
  } catch {
    // см. комментарий выше
  }
  return {};
}

async function readLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function metaContent(html: string, key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() || undefined : undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function parseProductHtml(html: string, base: URL): ProductPreview {
  const title =
    metaContent(html, "og:title") ??
    metaContent(html, "twitter:title") ??
    decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim() ??
    undefined;
  const image = metaContent(html, "og:image") ?? metaContent(html, "twitter:image");
  const amount =
    metaContent(html, "product:price:amount") ??
    metaContent(html, "og:price:amount") ??
    metaContent(html, "price");
  let imageUrl: string | undefined;
  if (image) {
    try {
      const u = new URL(image, base);
      if (u.protocol === "https:" || u.protocol === "http:") imageUrl = u.href;
    } catch {}
  }
  return {
    title: title ? title.slice(0, 200) : undefined,
    imageUrl,
    price: amount && /^[\d\s.,]+$/.test(amount) ? amount.trim() : undefined,
  };
}
