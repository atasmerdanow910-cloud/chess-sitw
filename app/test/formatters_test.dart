import 'package:flutter_test/flutter_test.dart';
import 'package:kerwen_market/core/format/formatters.dart';
import 'package:kerwen_market/data/providers.dart';

void main() {
  test('formats prices in TMT with spaces', () {
    expect(formatPrice(120000), '1 200 TMT');
    expect(formatPrice(12550), '125,50 TMT');
    expect(formatPrice(0), '0 TMT');
    expect(formatPrice(123456789), '1 234 567,89 TMT');
  });

  test('parses prices typed by sellers', () {
    expect(parsePriceToTenge('1200'), 120000);
    expect(parsePriceToTenge('1 200'), 120000);
    expect(parsePriceToTenge('125,5'), 12550);
    expect(parsePriceToTenge('125.55'), 12555);
    expect(parsePriceToTenge('abc'), isNull);
    expect(parsePriceToTenge('-5'), isNull);
    expect(parsePriceToTenge('1.234'), isNull);
  });

  test('groups cart lines by shop (one order per shop)', () {
    CartLine line(String product, String shop) => CartLine(
          productId: product,
          shopId: shop,
          shopName: shop,
          title: product,
          unitPriceTenge: 100,
          qty: 1,
          stock: 5,
        );
    final groups = groupByShop([line('a', 's1'), line('b', 's2'), line('c', 's1')]);
    expect(groups.keys, ['s1', 's2']);
    expect(groups['s1']!.map((l) => l.productId), ['a', 'c']);
  });
}
