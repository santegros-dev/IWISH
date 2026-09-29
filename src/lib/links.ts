import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { clicks, outboundLinks } from "@/db/schema";
import { shortId } from "./crypto";
import { toAffiliateUrl } from "./affiliate";

export async function createOutboundLink(db: Db, url: URL): Promise<string> {
  const id = shortId(10);
  const affiliateUrl = await toAffiliateUrl(url);
  await db.insert(outboundLinks).values({ id, targetUrl: url.href, affiliateUrl });
  return id;
}

// Адрес, куда отправить человека по /go/<id>, с записью перехода.
export async function resolveOutboundLink(db: Db, id: string): Promise<string | null> {
  const [link] = await db.select().from(outboundLinks).where(eq(outboundLinks.id, id)).limit(1);
  if (!link) return null;
  await db.insert(clicks).values({ linkId: id });
  return link.affiliateUrl ?? link.targetUrl;
}
