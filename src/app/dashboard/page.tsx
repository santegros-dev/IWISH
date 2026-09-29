import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate, plural } from "@/lib/format";
import { listOwnerWishlists } from "@/lib/wishlists";
import { card } from "@/components/ui";
import { WishlistForm } from "./forms";

export const metadata: Metadata = { title: "Мои вишлисты" };

export default async function DashboardPage() {
  const user = await requireUser();
  const lists = await listOwnerWishlists(getDb(), user.id);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Мои вишлисты</h1>
        {lists.length === 0 && <p className="text-muted">Пока ни одного списка. Создайте первый ниже.</p>}
        <ul className="space-y-3">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`/dashboard/${l.id}`} className={`${card} block hover:border-accent`}>
                <div className="font-semibold">{l.title}</div>
                <div className="mt-1 text-sm text-muted">
                  {[l.occasion, formatDate(l.eventDate)].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-2 text-sm">
                  {l.giftCount} {plural(l.giftCount, "подарок", "подарка", "подарков")}, занято {l.reservedCount}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={card}>
        <h2 className="mb-3 text-lg font-semibold">Новый вишлист</h2>
        <WishlistForm />
      </section>
    </div>
  );
}
