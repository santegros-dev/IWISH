import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/redirects";
import { card } from "@/components/ui";
import { LoginForm } from "./login-form";
import { TelegramButton } from "./telegram-button";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getCurrentUser()) redirect(next);

  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const authUrl = `${appUrl}/api/auth/telegram?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Вход</h1>
      <p className="text-sm text-muted">Войдите, чтобы создавать вишлисты и видеть свои брони с любого устройства.</p>
      {params.error === "telegram" && <p className="text-sm text-accent">Не удалось войти через Telegram. Попробуйте ещё раз.</p>}
      <div className={`${card} space-y-4`}>
        {botName && (
          <>
            <TelegramButton botName={botName} authUrl={authUrl} />
            <div className="text-center text-xs text-muted">или по почте</div>
          </>
        )}
        <LoginForm next={next} />
      </div>
    </div>
  );
}
