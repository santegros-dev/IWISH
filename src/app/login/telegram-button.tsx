"use client";

import { useEffect, useRef } from "react";

// Официальная кнопка Telegram Login Widget. После входа Telegram
// перенаправит на authUrl с подписанными данными пользователя.
export function TelegramButton({ botName, authUrl }: { botName: string; authUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, [botName, authUrl]);
  return <div ref={ref} className="flex justify-center" />;
}
