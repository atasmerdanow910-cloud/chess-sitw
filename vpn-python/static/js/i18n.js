/* Языки сайта: русский, турецкий, туркменский.
   Выбор хранится в куке sm_lang на всём домене (*.sstymmarket.click), поэтому
   маркетплейс и VPN Python помнят один и тот же язык. Подключается в <head>. */
(function () {
  "use strict";

  const LANGS = ["ru", "tr", "tk"];
  const CODE = { ru: "RU", tr: "TR", tk: "TM" };
  const NAMES = { ru: "Русский", tr: "Türkçe", tk: "Türkmençe" };

  /* [русский, турецкий, туркменский]; в русском «|» разделяет формы 1 / 2–4 / 5+ */
  const TXT = {
    to_start: ["в начало", "başa dön", "başyna"],
    sections: ["Разделы", "Bölümler", "Bölümler"],
    nav_guide: ["Инструкция", "Talimat", "Gollanma"],
    nav_files: ["Файлы", "Dosyalar", "Faýllar"],
    nav_home: ["Главная", "Ana sayfa", "Baş sahypa"],
    nav_profile: ["Профиль", "Profil", "Profil"],
    nav_search: ["Поиск", "Ara", "Gözleg"],
    language: ["Язык", "Dil", "Dil"],
    close: ["Закрыть", "Kapat", "Ýap"],
    badge_android: ["Pydroid 3 для Android", "Android için Pydroid 3", "Android üçin Pydroid 3"],
    subtitle_default: [
      "Запускайте Python-скрипты прямо на Android. Установите Pydroid 3 по пошаговой инструкции и используйте готовые .py файлы.",
      "Python betiklerini doğrudan Android'de çalıştırın. Adım adım talimatla Pydroid 3'ü kurun ve hazır .py dosyalarını kullanın.",
      "Python skriptlerini gönüden-göni Android-de işlediň. Ädimme-ädim gollanma boýunça Pydroid 3-i guruň we taýýar .py faýllaryny ulanyň.",
    ],
    dl_pydroid: ["Скачать Pydroid 3", "Pydroid 3'ü indir", "Pydroid 3-i ýükle"],
    chk_free: ["Бесплатно", "Ücretsiz", "Mugt"],
    chk_steps: ["Пошаговая инструкция", "Adım adım talimat", "Ädimme-ädim gollanma"],
    chk_secure: ["Защищённое соединение", "Güvenli bağlantı", "Howpsuz birikme"],
    st_scripts: ["скриптов", "betik", "skript"],
    st_downloads: ["загрузок", "indirme", "ýükleme"],
    st_steps: ["шагов", "adım", "ädim"],
    f1_title: ["Установщик Pydroid 3", "Pydroid 3 yükleyicisi", "Pydroid 3 gurnaýjysy"],
    f1_text: ["Файл APK доступен для прямой загрузки — без поиска по сторонним сайтам.", "APK dosyası doğrudan indirilebilir — başka sitelerde aramaya gerek yok.", "APK faýly gönüden-göni ýüklenip bilner — başga saýtlarda gözlemek gerek däl."],
    f2_title: ["Инструкция с иллюстрациями", "Resimli talimat", "Suratly gollanma"],
    f2_text: ["Семь шагов: от загрузки приложения до запуска первого скрипта.", "Yedi adım: uygulamayı indirmekten ilk betiği çalıştırmaya kadar.", "Ýedi ädim: programmany ýüklemekden ilkinji skripti işletmäge çenli."],
    f3_title: ["Библиотека скриптов", "Betik kütüphanesi", "Skriptler kitaphanasy"],
    f3_text: ["Просмотр кода, копирование в один клик и загрузка готовых .py файлов.", "Kodu görüntüleme, tek dokunuşla kopyalama ve hazır .py dosyalarını indirme.", "Kody görmek, bir basyşda göçürmek we taýýar .py faýllaryny ýüklemek."],
    guide_title: ["Установка и запуск за {n} шагов", "{n} adımda kurulum ve çalıştırma", "{n} ädimde gurmak we işletmek"],
    guide_sub: ["Синий маркер на экране показывает, куда нажать на каждом шаге.", "Ekrandaki mavi işaret her adımda nereye dokunacağınızı gösterir.", "Ekrandaky gök bellik her ädimde nirä basmalydygyny görkezýär."],
    files_title: ["Готовые скрипты", "Hazır betikler", "Taýýar skriptler"],
    files_sub: ["Откройте код, скопируйте его в Pydroid 3 или скачайте файл и запустите кнопкой ▶.", "Kodu açın, Pydroid 3'e kopyalayın veya dosyayı indirip ▶ düğmesiyle çalıştırın.", "Kody açyň, Pydroid 3-e göçüriň ýa-da faýly ýükläp ▶ düwmesi bilen işlediň."],
    gate: ["Чтобы открыть код и скачать файлы, войдите через Google.", "Kodu açmak ve dosyaları indirmek için Google ile giriş yapın.", "Kody açmak we faýllary ýüklemek üçin Google arkaly giriň."],
    login: ["Войти", "Giriş yap", "Gir"],
    search_ph: ["Поиск по названию, файлу или описанию", "Ada, dosyaya veya açıklamaya göre ara", "Ady, faýly ýa-da beýany boýunça gözle"],
    search_clear: ["Очистить поиск", "Aramayı temizle", "Gözlegi arassala"],
    howto_title: ["Как запустить .py файл", ".py dosyası nasıl çalıştırılır", ".py faýly nähili işletmeli"],
    copy_code: ["Копировать код", "Kodu kopyala", "Kody göçür"],
    dl_file: ["Скачать файл", "Dosyayı indir", "Faýly ýükle"],
    howto_c1: ["Нажмите <b>«Копировать»</b> у нужного скрипта — код попадёт в буфер обмена.", "İstediğiniz betikte <b>«Kopyala»</b>ya dokunun — kod panoya kopyalanır.", "Gerekli skriptde <b>«Göçür»</b> düwmesine basyň — kod bufere göçüriler."],
    howto_c2: ["Откройте <b>Pydroid 3</b>, в редакторе: долгое нажатие → <b>«Вставить»</b>.", "<b>Pydroid 3</b>'ü açın, düzenleyicide: uzun basın → <b>«Yapıştır»</b>.", "<b>Pydroid 3</b>-i açyň, redaktorda: uzak basyň → <b>«Goýmak»</b>."],
    howto_c3: ["Нажмите жёлтую кнопку <span class=\"kbd\">▶</span> — скрипт запустится.", "Sarı <span class=\"kbd\">▶</span> düğmesine dokunun — betik çalışır.", "Sary <span class=\"kbd\">▶</span> düwmä basyň — skript işläp başlar."],
    howto_d1: ["Нажмите <b>«Скачать»</b> — файл сохранится в папку <b>Download</b>.", "<b>«İndir»</b>e dokunun — dosya <b>Download</b> klasörüne kaydedilir.", "<b>«Ýükle»</b> düwmesine basyň — faýl <b>Download</b> bukjasyna saklanar."],
    howto_d2: ["В Pydroid 3: <span class=\"kbd\">☰</span> → <b>Open</b> → <b>Internal storage</b> → <b>Download</b>.", "Pydroid 3'te: <span class=\"kbd\">☰</span> → <b>Open</b> → <b>Internal storage</b> → <b>Download</b>.", "Pydroid 3-de: <span class=\"kbd\">☰</span> → <b>Open</b> → <b>Internal storage</b> → <b>Download</b>."],
    howto_d3: ["Выберите файл и нажмите <span class=\"kbd\">▶</span>.", "Dosyayı seçin ve <span class=\"kbd\">▶</span> düğmesine dokunun.", "Faýly saýlaň we <span class=\"kbd\">▶</span> düwmä basyň."],
    foot_about: ["Pydroid 3, пошаговая инструкция и готовые Python-скрипты для Android.", "Android için Pydroid 3, adım adım talimat ve hazır Python betikleri.", "Android üçin Pydroid 3, ädimme-ädim gollanma we taýýar Python skriptleri."],
    dl_apk: ["Скачать APK", "APK indir", "APK ýükle"],
    contact: ["Связаться с нами", "Bize ulaşın", "Biz bilen habarlaşyň"],
    security: ["Безопасность", "Güvenlik", "Howpsuzlyk"],
    legal1: ["Pydroid 3 — стороннее приложение, все права принадлежат его разработчикам.", "Pydroid 3 üçüncü taraf bir uygulamadır, tüm hakları geliştiricilerine aittir.", "Pydroid 3 — üçünji tarapyň programmasy, ähli hukuklary onuň işläp düzüjilerine degişli."],
    legal2: ["«Python» и логотип Python — товарные знаки Python Software Foundation.", "«Python» ve Python logosu Python Software Foundation'ın ticari markalarıdır.", "«Python» we Python logotipi Python Software Foundation-yň haryt nyşanlarydyr."],
    libs: ["Библиотеки:", "Kütüphaneler:", "Kitaphanalar:"],
    copy_pip: ["Скопировать команду pip", "pip komutunu kopyala", "pip buýrugyny göçür"],
    dl_py: ["Скачать .py", ".py indir", ".py ýükle"],
    sheet_hint: ["Pydroid 3: вставьте код в редактор и нажмите ▶", "Pydroid 3: kodu düzenleyiciye yapıştırın ve ▶'ye dokunun", "Pydroid 3: kody redaktora goýuň we ▶ basyň"],
    account: ["Аккаунт", "Hesap", "Hasap"],
    apk_file: ["APK файл", "APK dosyası", "APK faýly"],
    created_at: ["Аккаунт создан {date}", "Hesap oluşturuldu: {date}", "Hasap döredildi: {date}"],
    logout: ["Выйти", "Çıkış", "Çyk"],
    login_title: ["Вход и регистрация", "Giriş ve kayıt", "Giriş we hasaba alyş"],
    login_text: ["Войдите с помощью аккаунта Google. При первом входе аккаунт создаётся автоматически.", "Google hesabınızla giriş yapın. İlk girişte hesap otomatik oluşturulur.", "Google hasabyňyz bilen giriň. Ilkinji girişde hasap awtomatik döredilýär."],
    continue_google: ["Продолжить с Google", "Google ile devam et", "Google bilen dowam et"],
    login_fine: ["Мы получаем только имя, email и фото профиля. Пароль от Google сайт не видит.", "Yalnızca adınızı, e-postanızı ve profil fotoğrafınızı alırız. Google şifrenizi site görmez.", "Diňe adyňyzy, e-poçtaňyzy we profil suratyňyzy alýarys. Google parolyňyzy saýt görmeýär."],
    version: ["версия {v}", "sürüm {v}", "wersiýa {v}"],
    play_note: ["Откроется страница Pydroid 3 в Google Play", "Google Play'de Pydroid 3 sayfası açılır", "Google Play-de Pydroid 3 sahypasy açylar"],
    gate_apk: ["Чтобы скачать Pydroid 3, войдите через Google — это займёт несколько секунд.", "Pydroid 3'ü indirmek için Google ile giriş yapın — birkaç saniye sürer.", "Pydroid 3-i ýüklemek üçin Google arkaly giriň — bu birnäçe sekunt alar."],
    flood: ["Защита от флуда", "Flood koruması", "Flud goragy"],
    google_login: ["Вход через Google", "Google ile giriş", "Google arkaly giriş"],
    photo_n: ["Фото {n}", "Fotoğraf {n}", "Surat {n}"],
    photo_of: ["Фото: {t}", "Fotoğraf: {t}", "Surat: {t}"],
    step_n: ["ШАГ {n}", "ADIM {n}", "ÄDIM {n}"],
    swipe: ["листайте экраны", "ekranları kaydırın", "ekranlary süýşüriň"],
    no_scripts: ["Скрипты скоро появятся", "Betikler yakında eklenecek", "Skriptler ýakynda goşular"],
    come_later: ["Загляните позже.", "Daha sonra tekrar bakın.", "Soňrak gelip görüň."],
    nothing: ["Ничего не найдено", "Sonuç bulunamadı", "Hiç zat tapylmady"],
    change_query: ["Измените запрос.", "Aramanızı değiştirin.", "Gözlegi üýtgediň."],
    lines: ["строка|строки|строк", "satır", "setir"],
    downloads: ["Скачиваний", "İndirme", "Ýükleme"],
    needs_lib: ["Нужна библиотека", "Kütüphane gerekli", "Kitaphana gerek"],
    code: ["Код", "Kod", "Kod"],
    copy: ["Копировать", "Kopyala", "Göçür"],
    download: ["Скачать", "İndir", "Ýükle"],
    code_copied: ["Код скопирован. Вставьте его в Pydroid 3", "Kod kopyalandı. Pydroid 3'e yapıştırın", "Kod göçürildi. Ony Pydroid 3-e goýuň"],
    copied: ["Скопировано", "Kopyalandı", "Göçürildi"],
    copy_failed_code: ["Не удалось скопировать. Откройте код и выделите текст вручную", "Kopyalanamadı. Kodu açıp metni elle seçin", "Göçürip bolmady. Kody açyp, teksti el bilen saýlaň"],
    code_loading: ["Загрузка кода…", "Kod yükleniyor…", "Kod ýüklenýär…"],
    code_failed: ["Не удалось загрузить код. Проверьте подключение к интернету.", "Kod yüklenemedi. İnternet bağlantınızı kontrol edin.", "Kody ýükläp bolmady. Internet birikmäňizi barlaň."],
    pip_copied: ["Команда скопирована. В Pydroid 3: ☰ → Pip", "Komut kopyalandı. Pydroid 3'te: ☰ → Pip", "Buýruk göçürildi. Pydroid 3-de: ☰ → Pip"],
    copy_failed: ["Не удалось скопировать", "Kopyalanamadı", "Göçürip bolmady"],
    saving_file: ["Файл сохраняется в «Загрузки»", "Dosya «İndirilenler» klasörüne kaydediliyor", "Faýl «Ýüklenenler» bukjasyna saklanýar"],
    flash_login: ["Вы вошли как {name}", "{name} olarak giriş yaptınız", "Siz {name} hökmünde girdiňiz"],
    flash_welcome: ["Добро пожаловать, {name}! Аккаунт создан.", "Hoş geldiniz, {name}! Hesap oluşturuldu.", "Hoş geldiňiz, {name}! Hasap döredildi."],
    size_units: ["Б,КБ,МБ,ГБ", "B,KB,MB,GB", "B,KB,MB,GB"],

    /* --- шаги инструкции (тексты с сервера приходят по-русски) --- */
    s_download_title: ["Скачайте Pydroid 3", "Pydroid 3'ü indirin", "Pydroid 3-i ýükläň"],
    s_download_text: ["Нажмите кнопку «Скачать Pydroid 3» в начале страницы. Если браузер спросит подтверждение — нажмите «Скачать».", "Sayfanın başındaki «Pydroid 3'ü indir» düğmesine dokunun. Tarayıcı onay isterse «İndir»e dokunun.", "Sahypanyň başyndaky «Pydroid 3-i ýükle» düwmesine basyň. Brauzer tassyklamagy sorasa — «Ýükle» basyň."],
    s_download_tips: ["Файл сохранится в папку «Загрузки» (Download).", "Dosya «İndirilenler» (Download) klasörüne kaydedilir.", "Faýl «Ýüklenenler» (Download) bukjasyna saklanar."],
    s_unknown_title: ["Разрешите установку", "Kuruluma izin verin", "Gurnamaga rugsat beriň"],
    s_unknown_text: ["Откройте скачанный файл. Android покажет «Установка заблокирована» — нажмите «Настройки» и включите «Разрешить из этого источника».", "İndirilen dosyayı açın. Android «Yükleme engellendi» uyarısı gösterir — «Ayarlar»a dokunun ve «Bu kaynaktan izin ver»i açın.", "Ýüklenen faýly açyň. Android «Gurnamak gadagan edildi» diýip görkezer — «Sazlamalar» basyň we «Bu çeşmeden rugsat ber» açyň."],
    s_unknown_tips: ["Разрешение выдаётся один раз для вашего браузера.", "İzin tarayıcınız için bir kez verilir.", "Rugsat brauzeriňiz üçin bir gezek berilýär."],
    s_install_title: ["Установите приложение", "Uygulamayı yükleyin", "Programmany guruň"],
    s_install_text: ["Вернитесь назад и нажмите «Установить». Установка займёт несколько секунд.", "Geri dönün ve «Yükle»ye dokunun. Kurulum birkaç saniye sürer.", "Yza gaýdyň we «Gurna» basyň. Gurnamak birnäçe sekunt alar."],
    s_install_tips: ["Если появится Play Защита — нажмите «Подробнее» → «Всё равно установить».", "Play Protect uyarısı çıkarsa «Ayrıntılar» → «Yine de yükle»ye dokunun.", "Play Protect çyksa — «Jikme-jik» → «Her niçik-de gurna» basyň."],
    s_open_title: ["Откройте Pydroid 3", "Pydroid 3'ü açın", "Pydroid 3-i açyň"],
    s_open_text: ["Найдите Pydroid 3 на рабочем столе или в списке приложений. При первом запуске приложение подготовит Python — дождитесь окончания.", "Pydroid 3'ü ana ekranda veya uygulama listesinde bulun. İlk açılışta uygulama Python'u hazırlar — bitmesini bekleyin.", "Pydroid 3-i iş stolunda ýa-da programmalaryň sanawynda tapyň. Ilkinji açylanda programma Python-y taýýarlar — gutarmagyna garaşyň."],
    s_open_tips: ["Для первого запуска нужно подключение к интернету.", "İlk açılış için internet bağlantısı gerekir.", "Ilkinji açmak üçin internet birikmesi gerek."],
    s_storage_title: ["Дайте доступ к хранилищу", "Depolama erişimi verin", "Ýatda saklaýja rugsat beriň"],
    s_storage_text: ["Когда появится запрос доступа к файлам — нажмите «Разрешить». Без этого Pydroid 3 не увидит скачанные .py файлы.", "Dosya erişimi istendiğinde «İzin ver»e dokunun. Bu olmadan Pydroid 3 indirilen .py dosyalarını göremez.", "Faýllara rugsat soralanda — «Rugsat ber» basyň. Munsuz Pydroid 3 ýüklenen .py faýllary görmez."],
    s_storage_tips: ["Запроса не было: Настройки → Приложения → Pydroid 3 → Разрешения → Файлы и медиа → Разрешить.\nAndroid 11 и новее: Настройки → Приложения → Специальный доступ → Доступ ко всем файлам → Pydroid 3 → Вкл.", "İstek gelmediyse: Ayarlar → Uygulamalar → Pydroid 3 → İzinler → Dosyalar ve medya → İzin ver.\nAndroid 11 ve üzeri: Ayarlar → Uygulamalar → Özel erişim → Tüm dosyalara erişim → Pydroid 3 → Açık.", "Sorag bolmadyk bolsa: Sazlamalar → Programmalar → Pydroid 3 → Rugsatlar → Faýllar we media → Rugsat ber.\nAndroid 11 we täzeleri: Sazlamalar → Programmalar → Ýörite rugsat → Ähli faýllara rugsat → Pydroid 3 → Aç."],
    s_file_title: ["Откройте .py файл", ".py dosyasını açın", ".py faýly açyň"],
    s_file_text: ["Скачайте нужный файл в разделе «Файлы». В Pydroid 3 нажмите значок папки вверху → «Open» → «Internal storage» → «Download» и выберите файл.", "Gerekli dosyayı «Dosyalar» bölümünden indirin. Pydroid 3'te üstteki klasör simgesine dokunun → «Open» → «Internal storage» → «Download» ve dosyayı seçin.", "Gerekli faýly «Faýllar» bölüminden ýükläň. Pydroid 3-de ýokardaky bukja nyşanyna basyň → «Open» → «Internal storage» → «Download» we faýly saýlaň."],
    s_file_tips: ["Альтернатива: нажмите «Копировать» у файла и вставьте код в редактор Pydroid (долгое нажатие → «Вставить»).", "Alternatif: dosyada «Kopyala»ya dokunun ve kodu Pydroid düzenleyicisine yapıştırın (uzun basın → «Yapıştır»).", "Başga ýol: faýlda «Göçür» basyň we kody Pydroid redaktoryna goýuň (uzak basyň → «Goýmak»)."],
    s_run_title: ["Запустите код", "Kodu çalıştırın", "Kody işlediň"],
    s_run_text: ["Нажмите жёлтую кнопку ▶ в правом нижнем углу. Откроется терминал с результатом работы программы.", "Sağ alt köşedeki sarı ▶ düğmesine dokunun. Programın sonucunu gösteren terminal açılır.", "Sag aşaky burçdaky sary ▶ düwmä basyň. Programmanyň netijesi bilen terminal açylar."],
    s_run_tips: ["Ошибка ModuleNotFoundError: меню ☰ → «Pip» → введите название библиотеки → «Install».", "ModuleNotFoundError hatası: ☰ menüsü → «Pip» → kütüphane adını girin → «Install».", "ModuleNotFoundError ýalňyşlygy: ☰ menýu → «Pip» → kitaphananyň adyny ýazyň → «Install»."],

    /* --- нарисованные экраны Android --- */
    m_dl_cap1: ["Нажмите «Скачать» в окне браузера", "Tarayıcı penceresinde «İndir»e dokunun", "Brauzer penjiresinde «Ýükle» basyň"],
    m_web_sub: ["Pydroid 3 · инструкция · файлы", "Pydroid 3 · talimat · dosyalar", "Pydroid 3 · gollanma · faýllar"],
    m_dl_q: ["Скачать файл?", "Dosya indirilsin mi?", "Faýl ýüklenilsinmi?"],
    m_cancel: ["Отмена", "İptal", "Ýatyr"],
    m_dl_cap2: ["Откройте файл из уведомления «Загрузка завершена»", "«İndirme tamamlandı» bildiriminden dosyayı açın", "«Ýükleme tamamlandy» habarnamasyndan faýly açyň"],
    m_chrome_now: ["Chrome · сейчас", "Chrome · şimdi", "Chrome · häzir"],
    m_dl_done: ["Загрузка завершена", "İndirme tamamlandı", "Ýükleme tamamlandy"],
    m_open: ["Открыть", "Aç", "Aç"],
    m_un_cap1: ["Android предупредит — нажмите «Настройки»", "Android uyarır — «Ayarlar»a dokunun", "Android duýduryş berer — «Sazlamalar» basyň"],
    m_downloads: ["Загрузки", "İndirilenler", "Ýüklenenler"],
    m_blocked: ["Установка заблокирована", "Yükleme engellendi", "Gurnamak gadagan edildi"],
    m_blocked_p: ["В целях безопасности на телефоне запрещена установка неизвестных приложений из этого источника.", "Güvenliğiniz için telefonunuzda bu kaynaktan bilinmeyen uygulamaların yüklenmesine izin verilmiyor.", "Howpsuzlyk üçin telefonyňyzda bu çeşmeden näbelli programmalary gurnamak gadagan."],
    m_settings: ["Настройки", "Ayarlar", "Sazlamalar"],
    m_un_cap2: ["Включите «Разрешить из этого источника» и вернитесь назад", "«Bu kaynaktan izin ver»i açın ve geri dönün", "«Bu çeşmeden rugsat ber» açyň we yza gaýdyň"],
    m_unknown_apps: ["Установка неизвестных приложений", "Bilinmeyen uygulamaları yükle", "Näbelli programmalary gurnamak"],
    m_browser: ["Браузер", "Tarayıcı", "Brauzer"],
    m_allow_src: ["Разрешить из этого источника", "Bu kaynaktan izin ver", "Bu çeşmeden rugsat ber"],
    m_un_note: ["После включения нажмите «Назад» — появится кнопка «Установить».", "Açtıktan sonra «Geri»ye dokunun — «Yükle» düğmesi görünür.", "Açandan soň «Yza» basyň — «Gurna» düwmesi peýda bolar."],
    m_in_cap1: ["Нажмите «Установить»", "«Yükle»ye dokunun", "«Gurna» basyň"],
    m_install_q: ["Установить это приложение?", "Bu uygulama yüklensin mi?", "Bu programma gurnalsynmy?"],
    m_install: ["Установить", "Yükle", "Gurna"],
    m_in_cap2: ["Готово — нажмите «Открыть»", "Hazır — «Aç»a dokunun", "Taýýar — «Aç» basyň"],
    m_installed: ["Приложение установлено.", "Uygulama yüklendi.", "Programma gurnaldy."],
    m_done: ["Готово", "Bitti", "Taýýar"],
    m_op_cap: ["Найдите Pydroid 3 среди приложений", "Uygulamalar arasında Pydroid 3'ü bulun", "Programmalaryň arasynda Pydroid 3-i tapyň"],
    m_date: ["понедельник, 23 ноября", "23 Kasım Pazartesi", "23-nji noýabr, duşenbe"],
    m_gallery: ["Галерея", "Galeri", "Galereýa"],
    m_music: ["Музыка", "Müzik", "Aýdym-saz"],
    m_files: ["Файлы", "Dosyalar", "Faýllar"],
    m_mail: ["Почта", "E-posta", "Poçta"],
    m_store: ["Play Маркет", "Play Store", "Play Market"],
    m_notes: ["Заметки", "Notlar", "Bellikler"],
    m_app_ver: ["Версия приложения", "Uygulama sürümü", "Programmanyň wersiýasy"],
    m_st_cap1: ["Pydroid 3 спросит доступ — нажмите «Разрешить»", "Pydroid 3 erişim isteyecek — «İzin ver»e dokunun", "Pydroid 3 rugsat sorar — «Rugsat ber» basyň"],
    m_st_q: ["Разрешить приложению «Pydroid 3» доступ к файлам на устройстве?", "«Pydroid 3» uygulamasının cihazdaki dosyalara erişmesine izin verilsin mi?", "«Pydroid 3» programmasyna enjamdaky faýllara rugsat berilsinmi?"],
    m_allow: ["Разрешить", "İzin ver", "Rugsat ber"],
    m_deny: ["Запретить", "Reddet", "Gadagan et"],
    m_st_cap2: ["Нет запроса? Настройки → Приложения → Pydroid 3 → «Разрешения»", "İstek yok mu? Ayarlar → Uygulamalar → Pydroid 3 → «İzinler»", "Sorag ýokmy? Sazlamalar → Programmalar → Pydroid 3 → «Rugsatlar»"],
    m_app_info: ["О приложении", "Uygulama bilgileri", "Programma barada"],
    m_stop: ["Остановить", "Durdur", "Duruz"],
    m_notifs: ["Уведомления", "Bildirimler", "Habarnamalar"],
    m_on: ["Включены", "Açık", "Açyk"],
    m_perms: ["Разрешения", "İzinler", "Rugsatlar"],
    m_no_perms_given: ["Разрешения не предоставлены", "İzin verilmedi", "Rugsat berilmedi"],
    m_storage_cache: ["Память и кеш", "Depolama ve önbellek", "Ýat we keş"],
    m_used: ["Использовано 210 МБ", "210 MB kullanılıyor", "210 MB ulanyldy"],
    m_st_cap3: ["Откройте «Файлы и медиа» в списке «Не разрешено»", "«İzin verilmeyenler» listesinde «Dosyalar ve medya»yı açın", "«Rugsat berilmedik» sanawynda «Faýllar we media» açyň"],
    m_app_perms: ["Разрешения приложения", "Uygulama izinleri", "Programmanyň rugsatlary"],
    m_allowed: ["Разрешено", "İzin verilenler", "Rugsat berlen"],
    m_no_perms: ["Нет разрешений", "İzin yok", "Rugsat ýok"],
    m_not_allowed: ["Не разрешено", "İzin verilmeyenler", "Rugsat berilmedik"],
    m_files_media: ["Файлы и медиа", "Dosyalar ve medya", "Faýllar we media"],
    m_st_cap4: ["Выберите «Разрешить»", "«İzin ver»i seçin", "«Rugsat ber» saýlaň"],
    m_files_media2: ["Файлы и медиаконтент", "Dosyalar ve medya", "Faýllar we media"],
    m_media_access: ["Доступ к файлам и медиаконтенту для этого приложения", "Bu uygulama için dosya ve medya erişimi", "Bu programma üçin faýllara we media rugsat"],
    m_st_cap5: ["Android 11+: Специальный доступ → «Доступ ко всем файлам» → Вкл.", "Android 11+: Özel erişim → «Tüm dosyalara erişim» → Açık", "Android 11+: Ýörite rugsat → «Ähli faýllara rugsat» → Aç"],
    m_all_files: ["Доступ ко всем файлам", "Tüm dosyalara erişim", "Ähli faýllara rugsat"],
    m_manage_all: ["Разрешить доступ для управления всеми файлами", "Tüm dosyaları yönetmek için erişime izin ver", "Ähli faýllary dolandyrmaga rugsat ber"],
    m_st_note: ["Приложение сможет читать и изменять файлы на устройстве — это нужно, чтобы открывать .py из «Загрузок».", "Uygulama cihazdaki dosyaları okuyup değiştirebilir — .py dosyalarını «İndirilenler»den açmak için gereklidir.", "Programma enjamdaky faýllary okap we üýtgedip biler — bu .py faýllary «Ýüklenenler»-den açmak üçin gerek."],
    m_fi_cap1: ["Нажмите значок папки вверху → «Open»", "Üstteki klasör simgesine dokunun → «Open»", "Ýokardaky bukja nyşanyna basyň → «Open»"],
    m_fi_cap2: ["Internal storage → Download → выберите файл", "Internal storage → Download → dosyayı seçin", "Internal storage → Download → faýly saýlaň"],
    m_folder: ["Папка", "Klasör", "Bukja"],
    m_py_now: ["Python · только что", "Python · az önce", "Python · häzirjik"],
    m_2kb: ["2 КБ", "2 KB", "2 KB"],
    m_ru_cap1: ["Нажмите жёлтую кнопку ▶", "Sarı ▶ düğmesine dokunun", "Sary ▶ düwmä basyň"],
    m_ru_cap2: ["Результат появится в терминале", "Sonuç terminalde görünür", "Netije terminalda görüner"],
    m_code_comment: ["# Мой скрипт", "# Betiğim", "# Meniň skriptim"],
    m_code_world: ["Мир", "Dünya", "Dünýä"],
    m_code_hello: ["Привет", "Merhaba", "Salam"],
  };

  /* ----------------------------------------------------- выбор языка -- */
  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function baseDomain() {
    const h = location.hostname;
    if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":")) return "";
    return h.split(".").slice(-2).join(".");
  }
  function readLang() {
    const c = getCookie("sm_lang");
    if (LANGS.includes(c)) return c;
    try { const s = JSON.parse(localStorage.getItem("sm_lang") || '""'); if (LANGS.includes(s)) return s; } catch (e) { /* нет доступа */ }
    return "";
  }
  function saveLang(l) {
    try { localStorage.setItem("sm_lang", JSON.stringify(l)); } catch (e) { /* нет доступа */ }
    const attrs = "; path=/; max-age=31536000; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
    const d = baseDomain();
    try {
      document.cookie = "sm_lang=" + l + attrs + (d ? "; domain=" + d : "");
      if (getCookie("sm_lang") !== l) document.cookie = "sm_lang=" + l + attrs;
    } catch (e) { /* нет доступа */ }
  }

  const chosen = readLang();
  const lang = chosen || "ru";
  const li = LANGS.indexOf(lang);

  function raw(key) {
    const row = TXT[key];
    if (!row) return key;
    return row[li] != null ? row[li] : row[0];
  }
  function t(key, vars) {
    let s = raw(key);
    if (s.includes("|") && !s.includes("<")) s = s.split("|")[0];
    return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : "")) : s;
  }
  function tp(key, n) {
    const s = raw(key);
    if (!s.includes("|")) return s;
    const f = s.split("|"), a = Math.abs(n) % 100, b = a % 10;
    return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2];
  }
  /* Шаг инструкции: заголовок, текст и подсказки на выбранном языке */
  function step(s) {
    if (lang === "ru" || !TXT["s_" + s.key + "_title"]) return s;
    return Object.assign({}, s, {
      title: t("s_" + s.key + "_title"),
      text: t("s_" + s.key + "_text"),
      tips: t("s_" + s.key + "_tips").split("\n"),
    });
  }
  /* Сообщения сервера после входа через Google */
  function flash(msg) {
    if (lang === "ru" || !msg) return msg;
    let m = msg.match(/^Вы вошли как (.+)$/);
    if (m) return t("flash_login", { name: m[1] });
    m = msg.match(/^Добро пожаловать, (.+)! Аккаунт создан\.$/);
    if (m) return t("flash_welcome", { name: m[1] });
    return msg;
  }
  function locale() { return lang === "tr" ? "tr-TR" : "ru-RU"; }

  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const n = el.dataset.n;
      el.textContent = n != null ? t(el.dataset.i18n, { n }) : t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    root.querySelectorAll("[data-i18n-sub]").forEach((el) => {
      if (el.textContent.trim() === TXT.subtitle_default[0]) el.textContent = t("subtitle_default");
    });
    root.querySelectorAll("[data-i18n-brand]").forEach((el) => {
      el.setAttribute("aria-label", el.dataset.i18nBrand + " — " + t("to_start"));
    });
  }

  /* ----------------------------------------------- окно выбора языка -- */
  function openPicker(first) {
    let ov = document.getElementById("lp-overlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "lp-overlay";
      ov.className = "lp-overlay";
      const brand = (document.querySelector(".brand-name") || {}).textContent || "VPN Python";
      ov.innerHTML =
        '<div class="lp-card glass" role="dialog" aria-modal="true">' +
        '<button class="icon-btn lp-close" type="button" aria-label="' + t("close") + '"><svg class="i"><use href="#i-x"/></svg></button>' +
        '<span class="lp-logo"><svg class="py-logo" viewBox="0 0 100 100"><use href="#i-python"/></svg></span>' +
        '<div class="lp-brand"></div>' +
        '<p class="lp-title">Выберите язык<br>Dil seçin<br>Dili saýlaň</p>' +
        '<div class="lp-list">' + LANGS.map((l) =>
          '<button type="button" data-lang="' + l + '"><span class="lp-code ' + l + '">' + CODE[l] + '</span>' +
          '<span class="lp-name">' + NAMES[l] + '</span><svg class="i"><use href="#i-chevron"/></svg></button>').join("") +
        "</div></div>";
      ov.querySelector(".lp-brand").textContent = brand;
      ov.addEventListener("click", (e) => {
        const b = e.target.closest("[data-lang]");
        if (b) {
          const l = b.dataset.lang;
          const wasFirst = !readLang();
          saveLang(l);
          if (wasFirst || l !== lang) location.reload();
          else ov.hidden = true;
          return;
        }
        if (e.target.closest(".lp-close")) ov.hidden = true;
      });
      document.body.appendChild(ov);
    }
    ov.querySelector(".lp-close").hidden = !!first;
    ov.querySelectorAll("[data-lang]").forEach((b) => b.classList.toggle("on", !first && b.dataset.lang === lang));
    ov.hidden = false;
  }

  window.I18N = { lang, chosen: !!chosen, t, tp, step, flash, locale, apply, openPicker };

  /* Пока перевод не применён, страница скрыта (только для tr/tk) — без мигания русского текста */
  if (lang !== "ru") document.documentElement.classList.add("i18n-wait");
  document.documentElement.lang = lang;

  document.addEventListener("DOMContentLoaded", () => {
    apply(document);
    const btn = document.getElementById("lang-btn");
    if (btn) {
      const code = btn.querySelector("[data-lang-code]");
      if (code) code.textContent = CODE[lang];
      btn.addEventListener("click", () => openPicker(false));
    }
    document.documentElement.classList.remove("i18n-wait");
    if (!chosen) openPicker(true);
  });
})();
