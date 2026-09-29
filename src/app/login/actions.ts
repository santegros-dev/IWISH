"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { signIn } from "@/lib/auth";
import { normalizeEmail, requestLoginCode, verifyLoginCode } from "@/lib/login-codes";
import { sendMail } from "@/lib/mailer";
import { safeNext } from "@/lib/redirects";

export type LoginState = { step: "email" | "code"; email?: string; error?: string; info?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  return formData.get("intent") === "verify" ? verifyCode(formData) : requestCode(formData);
}

async function requestCode(formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { step: "email", error: "Проверьте адрес почты" };
  const res = await requestLoginCode(getDb(), email);
  if (!res.ok) {
    return res.error === "too_soon"
      ? { step: "code", email, info: "Код уже отправлен. Новый можно запросить через минуту." }
      : { step: "email", error: "Слишком много попыток. Попробуйте через час." };
  }
  await sendMail(
    email,
    `Код для входа в IWISH: ${res.code}`,
    `Ваш код для входа: ${res.code}\n\nОн действует 10 минут. Если вы не запрашивали код, просто проигнорируйте это письмо.`,
  );
  return { step: "code", email, info: `Отправили код на ${email}` };
}

async function verifyCode(formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!email) return { step: "email", error: "Проверьте адрес почты" };
  if (!/^\d{6}$/.test(code)) return { step: "code", email, error: "Код состоит из 6 цифр" };
  const res = await verifyLoginCode(getDb(), email, code);
  if (!res.ok) {
    return res.error === "invalid"
      ? { step: "code", email, error: "Неверный код" }
      : { step: "email", error: "Код устарел. Запросите новый." };
  }
  await signIn(res.user.id);
  redirect(safeNext(formData.get("next")));
}
