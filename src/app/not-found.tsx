import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-10 text-center">
      <h1 className="text-2xl font-bold">Страница не найдена</h1>
      <p className="text-muted">Возможно, ссылка устарела или вишлист удалён.</p>
      <Link href="/" className="underline">
        На главную
      </Link>
    </div>
  );
}
