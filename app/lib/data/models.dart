import 'package:material_ui/material_ui.dart';

/// Data from the server. Money is in tenge (1 TMT = 100 tenge).

typedef Json = Map<String, dynamic>;

DateTime _date(Object? v) => DateTime.tryParse(v as String? ?? '')?.toLocal() ?? DateTime.now();
DateTime? _dateOrNull(Object? v) => v == null ? null : DateTime.tryParse(v as String)?.toLocal();
int _int(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
double _double(Object? v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
List<T> _list<T>(Object? v, T Function(Json) f) =>
    (v as List? ?? const []).map((e) => f(Map<String, dynamic>.from(e as Map))).toList();

/// Category icon names (stored on the server) -> Material icons.
IconData categoryIcon(String key) => switch (key) {
      'checkroom' => Icons.checkroom,
      'shoes' => Icons.directions_run,
      'headphones' => Icons.headphones,
      'smartphone' => Icons.smartphone,
      'kitchen' => Icons.blender,
      'toys' => Icons.toys,
      'spa' => Icons.spa,
      'car' => Icons.directions_car,
      'sports' => Icons.sports_soccer,
      'home' => Icons.chair,
      'book' => Icons.menu_book,
      'gift' => Icons.card_giftcard,
      _ => Icons.category_outlined,
    };

const categoryIconKeys = [
  'checkroom', 'shoes', 'headphones', 'smartphone', 'kitchen', 'toys', 'spa', 'car', 'sports', 'home', 'book', 'gift', 'category',
];

bool _isTk(Locale l) => l.languageCode == 'tk';

class Category {
  Category.fromJson(Json j)
      : id = j['id'] as String,
        parentId = j['parentId'] as String?,
        nameRu = j['nameRu'] as String,
        nameTk = j['nameTk'] as String,
        icon = j['icon'] as String? ?? 'category',
        sort = _int(j['sort']),
        isActive = j['isActive'] as bool? ?? true;

  final String id;
  final String? parentId;
  final String nameRu;
  final String nameTk;
  final String icon;
  final int sort;
  final bool isActive;

  String name(Locale l) => _isTk(l) ? nameTk : nameRu;
  IconData get iconData => categoryIcon(icon);
}

class BannerItem {
  BannerItem.fromJson(Json j)
      : id = j['id'] as String,
        titleRu = j['titleRu'] as String,
        titleTk = j['titleTk'] as String,
        subtitleRu = j['subtitleRu'] as String? ?? '',
        subtitleTk = j['subtitleTk'] as String? ?? '',
        colorHex = j['color'] as String? ?? '#0F4A23',
        imageUrl = j['imageUrl'] as String?,
        shopId = j['shopId'] as String?;

  final String id;
  final String titleRu;
  final String titleTk;
  final String subtitleRu;
  final String subtitleTk;
  final String colorHex;
  final String? imageUrl;
  final String? shopId;

  String title(Locale l) => _isTk(l) ? titleTk : titleRu;
  String subtitle(Locale l) => _isTk(l) ? subtitleTk : subtitleRu;
  Color get color => Color(int.parse('FF${colorHex.substring(1)}', radix: 16));
}

class ShopSummary {
  ShopSummary.fromJson(Json j)
      : id = j['id'] as String,
        name = j['name'] as String,
        isVerified = j['isVerified'] as bool? ?? false,
        logoUrl = j['logoUrl'] as String?;

  final String id;
  final String name;
  final bool isVerified;
  final String? logoUrl;

  String get initials {
    final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first.substring(0, 1).toUpperCase();
    return (words[0].substring(0, 1) + words[1].substring(0, 1)).toUpperCase();
  }
}

class Shop extends ShopSummary {
  Shop.fromJson(super.j)
      : description = j['description'] as String? ?? '',
        address = j['address'] as String? ?? '',
        phone = j['phone'] as String? ?? '',
        workingHours = j['workingHours'] as String? ?? '',
        returnPolicy = j['returnPolicy'] as String? ?? '',
        rating = _double(j['rating']),
        reviewsCount = _int(j['reviewsCount']),
        productsCount = _int(j['productsCount']),
        super.fromJson();

  final String description;
  final String address;
  final String phone;
  final String workingHours;
  final String returnPolicy;
  final double rating;
  final int reviewsCount;
  final int productsCount;
}

class ProductCardData {
  ProductCardData.fromJson(Json j)
      : id = j['id'] as String,
        title = j['title'] as String,
        priceTenge = _int(j['priceTenge']),
        stock = _int(j['stock']),
        categoryId = j['categoryId'] as String?,
        status = j['status'] as String? ?? 'active',
        createdAt = _date(j['createdAt']),
        imageUrl = j['imageUrl'] as String?,
        shop = ShopSummary.fromJson(Map<String, dynamic>.from(j['shop'] as Map)),
        isFavorite = j['isFavorite'] as bool? ?? false,
        views = _int(j['views']),
        ordersCount = _int(j['ordersCount']);

  final String id;
  final String title;
  final int priceTenge;
  final int stock;
  final String? categoryId;
  final String status;
  final DateTime createdAt;
  final String? imageUrl;
  final ShopSummary shop;
  final bool isFavorite;
  final int views;
  final int ordersCount;

  bool get inStock => stock > 0;
  bool get isNew => DateTime.now().difference(createdAt) < const Duration(days: 7);
}

class MediaItem {
  MediaItem.fromJson(Json j)
      : id = j['id'] as String,
        kind = j['kind'] as String,
        url = j['url'] as String,
        width = j['width'] as int?,
        height = j['height'] as int?;

  final String id;
  final String kind;
  final String url;
  final int? width;
  final int? height;

  bool get isVideo => kind == 'video';
}

class Variant {
  Variant.fromJson(Json j)
      : id = j['id'] as String,
        kind = j['kind'] as String,
        value = j['value'] as String,
        priceDeltaTenge = _int(j['priceDeltaTenge']);

  final String id;
  final String kind; // color | size
  final String value;
  final int priceDeltaTenge;
}

class ProductDetails {
  ProductDetails.fromJson(Json j)
      : id = j['id'] as String,
        title = j['title'] as String,
        description = j['description'] as String? ?? '',
        priceTenge = _int(j['priceTenge']),
        stock = _int(j['stock']),
        status = j['status'] as String? ?? 'active',
        categoryId = j['categoryId'] as String?,
        views = _int(j['views']),
        createdAt = _date(j['createdAt']),
        media = _list(j['media'], MediaItem.fromJson),
        variants = _list(j['variants'], Variant.fromJson),
        isFavorite = j['isFavorite'] as bool? ?? false,
        shop = Shop.fromJson(Map<String, dynamic>.from(j['shop'] as Map));

  final String id;
  final String title;
  final String description;
  final int priceTenge;
  final int stock;
  final String status;
  final String? categoryId;
  final int views;
  final DateTime createdAt;
  final List<MediaItem> media;
  final List<Variant> variants;
  final bool isFavorite;
  final Shop shop;

  List<Variant> variantsOf(String kind) => variants.where((v) => v.kind == kind).toList();
  String? get firstImageUrl => media.where((m) => !m.isVideo).map((m) => m.url).firstOrNull;
}

class Review {
  Review.fromJson(Json j)
      : id = j['id'] as String,
        rating = _int(j['rating']),
        text = j['text'] as String? ?? '',
        createdAt = _date(j['createdAt']),
        buyerName = j['buyerName'] as String? ?? '';

  final String id;
  final int rating;
  final String text;
  final DateTime createdAt;
  final String buyerName;
}

class HomeData {
  HomeData.fromJson(Json j)
      : banners = _list(j['banners'], BannerItem.fromJson),
        categories = _list(j['categories'], Category.fromJson),
        popularShops = _list(j['popularShops'], Shop.fromJson),
        newProducts = _list(j['newProducts'], ProductCardData.fromJson);

  final List<BannerItem> banners;
  final List<Category> categories;
  final List<Shop> popularShops;
  final List<ProductCardData> newProducts;
}

enum OrderStatus { pending, confirmed, shipping, delivered, cancelled }

OrderStatus orderStatusFrom(String s) =>
    OrderStatus.values.firstWhere((e) => e.name == s, orElse: () => OrderStatus.pending);

class OrderItem {
  OrderItem.fromJson(Json j)
      : productId = j['productId'] as String?,
        title = j['title'] as String,
        variantLabel = j['variantLabel'] as String? ?? '',
        qty = _int(j['qty']),
        priceTenge = _int(j['priceTenge']),
        imageUrl = j['imageUrl'] as String?;

  final String? productId;
  final String title;
  final String variantLabel;
  final int qty;
  final int priceTenge;
  final String? imageUrl;
}

class Order {
  Order.fromJson(Json j)
      : id = j['id'] as String,
        number = _int(j['number']),
        status = orderStatusFrom(j['status'] as String),
        totalTenge = _int(j['totalTenge']),
        contactPhone = j['contactPhone'] as String? ?? '',
        address = j['address'] as String? ?? '',
        comment = j['comment'] as String? ?? '',
        createdAt = _date(j['createdAt']),
        shop = ShopSummary.fromJson(Map<String, dynamic>.from(j['shop'] as Map)),
        buyerName = (j['buyer'] as Map?)?['name'] as String?,
        items = _list(j['items'], OrderItem.fromJson),
        hasReview = j['hasReview'] as bool? ?? false,
        canCancel = j['canCancel'] as bool? ?? false,
        nextStatuses = (j['nextStatuses'] as List? ?? const []).map((s) => orderStatusFrom(s as String)).toList();

  final String id;
  final int number;
  final OrderStatus status;
  final int totalTenge;
  final String contactPhone;
  final String address;
  final String comment;
  final DateTime createdAt;
  final ShopSummary shop;
  final String? buyerName;
  final List<OrderItem> items;
  final bool hasReview;
  final bool canCancel;
  final List<OrderStatus> nextStatuses;

  int get itemsCount => items.fold(0, (s, i) => s + i.qty);
}

class MessagePreview {
  MessagePreview.fromJson(Json j)
      : type = j['type'] as String,
        text = j['text'] as String?,
        senderId = j['senderId'] as String,
        createdAt = _date(j['createdAt']);

  final String type;
  final String? text;
  final String senderId;
  final DateTime createdAt;
}

class ConversationItem {
  ConversationItem.fromJson(Json j)
      : id = j['id'] as String,
        side = j['side'] as String,
        shop = ShopSummary.fromJson(Map<String, dynamic>.from(j['shop'] as Map)),
        peerName = j['peerName'] as String,
        productId = j['productId'] as String?,
        productTitle = j['productTitle'] as String?,
        orderId = j['orderId'] as String?,
        lastMessageAt = _date(j['lastMessageAt']),
        lastMessage = j['lastMessage'] == null
            ? null
            : MessagePreview.fromJson(Map<String, dynamic>.from(j['lastMessage'] as Map)),
        unreadCount = _int(j['unreadCount']);

  final String id;
  final String side; // buyer | seller
  final ShopSummary shop;
  final String peerName;
  final String? productId;
  final String? productTitle;
  final String? orderId;
  final DateTime lastMessageAt;
  final MessagePreview? lastMessage;
  final int unreadCount;

  bool get iAmSeller => side == 'seller';
}

enum SendState { sending, sent, failed }

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.clientId,
    required this.type,
    required this.createdAt,
    this.text,
    this.mediaUrl,
    this.deliveredAt,
    this.readAt,
    this.sendState = SendState.sent,
    this.localPath,
  });

  ChatMessage.fromJson(Json j)
      : id = j['id'] as String,
        conversationId = j['conversationId'] as String,
        senderId = j['senderId'] as String,
        clientId = j['clientId'] as String,
        type = j['type'] as String,
        text = j['text'] as String?,
        mediaUrl = j['mediaUrl'] as String?,
        createdAt = _date(j['createdAt']),
        deliveredAt = _dateOrNull(j['deliveredAt']),
        readAt = _dateOrNull(j['readAt']),
        sendState = SendState.sent,
        localPath = null;

  final String id;
  final String conversationId;
  final String senderId;
  final String clientId;
  final String type; // text | photo | video | voice
  final String? text;
  final String? mediaUrl;
  final DateTime createdAt;
  final DateTime? deliveredAt;
  final DateTime? readAt;
  final SendState sendState;

  /// File on the phone while it is being uploaded.
  final String? localPath;

  ChatMessage copyWith({DateTime? deliveredAt, DateTime? readAt, SendState? sendState}) => ChatMessage(
        id: id,
        conversationId: conversationId,
        senderId: senderId,
        clientId: clientId,
        type: type,
        createdAt: createdAt,
        text: text,
        mediaUrl: mediaUrl,
        deliveredAt: deliveredAt ?? this.deliveredAt,
        readAt: readAt ?? this.readAt,
        sendState: sendState ?? this.sendState,
        localPath: localPath,
      );
}

