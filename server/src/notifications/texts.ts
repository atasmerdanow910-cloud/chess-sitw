/** Notification texts on the server, in the user's language. */
type Locale = 'ru' | 'tk';

const TEXTS = {
  'order.new': {
    ru: (p: Record<string, string>) => [`Новый заказ №${p.number}`, `Сумма: ${p.total}`],
    tk: (p: Record<string, string>) => [`Täze sargyt №${p.number}`, `Jemi: ${p.total}`],
  },
  'order.status': {
    ru: (p: Record<string, string>) => [`Заказ №${p.number}`, STATUS.ru[p.status] ?? p.status],
    tk: (p: Record<string, string>) => [`Sargyt №${p.number}`, STATUS.tk[p.status] ?? p.status],
  },
  'subscription.ends_soon': {
    ru: (p: Record<string, string>) => ['Подписка скоро закончится', `Оплачено до ${p.date}. Свяжитесь с администрацией.`],
    tk: (p: Record<string, string>) => ['Abunanyň möhleti gutarýar', `${p.date} çenli tölenen. Administrasiýa ýüz tutuň.`],
  },
  'subscription.extended': {
    ru: (p: Record<string, string>) => ['Подписка продлена', `Оплачено до ${p.date}`],
    tk: (p: Record<string, string>) => ['Abuna uzaldyldy', `${p.date} çenli tölenen`],
  },
  'product.blocked': {
    ru: (p: Record<string, string>) => ['Товар скрыт модератором', p.title],
    tk: (p: Record<string, string>) => ['Haryt moderator tarapyndan gizlendi', p.title],
  },
  'shop.blocked': {
    ru: () => ['Магазин заблокирован', 'Свяжитесь с администрацией'],
    tk: () => ['Dükan bloklandy', 'Administrasiýa ýüz tutuň'],
  },
  'shop.unblocked': {
    ru: () => ['Магазин снова активен', ''],
    tk: () => ['Dükan ýene işjeň', ''],
  },
} as const;

const STATUS: Record<Locale, Record<string, string>> = {
  ru: {
    pending: 'Новый',
    confirmed: 'Подтверждён продавцом',
    shipping: 'В пути',
    delivered: 'Выдан',
    cancelled: 'Отменён',
  },
  tk: {
    pending: 'Täze',
    confirmed: 'Satyjy tassyklady',
    shipping: 'Ýolda',
    delivered: 'Gowşuryldy',
    cancelled: 'Ýatyryldy',
  },
};

export type TextKey = keyof typeof TEXTS;

export function notificationText(key: TextKey, locale: string, params: Record<string, string> = {}): [string, string] {
  const l: Locale = locale === 'tk' ? 'tk' : 'ru';
  const [title, body] = TEXTS[key][l](params);
  return [title, body];
}

export function formatTmt(tenge: number): string {
  const manat = Math.floor(tenge / 100);
  const rest = tenge % 100;
  const grouped = String(manat).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped}${rest ? ',' + String(rest).padStart(2, '0') : ''} TMT`;
}

export function formatDate(d: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getUTCDate())}.${two(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}
