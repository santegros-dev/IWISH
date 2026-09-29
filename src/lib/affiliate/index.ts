// Конвертер партнёрских ссылок. Для каждой площадки свой конвертер:
// получает обычную ссылку на товар и возвращает партнёрскую или null.
// Пока партнёрки не подключены (нет самозанятости), список пуст
// и все ссылки ведут на исходный адрес.

export interface AffiliateConverter {
  name: string;
  matches(url: URL): boolean;
  convert(url: URL): Promise<string | null>;
}

const converters: AffiliateConverter[] = [];

export async function toAffiliateUrl(url: URL): Promise<string | null> {
  const converter = converters.find((c) => c.matches(url));
  return converter ? converter.convert(url) : null;
}
