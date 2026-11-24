import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { z } from 'zod';

import { AuthUser, CurrentUser, Public } from '../common/auth-context.js';
import { zPage, ZodPipe } from '../common/zod.js';
import { CatalogService } from './catalog.service.js';

const productQuery = zPage.extend({
  q: z.string().trim().max(80).optional(),
  categoryId: z.uuid().optional(),
  shopId: z.uuid().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['new', 'price_asc', 'price_desc', 'popular']).default('new'),
});
const shopQuery = zPage.extend({
  q: z.string().trim().max(80).optional(),
  categoryId: z.uuid().optional(),
});

/** Public catalog. Works without login; favorites are marked when logged in. */
@Public()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('home')
  home(@CurrentUser() user?: AuthUser) {
    return this.catalog.home(user?.id ?? null);
  }

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('banners')
  banners() {
    return this.catalog.banners();
  }

  @Get('shops')
  shops(@Query(new ZodPipe(shopQuery)) query: z.infer<typeof shopQuery>) {
    return this.catalog.shops(query);
  }

  @Get('shops/:id')
  shop(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalog.shop(id);
  }

  @Get('shops/:id/reviews')
  reviews(@Param('id', new ParseUUIDPipe()) id: string, @Query(new ZodPipe(zPage)) page: z.infer<typeof zPage>) {
    return this.catalog.shopReviews(id, page.limit, page.offset);
  }

  @Get('products')
  products(@Query(new ZodPipe(productQuery)) query: z.infer<typeof productQuery>, @CurrentUser() user?: AuthUser) {
    return this.catalog.products(query, user?.id ?? null);
  }

  @Get('products/:id')
  product(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user?: AuthUser) {
    return this.catalog.product(id, user?.id ?? null);
  }
}
