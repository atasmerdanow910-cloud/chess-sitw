import 'package:bazar_tm/core/format/money.dart';
import 'package:bazar_tm/data/mock_data.dart';
import 'package:bazar_tm/data/models.dart';
import 'package:bazar_tm/data/stores.dart';
import 'package:bazar_tm/features/cart/checkout_sheet.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('formatting', () {
    test('manat amounts use narrow no-break spaces and comma decimals', () {
      expect(formatTmt(1250), '1 250 TMT');
      expect(formatTmt(99.5), '99,50 TMT');
      expect(formatTmt(0), '0 TMT');
      expect(formatTmt(1234567), '1 234 567 TMT');
    });

    test('plain numbers are grouped the same way', () {
      expect(formatNumber(12345), '12 345');
      expect(formatNumber(999), '999');
    });
  });

  group('Turkmen phone numbers', () {
    test('accepts local and international forms', () {
      expect(normalizeTmPhone('+993 65 123456'), '+993 65 123456');
      expect(normalizeTmPhone('65123456'), '+993 65 123456');
      expect(normalizeTmPhone('8 (993) 61-76-54-32'), isNull, reason: '12 digits is not a valid form');
      expect(normalizeTmPhone('99361765432'), '+993 61 765432');
    });

    test('rejects wrong lengths, other countries and leading zero', () {
      expect(normalizeTmPhone('+993 6512345'), isNull);
      expect(normalizeTmPhone(''), isNull);
      expect(normalizeTmPhone('+7 999 1234567'), isNull);
      expect(normalizeTmPhone('+993 05 123456'), isNull);
    });
  });

  group('CartStore', () {
    final phone = MockData.product('p1'); // stock 7
    final soldOut = MockData.product('p4'); // stock 0

    test('never goes above the stock and refuses sold-out products', () {
      final cart = CartStore();
      for (var i = 0; i < 10; i++) {
        cart.add(phone, color: 'Синий');
      }
      expect(cart.count, phone.stock);
      expect(cart.add(phone, color: 'Синий'), isFalse);
      expect(cart.add(soldOut), isFalse);
      expect(cart.contains(soldOut.id), isFalse);
    });

    test('different variants are separate lines', () {
      final cart = CartStore()
        ..add(phone, color: 'Синий')
        ..add(phone, color: 'Чёрный');
      expect(cart.lines, hasLength(2));
    });

    test('groups by shop and checks out one shop at a time', () {
      final cart = CartStore()
        ..add(MockData.product('p1'))
        ..add(MockData.product('p5'), size: 'M')
        ..add(MockData.product('p2'));
      expect(cart.byShop.keys, ['s1', 's2']);
      expect(cart.totalFor('s1'), 4850 + 390);
      final taken = cart.takeShop('s1');
      expect(taken.map((l) => l.product.id), ['p1', 'p2']);
      expect(cart.byShop.keys, ['s2']);
    });

    test('quantity 0 removes the line', () {
      final cart = CartStore()..add(phone);
      cart.setQty(cart.lines.single, 0);
      expect(cart.lines, isEmpty);
    });
  });

  group('OrdersStore', () {
    test('an order contains items of exactly one shop', () {
      final orders = OrdersStore();
      final lines = [CartLine(product: MockData.product('p1')), CartLine(product: MockData.product('p5'))];
      expect(() => orders.place(shopId: 's1', lines: lines, name: 'A', phone: '+993 65 123456'), throwsArgumentError);
      expect(() => orders.place(shopId: 's1', lines: const [], name: 'A', phone: '+993 65 123456'), throwsArgumentError);
      expect(orders.mine, isEmpty);
    });

    test('a new order starts as "new" and reaches the demo seller', () {
      final orders = OrdersStore();
      final before = orders.incoming.length;
      final order = orders.place(
        shopId: 's1',
        lines: [CartLine(product: MockData.product('p2'), qty: 2)],
        name: 'Aýna',
        phone: '+993 65 123456',
      );
      expect(order.status, OrderStatus.created);
      expect(order.total, 780);
      expect(orders.mine.first, same(order));
      expect(orders.incoming.first, same(order));
      expect(orders.incoming.length, before + 1);
    });

    test('orders to other shops do not appear in the demo seller panel', () {
      final orders = OrdersStore();
      final before = orders.incoming.length;
      orders.place(
        shopId: 's2',
        lines: [CartLine(product: MockData.product('p5'))],
        name: 'A',
        phone: '+993 65 123456',
      );
      expect(orders.incoming.length, before);
    });

    test('status moves forward one step or to cancelled, never back', () {
      final orders = OrdersStore();
      final order = orders.place(
        shopId: 's1',
        lines: [CartLine(product: MockData.product('p3'))],
        name: 'A',
        phone: '+993 65 123456',
      );
      orders.setStatus(order, OrderStatus.delivered);
      expect(order.status, OrderStatus.created, reason: 'cannot skip steps');
      orders.setStatus(order, OrderStatus.confirmed);
      orders.setStatus(order, OrderStatus.shipping);
      orders.setStatus(order, OrderStatus.confirmed);
      expect(order.status, OrderStatus.shipping, reason: 'cannot go back');
      orders.setStatus(order, OrderStatus.delivered);
      orders.setStatus(order, OrderStatus.cancelled);
      expect(order.status, OrderStatus.delivered, reason: 'a delivered order cannot be cancelled');
    });

    test('a new order can be cancelled', () {
      expect(OrdersStore.canMove(OrderStatus.created, OrderStatus.cancelled), isTrue);
      expect(OrdersStore.canMove(OrderStatus.cancelled, OrderStatus.created), isFalse);
    });
  });

  group('ProductStore', () {
    test('a seller cannot overwrite a product of another shop', () {
      final products = ProductStore();
      final foreign = MockData.product('p5'); // shop s2
      final saved = products.save(id: foreign.id, shopId: 's1', title: 'X', description: '', categoryId: 'clothes', price: 1, stock: 1);
      expect(saved.id, isNot(foreign.id));
      expect(products.visible.firstWhere((p) => p.id == foreign.id).title, foreign.title);
    });

    test('hidden products disappear from the catalog but stay in the seller panel', () {
      final products = ProductStore();
      final seller = SellerStore(products);
      final p1 = MockData.product('p1');
      products.toggleVisible(p1);
      expect(products.visible.any((p) => p.id == 'p1'), isFalse);
      expect(seller.products.any((p) => p.id == 'p1' && !p.visible), isTrue);
      products.toggleVisible(p1);
      expect(products.visible.any((p) => p.id == 'p1'), isTrue);
    });

    test('a new product appears in its shop and in the catalog', () {
      final products = ProductStore();
      final saved = products.save(shopId: 's1', title: 'Чехол', description: '', categoryId: 'accessories', price: 40, stock: 3);
      expect(products.ofShop('s1').first.id, saved.id);
      expect(products.visible.first.id, saved.id);
    });
  });

  test('subscription reminder shows 5 days before the end', () {
    final seller = SellerStore(ProductStore());
    expect(seller.daysLeft, inInclusiveRange(4, 5));
    expect(seller.endsSoon, isTrue);
  });
}
