import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/auth/auth_controller.dart';
import '../core/providers.dart';
import '../core/realtime/realtime.dart';
import '../core/settings/settings_controller.dart';
import 'models.dart';

// ---------- Catalog (works without login) ----------

final homeProvider = FutureProvider<HomeData>((ref) async {
  ref.watch(currentUserProvider.select((u) => u?.id)); // reload favorites marks after login
  return ref.watch(catalogApiProvider).home();
});

final categoriesProvider = FutureProvider<List<Category>>((ref) => ref.watch(catalogApiProvider).categories());

typedef ShopsQuery = ({String? q, String? categoryId});

final shopsProvider = FutureProvider.autoDispose.family<List<Shop>, ShopsQuery>(
  (ref, q) => ref.watch(catalogApiProvider).shops(q: q.q, categoryId: q.categoryId),
);

final shopProvider = FutureProvider.autoDispose.family<Shop, String>((ref, id) => ref.watch(catalogApiProvider).shop(id));

final shopReviewsProvider =
    FutureProvider.autoDispose.family<List<Review>, String>((ref, id) => ref.watch(catalogApiProvider).reviews(id));

typedef ProductQuery = ({
  String? q,
  String? categoryId,
  String? shopId,
  int? minPrice,
  int? maxPrice,
  String sort,
});

final productsProvider = FutureProvider.autoDispose.family<List<ProductCardData>, ProductQuery>((ref, q) {
  ref.watch(currentUserProvider.select((u) => u?.id));
  return ref.watch(catalogApiProvider).products(
        q: q.q,
        categoryId: q.categoryId,
        shopId: q.shopId,
        minPrice: q.minPrice,
        maxPrice: q.maxPrice,
        sort: q.sort,
      );
});

final productProvider = FutureProvider.autoDispose.family<ProductDetails, String>((ref, id) {
  ref.watch(currentUserProvider.select((u) => u?.id));
  return ref.watch(catalogApiProvider).product(id);
});

// ---------- Favorites (optimistic) ----------

class FavoritesController extends AsyncNotifier<Set<String>> {
  @override
  Future<Set<String>> build() async {
    final user = ref.watch(currentUserProvider);
    if (user == null) return {};
    final list = await ref.read(meApiProvider).favorites();
    return list.map((p) => p.id).toSet();
  }

  bool isFavorite(String id) => state.value?.contains(id) ?? false;

  Future<void> toggle(String productId) async {
    final current = state.value ?? {};
    final adding = !current.contains(productId);
    state = AsyncData(adding ? {...current, productId} : ({...current}..remove(productId)));
    try {
      final api = ref.read(meApiProvider);
      adding ? await api.addFavorite(productId) : await api.removeFavorite(productId);
      ref.invalidate(favoriteProductsProvider);
    } catch (e) {
      state = AsyncData(current);
      rethrow;
    }
  }
}

final favoritesProvider = AsyncNotifierProvider<FavoritesController, Set<String>>(FavoritesController.new);

final favoriteProductsProvider = FutureProvider.autoDispose<List<ProductCardData>>((ref) {
  if (ref.watch(currentUserProvider) == null) return Future.value(const []);
  return ref.watch(meApiProvider).favorites();
});

// ---------- Cart (saved on the phone) ----------

class CartLine {
  CartLine({
    required this.productId,
    required this.shopId,
    required this.shopName,
    required this.title,
    required this.unitPriceTenge,
    required this.qty,
    required this.stock,
    this.imageUrl,
    this.variantIds = const [],
    this.variantLabel = '',
  });

  CartLine.fromJson(Map<String, dynamic> j)
      : productId = j['productId'] as String,
        shopId = j['shopId'] as String,
        shopName = j['shopName'] as String,
        title = j['title'] as String,
        unitPriceTenge = j['unitPriceTenge'] as int,
        qty = j['qty'] as int,
        stock = j['stock'] as int,
        imageUrl = j['imageUrl'] as String?,
        variantIds = (j['variantIds'] as List).cast<String>(),
        variantLabel = j['variantLabel'] as String? ?? '';

  final String productId;
  final String shopId;
  final String shopName;
  final String title;

  /// Price shown in the cart. The final price is always calculated by the server.
  final int unitPriceTenge;
  final int qty;
  final int stock;
  final String? imageUrl;
  final List<String> variantIds;
  final String variantLabel;

  String get key => '$productId|${variantIds.join(',')}';
  int get totalTenge => unitPriceTenge * qty;

  CartLine withQty(int q) => CartLine(
        productId: productId,
        shopId: shopId,
        shopName: shopName,
        title: title,
        unitPriceTenge: unitPriceTenge,
        qty: q,
        stock: stock,
        imageUrl: imageUrl,
        variantIds: variantIds,
        variantLabel: variantLabel,
      );

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'shopId': shopId,
        'shopName': shopName,
        'title': title,
        'unitPriceTenge': unitPriceTenge,
        'qty': qty,
        'stock': stock,
        'imageUrl': imageUrl,
        'variantIds': variantIds,
        'variantLabel': variantLabel,
      };
}

