import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { signIn } from "@/lib/auth";
import { safeNext } from "@/lib/redirects";
import { findOrCreateUserByTelegram, verifyTelegramAuth } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const next = safeNext(params.next);
  delete params.next;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const data = token ? verifyTelegramAuth(params, token) : null;
  if (!data) return NextResponse.redirect(new URL("/login?error=telegram", request.url));

  const user = await findOrCreateUserByTelegram(getDb(), data);
  await signIn(user.id);
  return NextResponse.redirect(new URL(next, request.url));
}
