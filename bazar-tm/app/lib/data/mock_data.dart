import 'package:material_ui/material_ui.dart';

import 'models.dart';

/// Demo content for Day 1. From Day 3–4 these come from the server.
abstract final class MockData {
  /// The shop opened in the demo seller panel.
  static const demoSellerShopId = 's1';

  static const categories = <Category>[
    Category(id: 'clothes', nameRu: 'Одежда', nameTk: 'Eşikler', icon: Icons.checkroom_rounded, color: Color(0xFF7C5CFF)),
    Category(id: 'shoes', nameRu: 'Обувь', nameTk: 'Aýakgaplar', icon: Icons.directions_walk_rounded, color: Color(0xFFE0885B)),
    Category(id: 'phones', nameRu: 'Телефоны', nameTk: 'Telefonlar', icon: Icons.smartphone_rounded, color: Color(0xFF3B82F6)),
    Category(id: 'electronics', nameRu: 'Электроника', nameTk: 'Elektronika', icon: Icons.headphones_rounded, color: Color(0xFF14B8A6)),
    Category(id: 'home', nameRu: 'Для дома', nameTk: 'Öý üçin', icon: Icons.chair_rounded, color: Color(0xFFB7791F)),
    Category(id: 'kids', nameRu: 'Детям', nameTk: 'Çagalar üçin', icon: Icons.toys_rounded, color: Color(0xFFE11D74)),
    Category(id: 'beauty', nameRu: 'Красота', nameTk: 'Gözellik', icon: Icons.spa_rounded, color: Color(0xFFD946EF)),
    Category(id: 'accessories', nameRu: 'Аксессуары', nameTk: 'Aksessuarlar', icon: Icons.watch_rounded, color: Color(0xFF0EA5E9)),
  ];

  static const shops = <Shop>[
    Shop(
      id: 's1',
      name: 'Ak Ýol Trade',
      descriptionRu: 'Электроника и телефоны напрямую из Гуанчжоу. Гарантия на всё.',
      descriptionTk: 'Guançžoudan gönüden-göni elektronika we telefonlar. Ähli zada kepillik.',
      market: 'Aşgabat, «Altyn Asyr» bazary',
      hours: '09:00–19:00',
      rating: 4.8,
      reviews: 126,
      verified: true,
      color: Color(0xFF12845A),
    ),
    Shop(
      id: 's2',
      name: 'Merjen Moda',
      descriptionRu: 'Женская и мужская одежда, новые коллекции каждую неделю.',
      descriptionTk: 'Aýal we erkek eşikleri, her hepde täze kolleksiýalar.',
      market: 'Aşgabat, «Gündogar» bazary',
      hours: '10:00–20:00',
      rating: 4.6,
      reviews: 84,
      verified: true,
      color: Color(0xFF7C5CFF),
    ),
    Shop(
      id: 's3',
      name: 'Öý Dünýä',
      descriptionRu: 'Всё для дома: посуда, текстиль, мебель.',
      descriptionTk: 'Öý üçin hemme zat: gap-gaç, dokma önümleri, mebel.',
      market: 'Mary, merkezi bazar',
      hours: '08:30–18:00',
      rating: 4.4,
      reviews: 37,
      verified: false,
      color: Color(0xFFB7791F),
    ),
    Shop(
      id: 's4',
      name: 'Çaga Dünýäsi',
      descriptionRu: 'Игрушки и одежда для детей от 0 до 12 лет.',
      descriptionTk: '0-dan 12 ýaşa çenli çagalar üçin oýunjaklar we eşikler.',
      market: 'Türkmenabat, «Lebap» bazary',
      hours: '09:00–18:00',
      rating: 4.9,
      reviews: 58,
      verified: true,
      color: Color(0xFFE11D74),
    ),
  ];

