export const SESSION_COOKIE = "iwish_session";
export const GUEST_COOKIE = "iwish_guest";

export const SESSION_TTL_DAYS = 90;
export const GUEST_TTL_DAYS = 400;

export function cookieOptions(maxAgeDays: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeDays * 24 * 60 * 60,
  };
}
