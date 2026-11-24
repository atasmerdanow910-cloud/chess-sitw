import '../core/api/api_client.dart';
import 'models.dart';

List<T> _list<T>(Object? data, T Function(Json) f) =>
    (data as List).map((e) => f(Map<String, dynamic>.from(e as Map))).toList();
Json _map(Object? data) => Map<String, dynamic>.from(data as Map);

/// Typed calls to the server API, grouped by area.
class CatalogApi {
  CatalogApi(this._c);
  final ApiClient _c;

  Future<HomeData> home() async => HomeData.fromJson(_map(await _c.get('/home')));
  Future<List<Category>> categories() async => _list(await _c.get('/categories'), Category.fromJson);

  Future<List<Shop>> shops({String? q, String? categoryId, int offset = 0}) async =>
      _list(await _c.get('/shops', query: {'q': q, 'categoryId': categoryId, 'offset': offset, 'limit': 30}), Shop.fromJson);

  Future<Shop> shop(String id) async => Shop.fromJson(_map(await _c.get('/shops/$id')));

  Future<List<Review>> reviews(String shopId) async =>
      _list(await _c.get('/shops/$shopId/reviews', query: {'limit': 30}), Review.fromJson);

  Future<List<ProductCardData>> products({
    String? q,
    String? categoryId,
    String? shopId,
    int? minPrice,
    int? maxPrice,
    String sort = 'new',
    int offset = 0,
    int limit = 30,
  }) async =>
      _list(
        await _c.get('/products', query: {
          'q': q,
          'categoryId': categoryId,
          'shopId': shopId,
          'minPrice': minPrice,
          'maxPrice': maxPrice,
          'sort': sort,
          'offset': offset,
          'limit': limit,
        }),
        ProductCardData.fromJson,
      );

  Future<ProductDetails> product(String id) async => ProductDetails.fromJson(_map(await _c.get('/products/$id')));
}

class AuthApi {
  AuthApi(this._c);
  final ApiClient _c;

  Future<Json> login(String phone, String password) async =>
      _map(await _c.post('/auth/login', body: {'phone': phone, 'password': password}, auth: false));

  Future<Json> register(String name, String phone, String password, String locale) async => _map(await _c.post(
        '/auth/register',
        body: {'name': name, 'phone': phone, 'password': password, 'locale': locale},
        auth: false,
      ));

  Future<Json> google(String idToken, String locale) async =>
      _map(await _c.post('/auth/google', body: {'idToken': idToken, 'locale': locale}, auth: false));

  Future<AppUser> me() async => AppUser.fromJson(_map(await _c.get('/auth/me')));

  Future<AppUser> updateMe({String? name, String? locale, String? phone}) async => AppUser.fromJson(_map(
        await _c.patch('/auth/me', body: {
          'name': ?name,
          'locale': ?locale,
          'phone': ?phone,
        }),
      ));

  Future<void> changePassword(String? current, String next) =>
      _c.post('/auth/password', body: {'currentPassword': ?current, 'newPassword': next});

  Future<void> logout(String refreshToken) =>
      _c.post('/auth/logout', body: {'refreshToken': refreshToken}, auth: false);

  Future<void> claimInvite(String code) => _c.post('/auth/invite', body: {'code': code});
}

class OrdersApi {
  OrdersApi(this._c);
  final ApiClient _c;

  Future<Order> create({
    required String shopId,
    required List<Json> items,
    required String contactPhone,
    required String address,
    required String comment,
  }) async =>
      Order.fromJson(_map(await _c.post('/orders', body: {
        'shopId': shopId,
        'items': items,
        'contactPhone': contactPhone,
        'address': address,
        'comment': comment,
      })));

  Future<List<Order>> mine() async => _list(await _c.get('/orders', query: {'limit': 50}), Order.fromJson);
  Future<Order> get(String id) async => Order.fromJson(_map(await _c.get('/orders/$id')));
  Future<Order> cancel(String id) async => Order.fromJson(_map(await _c.post('/orders/$id/cancel')));
  Future<void> review(String id, int rating, String text) =>
      _c.post('/orders/$id/review', body: {'rating': rating, 'text': text});

  Future<List<Order>> sellerOrders({String? status}) async =>
      _list(await _c.get('/seller/orders', query: {'status': status, 'limit': 50}), Order.fromJson);

  Future<Order> setStatus(String id, OrderStatus status) async =>
      Order.fromJson(_map(await _c.patch('/seller/orders/$id/status', body: {'status': status.name})));
}

class ChatApi {
  ChatApi(this._c);
  final ApiClient _c;

  Future<List<ConversationItem>> list() async => _list(await _c.get('/chats'), ConversationItem.fromJson);

  Future<ConversationItem> open({required String shopId, String? productId, String? orderId}) async =>
      ConversationItem.fromJson(_map(await _c.post('/chats', body: {
        'shopId': shopId,
        'productId': ?productId,
        'orderId': ?orderId,
      })));

  Future<List<ChatMessage>> history(String id, {DateTime? before}) async => _list(
        await _c.get('/chats/$id/messages', query: {'before': before?.toUtc().toIso8601String(), 'limit': 40}),
        ChatMessage.fromJson,
      );