  static const products = <Product>[
    Product(
      id: 'p1',
      shopId: 's1',
      categoryId: 'phones',
      title: 'Redmi Note 14 Pro 8/256 ГБ',
      description: 'Новый, запечатанный. Глобальная версия, русский и туркменский язык в меню. Гарантия магазина 6 месяцев.',
      price: 4850,
      stock: 7,
      colors: ['Чёрный', 'Синий'],
      isNew: true,
      views: 412,
    ),
    Product(
      id: 'p2',
      shopId: 's1',
      categoryId: 'electronics',
      title: 'Беспроводные наушники TWS Pro',
      description: 'Шумоподавление, до 30 часов с кейсом. Bluetooth 5.3.',
      price: 390,
      stock: 25,
      colors: ['Белый', 'Чёрный'],
      isNew: true,
      views: 288,
    ),
    Product(
      id: 'p3',
      shopId: 's1',
      categoryId: 'electronics',
      title: 'Power bank 20 000 мАч',
      description: 'Быстрая зарядка 22,5 Вт, два выхода USB и Type-C.',
      price: 260,
      stock: 40,
      views: 190,
    ),
    Product(
      id: 'p4',
      shopId: 's1',
      categoryId: 'accessories',
      title: 'Смарт-часы Watch 9',
      description: 'Пульс, шаги, уведомления. Ремешок в комплекте.',
      price: 520,
      stock: 0,
      colors: ['Чёрный', 'Розовый'],
      views: 156,
    ),
    Product(
      id: 'p5',
      shopId: 's2',
      categoryId: 'clothes',
      title: 'Пальто женское шерстяное',
      description: 'Шерсть 70%, подкладка. Сезон осень–зима.',
      price: 1150,
      stock: 6,
      colors: ['Бежевый', 'Чёрный'],
      sizes: ['S', 'M', 'L'],
      isNew: true,
      views: 344,
    ),
    Product(
      id: 'p6',
      shopId: 's2',
      categoryId: 'clothes',
      title: 'Мужская куртка-пуховик',
      description: 'Тёплая, лёгкая, с капюшоном.',
      price: 980,
      stock: 11,
      colors: ['Хаки', 'Чёрный'],
      sizes: ['M', 'L', 'XL'],
      views: 230,
    ),
    Product(
      id: 'p7',
      shopId: 's2',
      categoryId: 'shoes',
      title: 'Кроссовки городские',
      description: 'Лёгкие, дышащая сетка, подошва EVA.',
      price: 640,
      stock: 14,
      colors: ['Белый', 'Серый'],
      sizes: ['39', '40', '41', '42', '43'],
      isNew: true,
      views: 301,
    ),
    Product(
      id: 'p8',
      shopId: 's2',
      categoryId: 'beauty',
      title: 'Набор для ухода за лицом',
      description: 'Крем, тоник и сыворотка. Корея.',
      price: 450,
      stock: 9,
      views: 98,
    ),
    Product(
      id: 'p9',
      shopId: 's3',
      categoryId: 'home',
      title: 'Набор посуды 12 предметов',
      description: 'Нержавеющая сталь, подходит для индукции.',
      price: 1350,
      stock: 4,
      isNew: true,
      views: 120,
    ),
    Product(
      id: 'p10',
      shopId: 's3',
      categoryId: 'home',
      title: 'Плед флисовый 200×220',
      description: 'Мягкий, не линяет, стирка при 30°.',
      price: 210,
      stock: 30,
      colors: ['Серый', 'Бежевый', 'Зелёный'],
      views: 75,
    ),
    Product(
      id: 'p11',
      shopId: 's4',
      categoryId: 'kids',
      title: 'Конструктор «Город» 520 деталей',
      description: 'Совместим с популярными наборами. Для детей от 6 лет.',
      price: 340,
      stock: 18,
      isNew: true,
      views: 205,
    ),
    Product(
      id: 'p12',
      shopId: 's4',
      categoryId: 'kids',
      title: 'Детский комбинезон зимний',
      description: 'Мембрана, утеплитель 200 г.',
      price: 560,
      stock: 8,
      colors: ['Синий', 'Розовый'],
      sizes: ['92', '98', '104', '110'],
      views: 133,
    ),
  ];

  static Shop shop(String id) => shops.firstWhere((s) => s.id == id);
  static Product product(String id) => products.firstWhere((p) => p.id == id);
  static Category category(String id) => categories.firstWhere((c) => c.id == id);
  static List<Product> productsOf(String shopId) => products.where((p) => p.shopId == shopId).toList();

  /// Conversations shown in the Chats tab.
  static List<Conversation> conversations() {
    final now = DateTime.now();
    return [
      Conversation(
        id: 'c1',
        shopId: 's1',
        productId: 'p1',
        unread: 2,
        messages: [
          ChatMessage(
            fromMe: true,
            kind: MessageKind.text,
            text: 'Salam! Redmi Note 14 Pro bar, mavi reňkde?',
            time: now.subtract(const Duration(minutes: 42)),
          ),
          ChatMessage(
            fromMe: false,
            kind: MessageKind.text,
            text: 'Salam! Hawa, bar. Şu gün eltip bilerin.',
            time: now.subtract(const Duration(minutes: 30)),
          ),
          ChatMessage(fromMe: false, kind: MessageKind.photo, time: now.subtract(const Duration(minutes: 29))),
          ChatMessage(fromMe: false, kind: MessageKind.voice, seconds: 14, time: now.subtract(const Duration(minutes: 28))),
        ],
      ),
      Conversation(
        id: 'c2',
        shopId: 's2',
        productId: 'p5',
        messages: [
          ChatMessage(
            fromMe: true,
            kind: MessageKind.text,
            text: 'Здравствуйте, размер M есть в бежевом?',
            time: now.subtract(const Duration(hours: 5)),
          ),
          ChatMessage(
            fromMe: false,
            kind: MessageKind.text,
            text: 'Да, есть. Можете забрать на рынке.',
            time: now.subtract(const Duration(hours: 4)),
          ),
        ],
      ),
    ];
  }

  /// Orders that arrive in the seller panel (demo).
  static List<Order> sellerOrders() {
    final now = DateTime.now();
    return [
      Order(
        id: '1048',
        shopId: 's1',
        customerName: 'Aýna',
        customerPhone: '+993 65 123456',
        createdAt: now.subtract(const Duration(minutes: 25)),
        lines: [CartLine(product: product('p1'), color: 'Синий')],
      ),
      Order(
        id: '1047',
        shopId: 's1',
        customerName: 'Merdan',
        customerPhone: '+993 61 765432',
        createdAt: now.subtract(const Duration(hours: 3)),
        status: OrderStatus.confirmed,
        lines: [
          CartLine(product: product('p2'), qty: 2),
          CartLine(product: product('p3')),
        ],
      ),
      Order(
        id: '1043',
        shopId: 's1',
        customerName: 'Gülşat',
        customerPhone: '+993 62 112233',
        createdAt: now.subtract(const Duration(days: 1)),
        status: OrderStatus.shipping,
        lines: [CartLine(product: product('p3'), qty: 3)],
      ),
      Order(
        id: '1039',
        shopId: 's1',
        customerName: 'Döwlet',
        customerPhone: '+993 63 445566',
        createdAt: now.subtract(const Duration(days: 3)),
        status: OrderStatus.delivered,
        lines: [CartLine(product: product('p2'))],
      ),
    ];
  }
}
