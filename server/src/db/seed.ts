import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import sharp from 'sharp';

import { hashPassword } from '../auth/auth.service.js';
import { getEnv } from '../config/env.js';
import { LocalMediaStorage } from '../media/storage.js';
import * as schema from './schema.js';

const { categories, plans, users, shops, products, productMedia, productVariants, media, banners } = schema;

/** Starting prices from CLAUDE.md §9 — the owner can change them in the admin panel. */
export const DEFAULT_PLANS = [
  { id: 'trial', nameRu: 'Пробный', nameTk: 'Synag', priceTenge: 0, productLimit: 50, sort: 0 },
  { id: 'start', nameRu: 'Старт', nameTk: 'Start', priceTenge: 10_000, productLimit: 50, sort: 1 },
  { id: 'business', nameRu: 'Бизнес', nameTk: 'Biznes', priceTenge: 20_000, productLimit: 300, sort: 2 },
  { id: 'pro', nameRu: 'Про', nameTk: 'Pro', priceTenge: 35_000, productLimit: null, sort: 3 },
];

export const DEFAULT_CATEGORIES = [
  { nameRu: 'Одежда', nameTk: 'Eşikler', icon: 'checkroom' },
  { nameRu: 'Обувь', nameTk: 'Aýakgaplar', icon: 'shoes' },
  { nameRu: 'Электроника', nameTk: 'Elektronika', icon: 'headphones' },
  { nameRu: 'Телефоны', nameTk: 'Telefonlar', icon: 'smartphone' },
  { nameRu: 'Дом и кухня', nameTk: 'Öý we aşhana', icon: 'kitchen' },
  { nameRu: 'Детям', nameTk: 'Çagalar üçin', icon: 'toys' },
  { nameRu: 'Красота', nameTk: 'Gözellik', icon: 'spa' },
  { nameRu: 'Авто', nameTk: 'Awtoulag', icon: 'car' },
];

type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Plans + categories. Safe to run many times (production too). */
export async function seedBase(db: Db): Promise<void> {
  await db.insert(plans).values(DEFAULT_PLANS).onConflictDoNothing();
  const [{ n }] = await db.select({ n: count() }).from(categories);
  if (Number(n) === 0) {
    await db.insert(categories).values(DEFAULT_CATEGORIES.map((c, sort) => ({ ...c, sort })));
  }
}

