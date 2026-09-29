import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { getViewerGuests } from "@/lib/guests";
import { listGuestReservations } from "@/lib/wishlists";
import { btnSecondary, card } from "@/components/ui";
import { cancelAction } from "../w/[slug]/actions";

export const metadata: Metadata = { title: "Мои брони" };

export default async function MyReservationsPage() {
  const user = await getCurrentUser();
  const guests = await getViewerGuests(user);
  const items = await listGuestReservations(
    getDb(),
    guests.map((g) => g.id),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Мои брони</h1>
      {!user && (
        <p className="text-sm text-muted">
          Здесь брони, сделанные в этом браузере.{" "}
          <Link href="/login?next=/my" className="underline">
            Войдите
          </Link>
          , чтобы видеть их на любом устройстве.
        </p>
      )}
      {items.length === 0 && <p className="text-muted">Вы пока ничего не бронировали.</p>}
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.giftId} className={card}>
            <div className="text-sm text-muted">
              <Link href={`/w/${r.wishlistSlug}`} className="underline">
                {r.wishlistTitle}
              </Link>
              {r.eventDate && ` · ${formatDate(r.eventDate)}`}
            </div>
            <div className="mt-1 font-medium">{r.giftTitle}</div>
            {r.price && <div className="text-sm text-muted">{formatPrice(r.price)}</div>}
            {r.deleted ? (
              <p className="mt-2 text-sm text-accent">Автор удалил этот подарок из списка.</p>
            ) : (
              r.linkId && (
                <a href={`/go/${r.linkId}`} target="_blank" rel="noopener nofollow" className="text-sm underline">
                  Посмотреть в магазине
                </a>
              )
            )}
            <form action={cancelAction} className="mt-3">
              <input type="hidden" name="giftId" value={r.giftId} />
              <input type="hidden" name="slug" value={r.wishlistSlug} />
              <button className={btnSecondary}>{r.deleted ? "Убрать из списка" : "Снять бронь"}</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
