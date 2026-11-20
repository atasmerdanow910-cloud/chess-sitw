#!/usr/bin/env python3
"""Sstym Settings — the control center of Sstym Linux (GTK4 + libadwaita)."""
import os
import platform
import shutil
import subprocess
import sys

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
from gi.repository import Adw, Gio, GLib, Gtk  # noqa: E402

APP_ID = "org.sstym.Settings"
SHARE = "/usr/share/sstym"
CFG = os.path.expanduser("~/.config/sstym")
RUNTIME = os.environ.get("XDG_RUNTIME_DIR", "/tmp")
LIVE = os.path.exists("/run/archiso/bootmnt")
os.makedirs(CFG, exist_ok=True)


# ───────────────────────────── helpers ─────────────────────────────
def read(path, default=""):
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return default


def write(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(value + "\n")


def have(cmd):
    return shutil.which(cmd) is not None


def spawn(cmd, shell=False):
    """Start a program detached from this window."""
    try:
        subprocess.Popen(cmd, shell=shell, start_new_session=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except OSError:
        return False


def output(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=5).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def human(n):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.0f} {unit}" if unit in ("B", "KB") else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"


# ───────────────────────────── language ─────────────────────────────
LANG = read(f"{CFG}/lang") or os.environ.get("LANG", "ru")[:2]
if LANG not in ("ru", "en", "tk", "tr"):
    LANG = "en"
TEXT = {
    "title": ("Настройки Sstym", "Sstym Settings"),
    "home": ("Sstym Linux", "Sstym Linux"),
    "vpn": ("VPN и приватность", "VPN & Privacy"),
    "net": ("Сеть и устройства", "Network & Devices"),
    "look": ("Оформление", "Appearance"),
    "perf": ("Производительность", "Performance"),
    "apps": ("Приложения и игры", "Apps & Games"),
    "sys": ("Система", "System"),
    "welcome": ("Добро пожаловать в Sstym Linux!", "Welcome to Sstym Linux!"),
    "tagline": ("Дистрибутив на базе Arch Linux · Hyprland · работа, игры, безопасность",
                "Arch Linux based distribution · Hyprland · work, gaming, security"),
    "computer": ("Этот компьютер", "This computer"),
    "system": ("Система", "System"), "kernel": ("Ядро", "Kernel"),
    "cpu": ("Процессор", "Processor"), "gpu": ("Видеокарта", "Graphics"),
    "ram": ("Память", "Memory"), "disk": ("Диск", "Disk"),
    "mode": ("Режим", "Mode"),
    "live": ("Живая система с флешки", "Live system from USB"),
    "installed": ("Установлена на диск", "Installed on disk"),
    "quick": ("Быстрые действия", "Quick actions"),
    "install": ("Установить Sstym Linux", "Install Sstym Linux"),
    "install_sub": ("Поставить систему на диск ноутбука", "Install the system to this computer's disk"),
    "update": ("Обновить всё", "Update everything"),
    "update_sub": ("Система, AUR и Flatpak одной кнопкой", "System, AUR and Flatpak in one go"),
    "store": ("Магазин приложений", "App Store"),
    "store_sub": ("Тысячи программ из Flathub", "Thousands of apps from Flathub"),
    "keys": ("Горячие клавиши", "Keyboard shortcuts"),
    "vpn_group": ("Обход блокировок", "Unblock the internet"),
    "vpn_desc": ("Если один способ заблокирован — попробуйте следующий.",
                 "If one method is blocked, try the next one."),
    "tor": ("Tor Browser", "Tor Browser"),
    "tor_sub": ("Мосты Snowflake / WebTunnel / meek — лучше всего при блокировках",
                "Snowflake / WebTunnel / meek bridges — best against blocking"),
    "lantern_sub": ("Бесплатно, одной кнопкой", "Free, one click"),
    "amnezia_sub": ("AmneziaWG / XRay, бесплатный Amnezia Free или свой ключ",
                    "AmneziaWG / XRay, free Amnezia Free or your own key"),
    "throne_sub": ("Ключи vless:// reality, hy2://, trojan://, ss://",
                   "vless:// reality, hy2://, trojan://, ss:// keys"),
    "outline_sub": ("Ключ доступа ss://", "ss:// access key"),
    "proton_sub": ("Бесплатный тариф", "Free plan"),
    "help": ("Как обойти блокировки — инструкция", "How to get around blocking — guide"),
    "help_sub": ("Telegram через Tor, мосты, свой сервер", "Telegram via Tor, bridges, your own server"),
    "privacy": ("Защита", "Protection"),
    "firewall": ("Брандмауэр", "Firewall"),
    "firewall_sub": ("Блокирует входящие подключения", "Blocks incoming connections"),
    "mac": ("Случайный MAC-адрес Wi-Fi", "Random Wi-Fi MAC address"),
    "mac_sub": ("Включено — сети не могут отслеживать устройство", "On — networks can't track this device"),
    "wifi": ("Wi-Fi и сети", "Wi-Fi & networks"), "bt": ("Bluetooth", "Bluetooth"),
    "sound": ("Звук", "Sound"), "displays": ("Мониторы", "Displays"),
    "printers": ("Принтеры", "Printers"),
    "kb": ("Раскладка клавиатуры", "Keyboard layout"),
    "kb_sub": ("English / Русский — переключение Alt+Shift", "English / Russian — switch with Alt+Shift"),
    "wobble": ("Желе-окна", "Jelly windows"),
    "wobble_sub": ("Окна мягко колышутся, когда их перетаскиваешь", "Windows wobble softly while you drag them"),
    "glassst": ("Стиль прозрачности", "Transparency style"),
    "glass_opts": (["Зеркальное стекло", "Матовое стекло", "Классика"], ["Mirror glass", "Frosted glass", "Classic"]),
    "night": ("Ночной режим (Night Shift)", "Night Shift"),
    "night_sub": ("Тёплые цвета экрана вечером — меньше устают глаза", "Warmer screen colours in the evening"),
    "dtheme": ("Тема рабочего стола", "Desktop theme"),
    "dtheme_sub": ("Меню, док, Пункт управления, терминал и обои", "Menu bar, dock, Control Center, terminal and wallpaper"),
    "wall": ("Обои", "Wallpaper"), "own": ("Выбрать своё изображение…", "Choose your own image…"),
    "dock": ("Док", "Dock"), "dock_hide": ("Автоматически скрывать док", "Automatically hide the dock"),
    "theme": ("Тема, значки и шрифты", "Theme, icons and fonts"),
    "lang": ("Язык системы", "System language"),
    "lang_sub": ("Меню, приложения и раскладки клавиатуры", "Menus, apps and keyboard layouts"),
    "relogin": ("Готово — выйдите из сеанса и войдите снова", "Done — log out and back in to apply"),
    "effects": ("Качество эффектов", "Effects quality"),
    "effects_sub": ("Авто подбирает под ваш ноутбук", "Auto adapts to your laptop"),
    "fx": (["Авто", "Красиво", "Сбалансированно", "Максимум FPS"], ["Auto", "Beautiful", "Balanced", "Max FPS"]),
    "power": ("Режим питания", "Power mode"),
    "power_sub": ("Экономия батареи или максимальная скорость", "Save battery or go full speed"),
    "pw": (["Экономия", "Баланс", "Производительность"], ["Power saver", "Balanced", "Performance"]),
    "game": ("Игровой режим", "Game mode"),
    "game_sub": ("Все эффекты выкл., максимум FPS (SUPER+G)", "All effects off, max FPS (SUPER+G)"),
    "hw": ("Ваш ноутбук", "Your laptop"),
    "hw_weak": ("Слабый — Авто использует «Сбалансированно»", "Light — Auto uses Balanced"),
    "hw_strong": ("Мощный — Авто использует «Красиво»", "Powerful — Auto uses Beautiful"),
    "hw_vm": ("Виртуальная машина — Авто использует «Максимум FPS»", "Virtual machine — Auto uses Max FPS"),
    "games": ("Игры", "Games"), "tools": ("Инструменты", "Tools"),
    "steam_sub": ("Тысячи игр, Proton для игр с Windows", "Thousands of games, Proton for Windows games"),
    "lutris_sub": ("Epic, GOG, эмуляторы", "Epic, GOG, emulators"),
    "drivers": ("Драйверы видеокарты", "Graphics drivers"),
    "drivers_sub": ("NVIDIA / AMD / Intel — лучший драйвер для игр", "NVIDIA / AMD / Intel — best driver for games"),
    "sec": ("Инструменты безопасности", "Security tools"),
    "pentest_sub": ("Nmap, Metasploit, Wireshark, Burp… с иконками, запуск в один клик",
                    "Nmap, Metasploit, Wireshark, Burp… with icons, one-click launch"),
    "sec_sub": ("2800+ инструментов BlackArch по категориям", "2800+ BlackArch tools by category"),
    "backup": ("Резервные копии", "Backups"), "backup_sub": ("Timeshift — откат системы", "Timeshift — roll the system back"),
    "disks": ("Диски", "Disks"),
    "power_group": ("Питание", "Power"),
    "restart": ("Перезагрузить", "Restart"), "shutdown": ("Выключить", "Shut down"),
    "logout": ("Выйти из сеанса", "Log out"),
    "missing": ("не установлено", "not installed"),
    "applied": ("Готово", "Done"),
    "restart_app": ("Язык изменится после перезапуска приложения", "Restart the app to change the language"),
}


# Türkmençe / Türkçe (missing keys fall back to English)
EXTRA = {
    "tk": {
        "title": "Sstym sazlamalary", "vpn": "VPN we gizlinlik", "net": "Tor we enjamlar", "look": "Daşky görnüş",
        "perf": "Öndürijilik", "apps": "Programmalar we oýunlar", "sys": "Ulgam",
        "welcome": "Sstym Linux-a hoş geldiňiz!",
        "tagline": "Arch Linux esasly distribýutiw · Hyprland · iş, oýunlar, howpsuzlyk",
        "computer": "Bu kompýuter", "system": "Ulgam", "kernel": "Ýadro", "cpu": "Prosessor",
        "gpu": "Wideokarta", "ram": "Ýat", "disk": "Disk", "mode": "Režim",
        "live": "Fleşkadan işleýän ulgam", "installed": "Diske gurnaldy", "quick": "Çalt hereketler",
        "install": "Sstym Linux-y gurnamak", "install_sub": "Ulgamy kompýuteriň diskine gurnamak",
        "update": "Hemmesini täzelemek", "update_sub": "Ulgam, AUR we Flatpak bir düwme bilen",
        "store": "Programma dükany", "store_sub": "Flathub-dan müňlerçe programma",
        "keys": "Gysga düwmeler", "vpn_group": "Blokirowkalary aýlanyp geçmek",
        "vpn_desc": "Bir usul blokirlenen bolsa, indikisini synanyşyň.",
        "tor_sub": "Snowflake / WebTunnel / meek köprüleri — blokirowka garşy iň gowusy",
        "lantern_sub": "Mugt, bir düwme bilen", "outline_sub": "ss:// açary", "proton_sub": "Mugt tarif",
        "help": "Blokirowkalary nädip aýlanyp geçmeli — gollanma",
        "help_sub": "Tor arkaly Telegram, köprüler, öz serweriňiz",
        "privacy": "Gorag", "firewall": "Brandmauer", "firewall_sub": "Gelýän birikmeleri bökdeýär",
        "mac": "Tötänleýin Wi-Fi MAC salgysy", "mac_sub": "Açyk — torlar enjamy yzarlap bilmeýär",
        "wifi": "Wi-Fi we torlar", "sound": "Ses", "displays": "Monitorlar", "printers": "Printerler",
        "kb": "Klawiatura düzülişi", "kb_sub": "Alt+Shift bilen dil çalyşmak",
        "wobble": "Žele penjireler", "wobble_sub": "Penjireler süýrelende ýumşak titreýär",
        "glassst": "Aýna stili", "glass_opts": ["Aýna", "Gümür aýna", "Klassik"],
        "night": "Gijeki režim (Night Shift)", "night_sub": "Agşamlar ýyly reňkler — gözler az ýadaýar",
        "dtheme": "Iş stoly temasy", "dtheme_sub": "Menýu, dok, dolandyryş merkezi, terminal we fon",
        "wall": "Fon suraty", "own": "Öz suratyňyzy saýlaň…", "dock": "Dok",
        "dock_hide": "Dok awtomatik gizlensin", "theme": "Tema, nyşanlar we şriftler",
        "lang": "Ulgamyň dili", "lang_sub": "Menýular, programmalar we klawiatura",
        "relogin": "Taýýar — seansdan çykyp, gaýtadan giriň",
        "effects": "Effektleriň hili", "effects_sub": "Awto — noutbugyňyza görä saýlaýar",
        "fx": ["Awto", "Owadan", "Deňagramly", "Iň ýokary FPS"],
        "power": "Energiýa režimi", "power_sub": "Batareýany tygşytlamak ýa-da iň ýokary tizlik",
        "pw": ["Tygşytly", "Deňagramly", "Öndürijilik"],
        "game": "Oýun režimi", "game_sub": "Effektler öçük, iň ýokary FPS (SUPER+G)",
        "hw": "Siziň noutbugyňyz", "games": "Oýunlar", "tools": "Gurallar",
        "steam_sub": "Müňlerçe oýun, Windows oýunlary üçin Proton",
        "drivers": "Wideokarta drýwerleri", "drivers_sub": "NVIDIA / AMD / Intel — oýunlar üçin iň gowy drýwer",
        "pentest_sub": "Nmap, Metasploit, Wireshark, Burp… nyşanlar bilen, bir basyşda açmak",
        "sec": "Howpsuzlyk gurallary", "sec_sub": "Kategoriýalar boýunça 2800+ BlackArch guraly",
        "backup": "Ätiýaçlyk nusgalary", "backup_sub": "Timeshift — ulgamy yzyna gaýtarmak",
        "disks": "Diskler", "power_group": "Energiýa", "restart": "Täzeden açmak", "shutdown": "Öçürmek",
        "logout": "Seansdan çykmak", "missing": "gurnalmadyk", "applied": "Taýýar",
    },
    "tr": {
        "title": "Sstym Ayarları", "vpn": "VPN ve gizlilik", "net": "Ağ ve cihazlar", "look": "Görünüm",
        "perf": "Performans", "apps": "Uygulamalar ve oyunlar", "sys": "Sistem",
        "welcome": "Sstym Linux'a hoş geldiniz!",
        "tagline": "Arch Linux tabanlı dağıtım · Hyprland · iş, oyun, güvenlik",
        "computer": "Bu bilgisayar", "system": "Sistem", "kernel": "Çekirdek", "cpu": "İşlemci",
        "gpu": "Ekran kartı", "ram": "Bellek", "disk": "Disk", "mode": "Mod",
        "live": "USB'den canlı sistem", "installed": "Diske kurulu", "quick": "Hızlı işlemler",
        "install": "Sstym Linux'u kur", "install_sub": "Sistemi bu bilgisayarın diskine kur",
        "update": "Her şeyi güncelle", "update_sub": "Sistem, AUR ve Flatpak tek tuşla",
        "store": "Uygulama mağazası", "store_sub": "Flathub'dan binlerce uygulama",
        "keys": "Klavye kısayolları", "vpn_group": "Engelleri aş",
        "vpn_desc": "Bir yöntem engellenirse sıradakini deneyin.",
        "tor_sub": "Snowflake / WebTunnel / meek köprüleri — engellemelere karşı en iyisi",
        "lantern_sub": "Ücretsiz, tek tık", "outline_sub": "ss:// erişim anahtarı", "proton_sub": "Ücretsiz plan",
        "help": "Engeller nasıl aşılır — rehber", "help_sub": "Tor üzerinden Telegram, köprüler, kendi sunucunuz",
        "privacy": "Koruma", "firewall": "Güvenlik duvarı", "firewall_sub": "Gelen bağlantıları engeller",
        "mac": "Rastgele Wi-Fi MAC adresi", "mac_sub": "Açık — ağlar bu cihazı izleyemez",
        "wifi": "Wi-Fi ve ağlar", "sound": "Ses", "displays": "Ekranlar", "printers": "Yazıcılar",
        "kb": "Klavye düzeni", "kb_sub": "Dil değiştirmek için Alt+Shift",
        "wobble": "Jöle pencereler", "wobble_sub": "Pencereler sürüklenirken yumuşakça sallanır",
        "glassst": "Saydamlık stili", "glass_opts": ["Ayna cam", "Buzlu cam", "Klasik"],
        "night": "Gece modu (Night Shift)", "night_sub": "Akşamları sıcak renkler — gözler daha az yorulur",
        "dtheme": "Masaüstü teması", "dtheme_sub": "Menü çubuğu, dock, Denetim Merkezi, terminal ve duvar kağıdı",
        "wall": "Duvar kağıdı", "own": "Kendi resminizi seçin…", "dock": "Dock",
        "dock_hide": "Dock'u otomatik gizle", "theme": "Tema, simgeler ve yazı tipleri",
        "lang": "Sistem dili", "lang_sub": "Menüler, uygulamalar ve klavye düzenleri",
        "relogin": "Tamam — uygulamak için oturumu kapatıp yeniden açın",
        "effects": "Efekt kalitesi", "effects_sub": "Otomatik — dizüstünüze göre ayarlar",
        "fx": ["Otomatik", "Güzel", "Dengeli", "Maksimum FPS"],
        "power": "Güç modu", "power_sub": "Pil tasarrufu veya tam hız",
        "pw": ["Güç tasarrufu", "Dengeli", "Performans"],
        "game": "Oyun modu", "game_sub": "Tüm efektler kapalı, maksimum FPS (SUPER+G)",
        "hw": "Dizüstünüz", "games": "Oyunlar", "tools": "Araçlar",
        "steam_sub": "Binlerce oyun, Windows oyunları için Proton",
        "drivers": "Ekran kartı sürücüleri", "drivers_sub": "NVIDIA / AMD / Intel — oyunlar için en iyi sürücü",
        "pentest_sub": "Nmap, Metasploit, Wireshark, Burp… simgelerle, tek tıkla başlat",
        "sec": "Güvenlik araçları", "sec_sub": "Kategorilere göre 2800+ BlackArch aracı",
        "backup": "Yedekler", "backup_sub": "Timeshift — sistemi geri al",
        "disks": "Diskler", "power_group": "Güç", "restart": "Yeniden başlat", "shutdown": "Kapat",
        "logout": "Oturumu kapat", "missing": "kurulu değil", "applied": "Tamam",
    },
}


def _(key):
    v = TEXT[key]
    if LANG == "ru":
        return v[0]
    return EXTRA.get(LANG, {}).get(key, v[1])


def languages():
    """[(code, native name)] from /usr/share/sstym/languages.tsv"""
    out = []
    for line in read(f"{SHARE}/languages.tsv").splitlines():
        c = line.split("\t")
        if len(c) >= 4 and not line.startswith("#"):
            out.append((c[0], c[3]))
    return out or [("ru", "Русский"), ("en", "English")]


SHORTCUTS = [
    ("SUPER + Space", "Поиск (Spotlight)", "Search (Spotlight)"),
    ("SUPER + A", "Все приложения (Launchpad)", "All apps (Launchpad)"),
    ("SUPER + I", "Настройки Sstym", "Sstym Settings"),
    ("SUPER + N", "VPN / обход блокировок", "VPN / unblock"),
    ("SUPER + G", "Игровой режим", "Game mode"),
    ("SUPER + X", "Sstym Pentest", "Sstym Pentest"),
    ("SUPER + U", "Обновить всё", "Update everything"),
    ("SUPER + Return", "Терминал", "Terminal"),
    ("SUPER + B / E", "Браузер / Файлы", "Browser / Files"),
    ("SUPER + Q", "Закрыть окно", "Close window"),
    ("SUPER + 1…0", "Рабочие столы", "Workspaces"),
    ("SUPER + L", "Заблокировать экран", "Lock screen"),
    ("Alt + Shift", "Сменить язык ввода", "Switch input language"),
]


# ───────────────────────────── hardware ─────────────────────────────
def hw_info():
    info = {}
    os_rel = dict(l.split("=", 1) for l in read("/etc/os-release").splitlines() if "=" in l)
    info["system"] = os_rel.get("PRETTY_NAME", "Sstym Linux").strip('"')
    info["kernel"] = platform.release()
    cpu = ""
    threads = 0
    for line in read("/proc/cpuinfo").splitlines():
        if line.startswith("model name") and not cpu:
            cpu = line.split(":", 1)[1].strip()
        if line.startswith("processor"):
            threads += 1
    info["cpu"] = f"{cpu} ({threads})" if cpu else f"{threads} CPU"
    gpus = [l.split(": ", 1)[-1] for l in output(["lspci"]).splitlines()
            if any(k in l for k in ("VGA", "3D", "Display"))]
    info["gpu"] = "\n".join(gpus) or "—"
    mem_kb = 0
    for line in read("/proc/meminfo").splitlines():
        if line.startswith("MemTotal:"):
            mem_kb = int(line.split()[1])
    info["ram"] = human(mem_kb * 1024)
    try:
        st = os.statvfs("/")
        info["disk"] = f"{human(st.f_bavail * st.f_frsize)} / {human(st.f_blocks * st.f_frsize)}"
    except OSError:
        info["disk"] = "—"
    vm = subprocess.run(["systemd-detect-virt", "-q"]).returncode == 0 if have("systemd-detect-virt") else False
    info["class"] = "vm" if vm else ("weak" if (mem_kb < 6 * 1024 * 1024 or threads <= 4) else "strong")
    return info


# ───────────────────────────── window ─────────────────────────────
class SettingsWindow(Adw.ApplicationWindow):
    def __init__(self, app, start_page="home", welcome=False):
        super().__init__(application=app, title=_("title"))
        self.set_default_size(1000, 700)
        self.welcome = welcome
        self.info = hw_info()
        self.toasts = Adw.ToastOverlay()

        self.split = Adw.NavigationSplitView()
        self.split.set_min_sidebar_width(230)
        self.pages = {
            "home": (_("home"), "computer-symbolic", self.page_home),
            "vpn": (_("vpn"), "network-vpn-symbolic", self.page_vpn),
            "net": (_("net"), "network-wireless-symbolic", self.page_net),
            "look": (_("look"), "preferences-desktop-appearance-symbolic", self.page_look),
            "perf": (_("perf"), "power-profile-performance-symbolic", self.page_perf),
            "apps": (_("apps"), "input-gaming-symbolic", self.page_apps),
            "sys": (_("sys"), "emblem-system-symbolic", self.page_sys),
        }
        self.order = list(self.pages)

        # sidebar
        side = Adw.ToolbarView()
        sh = Adw.HeaderBar()
        sh.set_title_widget(Adw.WindowTitle(title="Sstym", subtitle=_("title")))
        side.add_top_bar(sh)
        self.listbox = Gtk.ListBox()
        self.listbox.add_css_class("navigation-sidebar")
        for key in self.order:
            title, icon, _fn = self.pages[key]
            row = Gtk.ListBoxRow()
            box = Gtk.Box(spacing=12, margin_top=8, margin_bottom=8, margin_start=6, margin_end=6)
            box.append(Gtk.Image.new_from_icon_name(icon))
            box.append(Gtk.Label(label=title, xalign=0))
            row.set_child(box)
            row.key = key
            self.listbox.append(row)
        self.listbox.connect("row-selected", self.on_row)
        scroll = Gtk.ScrolledWindow(child=self.listbox, vexpand=True)
        side.set_content(scroll)
        self.split.set_sidebar(Adw.NavigationPage(title="Sstym", child=side))

        # content
        self.content_view = Adw.ToolbarView()
        self.content_header = Adw.HeaderBar()
        self.content_view.add_top_bar(self.content_header)
        self.content_page = Adw.NavigationPage(title=_("home"), child=self.content_view)
        self.split.set_content(self.content_page)

        self.toasts.set_child(self.split)
        self.set_content(self.toasts)
        self.listbox.select_row(self.listbox.get_row_at_index(self.order.index(start_page)))

    # navigation
    def on_row(self, _lb, row):
        if not row:
            return
        title, _icon, build = self.pages[row.key]
        self.content_page.set_title(title)
        self.content_view.set_content(build())
        self.split.set_show_content(True)

    def toast(self, text):
        self.toasts.add_toast(Adw.Toast(title=text, timeout=2))

    # row builders
    def launch_row(self, title, subtitle, icon, cmd, shell=False):
        exe = cmd if shell else cmd[0]
        row = Adw.ActionRow(title=title, subtitle=subtitle or "")
        row.add_prefix(Gtk.Image.new_from_icon_name(icon))
        available = shell or have(exe)
        if available:
            row.set_activatable(True)
            row.add_suffix(Gtk.Image.new_from_icon_name("go-next-symbolic"))
            row.connect("activated", lambda *_a: spawn(cmd, shell=shell))
        else:
            row.set_subtitle(f"{subtitle} — {_('missing')}" if subtitle else _("missing"))
            row.set_sensitive(False)
        return row

    def info_row(self, title, value, icon=None):
        row = Adw.ActionRow(title=title, subtitle=value)
        row.set_subtitle_selectable(True)
        row.add_css_class("property")
        if icon:
            row.add_prefix(Gtk.Image.new_from_icon_name(icon))
        return row

    # ───────── pages ─────────
    def page_home(self):
        page = Adw.PreferencesPage()
        hero = Adw.PreferencesGroup()
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6, halign=Gtk.Align.CENTER, margin_top=6)
        logo = Gtk.Picture.new_for_filename(f"{SHARE}/logo-512.png")
        logo.set_size_request(128, 128)
        logo.set_can_shrink(True)
        logo.set_content_fit(Gtk.ContentFit.CONTAIN)
        box.append(logo)
        h = Gtk.Label(label=_("welcome") if self.welcome else "Sstym Linux")
        h.add_css_class("title-1")
        box.append(h)
        sub = Gtk.Label(label=_("tagline"), wrap=True, justify=Gtk.Justification.CENTER)
        sub.add_css_class("dim-label")
        box.append(sub)
        hero.add(box)
        page.add(hero)

        quick = Adw.PreferencesGroup(title=_("quick"))
        if LIVE:
            quick.add(self.launch_row(_("install"), _("install_sub"), "drive-harddisk-symbolic", ["sstym-install"]))
        quick.add(self.launch_row(_("update"), _("update_sub"), "software-update-available-symbolic", ["sstym-update"]))
        quick.add(self.launch_row(_("store"), _("store_sub"), "system-software-install-symbolic", ["gnome-software"]))
        quick.add(self.launch_row(_("vpn"), _("tor_sub"), "network-vpn-symbolic", ["sstym-vpn"]))
        quick.add(self.launch_row("Sstym Pentest", _("pentest_sub"), "security-high-symbolic", ["sstym-pentest"]))
        page.add(quick)

        comp = Adw.PreferencesGroup(title=_("computer"))
        i = self.info
        comp.add(self.info_row(_("system"), i["system"], "computer-symbolic"))
        comp.add(self.info_row(_("mode"), _("live") if LIVE else _("installed"), "media-removable-symbolic"))
        comp.add(self.info_row(_("cpu"), i["cpu"], "cpu-symbolic"))
        comp.add(self.info_row(_("gpu"), i["gpu"], "video-display-symbolic"))
        comp.add(self.info_row(_("ram"), i["ram"], "memory-symbolic"))
        comp.add(self.info_row(_("disk"), i["disk"], "drive-harddisk-symbolic"))
        comp.add(self.info_row(_("kernel"), i["kernel"], "application-x-firmware-symbolic"))
        page.add(comp)

        keys = Adw.PreferencesGroup(title=_("keys"))
        for combo, ru, en in SHORTCUTS:
            row = Adw.ActionRow(title=ru if LANG == "ru" else en)
            lab = Gtk.Label(label=combo)
            lab.add_css_class("dim-label")
            row.add_suffix(lab)
            keys.add(row)
        page.add(keys)
        return page

    def page_vpn(self):
        page = Adw.PreferencesPage()
        g = Adw.PreferencesGroup(title=_("vpn_group"), description=_("vpn_desc"))
        tor = ["tor-browser"] if have("tor-browser") else ["torbrowser-launcher"]
        g.add(self.launch_row(_("tor"), _("tor_sub"), "web-browser-symbolic", tor))
        g.add(self.launch_row("Lantern", _("lantern_sub"), "network-vpn-symbolic", ["lantern"]))
        g.add(self.launch_row("Amnezia VPN", _("amnezia_sub"), "network-vpn-symbolic", ["AmneziaVPN"]))
        g.add(self.launch_row("Throne", _("throne_sub"), "network-vpn-symbolic", ["throne"]))
        g.add(self.launch_row("Outline", _("outline_sub"), "network-vpn-symbolic", ["outline-client"]))
        g.add(self.launch_row("Proton VPN", _("proton_sub"), "network-vpn-symbolic", ["protonvpn-app"]))
        helprow = Adw.ActionRow(title=_("help"), subtitle=_("help_sub"), activatable=True)
        helprow.add_prefix(Gtk.Image.new_from_icon_name("help-browser-symbolic"))
        helprow.add_suffix(Gtk.Image.new_from_icon_name("go-next-symbolic"))
        helprow.connect("activated", lambda *_a: self.show_help())
        g.add(helprow)
        page.add(g)

        p = Adw.PreferencesGroup(title=_("privacy"))
        fw = Adw.SwitchRow(title=_("firewall"), subtitle=_("firewall_sub"))
        fw.add_prefix(Gtk.Image.new_from_icon_name("security-high-symbolic"))
        fw.set_active("ENABLED=yes" in read("/etc/ufw/ufw.conf"))
        fw.connect("notify::active", self.on_firewall)
        p.add(fw)
        mac = Adw.ActionRow(title=_("mac"), subtitle=_("mac_sub"))
        mac.add_prefix(Gtk.Image.new_from_icon_name("network-wireless-symbolic"))
        p.add(mac)
        page.add(p)
        return page

    def on_firewall(self, row, _p):
        action = "enable" if row.get_active() else "disable"
        cmd = ["sudo", "-n", "ufw", "--force", action] if LIVE else ["pkexec", "ufw", "--force", action]
        if not have(cmd[0]):
            self.toast("ufw: error")
            return
        proc = Gio.Subprocess.new(cmd, Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE)

        def done(p, res):
            try:
                ok = p.wait_check_finish(res)
            except GLib.Error:
                ok = False
            self.toast(_("applied") if ok else "ufw: error")
        proc.wait_check_async(None, done)

    def show_help(self):
        dlg = Adw.Dialog(title=_("help"), content_width=820, content_height=620)
        tv = Gtk.TextView(editable=False, monospace=True, wrap_mode=Gtk.WrapMode.WORD_CHAR,
                          left_margin=16, right_margin=16, top_margin=12, bottom_margin=12)
        tv.get_buffer().set_text(read(f"{SHARE}/vpn-help.txt", "—"))
        tb = Adw.ToolbarView()
        tb.add_top_bar(Adw.HeaderBar())
        tb.set_content(Gtk.ScrolledWindow(child=tv, vexpand=True))
        dlg.set_child(tb)
        dlg.present(self)

    def page_net(self):
        page = Adw.PreferencesPage()
        g = Adw.PreferencesGroup()
        g.add(self.launch_row(_("wifi"), "", "network-wireless-symbolic", ["nm-connection-editor"]))
        g.add(self.launch_row(_("bt"), "", "bluetooth-symbolic", ["blueman-manager"]))
        g.add(self.launch_row(_("sound"), "", "audio-speakers-symbolic", ["pavucontrol"]))
        g.add(self.launch_row(_("displays"), "", "video-display-symbolic", ["nwg-displays"]))
        g.add(self.launch_row(_("printers"), "", "printer-symbolic", ["system-config-printer"]))
        page.add(g)
        k = Adw.PreferencesGroup()
        k.add(self.info_row(_("kb"), _("kb_sub"), "input-keyboard-symbolic"))
        page.add(k)
        return page

    def page_look(self):
        page = Adw.PreferencesPage()
        th = Adw.PreferencesGroup()
        keys = ["glacier", "dark", "cozy", "neon"]
        combo = Adw.ComboRow(title=_("dtheme"), subtitle=_("dtheme_sub"),
                             model=Gtk.StringList.new(["Sstym Glacier", "Sstym Dark", "Sstym Cozy", "Sstym Neon"]))
        combo.add_prefix(Gtk.Image.new_from_icon_name("preferences-desktop-theme-symbolic"))
        cur = read(f"{CFG}/theme", "glacier")
        combo.set_selected(keys.index(cur) if cur in keys else 0)
        combo.connect("notify::selected", lambda r, _p: (spawn(["sstym-theme", keys[r.get_selected()]]),
                                                         self.toast(_("applied"))))
        th.add(combo)
        wb = Adw.SwitchRow(title=_("wobble"), subtitle=_("wobble_sub"))
        wb.add_prefix(Gtk.Image.new_from_icon_name("view-paged-symbolic"))
        wb.set_active(read(f"{CFG}/wobble", "off") == "on")
        wb.connect("notify::active", lambda r, _p: self.set_flag("wobble", "on" if r.get_active() else "off"))
        th.add(wb)
        gkeys = ["mirror", "frost", "classic"]
        gl = Adw.ComboRow(title=_("glassst"), model=Gtk.StringList.new(_("glass_opts")))
        gl.add_prefix(Gtk.Image.new_from_icon_name("window-new-symbolic"))
        gcur = read(f"{CFG}/glass", "classic")
        gl.set_selected(gkeys.index(gcur) if gcur in gkeys else 0)
        gl.connect("notify::selected", lambda r, _p: self.set_flag("glass", gkeys[r.get_selected()]))
        th.add(gl)
        ns = Adw.SwitchRow(title=_("night"), subtitle=_("night_sub"))
        ns.add_prefix(Gtk.Image.new_from_icon_name("weather-clear-night-symbolic"))
        ns.set_active(os.path.exists(f"{RUNTIME}/sstym-nightshift"))
        ns.connect("notify::active", lambda r, _p: spawn(["sstym-nightshift", "on" if r.get_active() else "off"]))
        th.add(ns)
        page.add(th)
        g = Adw.PreferencesGroup(title=_("wall"))
        flow = Gtk.FlowBox(selection_mode=Gtk.SelectionMode.NONE, max_children_per_line=3,
                           min_children_per_line=2, column_spacing=12, row_spacing=12, homogeneous=True)
        walls = sorted(f for f in os.listdir(f"{SHARE}/wallpapers") if f.endswith(".png")) \
            if os.path.isdir(f"{SHARE}/wallpapers") else []
        for w in walls:
            path = f"{SHARE}/wallpapers/{w}"
            pic = Gtk.Picture.new_for_filename(path)
            pic.set_content_fit(Gtk.ContentFit.COVER)
            pic.set_size_request(220, 124)
            frame = Gtk.Frame(child=pic)
            frame.add_css_class("card")
            btn = Gtk.Button(child=frame, tooltip_text=w.replace("sstym-", "").replace(".png", "").title())
            btn.add_css_class("flat")
            btn.connect("clicked", lambda _b, p=path: self.set_wallpaper(p))
            flow.append(btn)
        g.add(flow)
        own = Adw.ButtonRow(title=_("own"), start_icon_name="folder-pictures-symbolic")
        own.connect("activated", self.pick_wallpaper)
        g.add(own)
        page.add(g)

        d = Adw.PreferencesGroup(title=_("dock"))
        hide = Adw.SwitchRow(title=_("dock_hide"))
        hide.set_active(os.path.exists(f"{CFG}/dock-autohide"))
        hide.connect("notify::active", self.on_dock)
        d.add(hide)
        page.add(d)

        t = Adw.PreferencesGroup()
        t.add(self.launch_row(_("theme"), "", "preferences-desktop-theme-symbolic", ["nwg-look"]))
        self.langs = languages()
        lang = Adw.ComboRow(title=_("lang"), subtitle=_("lang_sub"),
                            model=Gtk.StringList.new([n for _c, n in self.langs]))
        lang.add_prefix(Gtk.Image.new_from_icon_name("preferences-desktop-locale-symbolic"))
        cur = read(f"{CFG}/lang") or os.environ.get("LANG", "ru")[:2]
        codes = [c for c, _n in self.langs]
        lang.set_selected(codes.index(cur) if cur in codes else 0)
        lang.connect("notify::selected", self.on_lang)
        t.add(lang)
        page.add(t)
        return page

    def set_wallpaper(self, path):
        write(f"{CFG}/wallpaper", path)
        subprocess.run(["pkill", "-x", "swaybg"])
        spawn(["swaybg", "-i", path, "-m", "fill"])
        self.toast(_("applied"))

    def pick_wallpaper(self, *_a):
        dialog = Gtk.FileDialog(title=_("own"))
        flt = Gtk.FileFilter()
        flt.add_mime_type("image/*")
        store = Gio.ListStore.new(Gtk.FileFilter)
        store.append(flt)
        dialog.set_filters(store)

        def done(dlg, res):
            try:
                f = dlg.open_finish(res)
            except GLib.Error:
                return
            if f:
                self.set_wallpaper(f.get_path())
        dialog.open(self, None, done)

    def on_dock(self, row, _p):
        if row.get_active():
            write(f"{CFG}/dock-autohide", "1")
        else:
            try:
                os.remove(f"{CFG}/dock-autohide")
            except OSError:
                pass
        spawn(["sstym-dock", "restart"])
        self.toast(_("applied"))

    def on_lang(self, row, _p):
        code = self.langs[row.get_selected()][0]
        cmd = ["sudo", "-n", "sstym-setlang", code] if LIVE else ["pkexec", "sstym-setlang", code]
        try:
            ok = subprocess.run(cmd, capture_output=True, timeout=120).returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            ok = False
        if not ok:   # no root rights: at least switch the apps + keyboard of this user
            subprocess.run(["sstym-setlang", code], capture_output=True)
        self.toast(_("relogin"))

    def page_perf(self):
        page = Adw.PreferencesPage()
        g = Adw.PreferencesGroup()
        fx_keys = ["auto", "beautiful", "balanced", "maxfps"]
        fx = Adw.ComboRow(title=_("effects"), subtitle=_("effects_sub"), model=Gtk.StringList.new(_("fx")))
        fx.add_prefix(Gtk.Image.new_from_icon_name("applications-graphics-symbolic"))
        cur = read(f"{CFG}/effects", "auto")
        fx.set_selected(fx_keys.index(cur) if cur in fx_keys else 0)
        fx.connect("notify::selected", lambda r, _p: self.set_effects(fx_keys[r.get_selected()]))
        g.add(fx)

        pw_keys = ["power-saver", "balanced", "performance"]
        pw = Adw.ComboRow(title=_("power"), subtitle=_("power_sub"), model=Gtk.StringList.new(_("pw")))
        pw.add_prefix(Gtk.Image.new_from_icon_name("battery-good-symbolic"))
        curp = output(["powerprofilesctl", "get"]) if have("powerprofilesctl") else ""
        pw.set_selected(pw_keys.index(curp) if curp in pw_keys else 1)
        pw.set_sensitive(have("powerprofilesctl"))
        pw.connect("notify::selected", lambda r, _p: self.set_power(pw_keys[r.get_selected()]))
        g.add(pw)

        gm = Adw.SwitchRow(title=_("game"), subtitle=_("game_sub"))
        gm.add_prefix(Gtk.Image.new_from_icon_name("input-gaming-symbolic"))
        gm.set_active(os.path.exists(f"{RUNTIME}/sstym-gamemode"))
        gm.connect("notify::active", lambda r, _p: spawn(["sstym-gamemode", "on" if r.get_active() else "off"]))
        g.add(gm)
        page.add(g)

        h = Adw.PreferencesGroup()
        cls = self.info["class"]
        h.add(self.info_row(_("hw"), _({"vm": "hw_vm", "weak": "hw_weak"}.get(cls, "hw_strong")),
                            "computer-symbolic"))
        page.add(h)
        return page

    def set_flag(self, name, value):
        write(f"{CFG}/{name}", value)
        if have("hyprctl"):
            subprocess.run(["hyprctl", "reload"], capture_output=True)
        self.toast(_("applied"))

    def set_effects(self, level):
        write(f"{CFG}/effects", level)
        if have("hyprctl"):
            subprocess.run(["hyprctl", "reload"], capture_output=True)
        self.toast(_("applied"))

    def set_power(self, profile):
        r = subprocess.run(["powerprofilesctl", "set", profile], capture_output=True)
        self.toast(_("applied") if r.returncode == 0 else "power-profiles-daemon: error")

    def page_apps(self):
        page = Adw.PreferencesPage()
        a = Adw.PreferencesGroup()
        a.add(self.launch_row(_("store"), _("store_sub"), "system-software-install-symbolic", ["gnome-software"]))
        a.add(self.launch_row(_("update"), _("update_sub"), "software-update-available-symbolic", ["sstym-update"]))
        page.add(a)
        g = Adw.PreferencesGroup(title=_("games"))
        g.add(self.launch_row("Steam", _("steam_sub"), "input-gaming-symbolic", ["steam"]))
        g.add(self.launch_row("Lutris", _("lutris_sub"), "input-gaming-symbolic", ["lutris"]))
        g.add(self.launch_row(_("drivers"), _("drivers_sub"), "video-display-symbolic", ["sstym-driver"]))
        page.add(g)
        t = Adw.PreferencesGroup(title=_("tools"))
        t.add(self.launch_row("Sstym Pentest", _("pentest_sub"), "security-high-symbolic", ["sstym-pentest"]))
        t.add(self.launch_row(_("sec"), _("sec_sub"), "security-medium-symbolic", ["sstym-tools"]))
        page.add(t)
        return page

    def page_sys(self):
        page = Adw.PreferencesPage()
        g = Adw.PreferencesGroup()
        if LIVE:
            g.add(self.launch_row(_("install"), _("install_sub"), "drive-harddisk-symbolic", ["sstym-install"]))
        g.add(self.launch_row(_("update"), _("update_sub"), "software-update-available-symbolic", ["sstym-update"]))
        g.add(self.launch_row(_("backup"), _("backup_sub"), "document-revert-symbolic", ["timeshift-launcher"]))
        g.add(self.launch_row(_("disks"), "", "drive-multidisk-symbolic", ["gnome-disks"]))
        page.add(g)
        p = Adw.PreferencesGroup(title=_("power_group"))
        p.add(self.launch_row(_("logout"), "", "system-log-out-symbolic", "hyprctl dispatch 'hl.dsp.exit()'", shell=True))
        p.add(self.launch_row(_("restart"), "", "system-reboot-symbolic", ["systemctl", "reboot"]))
        p.add(self.launch_row(_("shutdown"), "", "system-shutdown-symbolic", ["systemctl", "poweroff"]))
        page.add(p)
        return page


class SettingsApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id=APP_ID, flags=Gio.ApplicationFlags.HANDLES_COMMAND_LINE)
        self.start_page = "home"
        self.welcome = False

    def do_command_line(self, cmdline):
        args = cmdline.get_arguments()[1:]
        self.welcome = "--welcome" in args
        for a in args:
            if a.startswith("--page="):
                self.start_page = a.split("=", 1)[1]
        self.activate()
        return 0

    def do_activate(self):
        Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK)
        win = self.props.active_window
        if not win:
            page = self.start_page if self.start_page in ("home", "vpn", "net", "look", "perf", "apps", "sys") else "home"
            win = SettingsWindow(self, page, self.welcome)
        win.present()


if __name__ == "__main__":
    sys.exit(SettingsApp().run(sys.argv))
