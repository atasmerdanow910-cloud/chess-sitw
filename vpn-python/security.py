"""Защита сайта: настоящий IP за Cloudflare, лимиты запросов, 2FA (TOTP)."""
import base64
import hashlib
import hmac
import ipaddress
import re
import secrets
import struct
import threading
import time
from urllib.parse import quote

# Официальные диапазоны Cloudflare: https://www.cloudflare.com/ips/
CLOUDFLARE_RANGES = (
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
    "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
    "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
    "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
)
_CF_NETS = tuple(ipaddress.ip_network(n) for n in CLOUDFLARE_RANGES)


def parse_ip(value):
    try:
        ip = ipaddress.ip_address((value or "").strip())
    except ValueError:
        return None
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip


def parse_network(value):
    """IP или подсеть (1.2.3.4, 1.2.3.0/24, 2001:db8::/32) -> ip_network или None."""
    try:
        return ipaddress.ip_network((value or "").strip(), strict=False)
    except ValueError:
        return None


def is_cloudflare(addr):
    ip = parse_ip(addr)
    return ip is not None and any(ip.version == n.version and ip in n for n in _CF_NETS)


def is_loopback(addr):
    ip = parse_ip(addr)
    return ip is not None and ip.is_loopback


class RateLimiter:
    """Счётчики запросов в памяти процесса (фиксированное окно)."""

    def __init__(self, max_keys=60000):
        self._lock = threading.Lock()
        self._buckets = {}
        self._max = max_keys

    def hit(self, key, limit, window):
        now = time.monotonic()
        with self._lock:
            start, count = self._buckets.get(key, (now, 0))
            if now - start >= window:
                start, count = now, 0
            count += 1
            self._buckets[key] = (start, count)
            if len(self._buckets) > self._max:
                self._prune(now)
        return count <= limit, count

    def _prune(self, now):
        for key in [k for k, (s, _c) in self._buckets.items() if now - s > 900]:
            del self._buckets[key]
        if len(self._buckets) > self._max:
            self._buckets.clear()


class TTLCache:
    """Простой кэш значения на несколько секунд (чтобы не читать БД на каждый запрос)."""

    def __init__(self, ttl, loader):
        self.ttl = ttl
        self.loader = loader
        self._value = None
        self._at = 0.0
        self._lock = threading.Lock()

    def get(self):
        now = time.monotonic()
        if now - self._at > self.ttl:
            with self._lock:
                if now - self._at > self.ttl:
                    self._value = self.loader()
                    self._at = time.monotonic()
        return self._value

    def reset(self):
        self._at = 0.0


# ------------------------------------------------------------------ 2FA (TOTP) --

def new_totp_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def totp_code(secret, counter):
    key = base64.b32decode(secret.upper() + "=" * (-len(secret) % 8))
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    number = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return "%06d" % (number % 1000000)


def totp_match(secret, code, last_counter=0, now=None):
    """Проверка 6-значного кода (окно ±30 сек). Возвращает счётчик или None.
    Один и тот же код дважды не принимается (защита от повтора)."""
    code = re.sub(r"\D", "", code or "")
    if not secret or len(code) != 6:
        return None
    current = int((now if now is not None else time.time()) // 30)
    for counter in (current - 1, current, current + 1):
        if counter > last_counter and hmac.compare_digest(totp_code(secret, counter), code):
            return counter
    return None


def totp_uri(secret, account, issuer):
    label = quote("%s:%s" % (issuer, account))
    return "otpauth://totp/%s?secret=%s&issuer=%s&digits=6&period=30" % (label, secret, quote(issuer))


def qr_svg(text):
    """QR-код как SVG (если установлен segno), иначе пустая строка."""
    try:
        import segno
    except ImportError:
        return ""
    try:
        return segno.make(text, error="m").svg_inline(scale=5, dark="#0b1020", light="#ffffff", border=2)
    except Exception:  # noqa: BLE001 — QR не критичен
        return ""