class AppNotification {
  AppNotification.fromJson(Json j)
      : id = j['id'] as String? ?? '',
        type = j['type'] as String? ?? '',
        title = j['title'] as String? ?? '',
        body = j['body'] as String? ?? '',
        data = Map<String, dynamic>.from(j['data'] as Map? ?? const {}),
        readAt = _dateOrNull(j['readAt']),
        createdAt = _date(j['createdAt']);

  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic> data;
  final DateTime? readAt;
  final DateTime createdAt;
}

class AppUser {
  AppUser.fromJson(Json j)
      : id = j['id'] as String,
        role = j['role'] as String,
        name = j['name'] as String,
        phone = j['phone'] as String?,
        email = j['email'] as String?,
        locale = j['locale'] as String? ?? 'ru',
        hasPassword = j['hasPassword'] as bool? ?? false,
        hasGoogle = j['hasGoogle'] as bool? ?? false,
        shopId = j['shopId'] as String?;

  final String id;
  final String role;
  final String name;
  final String? phone;
  final String? email;
  final String locale;
  final bool hasPassword;
  final bool hasGoogle;
  final String? shopId;

  bool get isSeller => role == 'seller' && shopId != null;
  bool get isOwner => role == 'owner';

  Json toJson() => {
        'id': id,
        'role': role,
        'name': name,
        'phone': phone,
        'email': email,
        'locale': locale,
        'hasPassword': hasPassword,
        'hasGoogle': hasGoogle,
        'shopId': shopId,
      };
}

