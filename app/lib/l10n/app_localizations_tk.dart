// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Turkmen (`tk`).
class AppLocalizationsTk extends AppLocalizations {
  AppLocalizationsTk([String locale = 'tk']) : super(locale);

  @override
  String get appName => 'Kerwen Market';

  @override
  String get navHome => 'Baş sahypa';

  @override
  String get navShops => 'Dükanlar';

  @override
  String get navCart => 'Sebet';

  @override
  String get navChats => 'Hatlar';

  @override
  String get navProfile => 'Profil';

  @override
  String get searchHint => 'Haryt ýa-da dükan gözle';

  @override
  String get searchNothingFound => 'Hiç zat tapylmady';

  @override
  String get categories => 'Kategoriýalar';

  @override
  String get popularShops => 'Meşhur dükanlar';

  @override
  String get newProducts => 'Täze harytlar';

  @override
  String get seeAll => 'Ählisi';

  @override
  String get allShops => 'Ähli dükanlar';

  @override
  String get products => 'Harytlar';

  @override
  String productsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count haryt',
      zero: 'haryt ýok',
    );
    return '$_temp0';
  }

  @override
  String reviewsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count syn',
      zero: 'syn ýok',
    );
    return '$_temp0';
  }

  @override
  String get badgeNew => 'Täze';

  @override
  String get verifiedSeller => 'Barlanan satyjy';

  @override
  String inStock(int count) {
    return 'Bar: $count sany';
  }

  @override
  String get outOfStock => 'Haryt gutardy';

  @override
  String get addToCart => 'Sebede goş';

  @override
  String get addedToCart => 'Sebede goşuldy';

  @override
  String get writeToSeller => 'Satyja ýaz';

  @override
  String get description => 'Düşündiriş';

  @override
  String get variantColor => 'Reňk';

  @override
  String get variantSize => 'Ölçeg';

  @override
  String get shop => 'Dükan';

  @override
  String get workingHours => 'Iş wagty';

  @override
  String get address => 'Salgy';

  @override
  String get favorites => 'Halanlarym';

  @override
  String get favoritesEmpty => 'Halan harytlaryňyz şu ýerde görüner';

  @override
  String get report => 'Şikaýat et';

  @override
  String get cartEmpty => 'Sebet boş';

  @override
  String get cartEmptyHint => 'Dükanlardan haryt goşuň';

  @override
  String get total => 'Jemi';

  @override
  String get checkout => 'Sargyt et';

  @override
  String get checkoutPerShopHint =>
      'Sargyt her dükan üçin aýratyn edilýär. Tölegi we eltip bermegi satyjy bilen hatda ylalaşýarsyňyz.';

  @override
  String get chatsEmpty => 'Heniz hat ýok';

  @override
  String get messageHint => 'Hat ýazyň…';

  @override
  String get voiceMessage => 'Sesli hat';

  @override
  String get photo => 'Surat';

  @override
  String get video => 'Wideo';

  @override
  String get attach => 'Goş';

  @override
  String get guest => 'Myhman';

  @override
  String get loginPrompt =>
      'Sargyt etmek we satyjylara ýazmak üçin içeri giriň';

  @override
  String get login => 'Içeri gir';

  @override
  String get loginWithGoogle => 'Google bilen gir';

  @override
  String get or => 'ýa-da';

  @override
  String get phone => 'Telefon belgisi';

  @override
  String get password => 'Açar sözi';

  @override
  String get register => 'Hasaba dur';

  @override
  String get googleFallbackHint =>
      'Google işlemese, telefon belgiňiz bilen giriň';

  @override
  String get myOrders => 'Sargytlarym';

  @override
  String get language => 'Dil';

  @override
  String get theme => 'Tema';

  @override
  String get themeSystem => 'Ulgam boýunça';

  @override
  String get themeLight => 'Ýagty';

  @override
  String get themeDark => 'Garaňky';

  @override
  String get sellerPanel => 'Dükan paneli';

  @override
  String get privacyPolicy => 'Gizlinlik syýasaty';

  @override
  String get termsOfUse => 'Ulanyş düzgünleri';

  @override
  String appVersion(String version) {
    return 'Wersiýa $version';
  }

  @override
  String get myShop => 'Meniň dükanym';

  @override
  String subscriptionPaidUntil(String date) {
    return 'Abuna $date çenli tölenen';
  }

  @override
  String subscriptionEndsSoon(int days) {
    return 'Abunanyň möhleti $days günden gutarýar. Uzaltmak üçin administrasiýa ýüz tutuň.';
  }

  @override
  String get subscriptionExpired =>
      'Abunanyň möhleti gutardy. Dükan katalogda görünmeýär, maglumatlar saklanýar.';

  @override
  String get statViews => 'Görülen';

  @override
  String get statOrders => 'Sargytlar';

  @override
  String get statProducts => 'Harytlar';

  @override
  String get popularProducts => 'Meşhur harytlar';

  @override
  String views(int count) {
    return '$count gezek görüldi';
  }

  @override
  String get orders => 'Sargytlar';

  @override
  String get messages => 'Hatlar';

  @override
  String get shopProfile => 'Dükanyň maglumatlary';

  @override
  String get addProduct => 'Haryt goş';

  @override
  String get editProduct => 'Haryty üýtget';

  @override
  String get productTitle => 'Ady';

  @override
  String get productPrice => 'Bahasy, TMT';

  @override
  String get productStock => 'Galyndy, sany';

  @override
  String get productCategory => 'Kategoriýa';

  @override
  String get productPhotos => 'Surat we wideo';

  @override
  String get fieldRequired => 'Bu meýdany dolduryň';

  @override
  String get fieldInvalidNumber => 'San giriziň';

  @override
  String get save => 'Ýatda sakla';

  @override
  String get saved => 'Ýatda saklandy';

  @override
  String get edit => 'Üýtget';

  @override
  String get hidden => 'Gizlin';

  @override
  String get delete => 'Poz';

  @override
  String get cancel => 'Ýatyr';

  @override
  String get shopName => 'Dükanyň ady';

  @override
  String get shopPhone => 'Müşderiler üçin telefon';

  @override
  String get legalName => 'Hususy telekeçi / kärhana (bar bolsa)';

  @override
  String get returnPolicy => 'Yzyna gaýtarmak düzgünleri';

  @override
  String orderNumber(String id) {
    return 'Sargyt №$id';
  }

  @override
  String get orderStatusNew => 'Täze';

  @override
  String get orderStatusConfirmed => 'Tassyklandy';

  @override
  String get orderStatusShipping => 'Ýolda';

  @override
  String get orderStatusDelivered => 'Gowşuryldy';

  @override
  String get orderStatusCancelled => 'Ýatyryldy';

  @override
  String get comingSoon => 'Bu mümkinçilik ýakynda goşular';

  @override
  String get pageNotFound => 'Sahypa tapylmady';

  @override
  String get goHome => 'Baş sahypa';

  @override
  String get acceptTerms => 'Düzgünleri we gizlinlik syýasatyny kabul edýärin';

  @override
  String get activate => 'Işjeňleşdir';

  @override
  String get active => 'Işjeň';

  @override
  String get addBanner => 'Täze banner';

  @override
  String get addCategory => 'Täze kategoriýa';

  @override
  String get addFirstProduct =>
      'Ilkinji harydy goşmak üçin «Haryt goş» düwmesine basyň';

  @override
  String get addVariant => 'Goş';

  @override
  String get addressOrMarket => 'Salgy / bazar';

  @override
  String get amountTmt => 'Möçberi, TMT';

  @override
  String get apply => 'Ulan';

  @override
  String get banners => 'Bannerler';

  @override
  String get blockShop => 'Dükany blokla';

  @override
  String get blockShopConfirm => 'Dükany bloklamalymy? Ol katalogdan aýrylar.';

  @override
  String get blockShopHint => 'Müşderilerden gizlenýär, maglumatlar saklanýar';

  @override
  String get blockUser => 'Ulanyjyny blokla';

  @override
  String get blockedByModerator => 'Moderator gizledi';

  @override
  String get broadcast => 'Habarnama';

  @override
  String get broadcastConfirm => 'Habary saýlanan ähli ulanyjylara ibermelimi?';

  @override
  String get broadcastHint => 'Habar programmadaky bildirişlerde görüner';

  @override
  String broadcastSent(int count) {
    return 'Iberildi: $count';
  }

  @override
  String get buyer => 'Müşderi';

  @override
  String get cancelOrder => 'Sargydy ýatyr';

  @override
  String get cancelOrderConfirm => 'Bu sargydy ýatyrmalymy?';

  @override
  String get changePassword => 'Açar sözüni üýtget';

  @override
  String get chooseVariant => 'Reňki we ölçegi saýlaň';

  @override
  String get colorHex => 'Reňk (#RRGGBB)';

  @override
  String get copied => 'Göçürildi';

  @override
  String get copy => 'Göçür';

  @override
  String get createAndGetCode => 'Döret we kod al';

  @override
  String get currentPassword => 'Häzirki açar sözi';

  @override
  String get deleteConfirm => 'Pozmalymy?';

  @override
  String get deleteProductConfirm =>
      'Harydy pozmalymy? Müşderiler ony indi görmezler.';

  @override
  String get deliveryAddress => 'Eltip bermek salgysy (hökman däl)';

  @override
  String get editProfile => 'Profil';

  @override
  String get emptyUnlimited => 'Boş = çäksiz';

  @override
  String get errAccountLocked =>
      'Synanyşyk köp boldy. 15 minutdan soň synanyşyň.';

  @override
  String get errAlreadySeller => 'Siziň eýýäm dükanyňyz bar';

  @override
  String get errFileTooLarge => 'Faýl gaty uly';

  @override
  String get errFileType => 'Bu faýl görnüşi goldanmaýar';

  @override
  String get errGeneric => 'Näsazlyk ýüze çykdy. Gaýtadan synanyşyň.';

  @override
  String get errGoogleUnavailable =>
      'Google häzir elýeterli däl. Telefon belgiňiz bilen giriň.';

  @override
  String get errInvalidCredentials => 'Telefon ýa-da açar sözi nädogry';

  @override
  String get errInvalidPhone => 'Belgini +993 6X XXXXXX görnüşinde giriziň';

  @override
  String get errInviteInvalid => 'Kod nädogry, ulanylan ýa-da möhleti geçen';

  @override
  String get errNetwork => 'Serwer bilen aragatnaşyk ýok';

  @override
  String get errNetworkHint =>
      'Interneti (we VPN-i) barlaň we gaýtadan synanyşyň';

  @override
  String get errNotFound => 'Tapylmady ýa-da indi elýeterli däl';

  @override
  String get errOutOfStock => 'Şu mukdarda haryt ýok';

  @override
  String get errOwnShop => 'Öz dükanyňyzdan sargyt edip bolmaýar';

  @override
  String get errPhoneTaken => 'Bu belgi eýýäm hasaba alnan. Içeri giriň.';

  @override
  String get errProductLimit => 'Tarifiňiziň haryt çägi doldy';

  @override
  String get errProductUnavailable => 'Haryt indi elýeterli däl';

  @override
  String get errReviewExists => 'Siz eýýäm syn galdyrdyňyz';

  @override
  String get errShopBlocked => 'Dükan bloklandy. Administrasiýa ýüz tutuň.';

  @override
  String get errShopUnavailable => 'Dükan häzir işlemeýär';

  @override
  String get errStatusChanged =>
      'Sargydyň ýagdaýy eýýäm üýtgedi. Sahypany täzeläň.';

  @override
  String get errTimeout =>
      'Serwer uzak wagt jogap bermeýär. Gaýtadan synanyşyň.';

  @override
  String get errTooMany => 'Haýyşlar gaty köp. Bir minut garaşyň.';

  @override
  String get errUserBlocked => 'Hasap bloklandy. Administrasiýa ýüz tutuň.';

  @override
  String get errValidation => 'Doldurylan meýdanlary barlaň';

  @override
  String get errWrongPassword => 'Häzirki açar sözi nädogry';

  @override
  String get filterActive => 'Işjeň';

  @override
  String get filterBlocked => 'Bloklanan';

  @override
  String get filterEnding => 'Möhleti gutarýar';

  @override
  String get filterExpired => 'Möhleti geçen';

  @override
  String get filterUnclaimed => 'Işjeňleşdirilmedik';

  @override
  String get filters => 'Süzgüçler';

  @override
  String get finalPriceHint =>
      'Jemi bahany serwer häzirki bahalar boýunça hasaplar';

  @override
  String get freeDays => 'Mugt günler';

  @override
  String get goShopping => 'Söwda et';

  @override
  String get haveAccountLogin => 'Hasabyňyz barmy? Içeri giriň';

  @override
  String get hiddenHint => 'Gizlin: müşderiler harydy görmeýär';

  @override
  String get hideProduct => 'Harydy gizle';

  @override
  String get iAmSeller => 'Men satyjy';

  @override
  String get iAmSellerHint => 'Administrasiýadan alnan kody giriziň';

  @override
  String get inviteAccepted => 'Taýýar! Dükanyňyz açyldy.';

  @override
  String get inviteCode => 'Satyjy kody';

  @override
  String get inviteCodes => 'Çakylyk kodlary';

  @override
  String get inviteExplain =>
      'Dükanlar diňe administrasiýa bilen duşuşykdan soň açylýar. Size berlen kody giriziň.';

  @override
  String get inviteInstructions =>
      'Kody satyja beriň. Ol programmany gurnaýar, hasaba durýar we kody «Profil → Men satyjy» bölüminde girizýär.';

  @override
  String itemsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count haryt',
    );
    return '$_temp0';
  }

  @override
  String get leaveReview => 'Syn galdyr';

  @override
  String get logout => 'Çykmak';

  @override
  String get logoutConfirm => 'Hasapdan çykmalymy?';

  @override
  String get markAllRead => 'Hemmesini okalan diýip belle';

  @override
  String get markAs => 'Belle';

  @override
  String get markResolved => 'Çözüldi';

  @override
  String get messageLabel => 'Habaryň teksti';

  @override
  String get methodCash => 'Nagt';

  @override
  String get methodOther => 'Başga';

  @override
  String get methodTransfer => 'Geçirim';

  @override
  String get micPermission => 'Telefonyň sazlamalarynda mikrofona rugsat beriň';

  @override
  String get moderation => 'Moderasiýa we şikaýatlar';

  @override
  String get month => 'aý';

  @override
  String get months => 'Aý';

  @override
  String get mustAcceptTerms => 'Düzgünleri kabul etmeli';

  @override
  String get name => 'Ady';

  @override
  String get newInviteCode => 'Täze çakylyk kody';

  @override
  String get newPassword => 'Täze açar sözi';

  @override
  String get newSeller => 'Täze satyjy';

  @override
  String get newSellerHint =>
      'Şahsy duşuşykdan soň dükan dörediň we satyja kod beriň.';

  @override
  String get noAccountRegister => 'Hasabyňyz ýokmy? Hasaba duruň';

  @override
  String get noCategory => 'Kategoriýasyz';

  @override
  String get noNotifications => 'Heniz bildiriş ýok';

  @override
  String get noOrdersYet => 'Heniz sargyt ýok';

  @override
  String get noPayments => 'Heniz töleg ýok';

  @override
  String get noProductsYet => 'Heniz haryt ýok';

  @override
  String get noReports => 'Şikaýat ýok';

  @override
  String get noShopsYet => 'Heniz dükan ýok';

  @override
  String get notActivatedYet => 'Satyjy heniz kody girizmedi';

  @override
  String get note => 'Bellik';

  @override
  String get notifications => 'Bildirişler';

  @override
  String get ok => 'Bolýar';

  @override
  String get open => 'Aç';

  @override
  String get orderComment => 'Sargyda teswir';

  @override
  String get orderCreated =>
      'Sargyt satyja iberildi! Ol siz bilen habarlaşar. Tölegi we eltip bermegi hatda ylalaşyň.';

  @override
  String get ownerPanel => 'Eýesiniň paneli';

  @override
  String get paidUntil => 'Tölenen möhleti';

  @override
  String get passwordRule => 'Iň az 8 nyşan';

  @override
  String get paymentHint =>
      'Onlaýn töleg ýok. Nagt ýa-da geçirim bilen — satyjy bilen hatda ylalaşyň.';

  @override
  String get paymentMethod => 'Töleg usuly';

  @override
  String get paymentsHistory => 'Tölegleriň taryhy';

  @override
  String get photoFromGallery => 'Galereýadan surat';

  @override
  String get placeOrder => 'Sargydy iber';

  @override
  String get plan => 'Tarif';

  @override
  String get plans => 'Abuna tarifleri';

  @override
  String get plansHint =>
      'Bahalar we çäkler serwerde saklanýar, islendik wagt üýtgedip bolýar.';

  @override
  String get priceFrom => 'Bahasy -dan';

  @override
  String get priceRange => 'Baha';

  @override
  String get priceTo => 'Bahasy -a çenli';

  @override
  String get productBlockedText =>
      'Harydy moderator gizledi. Administrasiýa ýüz tutuň.';

  @override
  String get productLimit => 'Haryt çägi';

  @override
  String get recordPayment => 'Tölegi kabul et';

  @override
  String get recording => 'Ýazgy edilýär…';

  @override
  String get reject => 'Ret et';

  @override
  String get reportHint => 'Näme nädogry, ýazyň. Administrasiýa barlar.';

  @override
  String get reportOpen => 'Täze';

  @override
  String get reportReason => 'Sebäbi';

  @override
  String get reportRejected => 'Ret edilen';

  @override
  String get reportResolved => 'Çözülen';

  @override
  String get reportSent => 'Şikaýat iberildi. Sag boluň!';

  @override
  String get reset => 'Arassala';

  @override
  String get retry => 'Gaýtala';

  @override
  String get revenueThisMonth => 'Aýyň abuna girdejisi';

  @override
  String get revenueTotal => 'Jemi';

  @override
  String get reviewHint => 'Näme halandyňyz ýa-da halamadyňyz?';

  @override
  String get reviews => 'Synlar';

  @override
  String get roleBuyer => 'Müşderi';

  @override
  String get roleOwner => 'Eýesi';

  @override
  String get roleSeller => 'Satyjy';

  @override
  String get searchUsers => 'Ady ýa-da telefony';

  @override
  String get sellerName => 'Satyjynyň ady';

  @override
  String get send => 'Iber';

  @override
  String get setPassword => 'Açar sözi goý (ätiýaçlyk giriş)';

  @override
  String get shopBlockedText => 'Dükan administrasiýa tarapyndan bloklandy';

  @override
  String get shopsAndSellers => 'Dükanlar we satyjylar';

  @override
  String get sortBy => 'Tertiplemek';

  @override
  String get sortNew => 'Ilki täzeler';

  @override
  String get sortOrder => 'Tertip';

  @override
  String get sortPopular => 'Meşhurlar';

  @override
  String get sortPriceAsc => 'Ilki arzanlar';

  @override
  String get sortPriceDesc => 'Ilki gymmatlar';

  @override
  String get statActiveShops => 'Işleýär';

  @override
  String get statBuyers => 'Müşderiler';

  @override
  String get statExpiredShops => 'Tölenmedik';

  @override
  String get statReports => 'Şikaýatlar';

  @override
  String get statSellers => 'Satyjylar';

  @override
  String stockShort(int count) {
    return 'galyndy $count';
  }

  @override
  String get takePhoto => 'Surata düş';

  @override
  String get titleLabel => 'Sözbaşy';

  @override
  String get typing => 'ýazýar…';

  @override
  String get unlimited => 'çäksiz';

  @override
  String get used => 'Ulanyldy';

  @override
  String get users => 'Ulanyjylar';

  @override
  String get validUntil => 'Möhleti';

  @override
  String get variantValueHint => 'Mysal: Gara ýa-da 42';

  @override
  String get variants => 'Görnüşler (reňk, ölçeg)';

  @override
  String get videoTooLarge => 'Wideo gaty uly. Gysgarak saýlaň.';

  @override
  String get viewAsBuyer => 'Müşderi hökmünde gör';

  @override
  String get visibleHint => 'Müşderiler harydy katalogda görýärler';

  @override
  String get visibleToBuyers => 'Müşderilere görkez';

  @override
  String get writeToSellerShort => 'Hat';

  @override
  String get you => 'Siz';

  @override
  String get privacyText =>
      'TASLAMA — ýerli hukukçy tarapyndan barlanmaly.\n\nKerwen Market — Gizlinlik syýasaty\n\n1. Haýsy maglumatlary saklaýarys\n• Adyňyz we telefon belgiňiz (giriş we sargytlar üçin).\n• Email we Google ID — diňe Google bilen girseňiz.\n• Sargytlar: harytlar, jemi, habarlaşmak üçin telefon, salgy (görkezseňiz).\n• Hatdaky habarlar, iberen suratlaryňyz, wideolaryňyz we sesli hatlaryňyz.\n• Tehniki maglumatlar: giriş wagty, enjam (hasaby goramak üçin).\nÝerleşýän ýeriňizi we telefon kontaktlaryňyzy ýygnamaýarys. Suratlardan gizlin maglumatlar (EXIF, GPS) aýrylýar.\n\n2. Näme üçin\nGiriş, katalog, sargytlar we hat işlesin diýip; galplykdan we spamdan goramak üçin.\n\n3. Maglumatlaryňyzy kim görýär\n• Satyjy diňe siziň sargydyňyz boýunça adyňyzy we telefonyňyzy görýär.\n• Hatlaşygy diňe iki gatnaşyjy görýär. Administrasiýa habary diňe oňa şikaýat gelse görýär.\n• Maglumatlary satmaýarys we mahabatçylara bermeýäris.\n\n4. Goraýyş\nBaglanyşyk şifrlenýär (HTTPS). Açar sözleri diňe goralan hash görnüşinde saklanýar. Faýllara salgylar wagtlaýyn.\n\n5. Saklamak möhleti we pozmak\nMaglumatlar hasabyňyz bar wagty saklanýar. Hasaby we maglumatlary pozmak üçin programmada administrasiýa ýazyň.\n\n6. Habarlaşmak\nMaglumatlar barada soraglar — Kerwen Market administrasiýasy arkaly.';

  @override
  String get termsText =>
      'TASLAMA — ýerli hukukçy tarapyndan barlanmaly.\n\nKerwen Market — Ulanyş düzgünleri\n\n1. Kerwen Market — satyjylaryň harytlaryny görkezýän, müşderileriň bolsa sargyt edýän meýdançasy. Haryt, onuň beýany, bahasy we hili üçin satyjy özi jogapkär.\n2. Programmada onlaýn töleg ýok. Müşderi we satyjy tölegi (nagt ýa-da geçirim) we eltip bermegi hatda ylalaşýarlar.\n3. Satyjylar diňe administrasiýa bilen şahsy duşuşykdan soň rugsat alýarlar we aýlyk abuna tölýärler. Abuna tölenmese, dükan katalogdan gizlenýär, maglumatlar saklanýar.\n4. Gadagan: kanun bilen gadagan edilen harytlar; aldaw we galp harytlar; spam; kemsitmeler; rugsatsyz başganyň suratlary.\n5. Islendik ulanyjy haryt, dükan, ulanyjy ýa-da habar barada şikaýat edip biler. Administrasiýa harydy gizläp ýa-da hasaby bloklap biler.\n6. Yzyna gaýtarmak we çalyşmak — dükanyň düzgünleri (dükanyň profilinde) we Türkmenistanyň sarp edijileriň hukuklaryny goramak baradaky kanunlary boýunça.\n7. Administrasiýa düzgünleri üýtgedip biler; üýtgeşmeler barada programmada habar berilýär.';
}
