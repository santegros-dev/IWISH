import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { resolveOutboundLink } from "@/lib/links";

export async function GET(request: NextRequest, ctx: RouteContext<"/go/[id]">) {
  const { id } = await ctx.params;
  const target = /^[A-Za-z0-9]{1,32}$/.test(id) ? await resolveOutboundLink(getDb(), id) : null;
  if (!target) return NextResponse.redirect(new URL("/", request.url));
  const res = NextResponse.redirect(target, 302);
  res.headers.set("referrer-policy", "no-referrer");
  res.headers.set("x-robots-tag", "noindex");
  return res;
}
