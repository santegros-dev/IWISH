"use client";

import { useActionState, useState } from "react";
import { btnPrimary, btnSecondary, input } from "@/components/ui";
import { reserveAction, type ReserveState } from "./actions";

export function ReserveButton({ giftId, slug, knownGuest }: { giftId: string; slug: string; knownGuest: boolean }) {
  const [state, action, pending] = useActionState<ReserveState, FormData>(reserveAction, {});
  const [askName, setAskName] = useState(false);
  const showName = (askName && !knownGuest) || state.needName;

  return (
    <form
      action={action}
      className="space-y-2"
      onSubmit={(e) => {
        if (!knownGuest && !askName) {
          e.preventDefault();
          setAskName(true);
        }
      }}
    >
      <input type="hidden" name="giftId" value={giftId} />
      <input type="hidden" name="slug" value={slug} />
      {showName && (
        <div className="space-y-1">
          <input name="name" required maxLength={60} autoFocus placeholder="Как вас зовут?" className={input} aria-label="Ваше имя" />
          <p className="text-xs text-muted">Имя видите только вы. Автор и другие гости увидят лишь, что подарок занят.</p>
        </div>
      )}
      {state.error && <p className="text-sm text-accent">{state.error}</p>}
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={pending}>
          {pending ? "Бронируем…" : "Забронировать"}
        </button>
        {showName && (
          <button type="button" className={btnSecondary} onClick={() => setAskName(false)}>
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
