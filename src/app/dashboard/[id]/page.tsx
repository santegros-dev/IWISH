import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { getOwnerWishlist } from "@/lib/wishlists";
import { btnGhost, card } from "@/components/ui";
import { deleteGiftAction, deleteWishlistAction } from "../actions";
import { AddGiftForm, CopyLink, EditGiftForm, WishlistForm } from "../forms";

export const metadata: Metadata = { title: "Редактирование вишлиста" };

export default async function EditWishlistPage({ params }: PageProps<"/dashboard/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getOwnerWishlist(getDb(), user.id, id);
  if (!data) notFound();
  const { wishlist, gifts } = data;
  const shareUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/w/${wishlist.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← Мои вишлисты
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{wishlist.title}</h1>
        <p className="text-sm text-muted">{[wishlist.occasion, formatDate(wishlist.eventDate)].filter(Boolean).join(" · ")}</p>
      </div>

      <section className={`${card} space-y-2`}>
        <h2 className="font-semibold">Ссылка для гостей</h2>
        <CopyLink url={shareUrl} />
        <p className="text-xs text-muted">
          Гости бронируют подарки по этой ссылке. Вы увидите, что подарок занят, но не узнаете кем.{" "}
          <Link href={`/w/${wishlist.slug}`} className="underline">
            Посмотреть как гость
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Подарки</h2>
        {gifts.length === 0 && <p className="text-muted">Добавьте первый подарок.</p>}
        <ul className="space-y-3">
          {gifts.map((g) => (
            <li key={g.id} className={card}>
              <div className="flex gap-3">
                {g.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium break-words">{g.title}</div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${g.reserved ? "bg-accent-soft text-accent" : "bg-ok-soft text-ok"}`}
                    >
                      {g.reserved ? "Занят" : "Свободен"}
                    </span>
                  </div>
                  <div className="text-sm text-muted">
                    {[formatPrice(g.price), g.note].filter(Boolean).join(" · ")}
                  </div>
                  {g.targetUrl && (
                    <a href={g.targetUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-muted underline">
                      {g.targetUrl}
                    </a>
                  )}
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-muted">Изменить</summary>
                <EditGiftForm gift={g} />
                <form action={deleteGiftAction} className="mt-2">
                  <input type="hidden" name="giftId" value={g.id} />
                  <button className={`${btnGhost} px-0 text-accent`}>
                    {g.reserved ? "Удалить (гость, который его выбрал, увидит это)" : "Удалить подарок"}
                  </button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-lg font-semibold">Добавить подарок</h2>
        <AddGiftForm wishlistId={wishlist.id} />
      </section>

      <details className={card}>
        <summary className="cursor-pointer font-semibold">Настройки списка</summary>
        <div className="mt-3 space-y-4">
          <WishlistForm values={wishlist} />
          <form action={deleteWishlistAction}>
            <input type="hidden" name="id" value={wishlist.id} />
            <button className={`${btnGhost} px-0 text-accent`}>Удалить вишлист целиком</button>
          </form>
        </div>
      </details>
    </div>
  );
}
