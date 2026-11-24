import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { AuthUser, CurrentUser, Roles } from '../common/auth-context.js';
import { zPage, zText, ZodPipe } from '../common/zod.js';
import { OrdersService } from './orders.service.js';

const createSchema = z
  .object({
    shopId: z.uuid(),
    items: z
      .array(
        z
          .object({
            productId: z.uuid(),
            variantIds: z.array(z.uuid()).max(4).default([]),
            qty: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    contactPhone: z.string().trim().min(6).max(32),
    address: zText(300).default(''),
    comment: zText(1000).default(''),
  })
  .strict();
const statusSchema = z
  .object({ status: z.enum(['confirmed', 'shipping', 'delivered', 'cancelled']) })
  .strict();
const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), text: zText(1000).default('') }).strict();
const sellerListQuery = zPage.extend({
  status: z.enum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']).optional(),
});

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('orders')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.orders.create(user, body);
  }

  @Get('orders')
  list(@CurrentUser() user: AuthUser, @Query(new ZodPipe(zPage)) page: z.infer<typeof zPage>) {
    return this.orders.listForBuyer(user, page.limit, page.offset);
  }

  @Get('orders/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.orders.get(user, id);
  }

  @HttpCode(200)
  @Post('orders/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.orders.cancelByBuyer(user, id);
  }

  @Post('orders/:id/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(reviewSchema)) body: z.infer<typeof reviewSchema>,
  ) {
    return this.orders.review(user, id, body);
  }

  @Roles('seller')
  @Get('seller/orders')
  sellerList(@CurrentUser() user: AuthUser, @Query(new ZodPipe(sellerListQuery)) q: z.infer<typeof sellerListQuery>) {
    return this.orders.listForSeller(user, q.status, q.limit, q.offset);
  }

  @Roles('seller')
  @Patch('seller/orders/:id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(statusSchema)) body: z.infer<typeof statusSchema>,
  ) {
    return this.orders.setStatusBySeller(user, id, body.status);
  }
}