class CartController extends Notifier<List<CartLine>> {
  static const _key = 'cart.v1';

  @override
  List<CartLine> build() {
    final raw = ref.read(sharedPreferencesProvider).getString(_key);
    if (raw == null) return const [];
    try {
      return (jsonDecode(raw) as List).map((e) => CartLine.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } catch (_) {
      return const [];
    }
  }

  void _save() => ref.read(sharedPreferencesProvider).setString(_key, jsonEncode(state.map((l) => l.toJson()).toList()));

  void add(CartLine line) {
    final i = state.indexWhere((l) => l.key == line.key);
    if (i == -1) {
      state = [...state, line];
    } else {
      final merged = (state[i].qty + line.qty).clamp(1, line.stock > 0 ? line.stock : 99);
      state = [...state]..[i] = state[i].withQty(merged);
    }
    _save();
  }

  void setQty(String key, int qty) {
    state = qty <= 0 ? state.where((l) => l.key != key).toList() : [for (final l in state) l.key == key ? l.withQty(qty) : l];
    _save();
  }

  void clearShop(String shopId) {
    state = state.where((l) => l.shopId != shopId).toList();
    _save();
  }
}

final cartProvider = NotifierProvider<CartController, List<CartLine>>(CartController.new);
final cartCountProvider = Provider<int>((ref) => ref.watch(cartProvider).fold(0, (s, l) => s + l.qty));

/// Cart lines grouped by shop (an order is always for one shop).
Map<String, List<CartLine>> groupByShop(List<CartLine> lines) {
  final map = <String, List<CartLine>>{};
  for (final l in lines) {
    map.putIfAbsent(l.shopId, () => []).add(l);
  }
  return map;
}

// ---------- Orders ----------

final myOrdersProvider = FutureProvider.autoDispose<List<Order>>((ref) => ref.watch(ordersApiProvider).mine());
final orderProvider = FutureProvider.autoDispose.family<Order, String>((ref, id) => ref.watch(ordersApiProvider).get(id));

// ---------- Chats ----------

class ChatsController extends AsyncNotifier<List<ConversationItem>> {
  @override
  Future<List<ConversationItem>> build() async {
    final user = ref.watch(currentUserProvider);
    if (user == null) return const [];
    // New message anywhere -> refresh the list (cheap, one request).
    final sub = ref.read(realtimeProvider).events.listen((e) {
      if (e is ChatMessageEvent || e is ChatReadEvent || e is ConnectedEvent) _reload();
    });
    ref.onDispose(sub.cancel);
    return ref.read(chatApiProvider).list();
  }

  Timer? _debounce;

  void _reload() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      try {
        state = AsyncData(await ref.read(chatApiProvider).list());
      } catch (_) {}
    });
  }

  Future<void> refresh() async => state = AsyncData(await ref.read(chatApiProvider).list());
}

final chatsProvider = AsyncNotifierProvider<ChatsController, List<ConversationItem>>(ChatsController.new);

final unreadChatsProvider = Provider<int>(
  (ref) => ref.watch(chatsProvider).value?.fold<int>(0, (s, c) => s + c.unreadCount) ?? 0,
);

// ---------- Notifications ----------

class NotificationsController extends AsyncNotifier<(List<AppNotification>, int)> {
  @override
  Future<(List<AppNotification>, int)> build() async {
    if (ref.watch(currentUserProvider) == null) return (const <AppNotification>[], 0);
    final sub = ref.read(realtimeProvider).events.listen((e) {
      if (e is NotificationEvent) ref.invalidateSelf();
    });
    ref.onDispose(sub.cancel);
    return ref.read(meApiProvider).notifications();
  }

  Future<void> markAllRead() async {
    await ref.read(meApiProvider).readAllNotifications();
    ref.invalidateSelf();
  }
}

final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, (List<AppNotification>, int)>(NotificationsController.new);

// ---------- Seller ----------

final sellerShopProvider = FutureProvider.autoDispose<SellerShop>((ref) => ref.watch(sellerApiProvider).shop());
final sellerDashboardProvider =
    FutureProvider.autoDispose<SellerDashboard>((ref) => ref.watch(sellerApiProvider).dashboard());
final sellerProductsProvider =
    FutureProvider.autoDispose.family<List<ProductCardData>, String?>((ref, q) => ref.watch(sellerApiProvider).products(q: q));
final sellerOrdersProvider = FutureProvider.autoDispose.family<List<Order>, OrderStatus?>(
  (ref, status) => ref.watch(ordersApiProvider).sellerOrders(status: status?.name),
);
