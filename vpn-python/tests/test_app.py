"""Автотесты сайта: python -m unittest discover -s tests -v

Google подменяется заглушкой, реальные запросы в интернет не делаются."""
import base64
import io
import json
import os
import re
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="vpnpy-test-")

import app as site  # noqa: E402
import oauth  # noqa: E402
import security as sec  # noqa: E402

USER_IP = "198.51.100.10"
CF_IP = "172.64.10.20"          # адрес из диапазона Cloudflare
PASSWORD = "test-pass-123"


def client(ip=USER_IP):
    c = site.app.test_client()
    c.environ_base["REMOTE_ADDR"] = ip
    return c


def csrf_from(html):
    m = re.search(r'name="csrf" value="([0-9a-f]+)"', html) or re.search(r'data-csrf="([0-9a-f]+)"', html)
    return m.group(1)


def reset_state():
    con = site.connect()
    for table in ("files", "users", "ip_blocks", "security_log", "login_fail",
                  "support_threads", "support_messages"):
        con.execute("DELETE FROM %s" % table)
    for key, value in site.DEFAULT_SETTINGS.items():
        site.set_setting(con, key, value)
    con.commit()
    site.save_password(con, PASSWORD)
    con.close()
    site.limiter._buckets.clear()
    site.blocks_cache.reset()
    site.guard_cache.reset()


def admin_client(ip=USER_IP):
    c = client(ip)
    html = c.get("/admin").get_data(as_text=True)
    r = c.post("/admin/login", data={"password": PASSWORD, "csrf": csrf_from(html)})
    assert r.status_code == 302, r.status_code
    page = c.get("/admin").get_data(as_text=True)
    c.csrf = csrf_from(page)
    return c


def api(c, method, url, payload=None):
    return c.open(url, method=method, json=payload, headers={"X-CSRF-Token": c.csrf})


def fake_id_token(claims):
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
    return "%s.%s.sig" % (enc({"alg": "RS256"}), enc(claims))


class Base(unittest.TestCase):
    def setUp(self):
        reset_state()


