/* Публичная часть: инструкция, файлы, просмотр кода, нижнее меню. */
(function () {
  "use strict";
  const { $, $$, esc, icon, logo, fmtSize, plural, copyText, toast, highlight, countLines } = window.UI;

  const data = JSON.parse($("#initial-data").textContent);
  const codeCache = new Map();

  const ctx = () => ({
    host: location.host || "vpn-python",
    title: data.site.site_title,
    apkName: data.apk.name || "pydroid3.apk",
    apkSize: data.apk.size ? fmtSize(data.apk.size) : "APK файл",
    fileName: (data.files[0] && data.files[0].filename) || "script.py",
  });

  /* ---------------------------------------------------------- APK -- */
  function renderApk() {
    const a = data.apk;
    const meta = $("#apk-meta");
    if (a.available) {
      meta.textContent = [a.name, fmtSize(a.size), a.version ? "версия " + a.version : ""].filter(Boolean).join(" · ");
    } else {
      meta.textContent = "Откроется страница Pydroid 3 в Google Play";
    }
  }

  /* --------------------------------------------------- инструкция -- */
  function renderSteps() {
    const total = data.steps.length;
    const c = ctx();
    $("#steps").innerHTML = data.steps.map((s, i) => {
      const visual = s.photo
        ? `<img src="${esc(s.photo)}" alt="Фото: ${esc(s.title)}" loading="lazy" data-zoom><span class="photo-badge">Нажмите, чтобы увеличить</span>`
        : (window.Mockups[s.key] ? window.Mockups[s.key](c) : "");
      const tips = s.tips && s.tips.length
        ? `<ul class="tips">${s.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
      return `<article class="step glass reveal" id="step-${esc(s.key)}">
        <div class="step-body">
          <div class="step-head"><span class="step-num">${i + 1}</span>
            <div><div class="step-kicker">Шаг ${i + 1} из ${total}</div><h3>${esc(s.title)}</h3></div></div>
          <p>${esc(s.text)}</p>${tips}
        </div>
        <div class="step-visual"><div class="phone${s.photo ? " is-photo" : ""}"><div class="phone-screen">${visual}</div></div></div>
      </article>`;
    }).join("");
  }

  /* -------------------------------------------------------- файлы -- */
  let query = "";

  function renderFiles() {
    const list = $("#file-list");
    const q = query.trim().toLowerCase();
    if (!data.files.length) {
      list.innerHTML = `<div class="empty glass">${logo()}<b>Файлов пока нет</b>Скоро здесь появятся готовые скрипты.</div>`;
      return;
    }
    const items = data.files.filter((f) =>
      !q || [f.title, f.filename, f.description, f.requirements.join(" ")].join(" ").toLowerCase().includes(q));
    if (!items.length) {
      list.innerHTML = `<div class="empty glass"><b>Ничего не найдено</b>Попробуйте другой запрос.</div>`;
      return;
    }
    list.innerHTML = items.map((f) => `
      <article class="file glass" data-id="${esc(f.id)}">
        <div class="file-top">
          <span class="file-ico">${logo()}<em>.py</em></span>
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
          <button class="btn btn-glass btn-sm" type="button" data-act="open">${icon("eye")}Код</button>
          <button class="btn btn-blue btn-sm" type="button" data-act="copy">${icon("copy")}Копировать</button>
          <a class="btn btn-glass btn-sm" data-act="dl" href="${esc(f.download_url)}">${icon("download")}Скачать</a>
        </div>
      </article>`).join("");
    observePrefetch();
  }

  async function getCode(id) {
    if (codeCache.has(id)) return codeCache.get(id);
    const res = await fetch("/api/files/" + encodeURIComponent(id));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    codeCache.set(id, json.code);
    return json.code;
  }

  // Код подгружается заранее, когда карточка видна — чтобы «Копировать» срабатывал сразу.
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

  async function copyFile(id, btn) {
    try {
      const code = await getCode(id);
      const ok = await copyText(code);
      if (!ok) throw new Error("copy");
      toast("Код скопирован — вставьте в Pydroid 3");
      if (btn) {
        btn.classList.add("done");
        const label = btn.lastChild;
        const old = label.textContent;
        label.textContent = "Готово!";
        setTimeout(() => { label.textContent = old; btn.classList.remove("done"); }, 1600);
      }
    } catch (e) {
      toast("Не удалось скопировать. Откройте «Код» и выделите текст", true);
    }
  }

  function bumpDownloads(id) {
    const f = data.files.find((x) => x.id === id);
    if (!f) return;
    f.downloads += 1;
    const tag = $(`.file[data-id="${CSS.escape(id)}"] .tag[title="Скачиваний"]`);
    if (tag) tag.lastChild.textContent = String(f.downloads);
  }

  /* -------------------------------------------------- шторка кода -- */
  const sheet = $("#sheet");
  let currentId = null;

  async function openSheet(id) {
    const f = data.files.find((x) => x.id === id);
    if (!f) return;
    currentId = id;
    $("#sheet-title").textContent = f.title;
    $("#sheet-sub").textContent = `${f.filename} · ${f.lines} ${plural(f.lines, "строка", "строки", "строк")} · ${fmtSize(f.size)}`;
    const req = $("#sheet-req");
    req.hidden = !f.requirements.length;
    $("#sheet-req-code").textContent = "pip install " + f.requirements.join(" ");
    $("#sheet-dl").href = f.download_url;
    $("#sheet-dl").dataset.id = id;
    $("#gutter").textContent = "";
    $("#code").innerHTML = '<span class="loading">Загрузка кода…</span>';
    $("#code-box").scrollTo(0, 0);

    if (sheet.hidden) {
      sheet.hidden = false;
      document.documentElement.style.overflow = "hidden";
      history.pushState({ sheet: true }, "");
    }
    try {
      const code = await getCode(id);
      if (currentId !== id) return;
      $("#code").innerHTML = highlight(code);
      const n = countLines(code);
      let g = "";
      for (let i = 1; i <= n; i++) g += i + "\n";
      $("#gutter").textContent = g;
    } catch (e) {
      $("#code").textContent = "Не удалось загрузить код. Проверьте интернет.";
    }
  }

  function closeSheet(fromHistory) {
    if (sheet.hidden) return;
    sheet.hidden = true;
    currentId = null;
    document.documentElement.style.overflow = "";
    if (!fromHistory && history.state && history.state.sheet) history.back();
  }

  sheet.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeSheet(false);
  });
  window.addEventListener("popstate", () => closeSheet(true));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeSheet(false); closeLightbox(); }
  });
  $("#sheet-copy").addEventListener("click", (e) => { if (currentId) copyFile(currentId, null); });
  $("#sheet-req-copy").addEventListener("click", async () => {
    const ok = await copyText($("#sheet-req-code").textContent);
    toast(ok ? "Команда скопирована. В Pydroid: ☰ → Pip" : "Не удалось скопировать", !ok);
  });
  $("#sheet-dl").addEventListener("click", (e) => {
    bumpDownloads(e.currentTarget.dataset.id);
    toast("Файл скачивается в «Загрузки»");
  });

  $("#file-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".file").dataset.id;
    if (btn.dataset.act === "open") openSheet(id);
    else if (btn.dataset.act === "copy") copyFile(id, btn);
    else if (btn.dataset.act === "dl") { bumpDownloads(id); toast("Файл скачивается в «Загрузки»"); }
  });

  /* ------------------------------------------------------- поиск -- */
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

  /* ------------------------------------------------ лайтбокс фото -- */
  let lightbox = null;
  function closeLightbox() {
    if (lightbox) { lightbox.remove(); lightbox = null; }
  }
  document.addEventListener("click", (e) => {
    const img = e.target.closest("img[data-zoom]");
    if (img) {
      lightbox = document.createElement("div");
      lightbox.className = "lightbox";
      lightbox.innerHTML = `<img src="${esc(img.getAttribute("src"))}" alt="${esc(img.alt)}">
        <button class="icon-btn" type="button" aria-label="Закрыть">${icon("x")}</button>`;
      lightbox.addEventListener("click", closeLightbox);
      document.body.appendChild(lightbox);
    }
  });

  /* --------------------------------------------- нижнее меню -- */
  const tabbar = $("#tabbar");
  const tabs = $$(".tab", tabbar);
  const sections = ["home", "guide", "files"].map((id) => document.getElementById(id));
  let searchMode = false;

  function setTab(name) {
    const idx = tabs.findIndex((t) => t.dataset.tab === name);
    if (idx < 0) return;
    tabs.forEach((t, i) => {
      t.classList.toggle("active", i === idx);
      if (i === idx) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
    tabbar.style.setProperty("--i", idx);
  }

  let lockUntil = 0;
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
    if (t.dataset.tab !== "search") {
      searchMode = false;
      setTab(t.dataset.tab);
      lockUntil = Date.now() + 1500;   // пока идёт плавная прокрутка — не переключаем
      return;
    }
    e.preventDefault();
    searchMode = true;
    setTab("search");
    $(".search").scrollIntoView({ behavior: "smooth", block: "start" });
    q.focus({ preventScroll: true });
  }));
  q.addEventListener("focus", () => { searchMode = true; setTab("search"); });
  q.addEventListener("blur", () => { searchMode = false; spy(); });

  /* ------------------------------------------- плавное появление -- */
  function reveal() {
    const els = $$(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }

  renderApk();
  renderSteps();
  renderFiles();
  reveal();
  spy();
})();
