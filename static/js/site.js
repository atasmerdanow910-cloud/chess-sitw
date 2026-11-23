/* Публичная часть: инструкция, файлы, просмотр кода, вход через Google, нижнее меню. */
(function () {
  "use strict";
  const { $, $$, esc, icon, logo, glogo, fmtSize, fmtDate, plural, copyText, toast, highlight, countLines } = window.UI;

  const data = JSON.parse($("#initial-data").textContent);
  const auth = data.auth || {};
  const codeCache = new Map();
  const gatedFiles = () => auth.require_files && !auth.user;
  const gatedApk = () => auth.require_apk && !auth.user;

  const ctx = () => ({
    host: location.host || "example.com",
    title: data.site.site_title,
    apkName: data.apk.name || "pydroid3.apk",
    apkSize: data.apk.size ? fmtSize(data.apk.size) : "APK файл",
    fileName: (data.files[0] && data.files[0].filename) || "script.py",
  });

  const loginUrl = () => "/auth/google?next=" + encodeURIComponent(location.pathname + (location.hash || ""));

  function avatar(user, cls) {
    if (!user) return "";
    const letter = esc((user.name || user.email || "?").trim().charAt(0).toUpperCase());
    return user.picture
      ? `<span class="avatar ${cls || ""}"><img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer"></span>`
      : `<span class="avatar ${cls || ""}">${letter}</span>`;
  }

  /* ------------------------------------------------- модальные окна -- */
  const openModals = [];
  function openModal(el) {
    if (!el.hidden) return;
    el.hidden = false;
    openModals.push(el);
    document.documentElement.style.overflow = "hidden";
    history.pushState({ modal: true }, "");
  }
  function closeModal(el, fromHistory) {
    if (!el || el.hidden) return;
    el.hidden = true;
    const i = openModals.indexOf(el);
    if (i >= 0) openModals.splice(i, 1);
    if (!openModals.length) document.documentElement.style.overflow = "";
    if (!fromHistory && history.state && history.state.modal) history.back();
    if (el.id === "sheet") currentId = null;
  }
  window.addEventListener("popstate", () => {
    const top = openModals[openModals.length - 1];
    if (top) closeModal(top, true);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (lightbox) return closeLightbox();
    const top = openModals[openModals.length - 1];
    if (top) closeModal(top, false);
  });
  $$(".sheet-wrap, .modal-wrap").forEach((wrap) => wrap.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal(wrap, false);
  }));

  /* ------------------------------------------------------ аккаунт -- */
  const accountEl = $("#account");

  function openAccount(reason) {
    const body = $("#account-body");
    if (auth.user) {
      const u = auth.user;
      body.innerHTML = `${avatar(u, "lg")}
        <h3>${esc(u.name)}</h3><p>${esc(u.email)}</p>
        <p class="fine">Аккаунт создан ${esc(fmtDate(u.created_at))}</p>
        <form method="post" action="/auth/logout">
          <input type="hidden" name="csrf" value="${esc(auth.csrf)}">
          <button class="btn btn-glass btn-block" type="submit">${icon("logout")}Выйти</button>
        </form>`;
    } else {
      body.innerHTML = `<div class="g-hero">${glogo()}</div>
        <h3>Вход и регистрация</h3>
        <p>${esc(reason || "Войдите с помощью аккаунта Google. При первом входе аккаунт создаётся автоматически.")}</p>
        <a class="btn btn-google btn-block" href="${esc(loginUrl())}">${glogo()}Продолжить с Google</a>
        <p class="fine">Мы получаем только имя, email и фото профиля. Пароль от Google сайт не видит.</p>`;
    }
    openModal(accountEl);
  }

  function renderTop() {
    const host = $("#top-actions");
    if (!auth.google) { host.innerHTML = ""; return; }
    host.innerHTML = auth.user
      ? `<button type="button" class="avatar-btn" data-account aria-label="Аккаунт">${avatar(auth.user)}</button>`
      : `<button type="button" class="btn btn-glass btn-sm" data-login>${glogo()}Войти</button>`;
    const tab = $("#tab-account");
    if (tab && auth.user) {
      tab.innerHTML = `${avatar(auth.user)}<span>Профиль</span>`;
    }
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-login]")) { e.preventDefault(); openAccount(); }
    else if (e.target.closest("[data-account]")) { e.preventDefault(); openAccount(); }
  });

  /* ---------------------------------------------------------- APK -- */
  function renderApk() {
    const a = data.apk;
    const meta = $("#apk-meta");
    if (a.available) {
      meta.innerHTML = icon("shield") + esc([a.name, fmtSize(a.size), a.version ? "версия " + a.version : ""].filter(Boolean).join(" · "));
    } else {
      meta.textContent = "Откроется страница Pydroid 3 в Google Play";
    }
    $$("#apk-btn, [data-apk-link]").forEach((el) => el.addEventListener("click", (e) => {
      if (a.available && gatedApk()) {
        e.preventDefault();
        openAccount("Чтобы скачать Pydroid 3, войдите через Google — это займёт несколько секунд.");
      }
    }));
  }

  function renderSecurity() {
    const s = data.secure || {};
    $("#chk-secure").hidden = !s.https;
    const badges = [];
    if (s.https) badges.push(`<span class="tag ok">${icon("lock")}HTTPS</span>`);
    if (s.cloudflare) badges.push(`<span class="tag ok">${icon("cloud")}Cloudflare</span>`);
    badges.push(`<span class="tag">${icon("shield")}Защита от флуда</span>`);
    if (auth.google) badges.push(`<span class="tag">${icon("user")}Вход через Google</span>`);
    $("#badges").innerHTML = badges.join("");
  }

  /* --------------------------------------------------- инструкция -- */
  function renderSteps() {
    const c = ctx();
    $("#steps").innerHTML = data.steps.map((s, i) => {
      const photos = s.photos || [];
      const frames = photos.length
        ? photos.map((src, k) => ({
            cap: photos.length > 1 ? "Фото " + (k + 1) : "",
            html: `<img src="${esc(src)}" alt="Фото: ${esc(s.title)}" loading="lazy" data-zoom>`,
            photo: true,
          }))
        : (window.Mockups[s.key] ? window.Mockups[s.key](c) : []);
      const many = frames.length > 1;
      const visual = frames.map((f, k) => `
        <figure class="frame">
          <div class="phone${f.photo ? " is-photo" : ""}"><div class="phone-screen">${f.html}</div></div>
          ${f.cap ? `<figcaption class="frame-cap">${many ? `<b>${k + 1}/${frames.length}</b>` : ""}${esc(f.cap)}</figcaption>` : ""}
        </figure>`).join("");
      const tips = s.tips && s.tips.length
        ? `<ul class="tips">${s.tips.map((t) => `<li>${icon("info")}<span>${esc(t)}</span></li>`).join("")}</ul>` : "";
      return `<article class="step glass reveal" id="step-${esc(s.key)}">
        <div class="step-body">
          <span class="step-num">ШАГ ${String(i + 1).padStart(2, "0")}</span>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.text)}</p>${tips}
        </div>
        <div class="step-visual">
          <div class="frames${many ? "" : " single"}">${visual}</div>
          ${many ? `<div class="frames-hint">${icon("back")}листайте экраны</div>` : ""}
        </div>
      </article>`;
    }).join("");
    const hero = $("#hero-phone");
    if (hero && window.Mockups.run) hero.innerHTML = window.Mockups.run(c)[0].html;
  }

  /* -------------------------------------------------------- файлы -- */
  let query = "";

  function renderFiles() {
    const list = $("#file-list");
    $("#gate-notice").hidden = !gatedFiles() || !data.files.length;
    const q = query.trim().toLowerCase();
    if (!data.files.length) {
      list.innerHTML = `<div class="empty glass">${logo()}<b>Скрипты скоро появятся</b>Загляните позже.</div>`;
      return;
    }
    const items = data.files.filter((f) =>
      !q || [f.title, f.filename, f.description, f.requirements.join(" ")].join(" ").toLowerCase().includes(q));
    if (!items.length) {
      list.innerHTML = `<div class="empty glass"><b>Ничего не найдено</b>Измените запрос.</div>`;
      return;
    }
    const lock = gatedFiles();
    list.innerHTML = items.map((f) => `
      <article class="file glass" data-id="${esc(f.id)}">
        <div class="file-top">
          <span class="file-ico">${logo()}</span>
          <div class="grow"><h3>${esc(f.title)}</h3><div class="file-name">${esc(f.filename)}</div></div>
        </div>
        ${f.description ? `<p class="file-desc">${esc(f.description)}</p>` : ""}
        <div class="file-meta">
          <span class="tag">${icon("lines")}${f.lines} ${plural(f.lines, "строка", "строки", "строк")}</span>
          <span class="tag">${fmtSize(f.size)}</span>
          <span class="tag" title="Скачиваний">${icon("download")}${f.downloads}</span>
          ${f.requirements.map((r) => `<span class="tag req" title="Нужна библиотека">${esc(r)}</span>`).join("")}
        </div>
        <div class="file-actions">
          <button class="btn btn-glass btn-sm" type="button" data-act="open">${icon(lock ? "lock" : "eye")}Код</button>
          <button class="btn btn-primary btn-sm" type="button" data-act="copy">${icon("copy")}Копировать</button>
          <a class="btn btn-glass btn-sm" data-act="dl" href="${esc(f.download_url)}">${icon("download")}Скачать</a>
        </div>
      </article>`).join("");
    if (!lock) observePrefetch();
  }

  async function getCode(id) {
    if (codeCache.has(id)) return codeCache.get(id);
    const res = await fetch("/api/files/" + encodeURIComponent(id), { credentials: "same-origin" });
    if (res.status === 401) { const e = new Error("login"); e.login = true; throw e; }
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    codeCache.set(id, json.code);
    return json.code;
  }

  let prefetchObserver = null;
  function observePrefetch() {
    if (!("IntersectionObserver" in window)) return;
    if (prefetchObserver) prefetchObserver.disconnect();
    prefetchObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          prefetchObserver.unobserve(e.target);
          getCode(e.target.dataset.id).catch(() => {});
        }
      });
    }, { rootMargin: "200px" });
    $$("#file-list .file").forEach((el) => prefetchObserver.observe(el));
  }

  const GATE_TEXT = "Чтобы открыть код и скачать файлы, войдите через Google.";

  async function copyFile(id, btn) {
    try {
      const code = await getCode(id);
      if (!(await copyText(code))) throw new Error("copy");
      toast("Код скопирован. Вставьте его в Pydroid 3");
      if (btn) {
        btn.classList.add("done");
        const label = btn.lastChild;
        const old = label.textContent;
        label.textContent = "Скопировано";
        setTimeout(() => { label.textContent = old; btn.classList.remove("done"); }, 1600);
      }
    } catch (e) {
      if (e.login) return openAccount(GATE_TEXT);
      toast("Не удалось скопировать. Откройте код и выделите текст вручную", true);
    }
  }

  function bumpDownloads(id) {
    const f = data.files.find((x) => x.id === id);
    if (!f) return;
    f.downloads += 1;
    const tag = $(`.file[data-id="${CSS.escape(id)}"] .tag[title="Скачиваний"]`);
    if (tag) tag.lastChild.textContent = String(f.downloads);
  }

  /* -------------------------------------------------- просмотр кода -- */
  const sheet = $("#sheet");
  let currentId = null;

  async function openSheet(id) {
    const f = data.files.find((x) => x.id === id);
    if (!f) return;
    currentId = id;
    $("#sheet-title").textContent = f.title;
    $("#sheet-sub").textContent = `${f.filename} · ${f.lines} ${plural(f.lines, "строка", "строки", "строк")} · ${fmtSize(f.size)}`;
    $("#sheet-req").hidden = !f.requirements.length;
    $("#sheet-req-code").textContent = "pip install " + f.requirements.join(" ");
    $("#sheet-dl").href = f.download_url;
    $("#sheet-dl").dataset.id = id;
    $("#gutter").textContent = "";
    $("#code").innerHTML = '<span class="loading">Загрузка кода…</span>';
    $("#code-box").scrollTo(0, 0);
    openModal(sheet);
    try {
      const code = await getCode(id);
      if (currentId !== id) return;
      $("#code").innerHTML = highlight(code);
      let g = "";
      for (let i = 1, n = countLines(code); i <= n; i++) g += i + "\n";
      $("#gutter").textContent = g;
    } catch (e) {
      if (e.login) { closeModal(sheet, false); return openAccount(GATE_TEXT); }
      $("#code").textContent = "Не удалось загрузить код. Проверьте подключение к интернету.";
    }
  }

  $("#sheet-copy").addEventListener("click", () => { if (currentId) copyFile(currentId, null); });
  $("#sheet-req-copy").addEventListener("click", async () => {
    const ok = await copyText($("#sheet-req-code").textContent);
    toast(ok ? "Команда скопирована. В Pydroid 3: ☰ → Pip" : "Не удалось скопировать", !ok);
  });
  $("#sheet-dl").addEventListener("click", (e) => {
    bumpDownloads(e.currentTarget.dataset.id);
    toast("Файл сохраняется в «Загрузки»");
  });

  $("#file-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".file").dataset.id;
    if (gatedFiles()) { e.preventDefault(); return openAccount(GATE_TEXT); }
    if (btn.dataset.act === "open") openSheet(id);
    else if (btn.dataset.act === "copy") copyFile(id, btn);
    else if (btn.dataset.act === "dl") { bumpDownloads(id); toast("Файл сохраняется в «Загрузки»"); }
  });

  /* -------------------------------------------------------- поиск -- */
  const q = $("#q");
  q.addEventListener("input", () => {
    query = q.value;
    $("#q-clear").hidden = !query;
    renderFiles();
  });
  $("#q-clear").addEventListener("click", (e) => {
    e.preventDefault();
    q.value = "";
    query = "";
    $("#q-clear").hidden = true;
    renderFiles();
    q.focus();
  });

  /* ------------------------------------------- «Как запустить» -- */
  const seg = $("#howto-seg");
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    const i = b.dataset.i;
    seg.dataset.active = i;
    $$("button", seg).forEach((x) => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-selected", x === b ? "true" : "false");
    });
    $$(".howto ol").forEach((ol) => { ol.hidden = ol.dataset.panel !== i; });
  });

  /* ------------------------------------------------ увеличение фото -- */
  let lightbox = null;
  function closeLightbox() {
    if (lightbox) { lightbox.remove(); lightbox = null; }
  }
  document.addEventListener("click", (e) => {
    const img = e.target.closest("img[data-zoom]");
    if (!img) return;
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML = `<img src="${esc(img.getAttribute("src"))}" alt="${esc(img.alt)}">
      <button class="icon-btn" type="button" aria-label="Закрыть">${icon("x")}</button>`;
    lightbox.addEventListener("click", closeLightbox);
    document.body.appendChild(lightbox);
  });

  /* ------------------------------------------------- нижнее меню -- */
  const tabbar = $("#tabbar");
  const tabs = $$(".tab", tabbar);
  const sections = ["home", "guide", "files"].map((id) => document.getElementById(id));
  let searchMode = false;
  let lockUntil = 0;

  function setTab(name) {
    const idx = tabs.findIndex((t) => t.dataset.tab === name);
    if (idx < 0) return;
    tabs.forEach((t, i) => {
      t.classList.toggle("active", i === idx);
      if (i === idx) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
    tabbar.style.setProperty("--i", idx);
  }

  function spy() {
    if (searchMode || Date.now() < lockUntil) return;
    const y = window.scrollY + window.innerHeight * 0.4;
    let cur = "home";
    sections.forEach((s) => { if (s.offsetTop <= y) cur = s.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = "files";
    setTab(cur);
  }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; spy(); });
  }, { passive: true });
  window.addEventListener("scrollend", () => { lockUntil = 0; spy(); });

  tabs.forEach((t) => t.addEventListener("click", (e) => {
    const name = t.dataset.tab;
    if (name === "account") { e.preventDefault(); return openAccount(); }
    if (name !== "search") {
      searchMode = false;
      setTab(name);
      lockUntil = Date.now() + 1500;
      return;
    }
    e.preventDefault();
    searchMode = true;
    setTab("search");
    $(".search").scrollIntoView({ behavior: "smooth", block: "start" });
    q.focus({ preventScroll: true });
  }));
  q.addEventListener("focus", () => { if (tabs.some((t) => t.dataset.tab === "search")) { searchMode = true; setTab("search"); } });
  q.addEventListener("blur", () => { searchMode = false; spy(); });

  /* ------------------------------------------- плавное появление -- */
  function reveal() {
    const els = $$(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
  }

  renderTop();
  renderApk();
  renderSecurity();
  renderSteps();
  renderFiles();
  reveal();
  spy();
  if (data.flash) setTimeout(() => toast(data.flash), 300);
})();
