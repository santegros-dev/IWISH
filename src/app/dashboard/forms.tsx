"use client";

import { useActionState, useState, useTransition } from "react";
import { btnPrimary, btnSecondary, input, label } from "@/components/ui";
import {
  addGiftAction,
  createWishlistAction,
  previewAction,
  updateGiftAction,
  updateWishlistAction,
  type FormState,
} from "./actions";

type WishlistValues = { id?: string; title: string; occasion: string; eventDate: string | null; about: string };

export function WishlistForm({ values }: { values?: WishlistValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    values?.id ? updateWishlistAction : createWishlistAction,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      {values?.id && <input type="hidden" name="id" value={values.id} />}
      <div>
        <label className={label} htmlFor="title">
          Название
        </label>
        <input id="title" name="title" required maxLength={120} defaultValue={values?.title} placeholder="Мой день рождения" className={input} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="occasion">
            Повод
          </label>
          <input id="occasion" name="occasion" maxLength={80} defaultValue={values?.occasion} placeholder="День рождения" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="eventDate">
            Дата
          </label>
          <input id="eventDate" name="eventDate" type="date" defaultValue={values?.eventDate ?? ""} className={input} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="about">
          О себе и своих увлечениях
        </label>
        <textarea
          id="about"
          name="about"
          rows={3}
          maxLength={2000}
          defaultValue={values?.about}
          placeholder="Люблю рыбалку, настольные игры и хороший кофе"
          className={input}
        />
        <p className="mt-1 text-xs text-muted">Гости увидят это описание. Позже по нему ИИ будет подсказывать идеи подарков.</p>
      </div>
      {state.error && <p className="text-sm text-accent">{state.error}</p>}
      {state.ok && <p className="text-sm text-ok">Сохранено</p>}
      <button className={btnPrimary} disabled={pending}>
        {values?.id ? "Сохранить" : "Создать вишлист"}
      </button>
    </form>
  );
}

export function AddGiftForm({ wishlistId }: { wishlistId: string }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, startPreview] = useTransition();
  // После успешного добавления React сам очищает поля формы, а мы — управляемые поля.
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const res = await addGiftAction(prev, formData);
    if (res.ok) {
      setTitle("");
      setPrice("");
      setImageUrl("");
    }
    return res;
  }, {});

  function loadPreview(url: string) {
    if (!url.trim()) return;
    startPreview(async () => {
      const p = await previewAction(url);
      if (p.title) setTitle((t) => t || p.title!);
      if (p.price) setPrice((v) => v || p.price!);
      if (p.imageUrl) setImageUrl(p.imageUrl);
    });
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="wishlistId" value={wishlistId} />
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <div>
        <label className={label} htmlFor="url">
          Ссылка на товар
        </label>
        <input
          id="url"
          name="url"
          inputMode="url"
          placeholder="https://www.ozon.ru/product/…"
          className={input}
          onBlur={(e) => loadPreview(e.target.value)}
          onPaste={(e) => loadPreview(e.clipboardData.getData("text"))}
        />
        <p className="mt-1 text-xs text-muted">
          {loading ? "Загружаем описание товара…" : "Необязательно. Можно добавить подарок и без ссылки."}
        </p>
      </div>
      <div className="flex gap-3">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover" />
        )}
        <div className="flex-1 space-y-3">
          <div>
            <label className={label} htmlFor="gift-title">
              Название
            </label>
            <input id="gift-title" name="title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <div>
              <label className={label} htmlFor="price">
                Цена
              </label>
              <input id="price" name="price" maxLength={40} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2 500 ₽" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="note">
                Комментарий
              </label>
              <input id="note" name="note" maxLength={1000} placeholder="Размер M, синий цвет" className={input} />
            </div>
          </div>
        </div>
      </div>
      {state.error && <p className="text-sm text-accent">{state.error}</p>}
      <button className={btnPrimary} disabled={pending}>
        {pending ? "Добавляем…" : "Добавить подарок"}
      </button>
    </form>
  );
}

export function EditGiftForm({ gift }: { gift: { id: string; title: string; note: string; price: string | null } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateGiftAction, {});
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="giftId" value={gift.id} />
      <input name="title" required maxLength={200} defaultValue={gift.title} className={input} aria-label="Название" />
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
        <input name="price" maxLength={40} defaultValue={gift.price ?? ""} placeholder="Цена" className={input} aria-label="Цена" />
        <input name="note" maxLength={1000} defaultValue={gift.note} placeholder="Комментарий" className={input} aria-label="Комментарий" />
      </div>
      {state.error && <p className="text-sm text-accent">{state.error}</p>}
      {state.ok && <p className="text-sm text-ok">Сохранено</p>}
      <button className={btnSecondary} disabled={pending}>
        Сохранить
      </button>
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={url} className={`${input} text-sm`} onFocus={(e) => e.target.select()} aria-label="Ссылка на вишлист" />
      <button
        type="button"
        className={btnPrimary}
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ url });
              return;
            } catch {}
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Скопировано" : "Поделиться"}
      </button>
    </div>
  );
}
