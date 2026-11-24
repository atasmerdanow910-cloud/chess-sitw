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
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

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
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ru'),
    Locale('tk'),
  ];

  /// No description provided for @appName.
  ///
  /// In ru, this message translates to:
  /// **'Kerwen Market'**
  String get appName;

  /// No description provided for @navHome.
  ///
  /// In ru, this message translates to:
  /// **'Главная'**
  String get navHome;

  /// No description provided for @navShops.
  ///
  /// In ru, this message translates to:
  /// **'Магазины'**
  String get navShops;

  /// No description provided for @navCart.
  ///
  /// In ru, this message translates to:
  /// **'Корзина'**
  String get navCart;

  /// No description provided for @navChats.
  ///
  /// In ru, this message translates to:
  /// **'Чаты'**
  String get navChats;

  /// No description provided for @navProfile.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get navProfile;

  /// No description provided for @searchHint.
  ///
  /// In ru, this message translates to:
  /// **'Найти товар или магазин'**
  String get searchHint;

  /// No description provided for @searchNothingFound.
  ///
  /// In ru, this message translates to:
  /// **'Ничего не найдено'**
  String get searchNothingFound;

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

  /// No description provided for @allShops.
  ///
  /// In ru, this message translates to:
  /// **'Все магазины'**
  String get allShops;

  /// No description provided for @products.
  ///
  /// In ru, this message translates to:
  /// **'Товары'**
  String get products;

  /// No description provided for @productsCount.
  ///
  /// In ru, this message translates to:
  /// **'{count, plural, =0{нет товаров} one{{count} товар} few{{count} товара} many{{count} товаров} other{{count} товара}}'**
  String productsCount(int count);

  /// No description provided for @reviewsCount.
  ///
  /// In ru, this message translates to:
  /// **'{count, plural, =0{нет отзывов} one{{count} отзыв} few{{count} отзыва} many{{count} отзывов} other{{count} отзыва}}'**
  String reviewsCount(int count);

  /// No description provided for @badgeNew.
  ///
  /// In ru, this message translates to:
  /// **'Новинка'**
  String get badgeNew;

  /// No description provided for @verifiedSeller.
  ///
  /// In ru, this message translates to:
  /// **'Проверенный торговец'**
  String get verifiedSeller;

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

  /// No description provided for @addedToCart.
  ///
  /// In ru, this message translates to:
  /// **'Добавлено в корзину'**
  String get addedToCart;

  /// No description provided for @writeToSeller.
  ///
  /// In ru, this message translates to:
  /// **'Написать продавцу'**
  String get writeToSeller;

  /// No description provided for @description.
  ///
  /// In ru, this message translates to:
  /// **'Описание'**
  String get description;

  /// No description provided for @variantColor.
  ///
  /// In ru, this message translates to:
  /// **'Цвет'**
  String get variantColor;

  /// No description provided for @variantSize.
  ///
  /// In ru, this message translates to:
  /// **'Размер'**
  String get variantSize;

  /// No description provided for @shop.
  ///
  /// In ru, this message translates to:
  /// **'Магазин'**
  String get shop;

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

  /// No description provided for @favorites.
  ///
  /// In ru, this message translates to:
  /// **'Избранное'**
  String get favorites;

  /// No description provided for @favoritesEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Здесь появятся товары, которые вам понравились'**
  String get favoritesEmpty;

  /// No description provided for @report.
  ///
  /// In ru, this message translates to:
  /// **'Пожаловаться'**
  String get report;

  /// No description provided for @cartEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Корзина пуста'**
  String get cartEmpty;

  /// No description provided for @cartEmptyHint.
  ///
  /// In ru, this message translates to:
  /// **'Добавьте товары из магазинов'**
  String get cartEmptyHint;

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

  /// No description provided for @checkoutPerShopHint.
  ///
  /// In ru, this message translates to:
  /// **'Заказ оформляется отдельно в каждом магазине. Оплату и доставку вы обсуждаете с продавцом в чате.'**
  String get checkoutPerShopHint;

  /// No description provided for @chatsEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Пока нет сообщений'**
  String get chatsEmpty;

  /// No description provided for @messageHint.
  ///
  /// In ru, this message translates to:
  /// **'Сообщение…'**
  String get messageHint;

  /// No description provided for @voiceMessage.
  ///
  /// In ru, this message translates to:
  /// **'Голосовое сообщение'**
  String get voiceMessage;

  /// No description provided for @photo.
  ///
  /// In ru, this message translates to:
  /// **'Фото'**
  String get photo;

  /// No description provided for @video.
  ///
  /// In ru, this message translates to:
  /// **'Видео'**
  String get video;

  /// No description provided for @attach.
  ///
  /// In ru, this message translates to:
  /// **'Прикрепить'**
  String get attach;

  /// No description provided for @guest.
  ///
  /// In ru, this message translates to:
  /// **'Гость'**
  String get guest;

  /// No description provided for @loginPrompt.
  ///
  /// In ru, this message translates to:
  /// **'Войдите, чтобы оформлять заказы и писать продавцам'**
  String get loginPrompt;

  /// No description provided for @login.
  ///
  /// In ru, this message translates to:
  /// **'Войти'**
  String get login;

  /// No description provided for @loginWithGoogle.
  ///
  /// In ru, this message translates to:
  /// **'Войти через Google'**
  String get loginWithGoogle;

  /// No description provided for @or.
  ///
  /// In ru, this message translates to:
  /// **'или'**
  String get or;

  /// No description provided for @phone.
  ///
  /// In ru, this message translates to:
  /// **'Номер телефона'**
  String get phone;

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

  /// No description provided for @googleFallbackHint.
  ///
  /// In ru, this message translates to:
  /// **'Если Google не работает, войдите по номеру телефона'**
  String get googleFallbackHint;

  /// No description provided for @myOrders.
  ///
  /// In ru, this message translates to:
  /// **'Мои заказы'**
  String get myOrders;

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
  /// **'Системная'**
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

  /// No description provided for @sellerPanel.
  ///
  /// In ru, this message translates to:
  /// **'Панель магазина'**
  String get sellerPanel;

  /// No description provided for @privacyPolicy.
  ///
  /// In ru, this message translates to:
  /// **'Политика конфиденциальности'**
  String get privacyPolicy;

  /// No description provided for @termsOfUse.
  ///
  /// In ru, this message translates to:
  /// **'Правила пользования'**
  String get termsOfUse;

  /// No description provided for @appVersion.
  ///
  /// In ru, this message translates to:
  /// **'Версия {version}'**
  String appVersion(String version);

  /// No description provided for @myShop.
  ///
  /// In ru, this message translates to:
  /// **'Мой магазин'**
  String get myShop;

  /// No description provided for @subscriptionPaidUntil.
  ///
  /// In ru, this message translates to:
  /// **'Подписка оплачена до {date}'**
  String subscriptionPaidUntil(String date);

  /// No description provided for @subscriptionEndsSoon.
  ///
  /// In ru, this message translates to:
  /// **'Подписка закончится через {days} дн. Свяжитесь с администрацией, чтобы продлить.'**
  String subscriptionEndsSoon(int days);

  /// No description provided for @subscriptionExpired.
  ///
  /// In ru, this message translates to:
  /// **'Подписка закончилась. Магазин скрыт из каталога, данные сохранены.'**
  String get subscriptionExpired;

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

  /// No description provided for @statProducts.
  ///
  /// In ru, this message translates to:
  /// **'Товары'**
  String get statProducts;

  /// No description provided for @popularProducts.
  ///
  /// In ru, this message translates to:
  /// **'Популярные товары'**
  String get popularProducts;

  /// No description provided for @views.
  ///
  /// In ru, this message translates to:
  /// **'{count} просм.'**
  String views(int count);

  /// No description provided for @orders.
  ///
  /// In ru, this message translates to:
  /// **'Заказы'**
  String get orders;

  /// No description provided for @messages.
  ///
  /// In ru, this message translates to:
  /// **'Сообщения'**
  String get messages;

  /// No description provided for @shopProfile.
  ///
  /// In ru, this message translates to:
  /// **'Профиль магазина'**
  String get shopProfile;

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

  /// No description provided for @productPrice.
  ///
  /// In ru, this message translates to:
  /// **'Цена, TMT'**
  String get productPrice;

  /// No description provided for @productStock.
  ///
  /// In ru, this message translates to:
  /// **'Остаток, шт.'**
  String get productStock;

  /// No description provided for @productCategory.
  ///
  /// In ru, this message translates to:
  /// **'Категория'**
  String get productCategory;

  /// No description provided for @productPhotos.
  ///
  /// In ru, this message translates to:
  /// **'Фото и видео'**
  String get productPhotos;

  /// No description provided for @fieldRequired.
  ///
  /// In ru, this message translates to:
  /// **'Заполните это поле'**
  String get fieldRequired;

  /// No description provided for @fieldInvalidNumber.
  ///
  /// In ru, this message translates to:
  /// **'Введите число'**
  String get fieldInvalidNumber;

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

  /// No description provided for @edit.
  ///
  /// In ru, this message translates to:
  /// **'Изменить'**
  String get edit;

  /// No description provided for @hidden.
  ///
  /// In ru, this message translates to:
  /// **'Скрыт'**
  String get hidden;

  /// No description provided for @delete.
  ///
  /// In ru, this message translates to:
  /// **'Удалить'**
  String get delete;

  /// No description provided for @cancel.
  ///
  /// In ru, this message translates to:
  /// **'Отмена'**
  String get cancel;

  /// No description provided for @shopName.
  ///
  /// In ru, this message translates to:
  /// **'Название магазина'**
  String get shopName;

  /// No description provided for @shopPhone.
  ///
  /// In ru, this message translates to:
  /// **'Телефон для покупателей'**
  String get shopPhone;

  /// No description provided for @legalName.
  ///
  /// In ru, this message translates to:
  /// **'Юрлицо / ИП (если есть)'**
  String get legalName;

  /// No description provided for @returnPolicy.
  ///
  /// In ru, this message translates to:
  /// **'Правила возврата'**
  String get returnPolicy;

  /// No description provided for @orderNumber.
  ///
  /// In ru, this message translates to:
  /// **'Заказ №{id}'**
  String orderNumber(String id);

  /// No description provided for @orderStatusNew.
  ///
  /// In ru, this message translates to:
  /// **'Новый'**
  String get orderStatusNew;

  /// No description provided for @orderStatusConfirmed.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждён'**
  String get orderStatusConfirmed;

  /// No description provided for @orderStatusShipping.
  ///
  /// In ru, this message translates to:
  /// **'В пути'**
  String get orderStatusShipping;

  /// No description provided for @orderStatusDelivered.
  ///
  /// In ru, this message translates to:
  /// **'Выдан'**
  String get orderStatusDelivered;

  /// No description provided for @orderStatusCancelled.
  ///
  /// In ru, this message translates to:
  /// **'Отменён'**
  String get orderStatusCancelled;

  /// No description provided for @comingSoon.
  ///
  /// In ru, this message translates to:
  /// **'Эта функция скоро появится'**
  String get comingSoon;

  /// No description provided for @pageNotFound.
  ///
  /// In ru, this message translates to:
  /// **'Страница не найдена'**
  String get pageNotFound;

  /// No description provided for @goHome.
  ///
  /// In ru, this message translates to:
  /// **'На главную'**
  String get goHome;

  /// No description provided for @acceptTerms.
  ///
  /// In ru, this message translates to:
  /// **'Я принимаю правила и политику конфиденциальности'**
  String get acceptTerms;

  /// No description provided for @activate.
  ///
  /// In ru, this message translates to:
  /// **'Активировать'**
  String get activate;

  /// No description provided for @active.
  ///
  /// In ru, this message translates to:
  /// **'Активна'**
  String get active;

  /// No description provided for @addBanner.
  ///
  /// In ru, this message translates to:
  /// **'Новый баннер'**
  String get addBanner;

  /// No description provided for @addCategory.
  ///
  /// In ru, this message translates to:
  /// **'Новая категория'**
  String get addCategory;

  /// No description provided for @addFirstProduct.
  ///
  /// In ru, this message translates to:
  /// **'Нажмите «Добавить товар», чтобы выставить первый товар'**
  String get addFirstProduct;

  /// No description provided for @addVariant.
  ///
  /// In ru, this message translates to:
  /// **'Добавить'**
  String get addVariant;

  /// No description provided for @addressOrMarket.
  ///
  /// In ru, this message translates to:
  /// **'Адрес / рынок'**
  String get addressOrMarket;

  /// No description provided for @amountTmt.
  ///
  /// In ru, this message translates to:
  /// **'Сумма, TMT'**
  String get amountTmt;

  /// No description provided for @apply.
  ///
  /// In ru, this message translates to:
  /// **'Применить'**
  String get apply;

  /// No description provided for @banners.
  ///
  /// In ru, this message translates to:
  /// **'Баннеры'**
  String get banners;

  /// No description provided for @blockShop.
  ///
  /// In ru, this message translates to:
  /// **'Заблокировать магазин'**
  String get blockShop;

  /// No description provided for @blockShopConfirm.
  ///
  /// In ru, this message translates to:
  /// **'Заблокировать магазин? Он исчезнет из каталога.'**
  String get blockShopConfirm;

  /// No description provided for @blockShopHint.
  ///
  /// In ru, this message translates to:
  /// **'Скрыт от покупателей, данные сохраняются'**
  String get blockShopHint;

  /// No description provided for @blockUser.
  ///
  /// In ru, this message translates to:
  /// **'Заблокировать пользователя'**
  String get blockUser;

  /// No description provided for @blockedByModerator.
  ///
  /// In ru, this message translates to:
  /// **'Скрыт модератором'**
  String get blockedByModerator;

  /// No description provided for @broadcast.
  ///
  /// In ru, this message translates to:
  /// **'Рассылка'**
  String get broadcast;

  /// No description provided for @broadcastConfirm.
  ///
  /// In ru, this message translates to:
  /// **'Отправить сообщение всем выбранным пользователям?'**
  String get broadcastConfirm;

  /// No description provided for @broadcastHint.
  ///
  /// In ru, this message translates to:
  /// **'Сообщение появится в уведомлениях приложения'**
  String get broadcastHint;

  /// No description provided for @broadcastSent.
  ///
  /// In ru, this message translates to:
  /// **'Отправлено: {count}'**
  String broadcastSent(int count);

  /// No description provided for @buyer.
  ///
  /// In ru, this message translates to:
  /// **'Покупатель'**
  String get buyer;

  /// No description provided for @cancelOrder.
  ///
  /// In ru, this message translates to:
  /// **'Отменить заказ'**
  String get cancelOrder;

  /// No description provided for @cancelOrderConfirm.
  ///
  /// In ru, this message translates to:
  /// **'Отменить этот заказ?'**
  String get cancelOrderConfirm;

  /// No description provided for @changePassword.
  ///
  /// In ru, this message translates to:
  /// **'Сменить пароль'**
  String get changePassword;

  /// No description provided for @chooseVariant.
  ///
  /// In ru, this message translates to:
  /// **'Выберите цвет и размер'**
  String get chooseVariant;

  /// No description provided for @colorHex.
  ///
  /// In ru, this message translates to:
  /// **'Цвет (#RRGGBB)'**
  String get colorHex;

  /// No description provided for @copied.
  ///
  /// In ru, this message translates to:
  /// **'Скопировано'**
  String get copied;

  /// No description provided for @copy.
  ///
  /// In ru, this message translates to:
  /// **'Копировать'**
  String get copy;

  /// No description provided for @createAndGetCode.
  ///
  /// In ru, this message translates to:
  /// **'Создать и получить код'**
  String get createAndGetCode;

  /// No description provided for @currentPassword.
  ///
  /// In ru, this message translates to:
  /// **'Текущий пароль'**
  String get currentPassword;

  /// No description provided for @deleteConfirm.
  ///
  /// In ru, this message translates to:
  /// **'Удалить?'**
  String get deleteConfirm;

  /// No description provided for @deleteProductConfirm.
  ///
  /// In ru, this message translates to:
  /// **'Удалить товар? Покупатели больше не увидят его.'**
  String get deleteProductConfirm;

  /// No description provided for @deliveryAddress.
  ///
  /// In ru, this message translates to:
  /// **'Адрес доставки (необязательно)'**
  String get deliveryAddress;

  /// No description provided for @editProfile.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get editProfile;

  /// No description provided for @emptyUnlimited.
  ///
  /// In ru, this message translates to:
  /// **'Пусто = без ограничений'**
  String get emptyUnlimited;

  /// No description provided for @errAccountLocked.
  ///
  /// In ru, this message translates to:
  /// **'Слишком много попыток. Попробуйте через 15 минут.'**
  String get errAccountLocked;

  /// No description provided for @errAlreadySeller.
  ///
  /// In ru, this message translates to:
  /// **'У вас уже есть магазин'**
  String get errAlreadySeller;

  /// No description provided for @errFileTooLarge.
  ///
  /// In ru, this message translates to:
  /// **'Файл слишком большой'**
  String get errFileTooLarge;

  /// No description provided for @errFileType.
  ///
  /// In ru, this message translates to:
  /// **'Этот тип файла не поддерживается'**
  String get errFileType;

  /// No description provided for @errGeneric.
  ///
  /// In ru, this message translates to:
  /// **'Что-то пошло не так. Попробуйте ещё раз.'**
  String get errGeneric;

  /// No description provided for @errGoogleUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Google сейчас недоступен. Войдите по номеру телефона.'**
  String get errGoogleUnavailable;

  /// No description provided for @errInvalidCredentials.
  ///
  /// In ru, this message translates to:
  /// **'Неверный телефон или пароль'**
  String get errInvalidCredentials;

  /// No description provided for @errInvalidPhone.
  ///
  /// In ru, this message translates to:
  /// **'Введите номер в формате +993 6X XXXXXX'**
  String get errInvalidPhone;

  /// No description provided for @errInviteInvalid.
  ///
  /// In ru, this message translates to:
  /// **'Код неверный, уже использован или устарел'**
  String get errInviteInvalid;

  /// No description provided for @errNetwork.
  ///
  /// In ru, this message translates to:
  /// **'Нет связи с сервером'**
  String get errNetwork;

  /// No description provided for @errNetworkHint.
  ///
  /// In ru, this message translates to:
  /// **'Проверьте интернет (и VPN) и попробуйте снова'**
  String get errNetworkHint;

  /// No description provided for @errNotFound.
  ///
  /// In ru, this message translates to:
  /// **'Не найдено или больше недоступно'**
  String get errNotFound;

  /// No description provided for @errOutOfStock.
  ///
  /// In ru, this message translates to:
  /// **'Столько товара нет в наличии'**
  String get errOutOfStock;

  /// No description provided for @errOwnShop.
  ///
  /// In ru, this message translates to:
  /// **'Нельзя заказать в своём магазине'**
  String get errOwnShop;

  /// No description provided for @errPhoneTaken.
  ///
  /// In ru, this message translates to:
  /// **'Этот номер уже зарегистрирован. Войдите.'**
  String get errPhoneTaken;

  /// No description provided for @errProductLimit.
  ///
  /// In ru, this message translates to:
  /// **'Достигнут лимит товаров вашего тарифа'**
  String get errProductLimit;

  /// No description provided for @errProductUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Товар больше недоступен'**
  String get errProductUnavailable;

  /// No description provided for @errReviewExists.
  ///
  /// In ru, this message translates to:
  /// **'Вы уже оставили отзыв'**
  String get errReviewExists;

  /// No description provided for @errShopBlocked.
  ///
  /// In ru, this message translates to:
  /// **'Магазин заблокирован. Свяжитесь с администрацией.'**
  String get errShopBlocked;

  /// No description provided for @errShopUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Магазин сейчас не работает'**
  String get errShopUnavailable;

  /// No description provided for @errStatusChanged.
  ///
  /// In ru, this message translates to:
  /// **'Статус заказа уже изменился. Обновите страницу.'**
  String get errStatusChanged;

  /// No description provided for @errTimeout.
  ///
  /// In ru, this message translates to:
  /// **'Сервер долго не отвечает. Попробуйте ещё раз.'**
  String get errTimeout;

  /// No description provided for @errTooMany.
  ///
  /// In ru, this message translates to:
  /// **'Слишком много запросов. Подождите минуту.'**
  String get errTooMany;

  /// No description provided for @errUserBlocked.
  ///
  /// In ru, this message translates to:
  /// **'Аккаунт заблокирован. Свяжитесь с администрацией.'**
  String get errUserBlocked;

  /// No description provided for @errValidation.
  ///
  /// In ru, this message translates to:
  /// **'Проверьте заполненные поля'**
  String get errValidation;

  /// No description provided for @errWrongPassword.
  ///
  /// In ru, this message translates to:
  /// **'Неверный текущий пароль'**
  String get errWrongPassword;

  /// No description provided for @filterActive.
  ///
  /// In ru, this message translates to:
  /// **'Активные'**
  String get filterActive;

  /// No description provided for @filterBlocked.
  ///
  /// In ru, this message translates to:
  /// **'Заблокированные'**
  String get filterBlocked;

  /// No description provided for @filterEnding.
  ///
  /// In ru, this message translates to:
  /// **'Скоро закончится'**
  String get filterEnding;

  /// No description provided for @filterExpired.
  ///
  /// In ru, this message translates to:
  /// **'Просроченные'**
  String get filterExpired;

  /// No description provided for @filterUnclaimed.
  ///
  /// In ru, this message translates to:
  /// **'Не активированы'**
  String get filterUnclaimed;

  /// No description provided for @filters.
  ///
  /// In ru, this message translates to:
  /// **'Фильтры'**
  String get filters;

  /// No description provided for @finalPriceHint.
  ///
  /// In ru, this message translates to:
  /// **'Итоговую сумму рассчитает сервер по актуальным ценам'**
  String get finalPriceHint;

  /// No description provided for @freeDays.
  ///
  /// In ru, this message translates to:
  /// **'Бесплатных дней'**
  String get freeDays;

  /// No description provided for @goShopping.
  ///
  /// In ru, this message translates to:
  /// **'К покупкам'**
  String get goShopping;

  /// No description provided for @haveAccountLogin.
  ///
  /// In ru, this message translates to:
  /// **'Уже есть аккаунт? Войти'**
  String get haveAccountLogin;

  /// No description provided for @hiddenHint.
  ///
  /// In ru, this message translates to:
  /// **'Скрыт: покупатели не видят товар'**
  String get hiddenHint;

  /// No description provided for @hideProduct.
  ///
  /// In ru, this message translates to:
  /// **'Скрыть товар'**
  String get hideProduct;

  /// No description provided for @iAmSeller.
  ///
  /// In ru, this message translates to:
  /// **'Я торговец'**
  String get iAmSeller;

  /// No description provided for @iAmSellerHint.
  ///
  /// In ru, this message translates to:
  /// **'Ввести код от администрации'**
  String get iAmSellerHint;

  /// No description provided for @inviteAccepted.
  ///
  /// In ru, this message translates to:
  /// **'Готово! Ваш магазин открыт.'**
  String get inviteAccepted;

  /// No description provided for @inviteCode.
  ///
  /// In ru, this message translates to:
  /// **'Код торговца'**
  String get inviteCode;

  /// No description provided for @inviteCodes.
  ///
  /// In ru, this message translates to:
  /// **'Коды приглашения'**
  String get inviteCodes;

  /// No description provided for @inviteExplain.
  ///
  /// In ru, this message translates to:
  /// **'Магазины открываются только после личной встречи с администрацией. Введите код, который вам дали.'**
  String get inviteExplain;

  /// No description provided for @inviteInstructions.
  ///
  /// In ru, this message translates to:
  /// **'Передайте код торговцу. Он устанавливает приложение, регистрируется и вводит код в «Профиль → Я торговец».'**
  String get inviteInstructions;

  /// No description provided for @itemsCount.
  ///
  /// In ru, this message translates to:
  /// **'{count, plural, one{{count} товар} few{{count} товара} many{{count} товаров} other{{count} товара}}'**
  String itemsCount(int count);

  /// No description provided for @leaveReview.
  ///
  /// In ru, this message translates to:
  /// **'Оставить отзыв'**
  String get leaveReview;

  /// No description provided for @logout.
  ///
  /// In ru, this message translates to:
  /// **'Выйти'**
  String get logout;

  /// No description provided for @logoutConfirm.
  ///
  /// In ru, this message translates to:
  /// **'Выйти из аккаунта?'**
  String get logoutConfirm;

  /// No description provided for @markAllRead.
  ///
  /// In ru, this message translates to:
  /// **'Отметить всё прочитанным'**
  String get markAllRead;

  /// No description provided for @markAs.
  ///
  /// In ru, this message translates to:
  /// **'Отметить'**
  String get markAs;

  /// No description provided for @markResolved.
  ///
  /// In ru, this message translates to:
  /// **'Решено'**
  String get markResolved;

  /// No description provided for @messageLabel.
  ///
  /// In ru, this message translates to:
  /// **'Текст сообщения'**
  String get messageLabel;

  /// No description provided for @methodCash.
  ///
  /// In ru, this message translates to:
  /// **'Наличные'**
  String get methodCash;

  /// No description provided for @methodOther.
  ///
  /// In ru, this message translates to:
  /// **'Другое'**
  String get methodOther;

  /// No description provided for @methodTransfer.
  ///
  /// In ru, this message translates to:
  /// **'Перевод'**
  String get methodTransfer;

  /// No description provided for @micPermission.
  ///
  /// In ru, this message translates to:
  /// **'Разрешите доступ к микрофону в настройках телефона'**
  String get micPermission;

  /// No description provided for @moderation.
  ///
  /// In ru, this message translates to:
  /// **'Модерация и жалобы'**
  String get moderation;

  /// No description provided for @month.
  ///
  /// In ru, this message translates to:
  /// **'мес.'**
  String get month;

  /// No description provided for @months.
  ///
  /// In ru, this message translates to:
  /// **'Месяцев'**
  String get months;

  /// No description provided for @mustAcceptTerms.
  ///
  /// In ru, this message translates to:
  /// **'Нужно принять правила'**
  String get mustAcceptTerms;

  /// No description provided for @name.
  ///
  /// In ru, this message translates to:
  /// **'Имя'**
  String get name;

  /// No description provided for @newInviteCode.
  ///
  /// In ru, this message translates to:
  /// **'Новый код приглашения'**
  String get newInviteCode;

  /// No description provided for @newPassword.
  ///
  /// In ru, this message translates to:
  /// **'Новый пароль'**
  String get newPassword;

  /// No description provided for @newSeller.
  ///
  /// In ru, this message translates to:
  /// **'Новый торговец'**
  String get newSeller;

  /// No description provided for @newSellerHint.
  ///
  /// In ru, this message translates to:
  /// **'После личной встречи создайте магазин и передайте торговцу код.'**
  String get newSellerHint;

  /// No description provided for @noAccountRegister.
  ///
  /// In ru, this message translates to:
  /// **'Нет аккаунта? Регистрация'**
  String get noAccountRegister;

  /// No description provided for @noCategory.
  ///
  /// In ru, this message translates to:
  /// **'Без категории'**
  String get noCategory;

  /// No description provided for @noNotifications.
  ///
  /// In ru, this message translates to:
  /// **'Уведомлений пока нет'**
  String get noNotifications;

  /// No description provided for @noOrdersYet.
  ///
  /// In ru, this message translates to:
  /// **'Заказов пока нет'**
  String get noOrdersYet;

  /// No description provided for @noPayments.
  ///
  /// In ru, this message translates to:
  /// **'Оплат пока нет'**
  String get noPayments;

  /// No description provided for @noProductsYet.
  ///
  /// In ru, this message translates to:
  /// **'Товаров пока нет'**
  String get noProductsYet;

  /// No description provided for @noReports.
  ///
  /// In ru, this message translates to:
  /// **'Жалоб нет'**
  String get noReports;

  /// No description provided for @noShopsYet.
  ///
  /// In ru, this message translates to:
  /// **'Магазинов пока нет'**
  String get noShopsYet;

  /// No description provided for @notActivatedYet.
  ///
  /// In ru, this message translates to:
  /// **'Торговец ещё не ввёл код'**
  String get notActivatedYet;

  /// No description provided for @note.
  ///
  /// In ru, this message translates to:
  /// **'Заметка'**
  String get note;

  /// No description provided for @notifications.
  ///
  /// In ru, this message translates to:
  /// **'Уведомления'**
  String get notifications;

  /// No description provided for @ok.
  ///
  /// In ru, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @open.
  ///
  /// In ru, this message translates to:
  /// **'Открыть'**
  String get open;

  /// No description provided for @orderComment.
  ///
  /// In ru, this message translates to:
  /// **'Комментарий к заказу'**
  String get orderComment;

  /// No description provided for @orderCreated.
  ///
  /// In ru, this message translates to:
  /// **'Заказ отправлен продавцу! Он свяжется с вами. Оплату и доставку обсудите в чате.'**
  String get orderCreated;

  /// No description provided for @ownerPanel.
  ///
  /// In ru, this message translates to:
  /// **'Панель владельца'**
  String get ownerPanel;

  /// No description provided for @paidUntil.
  ///
  /// In ru, this message translates to:
  /// **'Оплачено до'**
  String get paidUntil;

  /// No description provided for @passwordRule.
  ///
  /// In ru, this message translates to:
  /// **'Минимум 8 символов'**
  String get passwordRule;

  /// No description provided for @paymentHint.
  ///
  /// In ru, this message translates to:
  /// **'Онлайн-оплаты нет. Оплата наличными или переводом — договоритесь с продавцом в чате.'**
  String get paymentHint;

  /// No description provided for @paymentMethod.
  ///
  /// In ru, this message translates to:
  /// **'Способ оплаты'**
  String get paymentMethod;

  /// No description provided for @paymentsHistory.
  ///
  /// In ru, this message translates to:
  /// **'История оплат'**
  String get paymentsHistory;

  /// No description provided for @photoFromGallery.
  ///
  /// In ru, this message translates to:
  /// **'Фото из галереи'**
  String get photoFromGallery;

  /// No description provided for @placeOrder.
  ///
  /// In ru, this message translates to:
  /// **'Отправить заказ'**
  String get placeOrder;

  /// No description provided for @plan.
  ///
  /// In ru, this message translates to:
  /// **'Тариф'**
  String get plan;

  /// No description provided for @plans.
  ///
  /// In ru, this message translates to:
  /// **'Тарифы подписки'**
  String get plans;

  /// No description provided for @plansHint.
  ///
  /// In ru, this message translates to:
  /// **'Цены и лимиты хранятся на сервере, их можно менять в любой момент.'**
  String get plansHint;

  /// No description provided for @priceFrom.
  ///
  /// In ru, this message translates to:
  /// **'Цена от'**
  String get priceFrom;

  /// No description provided for @priceRange.
  ///
  /// In ru, this message translates to:
  /// **'Цена'**
  String get priceRange;

  /// No description provided for @priceTo.
  ///
  /// In ru, this message translates to:
  /// **'Цена до'**
  String get priceTo;

  /// No description provided for @productBlockedText.
  ///
  /// In ru, this message translates to:
  /// **'Товар скрыт модератором. Свяжитесь с администрацией.'**
  String get productBlockedText;

  /// No description provided for @productLimit.
  ///
  /// In ru, this message translates to:
  /// **'Лимит товаров'**
  String get productLimit;

  /// No description provided for @recordPayment.
  ///
  /// In ru, this message translates to:
  /// **'Принять оплату'**
  String get recordPayment;

  /// No description provided for @recording.
  ///
  /// In ru, this message translates to:
  /// **'Идёт запись…'**
  String get recording;

  /// No description provided for @reject.
  ///
  /// In ru, this message translates to:
  /// **'Отклонить'**
  String get reject;

  /// No description provided for @reportHint.
  ///
  /// In ru, this message translates to:
  /// **'Опишите, что не так. Администрация проверит.'**
  String get reportHint;

  /// No description provided for @reportOpen.
  ///
  /// In ru, this message translates to:
  /// **'Новые'**
  String get reportOpen;

  /// No description provided for @reportReason.
  ///
  /// In ru, this message translates to:
  /// **'Причина'**
  String get reportReason;

  /// No description provided for @reportRejected.
  ///
  /// In ru, this message translates to:
  /// **'Отклонены'**
  String get reportRejected;

  /// No description provided for @reportResolved.
  ///
  /// In ru, this message translates to:
  /// **'Решены'**
  String get reportResolved;

  /// No description provided for @reportSent.
  ///
  /// In ru, this message translates to:
  /// **'Жалоба отправлена. Спасибо!'**
  String get reportSent;

  /// No description provided for @reset.
  ///
  /// In ru, this message translates to:
  /// **'Сбросить'**
  String get reset;

  /// No description provided for @retry.
  ///
  /// In ru, this message translates to:
  /// **'Повторить'**
  String get retry;

  /// No description provided for @revenueThisMonth.
  ///
  /// In ru, this message translates to:
  /// **'Доход от подписок за месяц'**
  String get revenueThisMonth;

  /// No description provided for @revenueTotal.
  ///
  /// In ru, this message translates to:
  /// **'Всего'**
  String get revenueTotal;

  /// No description provided for @reviewHint.
  ///
  /// In ru, this message translates to:
  /// **'Что понравилось или нет?'**
  String get reviewHint;

  /// No description provided for @reviews.
  ///
  /// In ru, this message translates to:
  /// **'Отзывы'**
  String get reviews;

  /// No description provided for @roleBuyer.
  ///
  /// In ru, this message translates to:
  /// **'Покупатель'**
  String get roleBuyer;

  /// No description provided for @roleOwner.
  ///
  /// In ru, this message translates to:
  /// **'Владелец'**
  String get roleOwner;

  /// No description provided for @roleSeller.
  ///
  /// In ru, this message translates to:
  /// **'Торговец'**
  String get roleSeller;

  /// No description provided for @searchUsers.
  ///
  /// In ru, this message translates to:
  /// **'Имя или телефон'**
  String get searchUsers;

  /// No description provided for @sellerName.
  ///
  /// In ru, this message translates to:
  /// **'Имя торговца'**
  String get sellerName;

  /// No description provided for @send.
  ///
  /// In ru, this message translates to:
  /// **'Отправить'**
  String get send;

  /// No description provided for @setPassword.
  ///
  /// In ru, this message translates to:
  /// **'Задать пароль (запасной вход)'**
  String get setPassword;

  /// No description provided for @shopBlockedText.
  ///
  /// In ru, this message translates to:
  /// **'Магазин заблокирован администрацией'**
  String get shopBlockedText;

  /// No description provided for @shopsAndSellers.
  ///
  /// In ru, this message translates to:
  /// **'Магазины и торговцы'**
  String get shopsAndSellers;

  /// No description provided for @sortBy.
  ///
  /// In ru, this message translates to:
  /// **'Сортировка'**
  String get sortBy;

  /// No description provided for @sortNew.
  ///
  /// In ru, this message translates to:
  /// **'Сначала новые'**
  String get sortNew;

  /// No description provided for @sortOrder.
  ///
  /// In ru, this message translates to:
  /// **'Порядок'**
  String get sortOrder;

  /// No description provided for @sortPopular.
  ///
  /// In ru, this message translates to:
  /// **'Популярные'**
  String get sortPopular;

  /// No description provided for @sortPriceAsc.
  ///
  /// In ru, this message translates to:
  /// **'Сначала дешёвые'**
  String get sortPriceAsc;

  /// No description provided for @sortPriceDesc.
  ///
  /// In ru, this message translates to:
  /// **'Сначала дорогие'**
  String get sortPriceDesc;

  /// No description provided for @statActiveShops.
  ///
  /// In ru, this message translates to:
  /// **'Работают'**
  String get statActiveShops;

  /// No description provided for @statBuyers.
  ///
  /// In ru, this message translates to:
  /// **'Покупатели'**
  String get statBuyers;

  /// No description provided for @statExpiredShops.
  ///
  /// In ru, this message translates to:
  /// **'Не оплачены'**
  String get statExpiredShops;

  /// No description provided for @statReports.
  ///
  /// In ru, this message translates to:
  /// **'Жалобы'**
  String get statReports;

  /// No description provided for @statSellers.
  ///
  /// In ru, this message translates to:
  /// **'Торговцы'**
  String get statSellers;

  /// No description provided for @stockShort.
  ///
  /// In ru, this message translates to:
  /// **'ост. {count}'**
  String stockShort(int count);

  /// No description provided for @takePhoto.
  ///
  /// In ru, this message translates to:
  /// **'Сделать фото'**
  String get takePhoto;

  /// No description provided for @titleLabel.
  ///
  /// In ru, this message translates to:
  /// **'Заголовок'**
  String get titleLabel;

  /// No description provided for @typing.
  ///
  /// In ru, this message translates to:
  /// **'печатает…'**
  String get typing;

  /// No description provided for @unlimited.
  ///
  /// In ru, this message translates to:
  /// **'без лимита'**
  String get unlimited;

  /// No description provided for @used.
  ///
  /// In ru, this message translates to:
  /// **'Использован'**
  String get used;

  /// No description provided for @users.
  ///
  /// In ru, this message translates to:
  /// **'Пользователи'**
  String get users;

  /// No description provided for @validUntil.
  ///
  /// In ru, this message translates to:
  /// **'Действует до'**
  String get validUntil;

  /// No description provided for @variantValueHint.
  ///
  /// In ru, this message translates to:
  /// **'Например: Чёрный или 42'**
  String get variantValueHint;

  /// No description provided for @variants.
  ///
  /// In ru, this message translates to:
  /// **'Варианты (цвет, размер)'**
  String get variants;

  /// No description provided for @videoTooLarge.
  ///
  /// In ru, this message translates to:
  /// **'Видео слишком большое. Выберите короче.'**
  String get videoTooLarge;

  /// No description provided for @viewAsBuyer.
  ///
  /// In ru, this message translates to:
  /// **'Посмотреть как покупатель'**
  String get viewAsBuyer;

  /// No description provided for @visibleHint.
  ///
  /// In ru, this message translates to:
  /// **'Покупатели видят товар в каталоге'**
  String get visibleHint;

  /// No description provided for @visibleToBuyers.
  ///
  /// In ru, this message translates to:
  /// **'Показывать покупателям'**
  String get visibleToBuyers;

  /// No description provided for @writeToSellerShort.
  ///
  /// In ru, this message translates to:
  /// **'Чат'**
  String get writeToSellerShort;

  /// No description provided for @you.
  ///
  /// In ru, this message translates to:
  /// **'Вы'**
  String get you;

  /// No description provided for @privacyText.
  ///
  /// In ru, this message translates to:
  /// **'ЧЕРНОВИК — требует проверки местным юристом.\n\nПолитика конфиденциальности Kerwen Market\n\n1. Какие данные мы храним\n• Имя и номер телефона (для входа и заказов).\n• Email и Google ID — только если вы входите через Google.\n• Заказы: товары, сумма, телефон для связи, адрес (если указали).\n• Сообщения в чате, фото, видео и голосовые, которые вы отправили.\n• Технические данные: время входа, устройство (для защиты аккаунта).\nМы не собираем геолокацию и контакты телефона. Из фото удаляются скрытые данные (EXIF, GPS).\n\n2. Зачем\nЧтобы работали вход, каталог, заказы и чат; чтобы защищать от мошенничества и спама.\n\n3. Кто видит ваши данные\n• Продавец видит ваше имя и телефон для связи — только по вашему заказу.\n• Переписку видят только два участника чата. Администрация видит сообщение только если на него поступила жалоба.\n• Мы не продаём и не передаём данные рекламодателям.\n\n4. Защита\nСоединение шифруется (HTTPS). Пароли хранятся только в виде защищённого хэша. Ссылки на файлы временные.\n\n5. Срок хранения и удаление\nДанные хранятся, пока у вас есть аккаунт. Чтобы удалить аккаунт и данные, напишите администрации в приложении.\n\n6. Контакты\nВопросы о данных — через администрацию Kerwen Market.'**
  String get privacyText;

  /// No description provided for @termsText.
  ///
  /// In ru, this message translates to:
  /// **'ЧЕРНОВИК — требует проверки местным юристом.\n\nПравила пользования Kerwen Market\n\n1. Kerwen Market — площадка, где торговцы показывают товары, а покупатели их заказывают. Продавец сам отвечает за товар, его описание, цену и качество.\n2. Онлайн-оплаты в приложении нет. Покупатель и продавец договариваются об оплате (наличные или перевод) и доставке в чате.\n3. Торговцы получают доступ только после личной встречи с администрацией и платят ежемесячную подписку. Если подписка не оплачена, магазин скрывается из каталога, данные сохраняются.\n4. Запрещено: товары, запрещённые законом; обман и подделки; спам; оскорбления; чужие фото без разрешения.\n5. Любой пользователь может пожаловаться на товар, магазин, пользователя или сообщение. Администрация может скрыть товар или заблокировать аккаунт.\n6. Возврат и обмен — по правилам магазина (указаны в профиле магазина) и законам Туркменистана о защите прав потребителей.\n7. Администрация может менять правила; об изменениях сообщается в приложении.'**
  String get termsText;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ru', 'tk'].contains(locale.languageCode);

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
