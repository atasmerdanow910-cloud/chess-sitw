// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appName => 'Kerwen Market';

  @override
  String get navHome => 'Главная';

  @override
  String get navShops => 'Магазины';

  @override
  String get navCart => 'Корзина';

  @override
  String get navChats => 'Чаты';

  @override
  String get navProfile => 'Профиль';

  @override
  String get searchHint => 'Найти товар или магазин';

  @override
  String get searchNothingFound => 'Ничего не найдено';

  @override
  String get categories => 'Категории';

  @override
  String get popularShops => 'Популярные магазины';

  @override
  String get newProducts => 'Новые товары';

  @override
  String get seeAll => 'Все';

  @override
  String get allShops => 'Все магазины';

  @override
  String get products => 'Товары';

  @override
  String productsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count товара',
      many: '$count товаров',
      few: '$count товара',
      one: '$count товар',
      zero: 'нет товаров',
    );
    return '$_temp0';
  }

  @override
  String reviewsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count отзыва',
      many: '$count отзывов',
      few: '$count отзыва',
      one: '$count отзыв',
      zero: 'нет отзывов',
    );
    return '$_temp0';
  }

  @override
  String get badgeNew => 'Новинка';

  @override
  String get verifiedSeller => 'Проверенный торговец';

  @override
  String inStock(int count) {
    return 'В наличии: $count шт.';
  }

  @override
  String get outOfStock => 'Нет в наличии';

  @override
  String get addToCart => 'В корзину';

  @override
  String get addedToCart => 'Добавлено в корзину';

  @override
  String get writeToSeller => 'Написать продавцу';

  @override
  String get description => 'Описание';

  @override
  String get variantColor => 'Цвет';

  @override
  String get variantSize => 'Размер';

  @override
  String get shop => 'Магазин';

  @override
  String get workingHours => 'Часы работы';

  @override
  String get address => 'Адрес';

  @override
  String get favorites => 'Избранное';

  @override
  String get favoritesEmpty => 'Здесь появятся товары, которые вам понравились';

  @override
  String get report => 'Пожаловаться';

  @override
  String get cartEmpty => 'Корзина пуста';

  @override
  String get cartEmptyHint => 'Добавьте товары из магазинов';

  @override
  String get total => 'Итого';

  @override
  String get checkout => 'Оформить заказ';

  @override
  String get checkoutPerShopHint =>
      'Заказ оформляется отдельно в каждом магазине. Оплату и доставку вы обсуждаете с продавцом в чате.';

  @override
  String get chatsEmpty => 'Пока нет сообщений';

  @override
  String get messageHint => 'Сообщение…';

  @override
  String get voiceMessage => 'Голосовое сообщение';

  @override
  String get photo => 'Фото';

  @override
  String get video => 'Видео';

  @override
  String get attach => 'Прикрепить';

  @override
  String get guest => 'Гость';

  @override
  String get loginPrompt =>
      'Войдите, чтобы оформлять заказы и писать продавцам';

  @override
  String get login => 'Войти';

  @override
  String get loginWithGoogle => 'Войти через Google';

  @override
  String get or => 'или';

  @override
  String get phone => 'Номер телефона';

  @override
  String get password => 'Пароль';

  @override
  String get register => 'Регистрация';

  @override
  String get googleFallbackHint =>
      'Если Google не работает, войдите по номеру телефона';

  @override
  String get myOrders => 'Мои заказы';

  @override
  String get language => 'Язык';

  @override
  String get theme => 'Тема';

  @override
  String get themeSystem => 'Системная';

  @override
  String get themeLight => 'Светлая';

  @override
  String get themeDark => 'Тёмная';

  @override
  String get sellerPanel => 'Панель магазина';

  @override
  String get privacyPolicy => 'Политика конфиденциальности';

  @override
  String get termsOfUse => 'Правила пользования';

  @override
  String appVersion(String version) {
    return 'Версия $version';
  }

  @override
  String get myShop => 'Мой магазин';

  @override
  String subscriptionPaidUntil(String date) {
    return 'Подписка оплачена до $date';
  }

  @override
  String subscriptionEndsSoon(int days) {
    return 'Подписка закончится через $days дн. Свяжитесь с администрацией, чтобы продлить.';
  }

  @override
  String get subscriptionExpired =>
      'Подписка закончилась. Магазин скрыт из каталога, данные сохранены.';

  @override
  String get statViews => 'Просмотры';

  @override
  String get statOrders => 'Заказы';

  @override
  String get statProducts => 'Товары';

  @override
  String get popularProducts => 'Популярные товары';

  @override
  String views(int count) {
    return '$count просм.';
  }

  @override
  String get orders => 'Заказы';

  @override
  String get messages => 'Сообщения';

  @override
  String get shopProfile => 'Профиль магазина';

  @override
  String get addProduct => 'Добавить товар';

  @override
  String get editProduct => 'Изменить товар';

  @override
  String get productTitle => 'Название';

  @override
  String get productPrice => 'Цена, TMT';

  @override
  String get productStock => 'Остаток, шт.';

  @override
  String get productCategory => 'Категория';

  @override
  String get productPhotos => 'Фото и видео';

  @override
  String get fieldRequired => 'Заполните это поле';

  @override
  String get fieldInvalidNumber => 'Введите число';

  @override
  String get save => 'Сохранить';

  @override
  String get saved => 'Сохранено';

  @override
  String get edit => 'Изменить';

  @override
  String get hidden => 'Скрыт';

  @override
  String get delete => 'Удалить';

  @override
  String get cancel => 'Отмена';

  @override
  String get shopName => 'Название магазина';

  @override
  String get shopPhone => 'Телефон для покупателей';

  @override
  String get legalName => 'Юрлицо / ИП (если есть)';

  @override
  String get returnPolicy => 'Правила возврата';

  @override
  String orderNumber(String id) {
    return 'Заказ №$id';
  }

  @override
  String get orderStatusNew => 'Новый';

  @override
  String get orderStatusConfirmed => 'Подтверждён';

  @override
  String get orderStatusShipping => 'В пути';

  @override
  String get orderStatusDelivered => 'Выдан';

  @override
  String get orderStatusCancelled => 'Отменён';

  @override
  String get comingSoon => 'Эта функция скоро появится';

  @override
  String get pageNotFound => 'Страница не найдена';

  @override
  String get goHome => 'На главную';

  @override
  String get acceptTerms => 'Я принимаю правила и политику конфиденциальности';

  @override
  String get activate => 'Активировать';

  @override
  String get active => 'Активна';

  @override
  String get addBanner => 'Новый баннер';

  @override
  String get addCategory => 'Новая категория';

  @override
  String get addFirstProduct =>
      'Нажмите «Добавить товар», чтобы выставить первый товар';

  @override
  String get addVariant => 'Добавить';

  @override
  String get addressOrMarket => 'Адрес / рынок';

  @override
  String get amountTmt => 'Сумма, TMT';

  @override
  String get apply => 'Применить';

  @override
  String get banners => 'Баннеры';

  @override
  String get blockShop => 'Заблокировать магазин';

  @override
  String get blockShopConfirm =>
      'Заблокировать магазин? Он исчезнет из каталога.';

  @override
  String get blockShopHint => 'Скрыт от покупателей, данные сохраняются';

  @override
  String get blockUser => 'Заблокировать пользователя';

  @override
  String get blockedByModerator => 'Скрыт модератором';

  @override
  String get broadcast => 'Рассылка';

  @override
  String get broadcastConfirm =>
      'Отправить сообщение всем выбранным пользователям?';

  @override
  String get broadcastHint => 'Сообщение появится в уведомлениях приложения';

  @override
  String broadcastSent(int count) {
    return 'Отправлено: $count';
  }

  @override
  String get buyer => 'Покупатель';

  @override
  String get cancelOrder => 'Отменить заказ';

  @override
  String get cancelOrderConfirm => 'Отменить этот заказ?';

  @override
  String get changePassword => 'Сменить пароль';

  @override
  String get chooseVariant => 'Выберите цвет и размер';

  @override
  String get colorHex => 'Цвет (#RRGGBB)';

  @override
  String get copied => 'Скопировано';

  @override
  String get copy => 'Копировать';

  @override
  String get createAndGetCode => 'Создать и получить код';

  @override
  String get currentPassword => 'Текущий пароль';

  @override
  String get deleteConfirm => 'Удалить?';

  @override
  String get deleteProductConfirm =>
      'Удалить товар? Покупатели больше не увидят его.';

  @override
  String get deliveryAddress => 'Адрес доставки (необязательно)';

  @override
  String get editProfile => 'Профиль';

  @override
  String get emptyUnlimited => 'Пусто = без ограничений';

  @override
  String get errAccountLocked =>
      'Слишком много попыток. Попробуйте через 15 минут.';

  @override
  String get errAlreadySeller => 'У вас уже есть магазин';

  @override
  String get errFileTooLarge => 'Файл слишком большой';

  @override
  String get errFileType => 'Этот тип файла не поддерживается';

  @override
  String get errGeneric => 'Что-то пошло не так. Попробуйте ещё раз.';

  @override
  String get errGoogleUnavailable =>
      'Google сейчас недоступен. Войдите по номеру телефона.';

  @override
  String get errInvalidCredentials => 'Неверный телефон или пароль';

  @override
  String get errInvalidPhone => 'Введите номер в формате +993 6X XXXXXX';

  @override
  String get errInviteInvalid => 'Код неверный, уже использован или устарел';

  @override
  String get errNetwork => 'Нет связи с сервером';

  @override
  String get errNetworkHint => 'Проверьте интернет (и VPN) и попробуйте снова';

  @override
  String get errNotFound => 'Не найдено или больше недоступно';

  @override
  String get errOutOfStock => 'Столько товара нет в наличии';

  @override
  String get errOwnShop => 'Нельзя заказать в своём магазине';

  @override
  String get errPhoneTaken => 'Этот номер уже зарегистрирован. Войдите.';

  @override
  String get errProductLimit => 'Достигнут лимит товаров вашего тарифа';

  @override
  String get errProductUnavailable => 'Товар больше недоступен';

  @override
  String get errReviewExists => 'Вы уже оставили отзыв';

  @override
  String get errShopBlocked =>
      'Магазин заблокирован. Свяжитесь с администрацией.';

  @override
  String get errShopUnavailable => 'Магазин сейчас не работает';

  @override
  String get errStatusChanged =>
      'Статус заказа уже изменился. Обновите страницу.';

  @override
  String get errTimeout => 'Сервер долго не отвечает. Попробуйте ещё раз.';

  @override
  String get errTooMany => 'Слишком много запросов. Подождите минуту.';

  @override
  String get errUserBlocked =>
      'Аккаунт заблокирован. Свяжитесь с администрацией.';

  @override
  String get errValidation => 'Проверьте заполненные поля';

  @override
  String get errWrongPassword => 'Неверный текущий пароль';

  @override
  String get filterActive => 'Активные';

  @override
  String get filterBlocked => 'Заблокированные';

  @override
  String get filterEnding => 'Скоро закончится';

  @override
  String get filterExpired => 'Просроченные';

  @override
  String get filterUnclaimed => 'Не активированы';

  @override
  String get filters => 'Фильтры';

  @override
  String get finalPriceHint =>
      'Итоговую сумму рассчитает сервер по актуальным ценам';

  @override
  String get freeDays => 'Бесплатных дней';

  @override
  String get goShopping => 'К покупкам';

  @override
  String get haveAccountLogin => 'Уже есть аккаунт? Войти';

  @override
  String get hiddenHint => 'Скрыт: покупатели не видят товар';

  @override
  String get hideProduct => 'Скрыть товар';

  @override
  String get iAmSeller => 'Я торговец';

  @override
  String get iAmSellerHint => 'Ввести код от администрации';

  @override
  String get inviteAccepted => 'Готово! Ваш магазин открыт.';

  @override
  String get inviteCode => 'Код торговца';

  @override
  String get inviteCodes => 'Коды приглашения';

  @override
  String get inviteExplain =>
      'Магазины открываются только после личной встречи с администрацией. Введите код, который вам дали.';

  @override
  String get inviteInstructions =>
      'Передайте код торговцу. Он устанавливает приложение, регистрируется и вводит код в «Профиль → Я торговец».';

  @override
  String itemsCount(int count) {
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
  String get leaveReview => 'Оставить отзыв';

  @override
  String get logout => 'Выйти';

  @override
  String get logoutConfirm => 'Выйти из аккаунта?';

  @override
  String get markAllRead => 'Отметить всё прочитанным';

  @override
  String get markAs => 'Отметить';

  @override
  String get markResolved => 'Решено';

  @override
  String get messageLabel => 'Текст сообщения';

  @override
  String get methodCash => 'Наличные';

  @override
  String get methodOther => 'Другое';

  @override
  String get methodTransfer => 'Перевод';

  @override
  String get micPermission =>
      'Разрешите доступ к микрофону в настройках телефона';

  @override
  String get moderation => 'Модерация и жалобы';

  @override
  String get month => 'мес.';

  @override
  String get months => 'Месяцев';

  @override
  String get mustAcceptTerms => 'Нужно принять правила';

  @override
  String get name => 'Имя';

  @override
  String get newInviteCode => 'Новый код приглашения';

  @override
  String get newPassword => 'Новый пароль';

  @override
  String get newSeller => 'Новый торговец';

  @override
  String get newSellerHint =>
      'После личной встречи создайте магазин и передайте торговцу код.';

  @override
  String get noAccountRegister => 'Нет аккаунта? Регистрация';

  @override
  String get noCategory => 'Без категории';

  @override
  String get noNotifications => 'Уведомлений пока нет';

  @override
  String get noOrdersYet => 'Заказов пока нет';

  @override
  String get noPayments => 'Оплат пока нет';

  @override
  String get noProductsYet => 'Товаров пока нет';

  @override
  String get noReports => 'Жалоб нет';

  @override
  String get noShopsYet => 'Магазинов пока нет';

  @override
  String get notActivatedYet => 'Торговец ещё не ввёл код';

  @override
  String get note => 'Заметка';

  @override
  String get notifications => 'Уведомления';

  @override
  String get ok => 'OK';

  @override
  String get open => 'Открыть';

  @override
  String get orderComment => 'Комментарий к заказу';

  @override
  String get orderCreated =>
      'Заказ отправлен продавцу! Он свяжется с вами. Оплату и доставку обсудите в чате.';

  @override
  String get ownerPanel => 'Панель владельца';

  @override
  String get paidUntil => 'Оплачено до';

  @override
  String get passwordRule => 'Минимум 8 символов';

  @override
  String get paymentHint =>
      'Онлайн-оплаты нет. Оплата наличными или переводом — договоритесь с продавцом в чате.';

  @override
  String get paymentMethod => 'Способ оплаты';

  @override
  String get paymentsHistory => 'История оплат';

  @override
  String get photoFromGallery => 'Фото из галереи';

  @override
  String get placeOrder => 'Отправить заказ';

  @override
  String get plan => 'Тариф';

  @override
  String get plans => 'Тарифы подписки';

  @override
  String get plansHint =>
      'Цены и лимиты хранятся на сервере, их можно менять в любой момент.';

  @override
  String get priceFrom => 'Цена от';

  @override
  String get priceRange => 'Цена';

  @override
  String get priceTo => 'Цена до';

  @override
  String get productBlockedText =>
      'Товар скрыт модератором. Свяжитесь с администрацией.';

  @override
  String get productLimit => 'Лимит товаров';

  @override
  String get recordPayment => 'Принять оплату';

  @override
  String get recording => 'Идёт запись…';

  @override
  String get reject => 'Отклонить';

  @override
  String get reportHint => 'Опишите, что не так. Администрация проверит.';

  @override
  String get reportOpen => 'Новые';

  @override
  String get reportReason => 'Причина';

  @override
  String get reportRejected => 'Отклонены';

  @override
  String get reportResolved => 'Решены';

  @override
  String get reportSent => 'Жалоба отправлена. Спасибо!';

  @override
  String get reset => 'Сбросить';

  @override
  String get retry => 'Повторить';

  @override
  String get revenueThisMonth => 'Доход от подписок за месяц';

  @override
  String get revenueTotal => 'Всего';

  @override
  String get reviewHint => 'Что понравилось или нет?';

  @override
  String get reviews => 'Отзывы';

  @override
  String get roleBuyer => 'Покупатель';

  @override
  String get roleOwner => 'Владелец';

  @override
  String get roleSeller => 'Торговец';

  @override
  String get searchUsers => 'Имя или телефон';

  @override
  String get sellerName => 'Имя торговца';

  @override
  String get send => 'Отправить';

  @override
  String get setPassword => 'Задать пароль (запасной вход)';

  @override
  String get shopBlockedText => 'Магазин заблокирован администрацией';

  @override
  String get shopsAndSellers => 'Магазины и торговцы';

  @override
  String get sortBy => 'Сортировка';

  @override
  String get sortNew => 'Сначала новые';

  @override
  String get sortOrder => 'Порядок';

  @override
  String get sortPopular => 'Популярные';

  @override
  String get sortPriceAsc => 'Сначала дешёвые';

  @override
  String get sortPriceDesc => 'Сначала дорогие';

  @override
  String get statActiveShops => 'Работают';

  @override
  String get statBuyers => 'Покупатели';

  @override
  String get statExpiredShops => 'Не оплачены';

  @override
  String get statReports => 'Жалобы';

  @override
  String get statSellers => 'Торговцы';

  @override
  String stockShort(int count) {
    return 'ост. $count';
  }

  @override
  String get takePhoto => 'Сделать фото';

  @override
  String get titleLabel => 'Заголовок';

  @override
  String get typing => 'печатает…';

  @override
  String get unlimited => 'без лимита';

  @override
  String get used => 'Использован';

  @override
  String get users => 'Пользователи';

  @override
  String get validUntil => 'Действует до';

  @override
  String get variantValueHint => 'Например: Чёрный или 42';

  @override
  String get variants => 'Варианты (цвет, размер)';

  @override
  String get videoTooLarge => 'Видео слишком большое. Выберите короче.';

  @override
  String get viewAsBuyer => 'Посмотреть как покупатель';

  @override
  String get visibleHint => 'Покупатели видят товар в каталоге';

  @override
  String get visibleToBuyers => 'Показывать покупателям';

  @override
  String get writeToSellerShort => 'Чат';

  @override
  String get you => 'Вы';

  @override
  String get privacyText =>
      'ЧЕРНОВИК — требует проверки местным юристом.\n\nПолитика конфиденциальности Kerwen Market\n\n1. Какие данные мы храним\n• Имя и номер телефона (для входа и заказов).\n• Email и Google ID — только если вы входите через Google.\n• Заказы: товары, сумма, телефон для связи, адрес (если указали).\n• Сообщения в чате, фото, видео и голосовые, которые вы отправили.\n• Технические данные: время входа, устройство (для защиты аккаунта).\nМы не собираем геолокацию и контакты телефона. Из фото удаляются скрытые данные (EXIF, GPS).\n\n2. Зачем\nЧтобы работали вход, каталог, заказы и чат; чтобы защищать от мошенничества и спама.\n\n3. Кто видит ваши данные\n• Продавец видит ваше имя и телефон для связи — только по вашему заказу.\n• Переписку видят только два участника чата. Администрация видит сообщение только если на него поступила жалоба.\n• Мы не продаём и не передаём данные рекламодателям.\n\n4. Защита\nСоединение шифруется (HTTPS). Пароли хранятся только в виде защищённого хэша. Ссылки на файлы временные.\n\n5. Срок хранения и удаление\nДанные хранятся, пока у вас есть аккаунт. Чтобы удалить аккаунт и данные, напишите администрации в приложении.\n\n6. Контакты\nВопросы о данных — через администрацию Kerwen Market.';

  @override
  String get termsText =>
      'ЧЕРНОВИК — требует проверки местным юристом.\n\nПравила пользования Kerwen Market\n\n1. Kerwen Market — площадка, где торговцы показывают товары, а покупатели их заказывают. Продавец сам отвечает за товар, его описание, цену и качество.\n2. Онлайн-оплаты в приложении нет. Покупатель и продавец договариваются об оплате (наличные или перевод) и доставке в чате.\n3. Торговцы получают доступ только после личной встречи с администрацией и платят ежемесячную подписку. Если подписка не оплачена, магазин скрывается из каталога, данные сохраняются.\n4. Запрещено: товары, запрещённые законом; обман и подделки; спам; оскорбления; чужие фото без разрешения.\n5. Любой пользователь может пожаловаться на товар, магазин, пользователя или сообщение. Администрация может скрыть товар или заблокировать аккаунт.\n6. Возврат и обмен — по правилам магазина (указаны в профиле магазина) и законам Туркменистана о защите прав потребителей.\n7. Администрация может менять правила; об изменениях сообщается в приложении.';
}