async function demoImage(db: Db, storage: LocalMediaStorage, ownerId: string, hue: number, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},70%,30%)"/>
    </linearGradient></defs>
    <rect width="800" height="800" fill="url(#g)"/>
    <circle cx="400" cy="360" r="190" fill="rgba(255,255,255,0.18)"/>
    <rect x="250" y="560" width="300" height="40" rx="20" fill="rgba(255,255,255,0.35)"/>
    <text x="400" y="420" font-size="170" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">${label}</text>
  </svg>`;
  const data = await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
  const [row] = await db
    .insert(media)
    .values({ ownerId, kind: 'image', mime: 'image/webp', sizeBytes: data.length, storageKey: 'pending', width: 800, height: 800 })
    .returning();
  const key = `demo/${row.id}.webp`;
  await storage.put(key, data);
  await db.update(media).set({ storageKey: key }).where(eq(media.id, row.id));
  return row.id;
}

/** Demo shops and products for testing. NEVER run on the real server. */
export async function seedDemo(db: Db, password: string): Promise<void> {
  const storage = new LocalMediaStorage();
  const cats = await db.select().from(categories);
  const cat = (icon: string) => cats.find((c) => c.icon === icon)?.id ?? null;
  const passwordHash = await hashPassword(password);
  const month = new Date(Date.now() + 30 * 86_400_000);

  const demoShops = [
    {
      phone: '+99361000001', seller: 'Merdan Ataýew', name: 'Altyn Moda', hue: 345, verified: true,
      description: 'Женская и мужская одежда из Гуанчжоу. Новые поставки каждую неделю.',
      address: 'Aşgabat, Altyn Asyr bazary, 3-nji hatar', hours: '08:00–18:00',
      items: [
        { t: 'Куртка зимняя с капюшоном', p: 89000, s: 14, c: 'checkroom', v: [['color', 'Чёрный'], ['color', 'Бежевый'], ['size', 'M'], ['size', 'L'], ['size', 'XL']] },
        { t: 'Кроссовки беговые', p: 45000, s: 20, c: 'shoes', v: [['size', '41'], ['size', '42'], ['size', '43']] },
        { t: 'Платье летнее', p: 32000, s: 6, c: 'checkroom', v: [] },
      ],
    },
    {
      phone: '+99361000002', seller: 'Aýna Orazowa', name: 'Tehno Dünýä', hue: 215, verified: true,
      description: 'Наушники, смарт-часы, повербанки и аксессуары. Гарантия 1 месяц.',
      address: 'Aşgabat, Görogly köçesi 45', hours: '09:00–20:00',
      items: [
        { t: 'Беспроводные наушники Pro', p: 28000, s: 32, c: 'headphones', v: [['color', 'Белый'], ['color', 'Чёрный']] },
        { t: 'Смарт-часы с пульсометром', p: 52000, s: 9, c: 'headphones', v: [] },
        { t: 'Повербанк 20000 мАч', p: 19000, s: 0, c: 'smartphone', v: [] },
      ],
    },
    {
      phone: '+99361000003', seller: 'Gülnar Annaýewa', name: 'Öý Bezegi', hue: 35, verified: false,
      description: 'Посуда, текстиль и всё для дома. Доставка по Ашхабаду.',
      address: 'Aşgabat, 15-nji mkr.', hours: '09:00–19:00',
      items: [
        { t: 'Набор кастрюль, 6 предметов', p: 76000, s: 5, c: 'kitchen', v: [] },
        { t: 'Электрочайник стеклянный 1.8 л', p: 23000, s: 7, c: 'kitchen', v: [] },
        { t: 'Çagalar üçin samokat', p: 41000, s: 11, c: 'toys', v: [['color', 'Gök'], ['color', 'Gyzyl']] },
      ],
    },
  ];

  for (const d of demoShops) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, d.phone));
    if (existing) continue;
    const [seller] = await db
      .insert(users)
      .values({ name: d.seller, phone: d.phone, passwordHash, role: 'seller' })
      .returning();
    const logo = await demoImage(db, storage, seller.id, d.hue, d.name.slice(0, 1));
    const [shop] = await db
      .insert(shops)
      .values({
        ownerUserId: seller.id,
        name: d.name,
        description: d.description,
        address: d.address,
        workingHours: d.hours,
        phone: d.phone,
        isVerified: d.verified,
        logoMediaId: logo,
        subscriptionUntil: month,
        ratingAvg: 4.5 + Math.round(Math.random() * 4) / 10,
        reviewsCount: 10 + Math.floor(Math.random() * 100),
      })
      .returning();
    let i = 0;
    for (const item of d.items) {
      const [product] = await db
        .insert(products)
        .values({
          shopId: shop.id,
          categoryId: cat(item.c),
          title: item.t,
          description: `${item.t}. Качество проверено продавцом. Доставка по городу.`,
          priceTenge: item.p,
          stock: item.s,
          createdAt: new Date(Date.now() - i * 5 * 3_600_000),
        })
        .returning();
      const img = await demoImage(db, storage, seller.id, (d.hue + i * 37) % 360, item.t.slice(0, 1));
      await db.insert(productMedia).values({ productId: product.id, mediaId: img, sort: 0 });
      if (item.v.length) {
        await db
          .insert(productVariants)
          .values(item.v.map(([kind, value]) => ({ productId: product.id, kind: kind as 'color' | 'size', value })));
      }
      i++;
    }
  }

  const [{ n }] = await db.select({ n: count() }).from(banners);
  if (Number(n) === 0) {
    await db.insert(banners).values([
      {
        titleRu: 'Добро пожаловать в Kerwen Market',
        titleTk: 'Kerwen Market-e hoş geldiňiz',
        subtitleRu: 'Товары из Китая от проверенных торговцев',
        subtitleTk: 'Barlanan satyjylardan Hytaý harytlary',
        color: '#0F4A23',
        sort: 0,
      },
      {
        titleRu: 'Откройте свой магазин',
        titleTk: 'Öz dükanyňyzy açyň',
        subtitleRu: 'Свяжитесь с нами — поможем начать',
        subtitleTk: 'Bize ýüz tutuň — başlamaga kömek ederis',
        color: '#1E3A8A',
        sort: 1,
      },
    ]);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const pool = new pg.Pool({ connectionString: getEnv().DATABASE_URL, max: 2 });
    const db = drizzle(pool, { schema });
    await seedBase(db);
    console.warn('Base data ready (plans, categories)');
    if (process.argv.includes('--demo')) {
      if (getEnv().NODE_ENV === 'production') throw new Error('Demo data is not allowed in production');
      const password = process.env.DEMO_PASSWORD || randomBytes(6).toString('base64url');
      await seedDemo(db, password);
      console.warn(`Demo sellers: +99361000001..3, password: ${password}`);
    }
    await pool.end();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
