export function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function formatPrice(value: string | null): string | null {
  if (!value) return null;
  return /^[\d\s.,]+$/.test(value) ? `${value} ₽` : value;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