class SubscriptionInfo {
  SubscriptionInfo.fromJson(Json j)
      : until = _date(j['until']),
        daysLeft = _int(j['daysLeft']),
        expired = j['expired'] as bool? ?? false,
        endsSoon = j['endsSoon'] as bool? ?? false;

  final DateTime until;
  final int daysLeft;
  final bool expired;
  final bool endsSoon;
}

class Plan {
  Plan.fromJson(Json j)
      : id = j['id'] as String,
        nameRu = j['nameRu'] as String,
        nameTk = j['nameTk'] as String,
        priceTenge = _int(j['priceTenge']),
        productLimit = j['productLimit'] as int?;

  final String id;
  final String nameRu;
  final String nameTk;
  final int priceTenge;
  final int? productLimit;

  String name(Locale l) => _isTk(l) ? nameTk : nameRu;
}

class SellerShop {
  SellerShop.fromJson(Json j)
      : id = j['id'] as String,
        name = j['name'] as String,
        description = j['description'] as String? ?? '',
        address = j['address'] as String? ?? '',
        phone = j['phone'] as String? ?? '',
        workingHours = j['workingHours'] as String? ?? '',
        logoMediaId = j['logoMediaId'] as String?,
        logoUrl = j['logoUrl'] as String?,
        legalName = j['legalName'] as String? ?? '',
        returnPolicy = j['returnPolicy'] as String? ?? '',
        status = j['status'] as String? ?? 'active',
        isVerified = j['isVerified'] as bool? ?? false,
        rating = _double(j['rating']),
        reviewsCount = _int(j['reviewsCount']),
        subscription = SubscriptionInfo.fromJson(Map<String, dynamic>.from(j['subscription'] as Map)),
        plan = j['plan'] == null ? null : Plan.fromJson(Map<String, dynamic>.from(j['plan'] as Map));

