import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { getViewerGuests } from "@/lib/guests";
import { getPublicWishlist } from "@/lib/wishlists";
import { btnGhost, btnSecondary, card } from "@/components/ui";
import { cancelAction } from "./actions";
import { ReserveButton } from "./reserve-button";

const load = cache(async (slug: string) => {
  const user = await getCurrentUser();
  const guests = await getViewerGuests(user);
  const data = await getPublicWishlist(
    getDb(),
    slug,
    guests.map((g) => g.id),
  );
  return { user, guests, data };
});

export async function generateMetadata({ params }: PageProps<"/w/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await load(slug);
  if (!data) return { title: "Вишлист не найден" };
  const { wishlist } = data;
  const description =
    [wishlist.occasion, formatDate(wishlist.eventDate)].filter(Boolean).join(" · ") ||
    "Выберите подарок и забронируйте его, чтобы не подарить одно и то же.";
  return {
    title: wishlist.title,
    description,
    openGraph: { title: `Вишлист: ${wishlist.title}`, description, type: "website" },
    robots: { index: false },
  };
}

export default async function PublicWishlistPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const { user, guests, data } = await load(slug);
  if (!data) notFound();
  const { wishlist, gifts } = data;
  const isOwner = user?.id === wishlist.ownerId;
  const knownGuest = guests.length > 0;
  const free = gifts.filter((g) => g.status === "free").length;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm text-muted">{[wishlist.occasion, formatDate(wishlist.eventDate)].filter(Boolean).join(" · ")}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{wishlist.title}</h1>
        {wishlist.about && <p className="whitespace-pre-line text-muted">{wishlist.about}</p>}
      </section>

      {isOwner && (
        <div className={`${card} text-sm`}>
          Это ваш вишлист. Вы видите только, какие подарки заняты.{" "}
          <Link href={`/dashboard/${wishlist.id}`} className="underline">
            Редактировать
          </Link>
        </div>
      )}

      <p className="text-sm text-muted">
        Свободно {free} из {gifts.length}
      </p>

      <ul className="space-y-3">
        {gifts.map((g) => (
          <li key={g.id} className={`${card} ${g.status === "taken" ? "opacity-60" : ""}`}>
            <div className="flex gap-3">
              {g.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium break-words">{g.title}</div>
                  {g.status !== "free" && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${g.status === "mine" ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"}`}
                    >
                      {g.status === "mine" ? "Вы дарите" : "Занят"}
                    </span>
                  )}
                </div>
                {(g.price || g.note) && (
                  <div className="text-sm text-muted">{[formatPrice(g.price), g.note].filter(Boolean).join(" · ")}</div>
                )}
                {g.linkId && (
                  <a href={`/go/${g.linkId}`} target="_blank" rel="noopener nofollow" className="text-sm underline">
                    Посмотреть в магазине
                  </a>
                )}
              </div>
            </div>
            {!isOwner && g.status === "free" && (
              <div className="mt-3">
                <ReserveButton giftId={g.id} slug={slug} knownGuest={knownGuest} />
              </div>
            )}
            {g.status === "mine" && (
              <form action={cancelAction} className="mt-3">
                <input type="hidden" name="giftId" value={g.id} />
                <input type="hidden" name="slug" value={slug} />
                <button className={btnSecondary}>Снять бронь</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {gifts.length === 0 && <p className="text-muted">Автор ещё не добавил подарки.</p>}

      {!isOwner && knownGuest && !user && (
        <div className={`${card} text-sm`}>
          Мы запомнили ваши брони в этом браузере.{" "}
          <Link href={`/login?next=/w/${slug}`} className="underline">
            Войдите
          </Link>
          , чтобы видеть их и на других устройствах.
        </div>
      )}

      <div className="pt-4 text-center">
        <Link href="/dashboard" className={btnGhost}>
          Создать свой вишлист
        </Link>
      </div>
    </div>
  );
}
