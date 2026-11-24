import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';

import { AuthUser, CurrentUser, Roles } from '../common/auth-context.js';
import { zPage, zText, ZodPipe } from '../common/zod.js';
import { AdminService } from './admin.service.js';

const shopsQuery = zPage.extend({
  q: z.string().trim().max(80).optional(),
  filter: z.enum(['all', 'active', 'expired', 'blocked', 'unclaimed', 'ending']).default('all'),
});
const createShop = z
  .object({
    shopName: zText(80).pipe(z.string().min(2)),
    sellerName: zText(80).pipe(z.string().min(2)),
    sellerPhone: z.string().trim().min(6).max(32),
    planId: z.string().max(32).default('trial'),
    trialDays: z.number().int().min(0).max(365).default(30),
  })
  .strict();
const updateShop = z
  .object({
    status: z.enum(['active', 'blocked']).optional(),
    isVerified: z.boolean().optional(),
    planId: z.string().max(32).optional(),
    name: zText(80).pipe(z.string().min(2)).optional(),
  })
  .strict();
const payment = z
  .object({
    planId: z.string().max(32),
    amountTenge: z.number().int().min(0).max(100_000_000),
    months: z.number().int().min(1).max(24),
    method: z.enum(['cash', 'transfer', 'other']),
    note: zText(500).default(''),
  })
  .strict();
const usersQuery = zPage.extend({
  q: z.string().trim().max(80).optional(),
  role: z.enum(['buyer', 'seller', 'owner']).optional(),
});
const blockUser = z.object({ isBlocked: z.boolean() }).strict();
const reportsQuery = zPage.extend({ status: z.enum(['open', 'resolved', 'rejected']).optional() });
const resolveReport = z.object({ status: z.enum(['resolved', 'rejected']) }).strict();
const productsQuery = zPage.extend({
  q: z.string().trim().max(80).optional(),
  status: z.enum(['active', 'hidden', 'blocked']).optional(),
});
const productStatus = z.object({ status: z.enum(['blocked', 'active']) }).strict();
const category = z
  .object({
    nameRu: zText(60).pipe(z.string().min(1)),
    nameTk: zText(60).pipe(z.string().min(1)),
    icon: z.string().max(40).regex(/^[a-z_]+$/).default('category'),
    parentId: z.uuid().nullable().default(null),
    sort: z.number().int().min(0).max(10_000).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();
const banner = z
  .object({
    titleRu: zText(100).pipe(z.string().min(1)),
    titleTk: zText(100).pipe(z.string().min(1)),
    subtitleRu: zText(200).default(''),
    subtitleTk: zText(200).default(''),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0F4A23'),
    mediaId: z.uuid().nullable().default(null),
    shopId: z.uuid().nullable().default(null),
    sort: z.number().int().min(0).max(10_000).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();
const plan = z
  .object({
    nameRu: zText(60).optional(),
    nameTk: zText(60).optional(),
    priceTenge: z.number().int().min(0).max(100_000_000).optional(),
    productLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
    sort: z.number().int().min(0).max(100).optional(),
  })
  .strict();
const broadcast = z
  .object({
    title: zText(100).pipe(z.string().min(1)),
    body: zText(1000).default(''),
    audience: z.enum(['all', 'buyers', 'sellers']).default('all'),
  })
  .strict();

/** Owner (super-admin) panel. Only the "owner" role can call these. */
@Roles('owner')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('shops')
  shops(@Query(new ZodPipe(shopsQuery)) q: z.infer<typeof shopsQuery>) {
    return this.admin.listShops(q);
  }

  @Post('shops')
  createShop(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createShop)) body: z.infer<typeof createShop>) {
    return this.admin.createShop(user, body);
  }

  @Get('shops/:id')
  shop(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.admin.getShop(id);
  }

  @Patch('shops/:id')
  updateShop(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(updateShop)) body: z.infer<typeof updateShop>,
  ) {
    return this.admin.updateShop(user, id, body);
  }

  @Post('shops/:id/invite')
  invite(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.admin.regenerateInvite(user, id);
  }

  @Post('shops/:id/payments')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(payment)) body: z.infer<typeof payment>,
  ) {
    return this.admin.addPayment(user, id, body);
  }

  @Get('payments')
  payments() {
    return this.admin.payments();
  }

  @Get('users')
  users(@Query(new ZodPipe(usersQuery)) q: z.infer<typeof usersQuery>) {
    return this.admin.listUsers(q);
  }

  @Patch('users/:id')
  blockUser(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(blockUser)) body: z.infer<typeof blockUser>,
  ) {
    return this.admin.setUserBlocked(user, id, body.isBlocked);
  }

  @Get('reports')
  reports(@Query(new ZodPipe(reportsQuery)) q: z.infer<typeof reportsQuery>) {
    return this.admin.listReports(q.status, q.limit, q.offset);
  }

  @Patch('reports/:id')
  resolveReport(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(resolveReport)) body: z.infer<typeof resolveReport>,
  ) {
    return this.admin.resolveReport(user, id, body.status);
  }

  @Get('products')
  products(@Query(new ZodPipe(productsQuery)) q: z.infer<typeof productsQuery>) {
    return this.admin.listProducts(q);
  }

  @Patch('products/:id')
  productStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(productStatus)) body: z.infer<typeof productStatus>,
  ) {
    return this.admin.setProductStatus(user, id, body.status);
  }

  @Get('categories')
  categories() {
    return this.admin.allCategories();
  }

  @Post('categories')
  createCategory(@CurrentUser() user: AuthUser, @Body(new ZodPipe(category)) body: z.infer<typeof category>) {
    return this.admin.createCategory(user, body);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(category.partial())) body: Partial<z.infer<typeof category>>,
  ) {
    return this.admin.updateCategory(user, id, body);
  }

  @Get('banners')
  banners() {
    return this.admin.allBanners();
  }

  @Post('banners')
  createBanner(@CurrentUser() user: AuthUser, @Body(new ZodPipe(banner)) body: z.infer<typeof banner>) {
    return this.admin.createBanner(user, body);
  }

  @Patch('banners/:id')
  updateBanner(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(banner.partial())) body: Partial<z.infer<typeof banner>>,
  ) {
    return this.admin.updateBanner(user, id, body);
  }

  @HttpCode(204)
  @Delete('banners/:id')
  async deleteBanner(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.admin.deleteBanner(user, id);
  }

  @Get('plans')
  plans() {
    return this.admin.allPlans();
  }

  @Patch('plans/:id')
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(plan)) body: z.infer<typeof plan>,
  ) {
    return this.admin.updatePlan(user, id.slice(0, 32), body);
  }

  @Post('broadcasts')
  broadcast(@CurrentUser() user: AuthUser, @Body(new ZodPipe(broadcast)) body: z.infer<typeof broadcast>) {
    return this.admin.broadcast(user, body);
  }

  @Get('audit')
  audit(@Query(new ZodPipe(zPage)) page: z.infer<typeof zPage>) {
    return this.admin.auditLog(page.limit, page.offset);
  }
}