  final String id;
  final String name;
  final String description;
  final String address;
  final String phone;
  final String workingHours;
  final String? logoMediaId;
  final String? logoUrl;
  final String legalName;
  final String returnPolicy;
  final String status;
  final bool isVerified;
  final double rating;
  final int reviewsCount;
  final SubscriptionInfo subscription;
  final Plan? plan;
}

class PopularProduct {
  PopularProduct.fromJson(Json j)
      : id = j['id'] as String,
        title = j['title'] as String,
        views = _int(j['views']),
        ordersCount = _int(j['ordersCount']);

  final String id;
  final String title;
  final int views;
  final int ordersCount;
}

class SellerDashboard {
  SellerDashboard.fromJson(Json j)
      : subscription = SubscriptionInfo.fromJson(Map<String, dynamic>.from(j['subscription'] as Map)),
        shopStatus = j['shopStatus'] as String? ?? 'active',
        views = _int((j['stats'] as Map)['views']),
        orders = _int((j['stats'] as Map)['orders']),
        pendingOrders = _int((j['stats'] as Map)['pendingOrders']),
        products = _int((j['stats'] as Map)['products']),
        popular = _list(j['popularProducts'], PopularProduct.fromJson);

  final SubscriptionInfo subscription;
  final String shopStatus;
  final int views;
  final int orders;
  final int pendingOrders;
  final int products;
  final List<PopularProduct> popular;
}