class PublicSite(Base):
    def test_pages_and_headers(self):
        r = client().get("/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("default-src 'self'", r.headers["Content-Security-Policy"])
        self.assertEqual(r.headers["X-Frame-Options"], "DENY")
        self.assertNotIn("Strict-Transport-Security", r.headers)

    def test_hsts_only_over_https_via_cloudflare(self):
        r = client(CF_IP).get("/", headers={"X-Forwarded-Proto": "https", "CF-Connecting-IP": USER_IP})
        self.assertIn("Strict-Transport-Security", r.headers)
        self.assertIn("Secure", r.headers.get("Set-Cookie", "Secure"))
        # с обычного IP заголовок X-Forwarded-Proto не принимается
        r = client().get("/", headers={"X-Forwarded-Proto": "https"})
        self.assertNotIn("Strict-Transport-Security", r.headers)


class AdminAuth(Base):
    def test_wrong_password_and_lockout(self):
        c = client()
        csrf = csrf_from(c.get("/admin").get_data(as_text=True))
        with mock.patch.object(site.time, "sleep"):
            for _ in range(site.LOGIN_MAX_FAILS):
                self.assertEqual(c.post("/admin/login", data={"password": "x", "csrf": csrf}).status_code, 401)
            r = c.post("/admin/login", data={"password": PASSWORD, "csrf": csrf})
        self.assertEqual(r.status_code, 429)

    def test_csrf_required(self):
        c = admin_client()
        r = c.post("/admin/api/settings", json={"site_title": "X"})
        self.assertEqual(r.status_code, 403)

    def test_two_factor_flow(self):
        c = admin_client()
        setup = api(c, "POST", "/admin/api/2fa/setup").get_json()
        secret = setup["secret"]
        self.assertTrue(setup["uri"].startswith("otpauth://totp/"))
        self.assertIn("<svg", setup["qr"])
        self.assertEqual(api(c, "POST", "/admin/api/2fa/enable", {"code": "000000"}).status_code, 400)
        code = sec.totp_code(secret, int(time.time() // 30))
        self.assertEqual(api(c, "POST", "/admin/api/2fa/enable", {"code": code}).status_code, 200)

        # новый вход: после пароля нужен код
        c2 = client("198.51.100.77")
        csrf = csrf_from(c2.get("/admin").get_data(as_text=True))
        c2.post("/admin/login", data={"password": PASSWORD, "csrf": csrf})
        page = c2.get("/admin").get_data(as_text=True)
        self.assertIn("Подтверждение входа", page)
        self.assertEqual(c2.get("/admin/api/data").status_code, 401)
        with mock.patch.object(site.time, "sleep"):
            self.assertEqual(c2.post("/admin/2fa", data={"code": "123456", "csrf": csrf_from(page)}).status_code, 401)
        # тот же код повторно не принимается (защита от повтора)
        self.assertEqual(c2.post("/admin/2fa", data={"code": code, "csrf": csrf_from(page)}).status_code, 401)
        next_code = sec.totp_code(secret, int(time.time() // 30) + 1)
        r = c2.post("/admin/2fa", data={"code": next_code, "csrf": csrf_from(page)})
        self.assertEqual(r.status_code, 302)
        self.assertEqual(c2.get("/admin/api/data").status_code, 200)


class Guard(Base):
    def test_rate_limit_and_auto_ban(self):
        c = client("203.0.113.50")
        limit = site.RATE_GENERAL[0]
        codes = [c.get("/api/data").status_code for _ in range(limit + 1)]
        self.assertEqual(codes[-1], 429)
        for _ in range(limit * site.FLOOD_BAN_FACTOR):
            c.get("/api/data")
        site.limiter._buckets.clear()
        self.assertEqual(c.get("/").status_code, 403)        # автоблок сработал
        self.assertEqual(client("203.0.113.51").get("/").status_code, 200)

    def test_cloudflare_real_ip(self):
        a = admin_client()
        self.assertEqual(api(a, "POST", "/admin/api/blocks", {"ip": "192.0.2.99", "minutes": 0}).status_code, 200)
        # через Cloudflare: блокируется настоящий IP посетителя
        self.assertEqual(client(CF_IP).get("/", headers={"CF-Connecting-IP": "192.0.2.99"}).status_code, 403)
        # подделанный заголовок не от Cloudflare игнорируется
        self.assertEqual(client("198.51.100.200").get("/", headers={"CF-Connecting-IP": "192.0.2.99"}).status_code, 200)

    def test_cannot_block_self_and_subnets(self):
        a = admin_client()
        self.assertEqual(api(a, "POST", "/admin/api/blocks", {"ip": USER_IP}).status_code, 400)
        self.assertEqual(api(a, "POST", "/admin/api/blocks", {"ip": "10.0.0.0/8"}).status_code, 400)
        self.assertEqual(api(a, "POST", "/admin/api/blocks", {"ip": "203.0.113.0/24", "minutes": 60}).status_code, 200)
        self.assertEqual(client("203.0.113.9").get("/").status_code, 403)

    def test_cloudflare_only_mode(self):
        a = admin_client()
        # включить можно только открыв админку через Cloudflare
        self.assertEqual(api(a, "POST", "/admin/api/security/cloudflare", {"enabled": True}).status_code, 400)
        cf_admin = admin_client(CF_IP)
        self.assertEqual(api(cf_admin, "POST", "/admin/api/security/cloudflare", {"enabled": True}).status_code, 200)
        site.guard_cache.reset()
        self.assertEqual(client("198.51.100.5").get("/").status_code, 403)
        self.assertEqual(client(CF_IP).get("/", headers={"CF-Connecting-IP": "198.51.100.5"}).status_code, 200)

    def test_big_public_body_rejected(self):
        r = client().post("/auth/logout", data=b"x" * (site.MAX_PUBLIC_BODY + 10),
                          content_type="application/octet-stream")
        self.assertEqual(r.status_code, 413)


class GoogleLogin(Base):
    def configure(self, require_files=True):
        a = admin_client()
        r = api(a, "POST", "/admin/api/google", {
            "client_id": "123-abc.apps.googleusercontent.com", "client_secret": "s3cret",
            "require_files": require_files, "require_apk": False})
        self.assertEqual(r.status_code, 200)
        fd = {"code": "print('hi')\n", "filename": "hi.py", "title": "Hi"}
        api_form = a.post("/admin/api/files", data=fd, headers={"X-CSRF-Token": a.csrf})
        return api_form.get_json()["created"][0]

    def login(self, c, sub="g-1", email="user@gmail.com"):
        r = c.get("/auth/google?next=/%23files")
        self.assertEqual(r.status_code, 302)
        loc = r.headers["Location"]
        self.assertTrue(loc.startswith(oauth.AUTH_URL))
        self.assertIn("code_challenge_method=S256", loc)
        state = re.search(r"state=([^&]+)", loc).group(1)
        info = {"sub": sub, "email": email, "name": "Иван", "picture": ""}
        with mock.patch.object(oauth, "finish", return_value=info):
            return c.get("/auth/google/callback?code=abc&state=" + state)

    def test_gated_files_and_registration(self):
        fid = self.configure(require_files=True)
        c = client()
        self.assertEqual(c.get("/api/files/" + fid).status_code, 401)
        self.assertEqual(c.get("/dl/%s/hi.py" % fid).status_code, 302)
        r = self.login(c)
        self.assertEqual(r.status_code, 302)
        self.assertEqual(r.headers["Location"], "/#files")
        self.assertEqual(c.get("/api/files/" + fid).get_json()["code"], "print('hi')\n")
        data = c.get("/api/data").get_json()
        self.assertEqual(data["auth"]["user"]["email"], "user@gmail.com")
        self.assertEqual(c.get("/dl/%s/hi.py" % fid).status_code, 200)
        users = admin_client().get("/admin/api/data").get_json()["users"]
        self.assertEqual(len(users), 1)
        self.assertEqual(users[0]["downloads"], 1)

    def test_state_mismatch_rejected(self):
        self.configure()
        c = client()
        c.get("/auth/google")
        with mock.patch.object(oauth, "finish") as fin:
            r = c.get("/auth/google/callback?code=abc&state=forged")
            fin.assert_not_called()
        self.assertEqual(r.status_code, 400)

    def test_blocked_user(self):
        fid = self.configure()
        c = client()
        self.login(c)
        a = admin_client()
        uid = a.get("/admin/api/data").get_json()["users"][0]["id"]
        self.assertEqual(api(a, "POST", "/admin/api/users/%d/block" % uid, {"blocked": True}).status_code, 200)
        self.assertEqual(c.get("/api/files/" + fid).status_code, 401)     # сессия сразу теряет доступ
        self.assertEqual(self.login(c).status_code, 403)                  # и войти снова нельзя

    def test_open_redirect_blocked(self):
        self.configure()
        c = client()
        r = c.get("/auth/google?next=//evil.example")
        state = re.search(r"state=([^&]+)", r.headers["Location"]).group(1)
        with mock.patch.object(oauth, "finish", return_value={"sub": "x", "email": "a@b.c", "name": "A", "picture": ""}):
            r = c.get("/auth/google/callback?code=abc&state=" + state)
        self.assertEqual(r.headers["Location"], "/")


class StepPhotos(Base):
    PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64

    def test_several_photos_per_step(self):
        a = admin_client()
        for _ in range(2):
            r = a.post("/admin/api/steps/storage/photo", headers={"X-CSRF-Token": a.csrf},
                       data={"photo": (io.BytesIO(self.PNG), "s.png")})
            self.assertEqual(r.status_code, 200)
        photos = client().get("/api/data").get_json()["steps"][4]["photos"]
        self.assertEqual(len(photos), 2)
        self.assertEqual(client().get(photos[0]).status_code, 200)
        name = photos[0].split("/")[-1]
        self.assertEqual(api(a, "DELETE", "/admin/api/steps/storage/photo?name=" + name).status_code, 200)
        self.assertEqual(len(client().get("/api/data").get_json()["steps"][4]["photos"]), 1)
        self.assertEqual(client().get(photos[0]).status_code, 404)

    def test_rejects_non_image(self):
        a = admin_client()
        r = a.post("/admin/api/steps/run/photo", headers={"X-CSRF-Token": a.csrf},
                   data={"photo": (io.BytesIO(b"<svg onload=alert(1)>"), "x.png")})
        self.assertEqual(r.status_code, 400)


class OAuthTokenCheck(unittest.TestCase):
    def _finish(self, claims):
        pending = {"state": "s", "nonce": "n1", "verifier": "v", "ts": int(time.time())}
        body = json.dumps({"id_token": fake_id_token(claims)}).encode()
        resp = mock.MagicMock()
        resp.__enter__.return_value.read.return_value = body
        with mock.patch.object(oauth.urllib.request, "urlopen", return_value=resp):
            return oauth.finish("cid", "secret", "https://x/cb", "code", pending)

    def good(self, **over):
        c = {"iss": "https://accounts.google.com", "aud": "cid", "exp": time.time() + 600, "nonce": "n1",
             "sub": "42", "email": "a@gmail.com", "email_verified": True, "name": "A",
             "picture": "https://lh3.googleusercontent.com/a/x"}
        c.update(over)
        return c

    def test_valid(self):
        info = self._finish(self.good())
        self.assertEqual(info["sub"], "42")
        self.assertTrue(info["picture"].startswith("https://lh3.googleusercontent.com/"))

    def test_rejects_bad_tokens(self):
        for bad in ({"aud": "other"}, {"iss": "evil"}, {"nonce": "zzz"}, {"exp": time.time() - 3600},
                    {"email_verified": False}):
            with self.assertRaises(oauth.OAuthError):
                self._finish(self.good(**bad))

    def test_strips_foreign_picture(self):
        self.assertEqual(self._finish(self.good(picture="https://evil.example/p.png"))["picture"], "")


class TotpUnit(unittest.TestCase):
    def test_rfc6238_vector(self):
        secret = base64.b32encode(b"12345678901234567890").decode()
        self.assertEqual(sec.totp_code(secret, 59 // 30), "287082")


DEV_A = "a" * 40
DEV_B = "b" * 40


def sp(c, method="GET", url="/api/support", payload=None, key=DEV_A):
    headers = {"X-User-Key": key} if key else {}
    return c.open(url, method=method, json=payload, headers=headers)


class Support(GoogleLogin):
    """Сообщения администратору: без входа (ключ устройства) и с аккаунтом Google."""

    def test_guest_writes_admin_replies(self):
        c = client()
        self.assertEqual(sp(c, key=None).get_json()["code"], "no_key")
        self.assertEqual(sp(c, "POST", payload={"text": "x"}).get_json()["code"], "empty")
        self.assertIsNone(sp(c).get_json()["thread"])
        r = sp(c, "POST", payload={"text": "Не открывается шаг 5", "topic": "bug",
                                   "name": "Аман", "contact": "@aman", "lang": "tk"})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.get_json()["message"]["mine"])
        a = admin_client()
        lst = api(a, "GET", "/admin/api/support").get_json()
        self.assertEqual(lst["unread"], 1)
        t = lst["threads"][0]
        self.assertEqual((t["name"], t["contact"], t["lang"], t["count"]), ("Аман", "@aman", "tk", 1))
        self.assertEqual(a.get("/admin/api/data").get_json()["support"]["unread"], 1)
        msgs = api(a, "GET", "/admin/api/support/" + t["id"]).get_json()["messages"]
        self.assertEqual([(m["from"], m["topic"], m["text"]) for m in msgs], [("user", "bug", "Не открывается шаг 5")])
        self.assertEqual(api(a, "GET", "/admin/api/support").get_json()["unread"], 0)
        self.assertEqual(api(a, "POST", "/admin/api/support/" + t["id"], {"text": "Включите доступ к файлам"}).status_code, 200)
        self.assertEqual(sp(c, url="/api/support/unread").get_json()["unread"], 1)
        got = sp(c).get_json()
        self.assertEqual([(m["from"], m["mine"]) for m in got["messages"]], [("user", True), ("admin", False)])
        self.assertEqual(sp(c, url="/api/support/unread").get_json()["unread"], 0)
        last = got["messages"][0]["id"]
        self.assertEqual([m["text"] for m in sp(c, url="/api/support?after=%d" % last).get_json()["messages"]],
                         ["Включите доступ к файлам"])
        # другое устройство чужую переписку не видит
        self.assertIsNone(sp(client(), key=DEV_B).get_json()["thread"])
        # без входа в админку ответить нельзя
        self.assertEqual(client().post("/admin/api/support/" + t["id"], json={"text": "x"}).status_code, 401)
        # удаление переписки
        self.assertEqual(api(a, "DELETE", "/admin/api/support/" + t["id"]).status_code, 200)
        self.assertIsNone(sp(c).get_json()["thread"])

    def test_rate_limit(self):
        c = client()
        codes = [sp(c, "POST", payload={"text": "сообщение %d" % i}).status_code for i in range(8)]
        self.assertEqual(codes.count(201), site.SUPPORT_RATE[0])
        self.assertEqual(codes[-1], 429)

    def test_google_account_takes_device_thread(self):
        self.configure(require_files=False)
        c = client()
        sp(c, "POST", payload={"text": "Вопрос до входа"})
        self.login(c)
        got = sp(c).get_json()
        self.assertEqual([m["text"] for m in got["messages"]], ["Вопрос до входа"])
        self.assertEqual(got["thread"]["name"], "Иван")
        sp(c, "POST", payload={"text": "Вопрос после входа"})
        # с другого устройства тот же аккаунт видит всю переписку
        c2 = client()
        self.login(c2)
        self.assertEqual(len(sp(c2, key=DEV_B).get_json()["messages"]), 2)
        a = admin_client()
        threads = api(a, "GET", "/admin/api/support").get_json()["threads"]
        self.assertEqual(len(threads), 1)
        self.assertEqual(threads[0]["email"], "user@gmail.com")
        # удалённый пользователь теряет и переписку
        uid = a.get("/admin/api/data").get_json()["users"][0]["id"]
        self.assertEqual(api(a, "DELETE", "/admin/api/users/%d" % uid).status_code, 200)
        self.assertEqual(api(a, "GET", "/admin/api/support").get_json()["threads"], [])

    def test_two_threads_merge_on_login(self):
        self.configure(require_files=False)
        c = client()
        self.login(c)
        sp(c, "POST", payload={"text": "С аккаунта"})
        g = client()
        sp(g, "POST", payload={"text": "С гостевого устройства"}, key=DEV_B)
        self.login(g)
        got = sp(g, key=DEV_B).get_json()
        self.assertEqual(sorted(m["text"] for m in got["messages"]), ["С аккаунта", "С гостевого устройства"])
        a = admin_client()
        lst = api(a, "GET", "/admin/api/support").get_json()
        self.assertEqual(len(lst["threads"]), 1)
        self.assertEqual(lst["unread"], 2)


if __name__ == "__main__":
    unittest.main()
