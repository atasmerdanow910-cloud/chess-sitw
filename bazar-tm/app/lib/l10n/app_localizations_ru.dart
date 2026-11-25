// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appName => 'Bazar TM';

  @override
  String get tabHome => 'Главная';

  @override
  String get tabCatalog => 'Каталог';

  @override
  String get tabCart => 'Корзина';

  @override
  String get tabChats => 'Чаты';

  @override
  String get tabProfile => 'Профиль';

  @override
  String get chooseLanguage => 'Выберите язык';

  @override
  String get chooseLanguageHint => 'Язык можно поменять в профиле';

  @override
  String get continueButton => 'Продолжить';

  @override
  String get searchHint => 'Поиск товаров и магазинов';

  @override
  String get bannerTitle1 => 'Новые поступления из Китая';

  @override
  String get bannerText1 => 'Каждую неделю — новые товары от торговцев';

  @override
  String get bannerTitle2 => 'Проверенные торговцы';

  @override
  String get bannerText2 => 'Владелец площадки лично знакомится с каждым';

  @override
  String get bannerTitle3 => 'Оплата при получении';

  @override
  String get bannerText3 => 'Детали заказа обсудите с торговцем в чате';

  @override
  String get categories => 'Категории';

  @override
  String get popularShops => 'Популярные магазины';

  @override
  String get newProducts => 'Новые товары';

  @override
  String get seeAll => 'Все';

  @override
  String get greeting => 'Добро пожаловать';

  @override
  String get productsTab => 'Товары';

  @override
  String get shopsTab => 'Магазины';

  @override
  String get filters => 'Фильтры';

  @override
  String get price => 'Цена, TMT';

  @override
  String get priceFrom => 'от';

  @override
  String get priceTo => 'до';

  @override
  String get allCategories => 'Все категории';

  @override
  String get apply => 'Применить';

  @override
  String get reset => 'Сбросить';

  @override
  String get nothingFound => 'Ничего не найдено';

  @override
  String get nothingFoundHint => 'Измените запрос или фильтры';

  @override
  String foundCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Найдено $count товара',
      many: 'Найдено $count товаров',
      few: 'Найдено $count товара',
      one: 'Найден $count товар',
    );
    return '$_temp0';
  }

  @override
  String inStock(int count) {
    return 'В наличии: $count шт.';
  }

  @override
  String get outOfStock => 'Нет в наличии';

  @override
  String get addToCart => 'В корзину';

  @override
  String get inCart => 'В корзине';

  @override
  String get addedToCart => 'Добавлено в корзину';

  @override
  String get chatWithSeller => 'Написать';

  @override
  String get description => 'Описание';

  @override
  String get color => 'Цвет';

  @override
  String get size => 'Размер';

  @override
  String get openShop => 'В магазин';

  @override
  String get addToFavorites => 'В избранное';

  @override
  String get removeFromFavorites => 'Убрать из избранного';

  @override
  String get report => 'Пожаловаться';

  @override
  String get reportSent => 'Жалоба отправлена владельцу площадки';

  @override
  String reviewsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count отзыва',
      many: '$count отзывов',
      few: '$count отзыва',
      one: '$count отзыв',
    );
    return '$_temp0';
  }

  @override
  String productsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count товара',
      many: '$count товаров',
      few: '$count товара',
      one: '$count товар',
    );
    return '$_temp0';
  }

  @override
  String get workingHours => 'Часы работы';

  @override
  String get address => 'Адрес';

  @override
  String get verifiedSeller => 'Проверенный торговец';

  @override
  String get aboutShop => 'О магазине';

  @override
  String get cartTitle => 'Корзина';

  @override
  String get cartEmpty => 'Корзина пуста';

  @override
  String get cartEmptyHint => 'Добавьте товары из каталога — заказ оформляется в каждом магазине отдельно';

  @override
  String get goToCatalog => 'Перейти в каталог';

  @override
  String get oneShopNote => 'Заказ оформляется отдельно для каждого магазина';

  @override
  String get total => 'Итого';

  @override
  String get checkout => 'Оформить заказ';

  @override
  String get checkoutTitle => 'Оформление заказа';

  @override
  String get yourName => 'Ваше имя';

  @override
  String get phone => 'Телефон';

  @override
  String get deliveryAddress => 'Адрес доставки';

  @override
  String get comment => 'Комментарий для торговца';

  @override
  String get paymentNote => 'Онлайн-оплаты нет: оплата при получении или переводом. Детали обсудите с торговцем в чате.';

  @override
  String get placeOrder => 'Подтвердить заказ';

  @override
  String get orderPlaced => 'Заказ отправлен торговцу';

  @override
  String orderNumber(String id) {
    return 'Заказ № $id';
  }

  @override
  String get requiredField => 'Заполните это поле';

  @override
  String get invalidPhone => 'Номер в формате +993 6X XXXXXX';

  @override
  String get ordersTitle => 'Мои заказы';

  @override
  String get ordersEmpty => 'Заказов пока нет';

  @override
  String get statusNew => 'Новый';

  @override
  String get statusConfirmed => 'Подтверждён';

  @override
  String get statusShipping => 'В пути';

  @override
  String get statusDelivered => 'Выдан';

  @override
  String get statusCancelled => 'Отменён';

  @override
  String get chatsTitle => 'Чаты';

  @override
  String get chatsEmpty => 'Сообщений пока нет';

  @override
  String get chatsEmptyHint => 'Откройте товар и нажмите «Написать»';

  @override
  String get messageHint => 'Сообщение…';

  @override
  String get typing => 'печатает…';

  @override
  String get online => 'в сети';

  @override
  String get photo => 'Фото';

  @override
  String get voiceMessage => 'Голосовое';

  @override
  String get chatProtected => 'Переписку видите только вы и торговец';

  @override
  String get attach => 'Прикрепить';

  @override
  String get send => 'Отправить';

  @override
  String get recordVoice => 'Записать голосовое';

  @override
  String get profileTitle => 'Профиль';

  @override
  String get guest => 'Гость';

  @override
  String get guestHint => 'Войдите, чтобы оформлять заказы и писать торговцам';

  @override
  String get signIn => 'Войти';

  @override
  String get signInGoogle => 'Войти через Google';

  @override
  String get signInPhone => 'Войти по номеру телефона';

  @override
  String get googleFallbackHint => 'Если Google не открывается, войдите по номеру телефона и паролю';

  @override
  String get password => 'Пароль';

  @override
  String get register => 'Регистрация';

  @override
  String get noAccount => 'Нет аккаунта? Зарегистрируйтесь';

  @override
  String get haveAccount => 'Уже есть аккаунт? Войдите';

  @override
  String get comingSoon => 'Скоро будет доступно';

  @override
  String get favorites => 'Избранное';

  @override
  String get favoritesEmpty => 'В избранном пусто';

  @override
  String get language => 'Язык';

  @override
  String get theme => 'Тема';

  @override
  String get themeSystem => 'Авто';

  @override
  String get themeLight => 'Светлая';

  @override
  String get themeDark => 'Тёмная';

  @override
  String get iAmSeller => 'Я торговец';

  @override
  String get sellerInviteHint => 'Магазины открывает владелец площадки после личной встречи. Введите код приглашения, который он вам дал.';

  @override
  String get inviteCode => 'Код приглашения';

  @override
  String get sellerPanel => 'Панель торговца';

  @override
  String get demoSellerMode => 'Показать панель торговца (демо)';

  @override
  String get privacy => 'Конфиденциальность и правила';

  @override
  String get support => 'Поддержка';

  @override
  String version(String version) {
    return 'Версия $version';
  }

  @override
  String get sellerOverview => 'Обзор';

  @override
  String get subscription => 'Подписка';

  @override
  String paidUntil(String date) {
    return 'Оплачено до $date';
  }

  @override
  String daysLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Осталось $count дня',
      many: 'Осталось $count дней',
      few: 'Осталось $count дня',
      one: 'Остался $count день',
    );
    return '$_temp0';
  }

  @override
  String get subscriptionSoon => 'Подписка скоро закончится — свяжитесь с владельцем площадки';

  @override
  String planName(String name) {
    return 'Тариф «$name»';
  }

  @override
  String get statViews => 'Просмотры';

  @override
  String get statOrders => 'Заказы';

  @override
  String get statRevenue => 'Выручка, TMT';

  @override
  String get statProducts => 'Товары';

  @override
  String get last30Days => 'за 30 дней';

  @override
  String get popularProducts => 'Популярные товары';

  @override
  String get addProduct => 'Добавить товар';

  @override
  String get editProduct => 'Изменить товар';

  @override
  String get productTitle => 'Название';

  @override
  String get stock => 'Остаток, шт.';

  @override
  String get category => 'Категория';

  @override
  String get variants => 'Варианты (цвет, размер)';

  @override
  String get variantsHint => 'Например: красный, синий';

  @override
  String get photosVideo => 'Фото и видео';

  @override
  String get addPhoto => 'Добавить';

  @override
  String get save => 'Сохранить';

  @override
  String get saved => 'Сохранено';

  @override
  String get hidden => 'Скрыт';

  @override
  String get visible => 'В продаже';

  @override
  String get hide => 'Скрыть';

  @override
  String get show => 'Показать';

  @override
  String get delete => 'Удалить';

  @override
  String get deleteProductQuestion => 'Удалить товар?';

  @override
  String get deleteProductText => 'Товар пропадёт из магазина. Это действие нельзя отменить.';

  @override
  String get cancel => 'Отмена';

  @override
  String get sellerOrders => 'Заказы';

  @override
  String get sellerProducts => 'Товары';

  @override
  String get shopProfile => 'Магазин';

  @override
  String get changeStatus => 'Изменить статус';

  @override
  String get customer => 'Покупатель';

  @override
  String get shopName => 'Название магазина';

  @override
  String get shopDescription => 'Описание магазина';

  @override
  String get marketAddress => 'Рынок или адрес';

  @override
  String get legalName => 'Юрлицо или ИП (необязательно)';

  @override
  String get returnPolicy => 'Правила возврата';

  @override
  String get logo => 'Логотип';

  @override
  String get or => 'или';

  @override
  String get forgotPassword => 'Забыли пароль?';

  @override
  String get favoritesEmptyHint => 'Нажмите ♡ на товаре, чтобы сохранить его здесь';

  @override
  String get video => 'Видео';

  @override
  String get openChat => 'Открыть чат';

  @override
  String get orderPlacedHint => 'Торговец подтвердит заказ и напишет вам в чате';

  @override
  String get moreFromShop => 'Ещё в этом магазине';

  @override
  String get productsEmpty => 'Товаров пока нет';

  @override
  String get sort => 'Сортировка';

  @override
  String get sortPopular => 'Популярные';

  @override
  String get sortCheap => 'Сначала дешёвые';

  @override
  String get sortExpensive => 'Сначала дорогие';

  @override
  String get sortNew => 'Сначала новые';

  @override
  String get reportTitle => 'Что не так?';

  @override
  String get reasonFraud => 'Мошенничество';

  @override
  String get reasonProhibited => 'Запрещённый товар';

  @override
  String get reasonWrongInfo => 'Неверное описание или цена';

  @override
  String get reasonOther => 'Другое';

  @override
  String get planTrial => 'Пробный';

  @override
  String get planStart => 'Старт';

  @override
  String get planBusiness => 'Бизнес';

  @override
  String get planPro => 'Про';

  @override
  String get subscriptionActive => 'Подписка активна';

  @override
  String get contactOwner => 'Написать владельцу площадки';

  @override
  String get demoData => 'Демо-режим: тестовые данные';

  @override
  String get markConfirmed => 'Подтвердить заказ';

  @override
  String get markShipping => 'Отправить покупателю';

  @override
  String get markDelivered => 'Отметить: выдан';

  @override
  String get markCancelled => 'Отменить заказ';

  @override
  String get lowStock => 'Осталось мало';

  @override
  String viewsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count просмотра',
      many: '$count просмотров',
      few: '$count просмотра',
      one: '$count просмотр',
    );
    return '$_temp0';
  }

  @override
  String get photoCompressNote => 'Фото сжимаются до 1280 px — так покупатели тратят меньше интернета';

  @override
  String get invalidNumber => 'Введите число';

  @override
  String get hiddenHint => 'Скрытый товар покупатели не видят';

  @override
  String get today => 'Сегодня';

  @override
  String get yesterday => 'Вчера';

  @override
  String get addressHint => 'Город, улица, дом — или «заберу на рынке»';

  @override
  String get optional => 'необязательно';

  @override
  String get newBadge => 'Новинка';

  @override
  String get statistics => 'Статистика';

  @override
  String get signOut => 'Выйти';

  @override
  String get signOutAll => 'Выйти на всех устройствах';

  @override
  String get signOutAllQuestion => 'Выйти на всех устройствах?';

  @override
  String get signOutAllText => 'Понадобится заново войти на каждом телефоне.';

  @override
  String get changePassword => 'Сменить пароль';

  @override
  String get currentPassword => 'Текущий пароль';

  @override
  String get newPassword => 'Новый пароль';

  @override
  String get repeatPassword => 'Повторите пароль';

  @override
  String get passwordsDontMatch => 'Пароли не совпадают';

  @override
  String get passwordRules => 'Не короче 8 символов. Не 12345678 и не номер телефона.';

  @override
  String get passwordChanged => 'Пароль изменён. На других телефонах нужно войти заново.';

  @override
  String get mustChangePassword => 'Вы вошли с временным паролем. Придумайте свой.';

  @override
  String get forgotPasswordText => 'Напишите или позвоните владельцу площадки: он выдаст временный пароль, а потом вы придумаете новый.';

  @override
  String get roleBuyer => 'Покупатель';

  @override
  String get roleSeller => 'Торговец';

  @override
  String get roleOwner => 'Владелец площадки';

  @override
  String get ownerPanel => 'Панель владельца';

  @override
  String get signedIn => 'Вы вошли в аккаунт';

  @override
  String get accountCreated => 'Аккаунт создан';

  @override
  String get sellerActivated => 'Готово! Ваш магазин открыт, первый месяц бесплатно.';

  @override
  String get serverNotConnected => 'Это демо-сборка: сервер ещё не подключён. Вход заработает, когда сервер будет запущен.';

  @override
  String get signInFirst => 'Сначала войдите в аккаунт';

  @override
  String get errInvalidCredentials => 'Неверный номер или пароль';

  @override
  String get errPhoneTaken => 'Этот номер уже зарегистрирован. Войдите с ним.';

  @override
  String get errWeakPassword => 'Слишком простой пароль';

  @override
  String get errTooManyAttempts => 'Слишком много неверных паролей. Попробуйте через 15 минут.';

  @override
  String get errTooManyRequests => 'Слишком много попыток. Подождите немного.';

  @override
  String get errAccountBlocked => 'Аккаунт заблокирован. Свяжитесь с владельцем площадки.';

  @override
  String get errGoogleUnavailable => 'Google сейчас недоступен. Войдите по номеру телефона и паролю.';

  @override
  String get errInviteInvalid => 'Код неверный, уже использован или устарел';

  @override
  String get errAlreadySeller => 'У этого аккаунта уже есть магазин';

  @override
  String get errWrongPassword => 'Текущий пароль неверный';

  @override
  String get errNetwork => 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.';

  @override
  String get errSessionExpired => 'Сессия закончилась, войдите снова';

  @override
  String get errUnknown => 'Что-то пошло не так. Попробуйте ещё раз.';

  @override
  String get retry => 'Повторить';

  @override
  String get loadError => 'Не удалось загрузить';

  @override
  String get offline => 'Нет подключения к интернету';
}
