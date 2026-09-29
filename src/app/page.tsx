import Link from "next/link";
import { btnPrimary, card } from "@/components/ui";

const steps = [
  ["Составьте список", "Вставьте ссылки на подарки с Ozon, Wildberries, AliExpress или любого магазина."],
  ["Поделитесь ссылкой", "Отправьте ссылку на вишлист друзьям и родным в любом мессенджере."],
  ["Гости бронируют", "Каждый подарок можно забронировать только один раз. Вы видите только, что подарок занят, а кто его выбрал, останется сюрпризом."],
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 pt-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Подарки, которые действительно хочется получить</h1>
        <p className="mx-auto max-w-xl text-muted">
          Соберите вишлист к празднику, отправьте ссылку гостям, и никто не подарит одно и то же.
        </p>
        <Link href="/dashboard" className={btnPrimary}>
          Создать вишлист
        </Link>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {steps.map(([title, text], i) => (
          <div key={title} className={card}>
            <div className="mb-2 text-sm font-semibold text-accent">{i + 1}</div>
            <h2 className="mb-1 font-semibold">{title}</h2>
            <p className="text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
