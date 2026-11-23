"""Вход через Google: OAuth 2.0 / OpenID Connect (authorization code + PKCE)."""
import base64
import hashlib
import json
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
ISSUERS = ("accounts.google.com", "https://accounts.google.com")
STATE_TTL = 10 * 60


class OAuthError(Exception):
    pass


def _b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def start(client_id, redirect_uri):
    """Ссылка на Google и данные, которые нужно сохранить в сессии до возврата."""
    state = secrets.token_urlsafe(24)
    nonce = secrets.token_urlsafe(24)
    verifier = secrets.token_urlsafe(48)
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    pending = {"state": state, "nonce": nonce, "verifier": verifier, "ts": int(time.time())}
    return AUTH_URL + "?" + urllib.parse.urlencode(params), pending


def _jwt_payload(token):
    try:
        part = token.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
    except (IndexError, ValueError, AttributeError):
        raise OAuthError("Google вернул неверный ответ")


def finish(client_id, client_secret, redirect_uri, code, pending):
    """Меняет код на токен и проверяет данные пользователя."""
    if not pending or time.time() - pending.get("ts", 0) > STATE_TTL:
        raise OAuthError("Время входа истекло — попробуйте ещё раз")
    body = urllib.parse.urlencode({
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
        "code_verifier": pending["verifier"],
    }).encode("ascii")
    req = urllib.request.Request(TOKEN_URL, data=body, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            reason = json.loads(e.read().decode("utf-8")).get("error_description") or e.reason
        except ValueError:
            reason = e.reason
        raise OAuthError("Google отклонил вход: %s" % reason)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        raise OAuthError("Нет связи с Google — попробуйте позже")

    # Токен получен напрямую от Google по HTTPS — проверяем его содержимое.
    claims = _jwt_payload(data.get("id_token", ""))
    aud = claims.get("aud")
    aud_ok = aud == client_id or (isinstance(aud, list) and client_id in aud)
    if claims.get("iss") not in ISSUERS or not aud_ok:
        raise OAuthError("Токен Google не прошёл проверку")
    if int(claims.get("exp", 0)) < time.time() - 60:
        raise OAuthError("Токен Google устарел")
    if claims.get("nonce") != pending["nonce"]:
        raise OAuthError("Токен Google не прошёл проверку")
    if not claims.get("sub") or not claims.get("email"):
        raise OAuthError("Google не передал email")
    if claims.get("email_verified") not in (True, "true"):
        raise OAuthError("Email в аккаунте Google не подтверждён")

    picture = str(claims.get("picture") or "")
    host = urllib.parse.urlparse(picture).hostname or ""
    if not (picture.startswith("https://") and host.endswith(".googleusercontent.com")):
        picture = ""
    return {
        "sub": str(claims["sub"])[:64],
        "email": str(claims["email"])[:200],
        "name": str(claims.get("name") or claims["email"].split("@")[0])[:120],
        "picture": picture[:500],
    }
