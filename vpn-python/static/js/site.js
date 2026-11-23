/* Публичная часть: инструкция, файлы, просмотр кода, вход через Google, нижнее меню. */
(function () {
  "use strict";
  const { $, $$, esc, icon, logo, glogo, fmtSize, fmtDate, plural, copyText, toast, highlight, countLines } = window.UI;

  const T = window.I18N.t, TP = window.I18N.tp;
  const data = JSON.parse($("#initial-data").textContent);
  const auth = data.auth || {};
  const codeCache = new Map();
  const gatedFiles = () => auth.require_files && !auth.user;
  const gatedApk = () => auth.require_apk && !auth.user;

  const ctx = () => ({
    host: location.host || "example.com",
    title: data.site.site_title,
    apkName: data.apk.name || "pydroid3.apk",
    apkSize: data.apk.size ? fmtSize(data.apk.size) : T("apk_file"),
    fileName: (data.files[0] && data.files[0].filename) || "script.py",
  });

  const loginUrl = (hash) => "/auth/google?next=" + encodeURIComponent(location.pathname + (hash || location.hash || ""));

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
    if (lightbox) return closeLightbox(true);
    const top = openModals[openModals.length - 1];
    if (top) closeModal(top, true);
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") lbGo(lightbox.i - 1);
      else if (e.key === "ArrowRight") lbGo(lightbox.i + 1);
      return;
    }
    if (e.key !== "Escape") return;
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
        <p class="fine">${esc(T("created_at", { date: fmtDate(u.created_at) }))}</p>
        <form method="post" action="/auth/logout">
          <input type="hidden" name="csrf" value="${esc(auth.csrf)}">
          <button class="btn btn-glass btn-block" type="submit">${icon("logout")}${esc(T("logout"))}</button>
        </form>`;
    } else {
      body.innerHTML = `<div class="g-hero">${glogo()}</div>
        <h3>${esc(T("login_title"))}</h3>
        <p>${esc(reason || T("login_text"))}</p>
        <a class="btn btn-google btn-block" href="${esc(loginUrl())}">${glogo()}${esc(T("continue_google"))}</a>
        <p class="fine">${esc(T("login_fine"))}</p>
        <p class="fine">${esc(T("login_optional"))}</p>`;
    }
    openModal(accountEl);
  }

  function renderTop() {
    const host = $("#top-actions");
    if (!auth.google) { host.innerHTML = ""; return; }
    host.innerHTML = auth.user
      ? `<button type="button" class="avatar-btn" data-account aria-label="${esc(T("account"))}">${avatar(auth.user)}</button>`
      : `<button type="button" class="btn btn-glass btn-sm" data-login>${glogo()}${esc(T("login"))}</button>`;
    const tab = $("#tab-account");
    if (tab && auth.user) {
      tab.innerHTML = `${avatar(auth.user)}<span>${esc(T("nav_profile"))}</span>`;
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
      meta.innerHTML = icon("shield") + esc([a.name, fmtSize(a.size), a.version ? T("version", { v: a.version }) : ""].filter(Boolean).join(" · "));
    } else {
      meta.textContent = T("play_note");
    }
    $$("#apk-btn, [data-apk-link]").forEach((el) => el.addEventListener("click", (e) => {
      if (a.available && gatedApk()) {
        e.preventDefault();
        openAccount(T("gate_apk"));
      }
    }));
  }

  function renderSecurity() {
    const s = data.secure || {};
    $("#chk-secure").hidden = !s.https;
    const badges = [];
    if (s.https) badges.push(`<span class="tag ok">${icon("lock")}HTTPS</span>`);
    if (s.cloudflare) badges.push(`<span class="tag ok">${icon("cloud")}Cloudflare</span>`);
    badges.push(`<span class="tag">${icon("shield")}${esc(T("flood"))}</span>`);
    if (auth.google) badges.push(`<span class="tag">${icon("user")}${esc(T("google_login"))}</span>`);
    $("#badges").innerHTML = badges.join("");
  }

  /* --------------------------------------------------- инструкция -- */
  function renderSteps() {
    const c = ctx();
    $("#steps").innerHTML = data.steps.map(window.I18N.step).map((s, i) => {
      const photos = s.photos || [];
      const frames = photos.length
        ? photos.map((src, k) => ({
            cap: photos.length > 1 ? T("photo_n", { n: k + 1 }) : "",
            html: `<img src="${esc(src)}" alt="${esc(T("photo_of", { t: s.title }))}" loading="lazy">`,
            photo: true,
          }))
        : (window.Mockups[s.key] ? window.Mockups[s.key](c) : []);
      const many = frames.length > 1;
      const visual = frames.map((f, k) => `
        <figure class="frame" data-cap="${esc(f.cap || "")}">
          <div class="phone${f.photo ? " is-photo" : ""}${f.shot ? " is-shot" : ""}" role="button" tabindex="0"
               aria-label="${esc(T("zoom"))}"><div class="phone-screen">${f.html}</div></div>
          ${f.cap ? `<figcaption class="frame-cap">${many ? `<b>${k + 1}/${frames.length}</b>` : ""}${esc(f.cap)}</figcaption>` : ""}
        </figure>`).join("");
      const nav = many ? `<div class="frames-nav">
          <button class="icon-btn fr-prev" type="button" data-fr="-1" aria-label="${esc(T("prev"))}">${icon("chevron")}</button>
          <span class="fr-count"></span>
          <button class="icon-btn fr-next" type="button" data-fr="1" aria-label="${esc(T("next"))}">${icon("chevron")}</button>
        </div>` : "";
      const tips = s.tips && s.tips.length
        ? `<ul class="tips">${s.tips.map((t) => `<li>${icon("info")}<span>${esc(t)}</span></li>`).join("")}</ul>` : "";
      return `<article class="step glass reveal" id="step-${esc(s.key)}">
        <div class="step-body">
          <span class="step-num">${esc(T("step_n", { n: String(i + 1).padStart(2, "0") }))}</span>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.text)}</p>${tips}
        </div>
        <div class="step-visual">
          <div class="frames${many ? "" : " single"}">${visual}</div>${nav}
        </div>
      </article>`;
    }).join("");
    $$("#steps .frames").forEach(syncFrames);
    const hero = $("#hero-phone");
    if (hero && window.Mockups.run) hero.innerHTML = window.Mockups.run(c)[0].html;
  }

  /* Листание экранов внутри шага: счётчик «2–3 / 8» и стрелки */
  function syncFrames(box) {
    const nav = box.parentElement.querySelector(".frames-nav");
    if (!nav) return;
    const r = box.getBoundingClientRect();
    const seen = [];
    [...box.children].forEach((f, k) => {
      const fr = f.getBoundingClientRect();
      const vis = Math.min(fr.right, r.right) - Math.max(fr.left, r.left);
      if (vis > fr.width * 0.6) seen.push(k + 1);
    });
    const n = box.children.length;
    const a = seen[0] || 1, z = seen[seen.length - 1] || a;
    nav.hidden = box.scrollWidth <= box.clientWidth + 4;
    nav.querySelector(".fr-count").innerHTML = `<b>${a === z ? a : a + "–" + z}</b> / ${n}`;
    nav.querySelector(".fr-prev").disabled = box.scrollLeft < 4;
    nav.querySelector(".fr-next").disabled = box.scrollLeft + box.clientWidth >= box.scrollWidth - 4;
  }
  let framesTick = false;
  $("#steps").addEventListener("scroll", (e) => {
    const box = e.target;
    if (!box.classList || !box.classList.contains("frames") || framesTick) return;
    framesTick = true;
    requestAnimationFrame(() => { framesTick = false; syncFrames(box); });
  }, true);
  window.addEventListener("resize", () => $$("#steps .frames").forEach(syncFrames));

  $("#steps").addEventListener("click", (e) => {
    const b = e.target.closest("[data-fr]");
    if (b) {
      const box = b.closest(".step-visual").querySelector(".frames");
      const f = box.querySelector(".frame");
      const gap = parseFloat(getComputedStyle(box).columnGap) || 16;
      box.scrollBy({ left: Number(b.dataset.fr) * (f.offsetWidth + gap), behavior: "smooth" });
      return;
    }
    const ph = e.target.closest(".frame .phone");
    if (!ph) return;
    const figs = [...ph.closest(".frames").children];
    openLightbox(figs, figs.indexOf(ph.closest(".frame")));
  });
  $("#steps").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".frame .phone")) {
      e.preventDefault();
      e.target.click();
    }
  });

  /* -------------------------------------------------------- файлы -- */
  let query = "";

  function renderFiles() {
    const list = $("#file-list");
    $("#gate-notice").hidden = !gatedFiles() || !data.files.length;
    const q = query.trim().toLowerCase();
    if (!data.files.length) {
      list.innerHTML = `<div class="empty glass">${logo()}<b>${esc(T("no_scripts"))}</b>${esc(T("come_later"))}</div>`;
      return;
    }
    const items = data.files.filter((f) =>
      !q || [f.title, f.filename, f.description, f.requirements.join(" ")].join(" ").toLowerCase().includes(q));
    if (!items.length) {
      list.innerHTML = `<div class="empty glass"><b>${esc(T("nothing"))}</b>${esc(T("change_query"))}</div>`;
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
          <span class="tag">${icon("lines")}${f.lines} ${TP("lines", f.lines)}</span>
          <span class="tag">${fmtSize(f.size)}</span>
          <span class="tag" data-dl title="${esc(T("downloads"))}">${icon("download")}${f.downloads}</span>
          ${f.requirements.map((r) => `<span class="tag req" title="${esc(T("needs_lib"))}">${esc(r)}</span>`).join("")}
        </div>
        <div class="file-actions">
          <button class="btn btn-glass btn-sm" type="button" data-act="open">${icon(lock ? "lock" : "eye")}${esc(T("code"))}</button>
          <button class="btn btn-primary btn-sm" type="button" data-act="copy">${icon("copy")}${esc(T("copy"))}</button>
          <a class="btn btn-glass btn-sm" data-act="dl" href="${esc(f.download_url)}">${icon("download")}${esc(T("download"))}</a>
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

  const GATE_TEXT = T("gate");

  async function copyFile(id, btn) {
    try {
      const code = await getCode(id);
      if (!(await copyText(code))) throw new Error("copy");
      toast(T("code_copied"));
      if (btn) {
        btn.classList.add("done");
        const label = btn.lastChild;
        const old = label.textContent;
        label.textContent = T("copied");
        setTimeout(() => { label.textContent = old; btn.classList.remove("done"); }, 1600);
      }
    } catch (e) {
      if (e.login) return openAccount(GATE_TEXT);
      toast(T("copy_failed_code"), true);
    }
  }

  function bumpDownloads(id) {
    const f = data.files.find((x) => x.id === id);
    if (!f) return;
    f.downloads += 1;
    const tag = $(`.file[data-id="${CSS.escape(id)}"] .tag[data-dl]`);
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
    $("#sheet-sub").textContent = `${f.filename} · ${f.lines} ${TP("lines", f.lines)} · ${fmtSize(f.size)}`;
    $("#sheet-req").hidden = !f.requirements.length;
    $("#sheet-req-code").textContent = "pip install " + f.requirements.join(" ");
    $("#sheet-dl").href = f.download_url;
    $("#sheet-dl").dataset.id = id;
    $("#gutter").textContent = "";
    $("#code").innerHTML = '<span class="loading">' + esc(T("code_loading")) + '</span>';
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
      $("#code").textContent = T("code_failed");
    }
  }

  $("#sheet-copy").addEventListener("click", () => { if (currentId) copyFile(currentId, null); });
  $("#sheet-req-copy").addEventListener("click", async () => {
    const ok = await copyText($("#sheet-req-code").textContent);
    toast(ok ? T("pip_copied") : T("copy_failed"), !ok);
  });
  $("#sheet-dl").addEventListener("click", (e) => {
    bumpDownloads(e.currentTarget.dataset.id);
    toast(T("saving_file"));
  });

  $("#file-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".file").dataset.id;
    if (gatedFiles()) { e.preventDefault(); return openAccount(GATE_TEXT); }
    if (btn.dataset.act === "open") openSheet(id);
    else if (btn.dataset.act === "copy") copyFile(id, btn);
    else if (btn.dataset.act === "dl") { bumpDownloads(id); toast(T("saving_file")); }
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

  /* ------------------------------------------- увеличенный экран шага -- */
  let lightbox = null;
  function closeLightbox(fromHistory) {
    if (!lightbox) return;
    lightbox.el.hidden = true;
    lightbox.el.parentNode.removeChild(lightbox.el);
    lightbox = null;
    if (!openModals.length) document.documentElement.style.overflow = "";
    if (!fromHistory && history.state && history.state.lb) history.back();
  }
  function openLightbox(figs, i) {
    const el = document.createElement("div");
    el.className = "lightbox";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `<button class="icon-btn lb-close" type="button" aria-label="${esc(T("close"))}">${icon("x")}</button>
      <button class="icon-btn lb-prev" type="button" aria-label="${esc(T("prev"))}">${icon("chevron")}</button>
      <button class="icon-btn lb-next" type="button" aria-label="${esc(T("next"))}">${icon("chevron")}</button>
      <div class="lb-stage"></div><div class="lb-cap" aria-live="polite"></div>`;
    document.body.appendChild(el);
    document.documentElement.style.overflow = "hidden";
    history.pushState({ lb: true }, "");
    lightbox = { el, figs, i: -1 };
    el.addEventListener("click", (e) => {
      if (e.target.closest(".lb-prev")) return lbGo(lightbox.i - 1);
      if (e.target.closest(".lb-next")) return lbGo(lightbox.i + 1);
      if (e.target.closest(".lb-close") || !e.target.closest(".lb-stage")) closeLightbox();
    });
    let x0 = null, y0 = 0;
    el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 === null || !lightbox) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) lbGo(lightbox.i + (dx < 0 ? 1 : -1));
    });
    lbGo(i);
    $(".lb-close", el).focus({ preventScroll: true });
  }
  function lbGo(i) {
    const lb = lightbox;
    if (!lb || i < 0 || i >= lb.figs.length || i === lb.i) return;
    lb.i = i;
    const fig = lb.figs[i];
    const stage = $(".lb-stage", lb.el);
    const src = fig.querySelector(".phone");
    if (src.classList.contains("is-photo")) {
      const img = src.querySelector("img");
      stage.style.width = stage.style.height = "";
      stage.innerHTML = `<img class="photo" src="${esc(img.getAttribute("src"))}" alt="${esc(img.alt)}">`;
    } else {
      const ph = src.cloneNode(true);
      ["role", "tabindex", "aria-label"].forEach((a) => ph.removeAttribute(a));
      ph.querySelectorAll("img").forEach((im) => { im.loading = "eager"; });
      stage.replaceChildren(ph);
      lbFit();
    }
    const n = lb.figs.length;
    $(".lb-cap", lb.el).innerHTML = (n > 1 ? `<b>${i + 1}/${n}</b>` : "") + esc(fig.dataset.cap || "");
    $(".lb-prev", lb.el).disabled = i === 0;
    $(".lb-next", lb.el).disabled = i === n - 1;
    $(".lb-prev", lb.el).hidden = $(".lb-next", lb.el).hidden = n < 2;
  }
  function lbFit() {
    if (!lightbox) return;
    const stage = $(".lb-stage", lightbox.el);
    const ph = stage.querySelector(".phone");
    if (!ph) return;
    ph.style.transform = "";
    const w = ph.offsetWidth, h = ph.offsetHeight;
    const k = Math.max(0.6, Math.min((window.innerHeight - 170) / h, (window.innerWidth - 32) / w, 2.4));
    ph.style.transform = `scale(${k})`;
    stage.style.width = Math.round(w * k) + "px";
    stage.style.height = Math.round(h * k) + "px";
  }
  window.addEventListener("resize", lbFit);

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

  /* ------------------------------------------- связь с администратором -- */
  // Без входа переписка привязана к случайному ключу этого браузера, с Google — к аккаунту.
  const spEl = $("#support");
  const sp = { msgs: [], thread: null, topic: "bug", timer: 0, unread: 0, key: "", wrote: false };
  try { sp.wrote = localStorage.getItem("vp_sp") === "1"; } catch (e) { /* нет доступа */ }

  function deviceKey() {
    if (sp.key) return sp.key;
    try { sp.key = localStorage.getItem("vp_uid") || ""; } catch (e) { /* нет доступа */ }
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(sp.key)) {
      const b = new Uint8Array(24);
      crypto.getRandomValues(b);
      sp.key = btoa(String.fromCharCode.apply(null, b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      try { localStorage.setItem("vp_uid", sp.key); } catch (e) { /* ключ живёт до закрытия вкладки */ }
    }
    return sp.key;
  }

  async function spApi(method, url, body) {
    const opts = { method, headers: { "X-User-Key": deviceKey() }, credentials: "same-origin" };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    let res, json = {};
    try { res = await fetch(url, opts); } catch (e) { throw new Error(T("sp_e_net")); }
    try { json = await res.json(); } catch (e) { /* не JSON */ }
    if (!res.ok || json.ok === false) {
      const key = { empty: "sp_e_empty", too_long: "sp_e_long", rate_limit: "sp_e_rate" }[json.code];
      throw new Error(T(key || (res.status === 403 ? "sp_e_blocked" : "sp_e_net")));
    }
    return json;
  }

  const fmtClock = (ts) => new Date(ts * 1000).toLocaleTimeString(window.I18N.locale(), { hour: "2-digit", minute: "2-digit" });

  function setSpBadge(n) {
    sp.unread = n;
    $$("[data-sp-dot]").forEach((d) => { d.hidden = !n; d.textContent = n > 9 ? "9+" : String(n); });
  }

  function renderSpWho() {
    const who = $("#sp-who");
    if (auth.user) {
      who.innerHTML = `${avatar(auth.user)}<span>${esc(T("sp_as", { name: auth.user.name }))}</span>`;
    } else if (auth.google) {
      who.innerHTML = `<span>${esc(T("sp_login_hint"))}</span>
        <a class="btn btn-google btn-sm" href="${esc(loginUrl("#support"))}">${glogo()}${esc(T("login"))}</a>`;
    } else {
      who.innerHTML = "";
    }
    who.hidden = !who.innerHTML;
    const t = sp.thread;
    $("#sp-guest").hidden = !!auth.user || !!(t && (t.name || t.contact));
  }

  function renderSpMsgs() {
    const box = $("#sp-msgs");
    if (!sp.msgs.length) {
      box.innerHTML = `<div class="sp-empty">${icon("chat")}<b>${esc(T("sp_empty_t"))}</b><span>${esc(T("sp_empty"))}</span></div>`;
      return;
    }
    let day = "";
    box.innerHTML = sp.msgs.map((m) => {
      const d = fmtDate(m.created_at);
      const sep = d !== day ? `<div class="sp-day">${esc((day = d))}</div>` : "";
      const topic = m.mine && m.topic ? `<span class="sp-topic">${esc(T("sp_t_" + m.topic))}</span>` : "";
      const from = m.mine ? "" : `<span class="sp-from">${icon("shield")}${esc(T("sp_admin"))}</span>`;
      return `${sep}<div class="sp-msg ${m.mine ? "me" : "them"}">${from}${topic}<p>${esc(m.text)}</p><time>${fmtClock(m.created_at)}</time></div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  async function loadSupport(first) {
    try {
      const r = await spApi("GET", "/api/support");
      const last = (a) => (a.length ? a[a.length - 1].id : 0);
      const changed = first || r.messages.length !== sp.msgs.length || last(r.messages) !== last(sp.msgs);
      sp.thread = r.thread;
      sp.msgs = r.messages;
      if (changed) renderSpMsgs();
      if (first) renderSpWho();
      setSpBadge(0);
    } catch (e) {
      if (first) $("#sp-msgs").innerHTML = `<div class="sp-empty">${icon("alert")}<span>${esc(e.message)}</span></div>`;
    }
  }

  function openSupport() {
    $("#toast").classList.remove("show");
    renderSpWho();
    if (!sp.msgs.length) renderSpMsgs();
    openModal(spEl);
    loadSupport(true);
    clearInterval(sp.timer);
    sp.timer = setInterval(() => {
      if (spEl.hidden) return clearInterval(sp.timer);
      if (!document.hidden) loadSupport(false);
    }, 8000);
    if (window.matchMedia("(hover: hover)").matches) setTimeout(() => $("#sp-text").focus({ preventScroll: true }), 200);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-support]")) { e.preventDefault(); openSupport(); }
  });

  $("#sp-topics").addEventListener("click", (e) => {
    const b = e.target.closest("[data-topic]");
    if (!b) return;
    sp.topic = b.dataset.topic;
    $$("[data-topic]", e.currentTarget).forEach((x) => {
      x.classList.toggle("on", x === b);
      x.setAttribute("aria-checked", x === b ? "true" : "false");
    });
  });

  const spText = $("#sp-text");
  const autosize = () => { spText.style.height = "auto"; spText.style.height = Math.min(spText.scrollHeight + 2, 160) + "px"; };
  spText.addEventListener("input", () => { autosize(); $("#sp-err").hidden = true; });
  spText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $("#sp-form").requestSubmit(); }
  });

  $("#sp-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#sp-err"), btn = $(".sp-send");
    const text = spText.value.trim();
    err.hidden = true;
    if (text.length < 2) { err.textContent = T("sp_e_empty"); err.hidden = false; spText.focus(); return; }
    btn.disabled = true;
    try {
      const r = await spApi("POST", "/api/support", {
        text, topic: sp.topic, lang: window.I18N.lang,
        name: $("#sp-name").value.trim(), contact: $("#sp-contact").value.trim(),
      });
      const first = !sp.msgs.some((m) => m.mine);
      sp.thread = r.thread;
      sp.msgs.push(r.message);
      spText.value = "";
      autosize();
      renderSpMsgs();
      renderSpWho();
      sp.wrote = true;
      try { localStorage.setItem("vp_sp", "1"); } catch (ex) { /* нет доступа */ }
      if (first) toast(T("sp_sent"));
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  // Отметка о новом ответе: спрашиваем раз в минуту, только у тех, кто уже писал
  async function pollUnread(first) {
    if (document.hidden || !spEl.hidden || (!sp.wrote && !auth.user)) return;
    try {
      const r = await spApi("GET", "/api/support/unread");
      if (r.unread > sp.unread) toast(T("sp_new_reply"));
      setSpBadge(r.unread);
    } catch (e) { /* попробуем позже */ }
  }
  setInterval(pollUnread, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pollUnread(); });

  renderTop();
  renderApk();
  renderSecurity();
  renderSteps();
  renderFiles();
  reveal();
  spy();
  if (data.flash) setTimeout(() => toast(window.I18N.flash(data.flash)), 300);
  if (location.hash === "#support") {
    history.replaceState(null, "", location.pathname + location.search);
    openSupport();
  } else {
    pollUnread();
  }
})();
