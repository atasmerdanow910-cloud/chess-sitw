import 'package:material_ui/material_ui.dart';

import 'mock_data.dart';
import 'models.dart';

/// All products of all shops. Buyers see only visible ones; the seller panel edits its own shop's.
class ProductStore extends ChangeNotifier {
  final List<Product> _all = [...MockData.products];
  int _nextId = 1;

  /// What buyers see: hidden products stay only in the seller panel.
  List<Product> get visible => _all.where((p) => p.visible).toList(growable: false);

  List<Product> ofShop(String shopId, {bool includeHidden = false}) =>
      _all.where((p) => p.shopId == shopId && (includeHidden || p.visible)).toList(growable: false);

  /// Adds a new product or replaces an edited one (matched by id within the same shop).
  Product save({
    String? id,
    required String shopId,
    required String title,
    required String description,
    required String categoryId,
    required int price,
    required int stock,
    List<String> colors = const [],
    List<String> sizes = const [],
  }) {
    final old = id == null ? null : _all.where((x) => x.id == id && x.shopId == shopId).firstOrNull;
    final product = Product(
      id: old?.id ?? 'n${_nextId++}',
      shopId: shopId,
      categoryId: categoryId,
      title: title,
      description: description,
      price: price,
      stock: stock,
      colors: colors,
      sizes: sizes,
      isNew: old?.isNew ?? true,
      views: old?.views ?? 0,
      visible: old?.visible ?? true,
    );
    if (old == null) {
      _all.insert(0, product);
    } else {
      _all[_all.indexOf(old)] = product;
    }
    notifyListeners();
    return product;
  }

  void toggleVisible(Product p) {
    final i = _all.indexWhere((x) => x.id == p.id);
    if (i < 0) return;
    _all[i] = _all[i].copyWith(visible: !_all[i].visible);
    notifyListeners();
  }

  void delete(Product p) {
    _all.removeWhere((x) => x.id == p.id);
    notifyListeners();
  }
}

/// Cart grouped by shop: the spec allows one order per shop at a time.
class CartStore extends ChangeNotifier {
  final List<CartLine> _lines = [];

  List<CartLine> get lines => List.unmodifiable(_lines);
  int get count => _lines.fold(0, (sum, l) => sum + l.qty);
  bool contains(String productId) => _lines.any((l) => l.product.id == productId);

  /// Lines grouped by shop id, in the order shops were first added.
  Map<String, List<CartLine>> get byShop {
    final map = <String, List<CartLine>>{};
    for (final line in _lines) {
      map.putIfAbsent(line.product.shopId, () => []).add(line);
    }
    return map;
  }

  int totalFor(String shopId) => _lines.where((l) => l.product.shopId == shopId).fold(0, (sum, l) => sum + l.total);

  /// Adds one item. Returns false when the product is out of stock or the stock limit is reached.
  bool add(Product product, {String? color, String? size}) {
    if (product.stock <= 0) return false;
    final key = '${product.id}|${color ?? ''}|${size ?? ''}';
    final existing = _lines.where((l) => l.key == key).firstOrNull;
    if (existing != null) {
      if (existing.qty >= product.stock) return false;
      existing.qty++;
    } else {
      _lines.add(CartLine(product: product, color: color, size: size));
    }
    notifyListeners();
    return true;
  }

  void setQty(CartLine line, int qty) {
    if (qty <= 0) {
      _lines.removeWhere((l) => identical(l, line));
    } else {
      line.qty = qty.clamp(1, line.product.stock);
    }
    notifyListeners();
  }

  /// Removes and returns a shop's lines once its order is placed.
  List<CartLine> takeShop(String shopId) {
    final taken = _lines.where((l) => l.product.shopId == shopId).toList();
    _lines.removeWhere((l) => l.product.shopId == shopId);
    notifyListeners();
    return taken;
  }
}

class FavoritesStore extends ChangeNotifier {
  final Set<String> _ids = {};

  Set<String> get ids => Set.unmodifiable(_ids);
  bool contains(String productId) => _ids.contains(productId);

