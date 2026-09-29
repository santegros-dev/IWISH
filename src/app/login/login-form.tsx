"use client";

import { useActionState } from "react";
import { btnGhost, btnPrimary, input, label } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "email" });

  if (state.step === "email") {
    return (
      <form action={action} className="space-y-3">
        <input type="hidden" name="intent" value="request" />
        <div>
          <label htmlFor="email" className={label}>
            Электронная почта
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.email} className={input} />
        </div>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <button className={`${btnPrimary} w-full`} disabled={pending}>
          {pending ? "Отправляем…" : "Получить код"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={next} />
        {state.info && <p className="text-sm text-muted">{state.info}</p>}
        <div>
          <label htmlFor="code" className={label}>
            Код из письма
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            className={`${input} tracking-[0.4em]`}
          />
        </div>
        {state.error && <p className="text-sm text-accent">{state.error}</p>}
        <button className={`${btnPrimary} w-full`} disabled={pending}>
          {pending ? "Проверяем…" : "Войти"}
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="intent" value="request" />
        <input type="hidden" name="email" value={state.email} />
        <button className={`${btnGhost} w-full`} disabled={pending}>
          Отправить код ещё раз
        </button>
      </form>
    </div>
  );
}
