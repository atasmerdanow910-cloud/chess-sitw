/* Общие функции: уведомления, копирование, подсветка Python. */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);

  const icon = (name) => `<svg class="i" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  const glogo = () => `<svg class="g" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><use href="#i-google"/></svg>`;
  const logo = () => `<svg class="py-logo" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#i-python"/></svg>`;

  /* Язык страницы (на публичной части подключён i18n.js; в админке — всегда русский) */
  const L = window.I18N || null;
  const TK_MONTHS = ["ýanwar", "fewral", "mart", "aprel", "maý", "iýun", "iýul", "awgust", "sentýabr", "oktýabr", "noýabr", "dekabr"];

  function fmtSize(bytes) {
    const units = (L ? L.t("size_units") : "Б,КБ,МБ,ГБ").split(",");
    let n = Number(bytes) || 0;
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    const num = i === 0 ? String(n) : n.toLocaleString(L ? L.locale() : "ru-RU", { maximumFractionDigits: n < 10 ? 1 : 0 });
    return num + " " + units[i];
  }

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function fmtDate(ts) {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    if (L && L.lang === "tk") return d.getDate() + " " + TK_MONTHS[d.getMonth()] + " " + d.getFullYear();
    return d.toLocaleDateString(L ? L.locale() : "ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }

  /* Копирование. На сайте без HTTPS navigator.clipboard недоступен — тогда execCommand. */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* пробуем запасной способ */ }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.fontSize = "16px";
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  let toastTimer = 0;
  function toast(message, isError) {
    const el = $("#toast");
    if (!el) return;
    el.querySelector("span").textContent = message;
    el.classList.toggle("err", !!isError);
    const use = el.querySelector("use");
    if (use) use.setAttribute("href", isError ? "#i-alert" : "#i-check");
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  /* Мини-подсветка синтаксиса Python */
  const KW = new Set(("False None True and as assert async await break class continue def del elif else except " +
    "finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case").split(" "));
  const BI = new Set(("print input len range int str float list dict set tuple bool open enumerate zip map filter " +
    "sorted reversed sum min max abs round type isinstance super object Exception ValueError KeyError TypeError " +
    "IndexError format any all iter next help dir id hash chr ord bin hex oct pow divmod getattr setattr hasattr " +
    "exit quit callable property staticmethod classmethod bytes bytearray slice frozenset complex").split(" "));
  const H = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
  const h = (s) => s.replace(/[&<>]/g, (c) => H[c]);
  const TOKEN = /(#[^\n]*)|([rRbBuUfF]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(@[A-Za-z_][\w.]*)|(\b(?:0[xXoObB][\da-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?j?)\b)|([A-Za-z_Ѐ-ӿ][\wЀ-ӿ]*)/g;

  function highlight(code) {
    let out = "", last = 0, prev = "", m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      const gap = code.slice(last, m.index);
      if (gap.trim()) prev = "";
      out += h(gap);
      const t = m[0];
      let cls = "";
      if (m[1]) cls = "com";
      else if (m[2]) cls = "str";
      else if (m[3]) cls = "dec";
      else if (m[4]) cls = "num";
      else if (KW.has(t)) cls = "kw";
      else if (prev === "def" || prev === "class") cls = "fn";
      else if (t === "self" || t === "cls") cls = "self";
      else if (BI.has(t)) cls = "bi";
      else if (/^\s*\(/.test(code.slice(TOKEN.lastIndex, TOKEN.lastIndex + 8))) cls = "fn";
      out += cls ? `<span class="tk-${cls}">${h(t)}</span>` : h(t);
      prev = m[5] ? t : "";
      last = TOKEN.lastIndex;
    }
    return out + h(code.slice(last));
  }

  function countLines(code) {
    if (!code) return 1;
    const n = code.split("\n").length;
    return code.endsWith("\n") ? n - 1 : n;
  }

  window.UI = { $, $$, esc, icon, logo, glogo, fmtSize, plural, fmtDate, copyText, toast, highlight, countLines };
})();