  void toggle(String productId) {
    _ids.contains(productId) ? _ids.remove(productId) : _ids.add(productId);
    notifyListeners();
  }
}

class OrdersStore extends ChangeNotifier {
  final List<Order> _mine = [];
  final List<Order> _incoming = MockData.sellerOrders();
  int _nextId = 1049;

  /// Orders the buyer placed.
  List<Order> get mine => List.unmodifiable(_mine);

  /// Orders that arrived to the demo seller's shop.
  List<Order> get incoming => List.unmodifiable(_incoming);

  /// Places an order for ONE shop. Lines of other shops are rejected: the spec says one shop per order.
  Order place({required String shopId, required List<CartLine> lines, required String name, required String phone}) {
    if (lines.isEmpty || lines.any((l) => l.product.shopId != shopId)) {
      throw ArgumentError('An order must contain items of exactly one shop');
    }
    final order = Order(
      id: '${_nextId++}',
      shopId: shopId,
      lines: lines,
      createdAt: DateTime.now(),
      customerName: name,
      customerPhone: phone,
    );
    _mine.insert(0, order);
    // Demo link between the two sides: an order to the demo seller's shop shows up in the
    // seller panel at once. From Day 5 this goes through the server.
    if (shopId == MockData.demoSellerShopId) _incoming.insert(0, order);
    notifyListeners();
    return order;
  }

  void setStatus(Order order, OrderStatus status) {
    if (!canMove(order.status, status)) return;
    order.status = status;
    notifyListeners();
  }

  /// Allowed status changes: forward one step at a time, or cancel before delivery.
  static bool canMove(OrderStatus from, OrderStatus to) => switch ((from, to)) {
    (OrderStatus.created, OrderStatus.confirmed) => true,
    (OrderStatus.confirmed, OrderStatus.shipping) => true,
    (OrderStatus.shipping, OrderStatus.delivered) => true,
    (OrderStatus.created || OrderStatus.confirmed || OrderStatus.shipping, OrderStatus.cancelled) => true,
    _ => false,
  };
}

class ChatStore extends ChangeNotifier {
  final List<Conversation> _items = MockData.conversations();

  List<Conversation> get items => List.unmodifiable(_items);
  int get unread => _items.fold(0, (sum, c) => sum + c.unread);

  Conversation openFor(String shopId, {String? productId}) {
    final existing = _items.where((c) => c.shopId == shopId).firstOrNull;
    if (existing != null) return existing;
    final created = Conversation(id: 'c${_items.length + 1}', shopId: shopId, productId: productId, messages: []);
    _items.insert(0, created);
    notifyListeners();
    return created;
  }

  void markRead(Conversation c) {
    if (c.unread == 0) return;
    c.unread = 0;
    notifyListeners();
  }

  ChatMessage send(Conversation c, String text) {
    final message = ChatMessage(fromMe: true, kind: MessageKind.text, text: text, time: DateTime.now(), status: MessageStatus.sent);
    c.messages.add(message);
    _items
      ..removeWhere((x) => identical(x, c))
      ..insert(0, c);
    notifyListeners();
    return message;
  }

  void setStatus(ChatMessage message, MessageStatus status) {
    message.status = status;
    notifyListeners();
  }
}

/// Subscription plans from the spec (section 9). Prices live on the server, not here.
enum SubscriptionPlan { trial, start, business, pro }

/// The demo seller: one shop, its subscription. Products are edited through [ProductStore].
class SellerStore {
  SellerStore(this._products);

  final ProductStore _products;

  String get shopId => MockData.demoSellerShopId;
  List<Product> get products => _products.ofShop(shopId, includeHidden: true);

  /// Demo subscription: paid until 4 days from now, so the "ends soon" reminder is visible.
  final DateTime paidUntil = DateTime.now().add(const Duration(days: 4));
  final SubscriptionPlan plan = SubscriptionPlan.business;

  int get daysLeft => paidUntil.difference(DateTime.now()).inHours ~/ 24 + 1;

  /// The spec asks for a reminder 5 days before the subscription ends.
  bool get endsSoon => daysLeft <= 5;
}
