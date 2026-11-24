import { mediaUrl } from '../media/signing.js';
import { products, shops } from '../db/schema.js';

type ShopRow = typeof shops.$inferSelect;
type ProductRow = typeof products.$inferSelect;

export function shopSummary(s: Pick<ShopRow, 'id' | 'name' | 'isVerified' | 'logoMediaId'>) {
  return { id: s.id, name: s.name, isVerified: s.isVerified, logoUrl: mediaUrl(s.logoMediaId) };
}

export function shopDto(s: ShopRow, productsCount: number) {
  return {
    ...shopSummary(s),
    description: s.description,
    address: s.address,
    phone: s.phone,
    workingHours: s.workingHours,
    returnPolicy: s.returnPolicy,
    rating: Number(s.ratingAvg),
    reviewsCount: s.reviewsCount,
    productsCount,
    createdAt: s.createdAt,
  };
}

export function productCardDto(
  p: ProductRow,
  shop: Pick<ShopRow, 'id' | 'name' | 'isVerified' | 'logoMediaId'>,
  firstMediaId: string | null,
  isFavorite: boolean,
) {
  return {
    id: p.id,
    title: p.title,
    priceTenge: p.priceTenge,
    stock: p.stock,
    categoryId: p.categoryId,
    status: p.status,
    createdAt: p.createdAt,
    imageUrl: mediaUrl(firstMediaId),
    shop: shopSummary(shop),
    isFavorite,
  };
}
