import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';

import { AuthUser, CurrentUser, Roles } from '../common/auth-context.js';
import { zPage, zText, ZodPipe } from '../common/zod.js';
import { SellerService } from './seller.service.js';

const variant = z
  .object({
    kind: z.enum(['color', 'size']),
    value: zText(40).pipe(z.string().min(1)),
    priceDeltaTenge: z.number().int().min(-10_000_000).max(10_000_000).default(0),
  })
  .strict();

const productBase = z
  .object({
    title: zText(120).pipe(z.string().min(2)),
    description: zText(4000).default(''),
    priceTenge: z.number().int().min(0).max(1_000_000_000),
    stock: z.number().int().min(0).max(1_000_000),
    categoryId: z.uuid().nullable().default(null),
    status: z.enum(['active', 'hidden']).default('active'),
    mediaIds: z.array(z.uuid()).max(10).default([]),
    variants: z.array(variant).max(40).default([]),
  })
  .strict();

const productCreate = productBase;
const productUpdate = z
  .object({
    title: zText(120).pipe(z.string().min(2)).optional(),
    description: zText(4000).optional(),
    priceTenge: z.number().int().min(0).max(1_000_000_000).optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    categoryId: z.uuid().nullable().optional(),
    status: z.enum(['active', 'hidden']).optional(),
    mediaIds: z.array(z.uuid()).max(10).optional(),
    variants: z.array(variant).max(40).optional(),
  })
  .strict();

const shopUpdate = z
  .object({
    name: zText(80).pipe(z.string().min(2)).optional(),
    description: zText(2000).optional(),
    address: zText(200).optional(),
    phone: zText(32).optional(),
    workingHours: zText(80).optional(),
    logoMediaId: z.uuid().nullable().optional(),
    legalName: zText(200).optional(),
    returnPolicy: zText(2000).optional(),
  })
  .strict();

const listQuery = zPage.extend({ q: z.string().trim().max(80).optional() });

@Roles('seller')
@Controller('seller')
export class SellerController {
  constructor(private readonly seller: SellerService) {}

  @Get('shop')
  shop(@CurrentUser() user: AuthUser) {
    return this.seller.getShop(user);
  }

  @Patch('shop')
  updateShop(@CurrentUser() user: AuthUser, @Body(new ZodPipe(shopUpdate)) body: z.infer<typeof shopUpdate>) {
    return this.seller.updateShop(user, body);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.seller.dashboard(user);
  }

  @Get('products')
  products(@CurrentUser() user: AuthUser, @Query(new ZodPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.seller.listProducts(user, query);
  }

  @Get('products/:id')
  product(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.seller.getProduct(user, id);
  }

  @Post('products')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(productCreate)) body: z.infer<typeof productCreate>) {
    return this.seller.createProduct(user, body);
  }

  @Patch('products/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(productUpdate)) body: z.infer<typeof productUpdate>,
  ) {
    return this.seller.updateProduct(user, id, body);
  }

  @HttpCode(204)
  @Delete('products/:id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.seller.deleteProduct(user, id);
  }
}
