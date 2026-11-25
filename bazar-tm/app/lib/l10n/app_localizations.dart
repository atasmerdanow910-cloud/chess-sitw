import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ru.dart';
import 'app_localizations_tk.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('ru'), Locale('tk')];

  /// No description provided for @appName.
  ///
  /// In ru, this message translates to:
  /// **'Bazar TM'**
  String get appName;

  /// No description provided for @tabHome.
  ///
  /// In ru, this message translates to:
  /// **'Главная'**
  String get tabHome;

  /// No description provided for @tabCatalog.
  ///
  /// In ru, this message translates to:
  /// **'Каталог'**
  String get tabCatalog;

  /// No description provided for @tabCart.
  ///
  /// In ru, this message translates to:
  /// **'Корзина'**
  String get tabCart;

  /// No description provided for @tabChats.
  ///
  /// In ru, this message translates to:
  /// **'Чаты'**
  String get tabChats;

  /// No description provided for @tabProfile.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get tabProfile;

  /// No description provided for @chooseLanguage.
  ///
  /// In ru, this message translates to:
  /// **'Выберите язык'**
  String get chooseLanguage;

  /// No description provided for @chooseLanguageHint.
  ///
  /// In ru, this message translates to:
  /// **'Язык можно поменять в профиле'**
  String get chooseLanguageHint;

  /// No description provided for @continueButton.
  ///
  /// In ru, this message translates to:
  /// **'Продолжить'**
  String get continueButton;

  /// No description provided for @searchHint.
  ///
  /// In ru, this message translates to:
  /// **'Поиск товаров и магазинов'**
  String get searchHint;

  /// No description provided for @bannerTitle1.
  ///
  /// In ru, this message translates to:
  /// **'Новые поступления из Китая'**
  String get bannerTitle1;

  /// No description provided for @bannerText1.
  ///
  /// In ru, this message translates to:
  /// **'Каждую неделю — новые товары от торговцев'**
  String get bannerText1;

  /// No description provided for @bannerTitle2.
  ///
  /// In ru, this message translates to:
  /// **'Проверенные торговцы'**
  String get bannerTitle2;

  /// No description provided for @bannerText2.
  ///
  /// In ru, this message translates to:
  /// **'Владелец площадки лично знакомится с каждым'**
  String get bannerText2;

  /// No description provided for @bannerTitle3.
  ///
  /// In ru, this message translates to:
  /// **'Оплата при получении'**
  String get bannerTitle3;

  /// No description provided for @bannerText3.
  ///
  /// In ru, this message translates to:
  /// **'Детали заказа обсудите с торговцем в чате'**
  String get bannerText3;

  /// No description provided for @categories.
  ///
  /// In ru, this message translates to:
  /// **'Категории'**
  String get categories;

  /// No description provided for @popularShops.
  ///
  /// In ru, this message translates to:
  /// **'Популярные магазины'**
  String get popularShops;

  /// No description provided for @newProducts.
  ///
  /// In ru, this message translates to:
  /// **'Новые товары'**
  String get newProducts;

  /// No description provided for @seeAll.
  ///
  /// In ru, this message translates to:
  /// **'Все'**
  String get seeAll;

  /// No description provided for @greeting.
  ///
  /// In ru, this message translates to:
  /// **'Добро пожаловать'**
  String get greeting;

  /// No description provided for @productsTab.
  ///
  /// In ru, this message translates to:
  /// **'Товары'**
  String get productsTab;

  /// No description provided for @shopsTab.
  ///
  /// In ru, this message translates to:
  /// **'Магазины'**
  String get shopsTab;

  /// No description provided for @filters.
  ///
  /// In ru, this message translates to:
  /// **'Фильтры'**
  String get filters;

  /// No description provided for @price.
  ///
  /// In ru, this message translates to:
  /// **'Цена, TMT'**
  String get price;

  /// No description provided for @priceFrom.
  ///
  /// In ru, this message translates to:
  /// **'от'**
  String get priceFrom;

  /// No description provided for @priceTo.
  ///
  /// In ru, this message translates to:
  /// **'до'**
  String get priceTo;

  /// No description provided for @allCategories.
  ///
  /// In ru, this message translates to:
  /// **'Все категории'**
  String get allCategories;

  /// No description provided for @apply.
  ///
  /// In ru, this message translates to:
  /// **'Применить'**
  String get apply;

  /// No description provided for @reset.
  ///
  /// In ru, this message translates to:
  /// **'Сбросить'**
  String get reset;

  /// No description provided for @nothingFound.
  ///
  /// In ru, this message translates to:
  /// **'Ничего не найдено'**
  String get nothingFound;

  /// No description provided for @nothingFoundHint.
  ///
  /// In ru, this message translates to:
  /// **'Измените запрос или фильтры'**
  String get nothingFoundHint;

  /// No description provided for @foundCount.
  ///
  /// In ru, this message translates to:
  /// **'{count, plural, one{Найден {count} товар} few{Найдено {count} товара} many{Найдено {count} товаров} other{Найдено {count} товара}}'**
  String foundCount(int count);

  /// No description provided for @inStock.
  ///
  /// In ru, this message translates to:
  /// **'В наличии: {count} шт.'**
  String inStock(int count);

  /// No description provided for @outOfStock.
  ///
  /// In ru, this message translates to:
  /// **'Нет в наличии'**
  String get outOfStock;

  /// No description provided for @addToCart.
  ///
  /// In ru, this message translates to:
  /// **'В корзину'**
  String get addToCart;

  /// No description provided for @inCart.
  ///
  /// In ru, this message translates to:
  /// **'В корзине'**
  String get inCart;

  /// No description provided for @addedToCart.
  ///
  /// In ru, this message translates to:
  /// **'Добавлено в корзину'**
  String get addedToCart;

  /// No description provided for @chatWithSeller.
  ///
  /// In ru, this message translates to:
  /// **'Написать'**
  String get chatWithSeller;

  /// No description provided for @description.
  ///
  /// In ru, this message translates to:
  /// **'Описание'**
  String get description;

  /// No description provided for @color.
  ///
  /// In ru, this message translates to:
  /// **'Цвет'**
  String get color;

  /// No description provided for @size.
  ///
  /// In ru, this message translates to:
  /// **'Размер'**
  String get size;

  /// No description provided for @openShop.
  ///
  /// In ru, this message translates to:
  /// **'В магазин'**
  String get openShop;

  /// No description provided for @addToFavorites.
  ///
  /// In ru, this message translates to:
  /// **'В избранное'**
  String get addToFavorites;

  /// No description provided for @removeFromFavorites.
  ///
  /// In ru, this message translates to:
  /// **'Убрать из избранного'**
  String get removeFromFavorites;

  /// No description provided for @report.
  ///
  /// In ru, this message translates to:
  /// **'Пожаловаться'**
  String get report;

  /// No description provided for @reportSent.
  ///
  /// In ru, this message translates to:
  /// **'Жалоба отправлена владельцу площадки'**
  String get reportSent;

  /// No description provided for @reviewsCount.
  ///
  /// In ru, this message translates to:
  /// **'{count, plural, one{{count} отзыв} few{{count} отзыва} many{{count} отзывов} other{{count} отзыва}}'**
  String reviewsCount(int count);

  /// No description provided for @productsCount.
  ///
  /// In ru, this message translates to:
  /// **'{count, plural, one{{count} товар} few{{count} товара} many{{count} товаров} other{{count} товара}}'**
  String productsCount(int count);

  /// No description provided for @workingHours.
  ///
  /// In ru, this message translates to:
  /// **'Часы работы'**
  String get workingHours;

  /// No description provided for @address.
  ///
  /// In ru, this message translates to:
  /// **'Адрес'**
  String get address;

  /// No description provided for @verifiedSeller.
  ///
  /// In ru, this message translates to:
  /// **'Проверенный торговец'**
  String get verifiedSeller;

  /// No description provided for @aboutShop.
  ///
  /// In ru, this message translates to:
  /// **'О магазине'**
  String get aboutShop;

  /// No description provided for @cartTitle.
  ///
  /// In ru, this message translates to:
  /// **'Корзина'**
  String get cartTitle;

  /// No description provided for @cartEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Корзина пуста'**
  String get cartEmpty;

  /// No description provided for @cartEmptyHint.
  ///
  /// In ru, this message translates to:
  /// **'Добавьте товары из каталога — заказ оформляется в каждом магазине отдельно'**
  String get cartEmptyHint;

  /// No description provided for @goToCatalog.
  ///
  /// In ru, this message translates to:
  /// **'Перейти в каталог'**
  String get goToCatalog;

  /// No description provided for @oneShopNote.
  ///
  /// In ru, this message translates to:
  /// **'Заказ оформляется отдельно для каждого магазина'**
  String get oneShopNote;

  /// No description provided for @total.
  ///
  /// In ru, this message translates to:
  /// **'Итого'**
  String get total;

  /// No description provided for @checkout.
  ///
  /// In ru, this message translates to:
  /// **'Оформить заказ'**
  String get checkout;

  /// No description provided for @checkoutTitle.
  ///
  /// In ru, this message translates to:
  /// **'Оформление заказа'**
  String get checkoutTitle;

  /// No description provided for @yourName.
  ///
  /// In ru, this message translates to:
  /// **'Ваше имя'**
  String get yourName;

  /// No description provided for @phone.
  ///
  /// In ru, this message translates to:
  /// **'Телефон'**
  String get phone;

  /// No description provided for @deliveryAddress.
  ///
  /// In ru, this message translates to:
  /// **'Адрес доставки'**
  String get deliveryAddress;

  /// No description provided for @comment.
  ///
  /// In ru, this message translates to:
  /// **'Комментарий для торговца'**
  String get comment;

  /// No description provided for @paymentNote.
  ///
  /// In ru, this message translates to:
  /// **'Онлайн-оплаты нет: оплата при получении или переводом. Детали обсудите с торговцем в чате.'**
  String get paymentNote;

  /// No description provided for @placeOrder.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердить заказ'**
  String get placeOrder;

  /// No description provided for @orderPlaced.
  ///
  /// In ru, this message translates to:
  /// **'Заказ отправлен торговцу'**
  String get orderPlaced;

  /// No description provided for @orderNumber.
  ///
  /// In ru, this message translates to:
  /// **'Заказ № {id}'**
  String orderNumber(String id);

  /// No description provided for @requiredField.
  ///
  /// In ru, this message translates to:
  /// **'Заполните это поле'**
  String get requiredField;

  /// No description provided for @invalidPhone.
  ///
  /// In ru, this message translates to:
  /// **'Номер в формате +993 6X XXXXXX'**
  String get invalidPhone;

  /// No description provided for @ordersTitle.
  ///
  /// In ru, this message translates to:
  /// **'Мои заказы'**
  String get ordersTitle;

  /// No description provided for @ordersEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Заказов пока нет'**
  String get ordersEmpty;

  /// No description provided for @statusNew.
  ///
  /// In ru, this message translates to:
  /// **'Новый'**
  String get statusNew;

  /// No description provided for @statusConfirmed.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждён'**
  String get statusConfirmed;

  /// No description provided for @statusShipping.
  ///
  /// In ru, this message translates to:
  /// **'В пути'**
  String get statusShipping;

  /// No description provided for @statusDelivered.
  ///
  /// In ru, this message translates to:
  /// **'Выдан'**
  String get statusDelivered;

  /// No description provided for @statusCancelled.
  ///
  /// In ru, this message translates to:
  /// **'Отменён'**
  String get statusCancelled;

  /// No description provided for @chatsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Чаты'**
  String get chatsTitle;

  /// No description provided for @chatsEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Сообщений пока нет'**
  String get chatsEmpty;

  /// No description provided for @chatsEmptyHint.
  ///
  /// In ru, this message translates to:
  /// **'Откройте товар и нажмите «Написать»'**
  String get chatsEmptyHint;

  /// No description provided for @messageHint.
  ///
  /// In ru, this message translates to:
  /// **'Сообщение…'**
  String get messageHint;

  /// No description provided for @typing.
  ///
  /// In ru, this message translates to:
  /// **'печатает…'**
  String get typing;

  /// No description provided for @online.
  ///
  /// In ru, this message translates to:
  /// **'в сети'**
  String get online;

  /// No description provided for @photo.
  ///
  /// In ru, this message translates to:
  /// **'Фото'**
  String get photo;

  /// No description provided for @voiceMessage.
  ///
  /// In ru, this message translates to:
  /// **'Голосовое'**
  String get voiceMessage;

  /// No description provided for @chatProtected.
  ///
  /// In ru, this message translates to:
  /// **'Переписку видите только вы и торговец'**
  String get chatProtected;

  /// No description provided for @attach.
  ///
  /// In ru, this message translates to:
  /// **'Прикрепить'**
  String get attach;

  /// No description provided for @send.
  ///
  /// In ru, this message translates to:
  /// **'Отправить'**
  String get send;

  /// No description provided for @recordVoice.
  ///
  /// In ru, this message translates to:
  /// **'Записать голосовое'**
  String get recordVoice;

  /// No description provided for @profileTitle.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get profileTitle;

  /// No description provided for @guest.
  ///
  /// In ru, this message translates to:
  /// **'Гость'**
  String get guest;

  /// No description provided for @guestHint.
  ///
  /// In ru, this message translates to:
  /// **'Войдите, чтобы оформлять заказы и писать торговцам'**
  String get guestHint;

  /// No description provided for @signIn.
  ///
  /// In ru, this message translates to:
  /// **'Войти'**
  String get signIn;

  /// No description provided for @signInGoogle.
  ///
  /// In ru, this message translates to:
  /// **'Войти через Google'**
  String get signInGoogle;

  /// No description provided for @signInPhone.
  ///
  /// In ru, this message translates to:
  /// **'Войти по номеру телефона'**
  String get signInPhone;

  /// No description provided for @googleFallbackHint.
  ///
  /// In ru, this message translates to:
  /// **'Если Google не открывается, войдите по номеру телефона и паролю'**
  String get googleFallbackHint;

  /// No description provided for @password.
  ///
  /// In ru, this message translates to:
  /// **'Пароль'**
  String get password;

  /// No description provided for @register.
  ///
  /// In ru, this message translates to:
  /// **'Регистрация'**
  String get register;

  /// No description provided for @noAccount.
  ///
  /// In ru, this message translates to:
  /// **'Нет аккаунта? Зарегистрируйтесь'**
  String get noAccount;

  /// No description provided for @haveAccount.
  ///
  /// In ru, this message translates to:
  /// **'Уже есть аккаунт? Войдите'**
  String get haveAccount;

  /// No description provided for @comingSoon.
  ///
  /// In ru, this message translates to:
  /// **'Скоро будет доступно'**
  String get comingSoon;

  /// No description provided for @favorites.
  ///
  /// In ru, this message translates to:
  /// **'Избранное'**
  String get favorites;

  /// No description provided for @favoritesEmpty.
  ///
  /// In ru, this message translates to:
  /// **'В избранном пусто'**
  String get favoritesEmpty;

  /// No description provided for @language.
  ///
  /// In ru, this message translates to:
  /// **'Язык'**
  String get language;

  /// No description provided for @theme.
  ///
  /// In ru, this message translates to:
  /// **'Тема'**
  String get theme;

  /// No description provided for @themeSystem.
  ///
  /// In ru, this message translates to:
  /// **'Авто'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In ru, this message translates to:
  /// **'Светлая'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In ru, this message translates to:
  /// **'Тёмная'**
  String get themeDark;

  /// No description provided for @iAmSeller.
  ///
  /// In ru, this message translates to:
  /// **'Я торговец'**
  String get iAmSeller;

  /// No description provided for @sellerInviteHint.
  ///
  /// In ru, this message translates to:
  /// **'Магазины открывает владелец площадки после личной встречи. Введите код приглашения, который он вам дал.'**
  String get sellerInviteHint;

  /// No description provided for @inviteCode.
  ///
  /// In ru, this message translates to:
  /// **'Код приглашения'**
  String get inviteCode;

  /// No description provided for @sellerPanel.
  ///
  /// In ru, this message translates to:
  /// **'Панель торговца'**
  String get sellerPanel;

  /// No description provided for @demoSellerMode.
  ///
  /// In ru, this message translates to:
  /// **'Показать панель торговца (демо)'**
  String get demoSellerMode;

  /// No description provided for @privacy.
  ///
  /// In ru, this message translates to:
  /// **'Конфиденциальность и правила'**
  String get privacy;

  /// No description provided for @support.
  ///
  /// In ru, this message translates to:
  /// **'Поддержка'**
  String get support;

  /// No description provided for @version.
  ///
  /// In ru, this message translates to:
  /// **'Версия {version}'**
  String version(String version);

  /// No description provided for @sellerOverview.
  ///
  /// In ru, this message translates to:
  /// **'Обзор'**
  String get sellerOverview;

  /// No description provided for @subscription.
  ///
  /// In ru, this message translates to:
  /// **'Подписка'**
  String get subscription;

  /// No description provided for @paidUntil.
  ///
  /// In ru, this message translates to:
  /// **'Оплачено до {date}'**
  String paidUntil(String date);

  /// No description provided for @daysLeft.
  ///
  /// In ru, this message translates to:
  /// **'{count, plural, one{Остался {count} день} few{Осталось {count} дня} many{Осталось {count} дней} other{Осталось {count} дня}}'**
  String daysLeft(int count);

  /// No description provided for @subscriptionSoon.
  ///
  /// In ru, this message translates to:
  /// **'Подписка скоро закончится — свяжитесь с владельцем площадки'**
  String get subscriptionSoon;

  /// No description provided for @planName.
  ///
  /// In ru, this message translates to:
  /// **'Тариф «{name}»'**
  String planName(String name);

  /// No description provided for @statViews.
  ///
  /// In ru, this message translates to:
  /// **'Просмотры'**
  String get statViews;

  /// No description provided for @statOrders.
  ///
  /// In ru, this message translates to:
  /// **'Заказы'**
  String get statOrders;

  /// No description provided for @statRevenue.
  ///
  /// In ru, this message translates to:
  /// **'Выручка, TMT'**
  String get statRevenue;

  /// No description provided for @statProducts.
  ///
  /// In ru, this message translates to:
  /// **'Товары'**
  String get statProducts;

  /// No description provided for @last30Days.
  ///
  /// In ru, this message translates to:
  /// **'за 30 дней'**
  String get last30Days;

  /// No description provided for @popularProducts.
  ///
  /// In ru, this message translates to:
  /// **'Популярные товары'**
  String get popularProducts;

  /// No description provided for @addProduct.
  ///
  /// In ru, this message translates to:
  /// **'Добавить товар'**
  String get addProduct;

  /// No description provided for @editProduct.
  ///
  /// In ru, this message translates to:
  /// **'Изменить товар'**
  String get editProduct;

  /// No description provided for @productTitle.
  ///
  /// In ru, this message translates to:
  /// **'Название'**
  String get productTitle;

  /// No description provided for @stock.
  ///
  /// In ru, this message translates to:
  /// **'Остаток, шт.'**
  String get stock;

  /// No description provided for @category.
  ///
  /// In ru, this message translates to:
  /// **'Категория'**
  String get category;

  /// No description provided for @variants.
  ///
  /// In ru, this message translates to:
  /// **'Варианты (цвет, размер)'**
  String get variants;

  /// No description provided for @variantsHint.
  ///
  /// In ru, this message translates to:
  /// **'Например: красный, синий'**
  String get variantsHint;

  /// No description provided for @photosVideo.
  ///
  /// In ru, this message translates to:
  /// **'Фото и видео'**
  String get photosVideo;

  /// No description provided for @addPhoto.
  ///
  /// In ru, this message translates to:
  /// **'Добавить'**
  String get addPhoto;

  /// No description provided for @save.
  ///
  /// In ru, this message translates to:
  /// **'Сохранить'**
  String get save;

  /// No description provided for @saved.
  ///
  /// In ru, this message translates to:
  /// **'Сохранено'**
  String get saved;

  /// No description provided for @hidden.
  ///
  /// In ru, this message translates to:
  /// **'Скрыт'**
  String get hidden;

  /// No description provided for @visible.
  ///
  /// In ru, this message translates to:
  /// **'В продаже'**
  String get visible;

  /// No description provided for @hide.
  ///
  /// In ru, this message translates to:
  /// **'Скрыть'**
  String get hide;

  /// No description provided for @show.
  ///
  /// In ru, this message translates to:
  /// **'Показать'**
  String get show;

  /// No description provided for @delete.
  ///
  /// In ru, this message translates to:
  /// **'Удалить'**
  String get delete;

  /// No description provided for @deleteProductQuestion.
  ///
  /// In ru, this message translates to:
  /// **'Удалить товар?'**
  String get deleteProductQuestion;

  /// No description provided for @deleteProductText.
  ///
  /// In ru, this message translates to:
  /// **'Товар пропадёт из магазина. Это действие нельзя отменить.'**
  String get deleteProductText;

  /// No description provided for @cancel.
  ///
  /// In ru, this message translates to:
  /// **'Отмена'**
  String get cancel;

  /// No description provided for @sellerOrders.
  ///
  /// In ru, this message translates to:
  /// **'Заказы'**
  String get sellerOrders;

  /// No description provided for @sellerProducts.
  ///
  /// In ru, this message translates to:
  /// **'Товары'**
  String get sellerProducts;

  /// No description provided for @shopProfile.
  ///
  /// In ru, this message translates to:
  /// **'Магазин'**
  String get shopProfile;

  /// No description provided for @changeStatus.
  ///
  /// In ru, this message translates to:
  /// **'Изменить статус'**
  String get changeStatus;

  /// No description provided for @customer.
  ///
  /// In ru, this message translates to:
  /// **'Покупатель'**
  String get customer;

  /// No description provided for @shopName.
  ///
  /// In ru, this message translates to:
  /// **'Название магазина'**
  String get shopName;

  /// No description provided for @shopDescription.
  ///
  /// In ru, this message translates to:
  /// **'Описание магазина'**
  String get shopDescription;

  /// No description provided for @marketAddress.
  ///
  /// In ru, this message translates to:
  /// **'Рынок или адрес'**
  String get marketAddress;

  /// No description provided for @legalName.
  ///
  /// In ru, this message translates to:
  /// **'Юрлицо или ИП (необязательно)'**
  String get legalName;

  /// No description provided for @returnPolicy.
  ///
  /// In ru, this message translates to:
  /// **'Правила возврата'**
  String get returnPolicy;

  /// No description provided for @logo.
  ///
  /// In ru, this message translates to:
  /// **'Логотип'**
  String get logo;

  /// No description provided for @or.
  ///
  /// In ru, this message translates to:
  /// **'или'**
  String get or;

  /// No description provided for @forgotPassword.
  ///
  /// In ru, this message translates to:
  /// **'Забыли пароль?'**
  String get forgotPassword;

  /// No description provided for @favoritesEmptyHint.
  ///
  /// In ru, this message translates to:
  /// **'Нажмите ♡ на товаре, чтобы сохранить его здесь'**
  String get favoritesEmptyHint;

  /// No description provided for @video.
  ///
  /// In ru, this message translates to:
  /// **'Видео'**
  String get video;

  /// No description provided for @openChat.
  ///
  /// In ru, this message translates to:
  /// **'Открыть чат'**
  String get openChat;

  /// No description provided for @orderPlacedHint.
  ///
  /// In ru, this message translates to:
  /// **'Торговец подтвердит заказ и напишет вам в чате'**
  String get orderPlacedHint;

  /// No description provided for @moreFromShop.
  ///
  /// In ru, this message translates to:
  /// **'Ещё в этом магазине'**
  String get moreFromShop;

  /// No description provided for @productsEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Товаров пока нет'**
  String get productsEmpty;

  /// No description provided for @sort.
  ///
  /// In ru, this message translates to:
  /// **'Сортировка'**
  String get sort;

  /// No description provided for @sortPopular.
  ///
  /// In ru, this message translates to:
  /// **'Популярные'**
  String get sortPopular;

  /// No description provided for @sortCheap.
  ///
  /// In ru, this message translates to:
  /// **'Сначала дешёвые'**
  String get sortCheap;

  /// No description provided for @sortExpensive.
  ///
  /// In ru, this message translates to:
  /// **'Сначала дорогие'**
  String get sortExpensive;

  /// No description provided for @sortNew.
  ///
  /// In ru, this message translates to:
  /// **'Сначала новые'**
  String get sortNew;

  /// No description provided for @reportTitle.
  ///
  /// In ru, this message translates to:
  /// **'Что не так?'**
  String get reportTitle;

  /// No description provided for @reasonFraud.
  ///
  /// In ru, this message translates to:
  /// **'Мошенничество'**
  String get reasonFraud;

  /// No description provided for @reasonProhibited.
  ///
  /// In ru, this message translates to:
  /// **'Запрещённый товар'**
  String get reasonProhibited;

  /// No description provided for @reasonWrongInfo.
  ///
  /// In ru, this message translates to:
  /// **'Неверное описание или цена'**
  String get reasonWrongInfo;

  /// No description provided for @reasonOther.
  ///
  /// In ru, this message translates to:
  /// **'Другое'**
  String get reasonOther;

  /// No description provided for @planTrial.
  ///
  /// In ru, this message translates to:
  /// **'Пробный'**
  String get planTrial;

  /// No description provided for @planStart.
  ///
  /// In ru, this message translates to:
  /// **'Старт'**
  String get planStart;

  /// No description provided for @planBusiness.
  ///
  /// In ru, this message translates to:
  /// **'Бизнес'**
  String get planBusiness;

  /// No description provided for @planPro.
  ///
  /// In ru, this message translates to:
  /// **'Про'**
  String get planPro;

  /// No description provided for @subscriptionActive.
  ///
  /// In ru, this message translates to:
  /// **'Подписка активна'**
  String get subscriptionActive;

  /// No description provided for @contactOwner.
  ///
  /// In ru, this message translates to:
  /// **'Написать владельцу площадки'**
  String get contactOwner;

  /// No description provided for @demoData.
  ///
  /// In ru, this message translates to:
  /// **'Демо-режим: тестовые данные'**
  String get demoData;

  /// No description provided for @markConfirmed.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердить заказ'**
  String get markConfirmed;

  /// No description provided for @markShipping.
  ///
  /// In ru, this message translates to:
  /// **'Отправить покупателю'**
  String get markShipping;

  /// No description provided for @markDelivered.
  ///
  /// In ru, this message translates to:
  /// **'Отметить: выдан'**
  String get markDelivered;

  /// No description provided for @markCancelled.
  ///
  /// In ru, this message translates to:
  /// **'Отменить заказ'**
  String get markCancelled;

  /// No description provided for @lowStock.
  ///
  /// In ru, this message translates to:
  /// **'Осталось мало'**
  String get lowStock;

  /// No description provided for @viewsCount.
  ///
  /// In ru, this message translates to:
  /// **'{count, plural, one{{count} просмотр} few{{count} просмотра} many{{count} просмотров} other{{count} просмотра}}'**
  String viewsCount(int count);

  /// No description provided for @photoCompressNote.
  ///
  /// In ru, this message translates to:
  /// **'Фото сжимаются до 1280 px — так покупатели тратят меньше интернета'**
  String get photoCompressNote;

  /// No description provided for @invalidNumber.
  ///
  /// In ru, this message translates to:
  /// **'Введите число'**
  String get invalidNumber;

  /// No description provided for @hiddenHint.
  ///
  /// In ru, this message translates to:
  /// **'Скрытый товар покупатели не видят'**
  String get hiddenHint;

  /// No description provided for @today.
  ///
  /// In ru, this message translates to:
  /// **'Сегодня'**
  String get today;

  /// No description provided for @yesterday.
  ///
  /// In ru, this message translates to:
  /// **'Вчера'**
  String get yesterday;

  /// No description provided for @addressHint.
  ///
  /// In ru, this message translates to:
  /// **'Город, улица, дом — или «заберу на рынке»'**
  String get addressHint;

  /// No description provided for @optional.
  ///
  /// In ru, this message translates to:
  /// **'необязательно'**
  String get optional;

  /// No description provided for @newBadge.
  ///
  /// In ru, this message translates to:
  /// **'Новинка'**
  String get newBadge;

  /// No description provided for @statistics.
  ///
  /// In ru, this message translates to:
  /// **'Статистика'**
  String get statistics;

  /// No description provided for @signOut.
  ///
  /// In ru, this message translates to:
  /// **'Выйти'**
  String get signOut;

  /// No description provided for @signOutAll.
  ///
  /// In ru, this message translates to:
  /// **'Выйти на всех устройствах'**
  String get signOutAll;

  /// No description provided for @signOutAllQuestion.
  ///
  /// In ru, this message translates to:
  /// **'Выйти на всех устройствах?'**
  String get signOutAllQuestion;

  /// No description provided for @signOutAllText.
  ///
  /// In ru, this message translates to:
  /// **'Понадобится заново войти на каждом телефоне.'**
  String get signOutAllText;

  /// No description provided for @changePassword.
  ///
  /// In ru, this message translates to:
  /// **'Сменить пароль'**
  String get changePassword;

  /// No description provided for @currentPassword.
  ///
  /// In ru, this message translates to:
  /// **'Текущий пароль'**
  String get currentPassword;

  /// No description provided for @newPassword.
  ///
  /// In ru, this message translates to:
  /// **'Новый пароль'**
  String get newPassword;

  /// No description provided for @repeatPassword.
  ///
  /// In ru, this message translates to:
  /// **'Повторите пароль'**
  String get repeatPassword;

  /// No description provided for @passwordsDontMatch.
  ///
  /// In ru, this message translates to:
  /// **'Пароли не совпадают'**
  String get passwordsDontMatch;

  /// No description provided for @passwordRules.
  ///
  /// In ru, this message translates to:
  /// **'Не короче 8 символов. Не 12345678 и не номер телефона.'**
  String get passwordRules;

  /// No description provided for @passwordChanged.
  ///
  /// In ru, this message translates to:
  /// **'Пароль изменён. На других телефонах нужно войти заново.'**
  String get passwordChanged;

  /// No description provided for @mustChangePassword.
  ///
  /// In ru, this message translates to:
  /// **'Вы вошли с временным паролем. Придумайте свой.'**
  String get mustChangePassword;

  /// No description provided for @forgotPasswordText.
  ///
  /// In ru, this message translates to:
  /// **'Напишите или позвоните владельцу площадки: он выдаст временный пароль, а потом вы придумаете новый.'**
  String get forgotPasswordText;

  /// No description provided for @roleBuyer.
  ///
  /// In ru, this message translates to:
  /// **'Покупатель'**
  String get roleBuyer;

  /// No description provided for @roleSeller.
  ///
  /// In ru, this message translates to:
  /// **'Торговец'**
  String get roleSeller;

  /// No description provided for @roleOwner.
  ///
  /// In ru, this message translates to:
  /// **'Владелец площадки'**
  String get roleOwner;

  /// No description provided for @ownerPanel.
  ///
  /// In ru, this message translates to:
  /// **'Панель владельца'**
  String get ownerPanel;

  /// No description provided for @signedIn.
  ///
  /// In ru, this message translates to:
  /// **'Вы вошли в аккаунт'**
  String get signedIn;

  /// No description provided for @accountCreated.
  ///
  /// In ru, this message translates to:
  /// **'Аккаунт создан'**
  String get accountCreated;

  /// No description provided for @sellerActivated.
  ///
  /// In ru, this message translates to:
  /// **'Готово! Ваш магазин открыт, первый месяц бесплатно.'**
  String get sellerActivated;

  /// No description provided for @serverNotConnected.
  ///
  /// In ru, this message translates to:
  /// **'Это демо-сборка: сервер ещё не подключён. Вход заработает, когда сервер будет запущен.'**
  String get serverNotConnected;

  /// No description provided for @signInFirst.
  ///
  /// In ru, this message translates to:
  /// **'Сначала войдите в аккаунт'**
  String get signInFirst;

  /// No description provided for @errInvalidCredentials.
  ///
  /// In ru, this message translates to:
  /// **'Неверный номер или пароль'**
  String get errInvalidCredentials;

  /// No description provided for @errPhoneTaken.
  ///
  /// In ru, this message translates to:
  /// **'Этот номер уже зарегистрирован. Войдите с ним.'**
  String get errPhoneTaken;

  /// No description provided for @errWeakPassword.
  ///
  /// In ru, this message translates to:
  /// **'Слишком простой пароль'**
  String get errWeakPassword;

  /// No description provided for @errTooManyAttempts.
  ///
  /// In ru, this message translates to:
  /// **'Слишком много неверных паролей. Попробуйте через 15 минут.'**
  String get errTooManyAttempts;

  /// No description provided for @errTooManyRequests.
  ///
  /// In ru, this message translates to:
  /// **'Слишком много попыток. Подождите немного.'**
  String get errTooManyRequests;

  /// No description provided for @errAccountBlocked.
  ///
  /// In ru, this message translates to:
  /// **'Аккаунт заблокирован. Свяжитесь с владельцем площадки.'**
  String get errAccountBlocked;

  /// No description provided for @errGoogleUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Google сейчас недоступен. Войдите по номеру телефона и паролю.'**
  String get errGoogleUnavailable;

  /// No description provided for @errInviteInvalid.
  ///
  /// In ru, this message translates to:
  /// **'Код неверный, уже использован или устарел'**
  String get errInviteInvalid;

  /// No description provided for @errAlreadySeller.
  ///
  /// In ru, this message translates to:
  /// **'У этого аккаунта уже есть магазин'**
  String get errAlreadySeller;

  /// No description provided for @errWrongPassword.
  ///
  /// In ru, this message translates to:
  /// **'Текущий пароль неверный'**
  String get errWrongPassword;

  /// No description provided for @errNetwork.
  ///
  /// In ru, this message translates to:
  /// **'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'**
  String get errNetwork;

  /// No description provided for @errSessionExpired.
  ///
  /// In ru, this message translates to:
  /// **'Сессия закончилась, войдите снова'**
  String get errSessionExpired;

  /// No description provided for @errUnknown.
  ///
  /// In ru, this message translates to:
  /// **'Что-то пошло не так. Попробуйте ещё раз.'**
  String get errUnknown;

  /// No description provided for @retry.
  ///
  /// In ru, this message translates to:
  /// **'Повторить'**
  String get retry;

  /// No description provided for @loadError.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось загрузить'**
  String get loadError;

  /// No description provided for @offline.
  ///
  /// In ru, this message translates to:
  /// **'Нет подключения к интернету'**
  String get offline;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['ru', 'tk'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ru':
      return AppLocalizationsRu();
    case 'tk':
      return AppLocalizationsTk();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
