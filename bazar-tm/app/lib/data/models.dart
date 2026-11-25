import 'package:material_ui/material_ui.dart';

/// Order lifecycle from the spec: new → confirmed → shipping → delivered, or cancelled.
enum OrderStatus { created, confirmed, shipping, delivered, cancelled }

class Category {
  const Category({required this.id, required this.nameRu, required this.nameTk, required this.icon, required this.color});

  final String id;
  final String nameRu;
  final String nameTk;
  final IconData icon;
  final Color color;

  String name(Locale locale) => locale.languageCode == 'tk' ? nameTk : nameRu;
}

class Shop {
  const Shop({
    required this.id,
    required this.name,
    required this.descriptionRu,
    required this.descriptionTk,
    required this.market,
    required this.hours,
    required this.rating,
    required this.reviews,
    required this.verified,
    required this.color,
  });

  final String id;
  final String name;
  final String descriptionRu;
  final String descriptionTk;
  final String market;
  final String hours;
  final double rating;
  final int reviews;
  final bool verified;
  final Color color;

  String description(Locale locale) => locale.languageCode == 'tk' ? descriptionTk : descriptionRu;
  String get initials => name.split(' ').take(2).map((w) => w.characters.first).join().toUpperCase();
}

class Product {
  const Product({
    required this.id,
    required this.shopId,
    required this.categoryId,
    required this.title,
    required this.description,
    required this.price,
    required this.stock,
    this.colors = const [],
    this.sizes = const [],
    this.isNew = false,
    this.views = 0,
    this.visible = true,
  });

  final String id;
  final String shopId;
  final String categoryId;
  final String title;
  final String description;
  final int price;
  final int stock;
  final List<String> colors;
  final List<String> sizes;
  final bool isNew;
  final int views;
  final bool visible;

  Product copyWith({bool? visible}) => Product(
    id: id,
    shopId: shopId,
    categoryId: categoryId,
    title: title,
    description: description,
    price: price,
    stock: stock,
    colors: colors,
    sizes: sizes,
    isNew: isNew,
    views: views,
    visible: visible ?? this.visible,
  );
}

class CartLine {
  CartLine({required this.product, this.color, this.size, this.qty = 1});

  final Product product;
  final String? color;
  final String? size;
  int qty;

  String get key => '${product.id}|${color ?? ''}|${size ?? ''}';
  int get total => product.price * qty;
}

class Order {
  Order({
    required this.id,
    required this.shopId,
    required this.lines,
    required this.createdAt,
    required this.customerName,
    required this.customerPhone,
    this.status = OrderStatus.created,
  });

  final String id;
  final String shopId;
  final List<CartLine> lines;
  final DateTime createdAt;
  final String customerName;
  final String customerPhone;
  OrderStatus status;

  int get total => lines.fold(0, (sum, l) => sum + l.total);
  int get itemCount => lines.fold(0, (sum, l) => sum + l.qty);
}

enum MessageKind { text, photo, voice }

enum MessageStatus { sent, delivered, read }

class ChatMessage {
  ChatMessage({
    required this.fromMe,
    required this.kind,
    required this.time,
    this.text = '',
    this.seconds = 0,
    this.status = MessageStatus.read,
  });

  final bool fromMe;
  final MessageKind kind;
  final DateTime time;
  final String text;
  final int seconds;
  MessageStatus status;
}

class Conversation {
  Conversation({required this.id, required this.shopId, this.productId, required this.messages, this.unread = 0});

  final String id;
  final String shopId;
  final String? productId;
  final List<ChatMessage> messages;
  int unread;
}