  Future<ChatMessage> send(String id, {required String clientId, required String type, String? text, String? mediaId}) async =>
      ChatMessage.fromJson(_map(await _c.post('/chats/$id/messages', body: {
        'clientId': clientId,
        'type': type,
        'text': ?text,
        'mediaId': ?mediaId,
      })));

  Future<void> markRead(String id) => _c.post('/chats/$id/read');
}

class MeApi {
  MeApi(this._c);
  final ApiClient _c;

  Future<List<ProductCardData>> favorites() async => _list(await _c.get('/me/favorites'), ProductCardData.fromJson);
  Future<void> addFavorite(String productId) => _c.put('/me/favorites/$productId');
  Future<void> removeFavorite(String productId) => _c.delete('/me/favorites/$productId');

  Future<(List<AppNotification>, int)> notifications() async {
    final data = _map(await _c.get('/me/notifications', query: {'limit': 50}));
    return (_list(data['items'], AppNotification.fromJson), data['unreadCount'] as int? ?? 0);
  }

  Future<void> readAllNotifications() => _c.post('/me/notifications/read', body: <String, dynamic>{});

  Future<void> report(String targetType, String targetId, String reason) =>
      _c.post('/reports', body: {'targetType': targetType, 'targetId': targetId, 'reason': reason});
}

class SellerApi {
  SellerApi(this._c);
  final ApiClient _c;

  Future<SellerShop> shop() async => SellerShop.fromJson(_map(await _c.get('/seller/shop')));
  Future<SellerShop> updateShop(Json patch) async => SellerShop.fromJson(_map(await _c.patch('/seller/shop', body: patch)));
  Future<SellerDashboard> dashboard() async => SellerDashboard.fromJson(_map(await _c.get('/seller/dashboard')));

  Future<List<ProductCardData>> products({String? q}) async =>
      _list(await _c.get('/seller/products', query: {'q': q, 'limit': 50}), ProductCardData.fromJson);

  Future<ProductDetails> product(String id) async => ProductDetails.fromJson(_map(await _c.get('/seller/products/$id')));
  Future<ProductDetails> create(Json body) async => ProductDetails.fromJson(_map(await _c.post('/seller/products', body: body)));
  Future<ProductDetails> update(String id, Json body) async =>
      ProductDetails.fromJson(_map(await _c.patch('/seller/products/$id', body: body)));
  Future<void> delete(String id) => _c.delete('/seller/products/$id');
}

/// Owner panel. Uses plain JSON maps: these screens show raw admin data.
class AdminApi {
  AdminApi(this._c);
  final ApiClient _c;

  Future<Json> stats() async => _map(await _c.get('/admin/stats'));
  Future<List<Json>> shops({String? q, String filter = 'all'}) async =>
      (await _c.get('/admin/shops', query: {'q': q, 'filter': filter, 'limit': 50}) as List).map(_map).toList();
  Future<Json> shop(String id) async => _map(await _c.get('/admin/shops/$id'));
  Future<Json> createShop(Json body) async => _map(await _c.post('/admin/shops', body: body));
  Future<Json> updateShop(String id, Json body) async => _map(await _c.patch('/admin/shops/$id', body: body));
  Future<Json> newInvite(String id) async => _map(await _c.post('/admin/shops/$id/invite'));
  Future<Json> addPayment(String id, Json body) async => _map(await _c.post('/admin/shops/$id/payments', body: body));
  Future<List<Json>> payments() async => (await _c.get('/admin/payments') as List).map(_map).toList();
  Future<List<Json>> users({String? q}) async =>
      (await _c.get('/admin/users', query: {'q': q, 'limit': 50}) as List).map(_map).toList();
  Future<void> setUserBlocked(String id, bool blocked) => _c.patch('/admin/users/$id', body: {'isBlocked': blocked});
  Future<List<Json>> reports({String? status}) async =>
      (await _c.get('/admin/reports', query: {'status': status, 'limit': 50}) as List).map(_map).toList();
  Future<void> resolveReport(String id, String status) => _c.patch('/admin/reports/$id', body: {'status': status});
  Future<void> setProductStatus(String id, String status) => _c.patch('/admin/products/$id', body: {'status': status});
  Future<List<Category>> categories() async => _list(await _c.get('/admin/categories'), Category.fromJson);
  Future<void> createCategory(Json body) => _c.post('/admin/categories', body: body);
  Future<void> updateCategory(String id, Json body) => _c.patch('/admin/categories/$id', body: body);
  Future<List<Json>> banners() async => (await _c.get('/admin/banners') as List).map(_map).toList();
  Future<void> createBanner(Json body) => _c.post('/admin/banners', body: body);
  Future<void> updateBanner(String id, Json body) => _c.patch('/admin/banners/$id', body: body);
  Future<void> deleteBanner(String id) => _c.delete('/admin/banners/$id');
  Future<List<Plan>> plans() async => _list(await _c.get('/admin/plans'), Plan.fromJson);
  Future<void> updatePlan(String id, Json body) => _c.patch('/admin/plans/$id', body: body);
  Future<Json> broadcast(Json body) async => _map(await _c.post('/admin/broadcasts', body: body));
}
