import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IWISH — вишлисты подарков", template: "%s · IWISH" },
  description: "Составьте список желаемых подарков и поделитесь ссылкой с гостями. Гости бронируют подарки, чтобы не дарить одно и то же.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="text-lg font-bold tracking-tight text-accent">
              IWISH
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <Link href="/my" className="text-muted hover:text-foreground">
                Мои брони
              </Link>
              {user ? (
                <>
                  <Link href="/dashboard" className="text-muted hover:text-foreground">
                    Мои списки
                  </Link>
                  <form action={logoutAction}>
                    <button className="text-muted hover:text-foreground">Выйти</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="font-medium hover:text-accent">
                  Войти
                </Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">{children}</main>
        <footer className="py-6 text-center text-xs text-muted">IWISH · {new Date().getFullYear()}</footer>
      </body>
    </html>
  );
}
