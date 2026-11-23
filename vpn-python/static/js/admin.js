/* Админ-панель: скрипты, APK, фото, пользователи Google, защита, настройки. */
(function () {
  "use strict";
  const { $, $$, esc, icon, logo, fmtSize, plural, fmtDate, toast, copyText } = window.UI;

  const CSRF = document.body.dataset.csrf;
  let data = JSON.parse($("#initial-data").textContent);

  /* --------------------------------------------------------- запросы -- */
  async function api(method, url, body) {
    const opts = { method, headers: { "X-CSRF-Token": CSRF }, credentials: "same-origin" };
    if (body instanceof FormData) opts.body = body;
    else if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    let res;
    try { res = await fetch(url, opts); } catch (e) { throw new Error("Нет соединения с сервером"); }
    let json = {};
    try { json = await res.json(); } catch (e) { /* не JSON */ }
    if (res.status === 401) { location.reload(); throw new Error("Нужно войти снова"); }
    if (!res.ok || json.ok === false) throw new Error(json.error || "Ошибка " + res.status);
    return json;
  }

  function upload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("X-CSRF-Token", CSRF);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total); };
      xhr.onload = () => {
        let json = {};
        try { json = JSON.parse(xhr.responseText); } catch (e) { /* не JSON */ }
        if (xhr.status === 401) { location.reload(); return; }
        if (xhr.status >= 200 && xhr.status < 300 && json.ok !== false) resolve(json);
        else reject(new Error(json.error || (xhr.status === 413 ? "Файл слишком большой" : "Ошибка " + xhr.status)));
      };
      xhr.onerror = () => reject(new Error("Нет соединения с сервером"));
      xhr.send(formData);
    });
  }

  async function reload() {
    data = await api("GET", "/admin/api/data");
    renderAll();
  }

  function msg(el, text, ok) {
    el.hidden = !text;
    el.textContent = text || "";
    el.className = "msg " + (ok ? "ok" : "err");
  }

  function busy(btn, on) {
    btn.disabled = on;
    btn.classList.toggle("loading", on);
  }

  /* ----------------------------------------------------------- вкладки -- */
  const atabs = $("#atabs");
  const tabBtns = $$("button", atabs);
  function showTab(name) {
    if (!tabBtns.some((b) => b.dataset.tab === name)) name = "files";
    tabBtns.forEach((b, i) => {
      const on = b.dataset.tab === name;
      b.classList.toggle("active", on);
      if (on && b.scrollIntoView) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    $$("section[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== name; });
    try { localStorage.setItem("admin-tab", name); } catch (e) { /* приватный режим */ }
  }
  tabBtns.forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  let savedTab = "files";
  try { savedTab = localStorage.getItem("admin-tab") || "files"; } catch (e) { /* ок */ }
  showTab(savedTab);

  /* ------------------------------------------------------- статистика -- */
  function renderStats() {
    $("#s-files").textContent = data.stats.files;
    $("#s-fdl").textContent = data.stats.file_downloads;
    $("#s-apk").textContent = data.stats.apk_downloads;
    $("#s-users").textContent = data.stats.users || 0;
  }

  /* ----------------------------------------------------------- файлы -- */
  function renderFiles() {
    const n = data.files.length;
    $("#files-count").textContent = n
      ? `${n} ${plural(n, "файл", "файла", "файлов")} на сайте`
      : "Пока нет файлов — добавьте первый выше.";
    $("#afiles").innerHTML = data.files.map((f) => `
      <div class="aitem" data-id="${esc(f.id)}">
        <span class="file-ico">${logo()}</span>
        <div class="grow"><b>${esc(f.title)}</b>
          <small>${esc(f.filename)} · ${fmtSize(f.size)} · скачиваний: ${f.downloads}</small></div>
        <div class="acts">
          <button class="icon-btn" type="button" data-act="edit" aria-label="Редактировать">${icon("edit")}</button>
          <button class="icon-btn" type="button" data-act="del" aria-label="Удалить">${icon("trash")}</button>
        </div>
      </div>`).join("");
  }

  $("#afiles").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".aitem").dataset.id;
    const f = data.files.find((x) => x.id === id);
    if (!f) return;
    if (btn.dataset.act === "edit") openEdit(f);
    if (btn.dataset.act === "del") {
      if (!confirm(`Удалить «${f.title}»? Это нельзя отменить.`)) return;
      try {
        await api("DELETE", "/admin/api/files/" + encodeURIComponent(id));
        toast("Файл удалён");
        await reload();
      } catch (err) { toast(err.message, true); }
    }
  });

  // Добавление: режим «файл» / «вставить код»
  const addSeg = $("#add-mode");
  let addMode = "0";
  addSeg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    addMode = b.dataset.i;
    addSeg.dataset.active = addMode;
    $$("button", addSeg).forEach((x) => x.classList.toggle("active", x === b));
    $$("#add-form [data-mode]").forEach((el) => { el.hidden = el.dataset.mode !== addMode; });
  });

  const addFiles = $("#add-files");
  function renderPicked() {
    const files = Array.from(addFiles.files || []);
    $("#picked").innerHTML = files.map((f) => `<span class="tag req">${esc(f.name)} · ${fmtSize(f.size)}</span>`).join("");
  }
  addFiles.addEventListener("change", renderPicked);

  const drop = $("#drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("over")));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length) {
      addFiles.files = e.dataTransfer.files;
      renderPicked();
    }
  });

  $("#add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("#add-msg");
    const btn = e.submitter || $("#add-form button[type=submit]");
    const fd = new FormData();
    if (addMode === "0") {
      const files = Array.from(addFiles.files || []);
      if (!files.length) return msg(out, "Выберите хотя бы один .py файл");
      const wrong = files.find((f) => !/\.py$/i.test(f.name));
      if (wrong) return msg(out, `«${wrong.name}» — это не .py файл`);
      files.forEach((f) => fd.append("files", f, f.name));
    } else {
      const code = $("#add-code").value;
      if (!code.trim()) return msg(out, "Вставьте код");
      fd.append("code", code);
      fd.append("filename", $("#add-filename").value.trim() || "script.py");
    }
    fd.append("title", $("#add-title").value.trim());
    fd.append("description", $("#add-desc").value.trim());
    fd.append("requirements", $("#add-req").value.trim());
    busy(btn, true);
    try {
      const res = await api("POST", "/admin/api/files", fd);
      const n = res.created.length;
      e.target.reset();
      addFiles.value = "";
      renderPicked();
      msg(out, `Опубликовано: ${n} ${plural(n, "файл", "файла", "файлов")}`, true);
      toast("Файл на сайте!");
      await reload();
    } catch (err) {
      msg(out, err.message);
    } finally {
      busy(btn, false);
    }
  });

  // Tab в полях кода вставляет 4 пробела
  $$(".textarea.code").forEach((ta) => ta.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const s = ta.selectionStart, en = ta.selectionEnd;
    ta.setRangeText("    ", s, en, "end");
  }));

  /* ------------------------------------------------ редактирование -- */
  const editWrap = $("#edit");
  let editId = null;

  async function openEdit(f) {
    editId = f.id;
    $("#ed-title").value = f.title;
    $("#ed-filename").value = f.filename;
    $("#ed-req").value = f.requirements.join(" ");
    $("#ed-desc").value = f.description;
    $("#ed-code").value = "Загрузка…";
    $("#ed-code").disabled = true;
    msg($("#edit-msg"), "");
    editWrap.hidden = false;
    document.documentElement.style.overflow = "hidden";
    try {
      const res = await fetch("/api/files/" + encodeURIComponent(f.id), { cache: "no-store" });
      const json = await res.json();
      if (editId !== f.id) return;
      $("#ed-code").value = json.code;
      $("#ed-code").disabled = false;
    } catch (err) {
      $("#ed-code").value = "";
      msg($("#edit-msg"), "Не удалось загрузить код");
    }
  }

  function closeEdit() {
    editWrap.hidden = true;
    editId = null;
    document.documentElement.style.overflow = "";
  }
  editWrap.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeEdit(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !editWrap.hidden) closeEdit(); });

  $("#edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!editId || $("#ed-code").disabled) return;
    const btn = e.submitter || $("#edit-form button[type=submit]");
    busy(btn, true);
    try {
      await api("PUT", "/admin/api/files/" + encodeURIComponent(editId), {
        title: $("#ed-title").value,
        filename: $("#ed-filename").value,
        requirements: $("#ed-req").value,
        description: $("#ed-desc").value,
        code: $("#ed-code").value,
      });
      closeEdit();
      toast("Сохранено");
      await reload();
    } catch (err) {
      msg($("#edit-msg"), err.message);
    } finally {
      busy(btn, false);
    }
  });

  /* ------------------------------------------------------------- APK -- */
  function renderApk() {
    const a = data.apk;
    $("#apk-box").innerHTML = a.available
      ? `<div class="apk-box"><span class="ico">${icon("package")}</span>
          <div class="grow" style="flex:1;min-width:0"><b>${esc(a.name)}</b>
          <small>${fmtSize(a.size)}${a.version ? " · версия " + esc(a.version) : ""} · скачиваний: ${a.downloads}<br>
          Обновлён ${esc(fmtDate(a.updated_at))}</small></div>
          <button class="icon-btn" type="button" id="apk-del" aria-label="Удалить APK">${icon("trash")}</button></div>`
      : `<div class="apk-box none"><span class="ico">${icon("alert")}</span>
          <div><b>APK ещё не загружен</b><small>Сейчас кнопка на сайте ведёт в Google Play.</small></div></div>`;
    $("#apk-version").value = data.settings.apk_version || "";
    const del = $("#apk-del");
    if (del) del.addEventListener("click", async () => {
      if (!confirm("Удалить APK с сайта?")) return;
      try { await api("DELETE", "/admin/api/apk"); toast("APK удалён"); await reload(); }
      catch (err) { toast(err.message, true); }
    });
  }

  const apkFile = $("#apk-file");
  apkFile.addEventListener("change", () => {
    const f = apkFile.files[0];
    $("#apk-pick").textContent = f ? `${f.name} · ${fmtSize(f.size)}` : "Выбрать APK файл";
  });

  $("#apk-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("#apk-msg");
    const btn = $("#apk-submit");
    const f = apkFile.files[0];
    const version = $("#apk-version").value.trim();
    msg(out, "");
    if (!f) {
      if (version === (data.settings.apk_version || "")) return msg(out, "Выберите APK файл");
      try {
        await api("POST", "/admin/api/settings", { apk_version: version });
        msg(out, "Версия сохранена", true);
        await reload();
      } catch (err) { msg(out, err.message); }
      return;
    }
    if (!/\.apk$/i.test(f.name)) return msg(out, "Нужен файл с расширением .apk");
    const fd = new FormData();
    fd.append("apk", f, f.name);
    fd.append("version", version);
    const prog = $("#apk-progress");
    const bar = $("#apk-progress .progress i");
    const txt = $("#apk-progress-text");
    prog.hidden = false;
    bar.style.width = "0%";
    busy(btn, true);
    try {
      await upload("/admin/api/apk", fd, (loaded, total) => {
        const p = Math.round((loaded / total) * 100);
        bar.style.width = p + "%";
        txt.textContent = `Загрузка: ${p}% (${fmtSize(loaded)} из ${fmtSize(total)})`;
      });
      txt.textContent = "Готово!";
      msg(out, "APK загружен — посетители уже могут его скачать", true);
      apkFile.value = "";
      $("#apk-pick").textContent = "Выбрать APK файл";
      toast("APK загружен");
      await reload();
    } catch (err) {
      msg(out, err.message);
    } finally {
      busy(btn, false);
      setTimeout(() => { prog.hidden = true; }, 1500);
    }
  });

  /* ---------------------------------------------- фото инструкции -- */
  function renderSteps() {
    $("#asteps").innerHTML = data.steps.map((s, i) => {
      const photos = s.photos || [];
      const thumbs = photos.map((src) => `
        <span class="thumb">${`<img src="${esc(src)}" alt="">`}
          <button class="thumb-del" type="button" data-act="del-photo" data-name="${esc(src.split("/").pop())}" aria-label="Удалить фото">${icon("x")}</button>
        </span>`).join("");
      return `
      <div class="aitem step-photos" data-key="${esc(s.key)}">
        <div class="grow">
          <b>${i + 1}. ${esc(s.title)}</b>
          <small>${photos.length ? "Ваших фото: " + photos.length + " из 6" : "Показаны нарисованные экраны"}</small>
          <div class="thumbs">${thumbs}
            ${photos.length < 6 ? `<label class="thumb add" title="Добавить фото">${icon("plus")}<span>Фото</span>
              <input class="vh" type="file" accept="image/*" multiple data-act="photo"></label>` : ""}
          </div>
        </div>
      </div>`;
    }).join("");
  }

  // Сжимаем большие скриншоты перед загрузкой (быстрее грузится у посетителей).
  function compressImage(file) {
    return new Promise((resolve) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return resolve(file);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * k);
        canvas.height = Math.round(img.height * k);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob && blob.size < file.size ? blob : file), "image/jpeg", 0.86);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  $("#asteps").addEventListener("change", async (e) => {
    const input = e.target.closest("input[data-act=photo]");
    if (!input || !input.files.length) return;
    const key = input.closest(".aitem").dataset.key;
    const label = input.closest("label");
    label.classList.add("loading");
    const files = Array.from(input.files);
    let done = 0;
    try {
      for (const file of files) {
        const img = await compressImage(file);
        const fd = new FormData();
        fd.append("photo", img, "photo.jpg");
        await upload("/admin/api/steps/" + encodeURIComponent(key) + "/photo", fd);
        done++;
      }
      toast(done > 1 ? "Загружено фото: " + done : "Фото загружено");
    } catch (err) {
      toast(err.message, true);
    }
    await reload();
  });

  $("#asteps").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act=del-photo]");
    if (!btn) return;
    e.preventDefault();
    const key = btn.closest(".aitem").dataset.key;
    if (!confirm("Удалить это фото?")) return;
    try {
      await api("DELETE", "/admin/api/steps/" + encodeURIComponent(key) + "/photo?name=" + encodeURIComponent(btn.dataset.name));
      toast("Фото удалено");
      await reload();
    } catch (err) { toast(err.message, true); }
  });

  /* ------------------------------------------------------- настройки -- */
  function renderSettings() {
    const s = data.settings;
    $("#set-title").value = s.site_title || "";
    $("#set-sub").value = s.site_subtitle || "";
    $("#set-play").value = s.play_url || "";
    $("#set-url").value = s.site_url || "";
    $("#set-contact").value = s.contact_url || "";
  }

  $("#settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("#settings-msg");
    const btn = e.submitter || $("#settings-form button[type=submit]");
    busy(btn, true);
    try {
      await api("POST", "/admin/api/settings", {
        site_title: $("#set-title").value,
        site_subtitle: $("#set-sub").value,
        play_url: $("#set-play").value,
        site_url: $("#set-url").value,
        contact_url: $("#set-contact").value,
      });
      msg(out, "Сохранено — обновите сайт, чтобы увидеть изменения", true);
      await reload();
    } catch (err) {
      msg(out, err.message);
    } finally {
      busy(btn, false);
    }
  });

  $("#pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("#pw-msg");
    const cur = $("#pw-cur").value, nw = $("#pw-new").value, rep = $("#pw-rep").value;
    if (nw.length < 8) return msg(out, "Новый пароль — минимум 8 символов");
    if (nw !== rep) return msg(out, "Пароли не совпадают");
    const btn = e.submitter || $("#pw-form button[type=submit]");
    busy(btn, true);
    try {
      await api("POST", "/admin/api/password", { current: cur, new: nw });
      e.target.reset();
      msg(out, "Пароль изменён. На других устройствах нужно войти заново.", true);
    } catch (err) {
      msg(out, err.message);
    } finally {
      busy(btn, false);
    }
  });

  /* --------------------------------------------- вход через Google -- */
  function renderGoogle() {
    const gc = data.google;
    const st = $("#g-status");
    st.textContent = gc.enabled ? "Включён" : "Не настроен";
    st.className = "tag " + (gc.enabled ? "ok" : "");
    $("#g-id").value = gc.client_id || "";
    $("#g-secret").value = "";
    $("#g-secret").placeholder = gc.has_secret ? "•••••••• сохранён" : "Вставьте Client Secret";
    $("#g-secret-hint").textContent = gc.has_secret ? "Оставьте пустым, чтобы не менять" : "";
    $("#g-redirect").value = gc.redirect_uri;
    $("#g-req-files").checked = gc.require_files;
    $("#g-req-apk").checked = gc.require_apk;
    $("#g-https-warn").hidden = gc.redirect_uri.startsWith("https://");
  }

  $("#g-redirect-copy").addEventListener("click", async () => {
    const ok = await copyText($("#g-redirect").value);
    toast(ok ? "Redirect URI скопирован" : "Не удалось скопировать", !ok);
  });

  $("#google-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("#g-msg");
    const btn = e.submitter || $("#google-form button[type=submit]");
    busy(btn, true);
    try {
      await api("POST", "/admin/api/google", {
        client_id: $("#g-id").value.trim(),
        client_secret: $("#g-secret").value.trim(),
        require_files: $("#g-req-files").checked,
        require_apk: $("#g-req-apk").checked,
      });
      msg(out, "Сохранено", true);
      await reload();
    } catch (err) {
      msg(out, err.message);
    } finally {
      busy(btn, false);
    }
  });

  /* --------------------------------------------------- пользователи -- */
  let userQuery = "";
  function userAvatar(u) {
    const letter = esc((u.name || u.email || "?").trim().charAt(0).toUpperCase());
    return u.picture
      ? `<span class="avatar"><img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer"></span>`
      : `<span class="avatar">${letter}</span>`;
  }

  function renderUsers() {
    const n = data.stats.users || 0;
    $("#u-count").textContent = String(n);
    const q = userQuery.trim().toLowerCase();
    const list = data.users.filter((u) => !q || (u.name + " " + u.email).toLowerCase().includes(q));
    if (!data.users.length) {
      $("#ausers").innerHTML = `<p class="sub" style="margin:0;color:var(--muted)">Пока никто не зарегистрировался.</p>`;
      return;
    }
    $("#ausers").innerHTML = list.map((u) => `
      <div class="aitem${u.blocked ? " off" : ""}" data-uid="${u.id}">
        ${userAvatar(u)}
        <div class="grow"><b>${esc(u.name)}${u.blocked ? ' <span class="tag bad">заблокирован</span>' : ""}</b>
          <small>${esc(u.email)}</small>
          <small>Регистрация ${esc(fmtDate(u.created_at))} · входов: ${u.logins} · загрузок: ${u.downloads}${u.last_ip ? " · IP " + esc(u.last_ip) : ""}</small></div>
        <div class="acts">
          <button class="icon-btn" type="button" data-act="block" aria-label="${u.blocked ? "Разблокировать" : "Заблокировать"}" title="${u.blocked ? "Разблокировать" : "Заблокировать"}">${icon(u.blocked ? "check" : "ban")}</button>
          <button class="icon-btn" type="button" data-act="del" aria-label="Удалить" title="Удалить">${icon("trash")}</button>
        </div>
      </div>`).join("") || `<p class="sub" style="margin:0;color:var(--muted)">Никого не найдено.</p>`;
  }

  $("#u-q").addEventListener("input", (e) => { userQuery = e.target.value; renderUsers(); });
  $("#ausers").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const uid = btn.closest(".aitem").dataset.uid;
    const u = data.users.find((x) => String(x.id) === uid);
    if (!u) return;
    try {
      if (btn.dataset.act === "block") {
        await api("POST", `/admin/api/users/${uid}/block`, { blocked: !u.blocked });
        toast(u.blocked ? "Пользователь разблокирован" : "Пользователь заблокирован");
      } else {
        if (!confirm(`Удалить аккаунт ${u.email}? Пользователь сможет зарегистрироваться снова.`)) return;
        await api("DELETE", `/admin/api/users/${uid}`);
        toast("Аккаунт удалён");
      }
      await reload();
    } catch (err) { toast(err.message, true); }
  });

  /* ----------------------------------------------------------- защита -- */
  const EVENTS = {
    admin_login: ["Вход в админку", "good"],
    login_fail: ["Неверный пароль", "danger"],
    "2fa_fail": ["Неверный код 2FA", "danger"],
    login_locked: ["Вход заблокирован", "danger"],
    auto_ban: ["Автоблокировка IP", "danger"],
    ip_blocked: ["IP заблокирован", "danger"],
    ip_unblocked: ["IP разблокирован", ""],
    password_changed: ["Пароль изменён", "good"],
    "2fa_on": ["2FA включена", "good"],
    "2fa_off": ["2FA отключена", "danger"],
    cf_only_on: ["Режим «только Cloudflare» включён", "good"],
    cf_only_off: ["Режим «только Cloudflare» выключен", ""],
    google_settings: ["Настройки Google изменены", ""],
    google_error: ["Ошибка входа через Google", "danger"],
    blocked_user_login: ["Вход заблокированного пользователя", "danger"],
    user_blocked: ["Пользователь заблокирован", "danger"],
    user_unblocked: ["Пользователь разблокирован", ""],
    user_deleted: ["Пользователь удалён", ""],
  };
  const fmtTime = (ts) => new Date(ts * 1000).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  function renderSecurity() {
    const s = data.security;
    const st = (label, value, on, warn) => `<div class="status ${on ? "on" : warn ? "warn" : ""}"><small>${label}</small><b>${value}</b></div>`;
    $("#sec-status").innerHTML =
      st("Cloudflare", s.via_cloudflare ? "Подключён" : "Не подключён", s.via_cloudflare, !s.via_cloudflare) +
      st("HTTPS", s.https ? "Включён" : "Нет", s.https, !s.https) +
      st("2FA админки", s.twofa ? "Включена" : "Выключена", s.twofa, !s.twofa) +
      st("Ваш IP", esc(s.ip), true, false);
    $("#cf-only").checked = s.cf_only;
    $("#limits-text").textContent =
      `Автоматически: больше ${s.limits.general} запросов в минуту с одного IP — ответ «подождите», ` +
      `при флуде — блокировка на ${s.limits.ban_minutes} мин. ${s.limits.login_fails} неверных паролей — вход закрыт на ${s.limits.login_lock} мин.`;

    $("#blocks").innerHTML = s.blocks.length ? s.blocks.map((b) => `
      <div class="aitem" data-net="${esc(b.net)}">
        <div class="grow"><b class="mono">${esc(b.shown)}</b>
          <small>${esc(b.reason)} · ${b.until ? "до " + esc(fmtTime(b.until)) : "навсегда"}</small></div>
        <button class="btn btn-glass btn-sm" type="button" data-act="unblock">Снять</button>
      </div>`).join("") : `<p class="sub" style="margin:0;color:var(--muted)">Заблокированных адресов нет.</p>`;

    $("#seclog").innerHTML = s.log.length ? s.log.map((r) => {
      const [label, cls] = EVENTS[r.event] || [r.event, ""];
      return `<div class="log-row ${cls}"><time>${esc(fmtTime(r.ts))}</time><b>${esc(label)}</b>
        <span>${esc(r.ip)}${r.detail ? " · " + esc(r.detail) : ""}</span></div>`;
    }).join("") : `<p class="sub" style="margin:0;color:var(--muted)">Событий пока нет.</p>`;

    renderTwofa();
  }

  function renderTwofa(setup) {
    const box = $("#twofa");
    if (setup) {
      box.innerHTML = `
        ${setup.qr ? `<div class="qr">${setup.qr}</div>` : ""}
        <ol class="steps-list">
          <li>Установите <b>Google Authenticator</b> из Play Маркета.</li>
          <li>На этом телефоне нажмите «Открыть в Authenticator», с компьютера — отсканируйте QR-код или введите ключ вручную.</li>
          <li>Введите 6-значный код из приложения и нажмите «Включить».</li>
        </ol>
        <div class="secret">${esc(setup.secret.replace(/(.{4})/g, "$1 ").trim())}</div>
        <a class="btn btn-glass btn-block" href="${esc(setup.uri)}" style="margin-bottom:12px">${icon("smartphone")}Открыть в Authenticator</a>
        <div class="with-btn"><input class="input code-input" id="twofa-code" inputmode="numeric" maxlength="7" placeholder="000000" autocomplete="one-time-code" style="margin:0">
          <button class="btn btn-primary" type="button" id="twofa-enable" style="height:56px">Включить</button></div>`;
      $("#twofa-enable").addEventListener("click", async () => {
        try {
          await api("POST", "/admin/api/2fa/enable", { code: $("#twofa-code").value });
          msg($("#twofa-msg"), "2FA включена. Теперь при входе нужен код из приложения.", true);
          await reload();
        } catch (err) { msg($("#twofa-msg"), err.message); }
      });
      return;
    }
    if (data.security.twofa) {
      box.innerHTML = `<div class="with-btn"><input class="input code-input" id="twofa-off-code" inputmode="numeric" maxlength="7" placeholder="Код" style="margin:0">
        <button class="btn btn-ghost-danger" type="button" id="twofa-disable" style="height:56px">Отключить</button></div>`;
      $("#twofa-disable").addEventListener("click", async () => {
        if (!confirm("Отключить двухфакторную защиту?")) return;
        try {
          await api("POST", "/admin/api/2fa/disable", { code: $("#twofa-off-code").value });
          msg($("#twofa-msg"), "2FA отключена", true);
          await reload();
        } catch (err) { msg($("#twofa-msg"), err.message); }
      });
    } else {
      box.innerHTML = `<button class="btn btn-primary btn-block" type="button" id="twofa-setup">${icon("shield")}Включить 2FA</button>`;
      $("#twofa-setup").addEventListener("click", async () => {
        try {
          const res = await api("POST", "/admin/api/2fa/setup");
          msg($("#twofa-msg"), "");
          renderTwofa(res);
        } catch (err) { msg($("#twofa-msg"), err.message); }
      });
    }
  }

  $("#cf-only").addEventListener("change", async (e) => {
    const out = $("#cf-msg");
    const enabled = e.target.checked;
    if (enabled && !confirm("Включить? Сайт перестанет открываться по IP-адресу — только по домену через Cloudflare.")) {
      e.target.checked = false;
      return;
    }
    try {
      await api("POST", "/admin/api/security/cloudflare", { enabled });
      msg(out, enabled ? "Включено: прямые запросы на сервер отклоняются" : "Выключено", true);
      await reload();
    } catch (err) {
      e.target.checked = !enabled;
      msg(out, err.message);
    }
  });

  $("#block-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("#b-msg");
    try {
      await api("POST", "/admin/api/blocks", {
        ip: $("#b-ip").value.trim(),
        minutes: Number($("#b-time").value),
        reason: $("#b-reason").value.trim(),
      });
      e.target.reset();
      $("#b-time").value = "0";
      msg(out, "Адрес заблокирован", true);
      await reload();
    } catch (err) { msg(out, err.message); }
  });

  $("#blocks").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act=unblock]");
    if (!btn) return;
    try {
      await api("POST", "/admin/api/blocks/delete", { net: btn.closest(".aitem").dataset.net });
      toast("Блокировка снята");
      await reload();
    } catch (err) { toast(err.message, true); }
  });

  /* --------------------------------------------- сообщения посетителей -- */
  const TOPIC = { bug: "Ошибка", question: "Вопрос", idea: "Идея", other: "Другое" };
  const LANG = { ru: "RU", tr: "TR", tk: "TM" };
  const baseTitle = document.title;
  let spOpen = null;
  let spMsgs = [];
  const clock = (ts) => new Date(ts * 1000).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const when = (ts) => {
    const d = new Date(ts * 1000);
    return d.toDateString() === new Date().toDateString() ? clock(ts) : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  };
  const spThreadById = (id) => ((data.support && data.support.threads) || []).find((t) => t.id === id);

  function shortUa(ua) {
    if (!ua) return "браузер неизвестен";
    const os = /Android [\d.]+/.exec(ua) || /iPhone OS [\d_]+/.exec(ua) || /Windows NT [\d.]+/.exec(ua) || /Mac OS X [\d_]+/.exec(ua) || /Linux/.exec(ua);
    const br = /(?:YaBrowser|OPR|Edg|Firefox|Chrome|Version)\/[\d.]+/.exec(ua);
    return [os && os[0].replace(/_/g, "."), br && br[0]].filter(Boolean).join(", ") || ua.slice(0, 60);
  }

  function renderSupport() {
    const sup = data.support || { threads: [], unread: 0 };
    const n = sup.unread || 0;
    const badge = $("#sp-badge");
    badge.hidden = !n;
    badge.textContent = n > 99 ? "99+" : String(n);
    document.title = (n ? "(" + n + ") " : "") + baseTitle;
    $("#sp-count").textContent = sup.threads.length;
    const box = $("#sp-threads");
    if (!sup.threads.length) {
      box.innerHTML = `<div class="empty"><b>Сообщений пока нет</b>Когда посетитель напишет, переписка появится здесь.</div>`;
      return;
    }
    box.innerHTML = sup.threads.map((t) => `
      <button type="button" class="sp-trow${t.id === spOpen ? " on" : ""}" data-thread="${esc(t.id)}">
        <div class="grow">
          <b>${esc(t.name || "Гость")}${t.lang ? `<span class="tag">${esc(LANG[t.lang] || t.lang)}</span>` : ""}</b>
          <small>${esc(t.email || t.contact || "без контакта")}</small>
          <small>${t.last_from === "admin" ? "Вы: " : ""}${esc(t.last_text)}</small>
        </div>
        <div style="display:grid;gap:6px;justify-items:end"><time>${when(t.updated_at)}</time>${t.unread ? `<span class="atab-badge">${t.unread}</span>` : ""}</div>
      </button>`).join("");
  }

  function renderThreadMsgs(t) {
    const box = $("#sp-amsgs");
    if (!box || !t) return;
    let day = "";
    box.innerHTML = spMsgs.length ? spMsgs.map((m) => {
      const d = new Date(m.created_at * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
      const sep = d !== day ? `<div class="sp-day">${esc((day = d))}</div>` : "";
      const from = m.mine ? "" : `<span class="sp-from">${icon("user")}${esc(t.name || "Гость")}</span>`;
      const topic = m.topic ? `<span class="sp-topic">${esc(TOPIC[m.topic] || m.topic)}</span>` : "";
      return `${sep}<div class="sp-msg ${m.mine ? "me" : "them"}">${from}${topic}<p>${esc(m.text)}</p><time>${clock(m.created_at)}</time></div>`;
    }).join("") : `<div class="sp-hint">Сообщений нет</div>`;
    box.scrollTop = box.scrollHeight;
  }

  async function openThread(id, quiet) {
    const t = spThreadById(id);
    if (!t) return;
    spOpen = id;
    if (!quiet) {
      const meta = [t.email ? "Google: " + t.email : "без входа через Google",
        t.contact ? "контакт: " + t.contact : "", t.lang ? "язык: " + (LANG[t.lang] || t.lang) : ""].filter(Boolean);
      $("#sp-thread").innerHTML = `
        <div class="sp-thread-head">
          <div class="who"><b>${esc(t.name || "Гость")}</b>
            <small>${meta.map(esc).join(" · ")}</small>
            <small>IP ${esc(t.ip || "—")} · ${esc(shortUa(t.ua))} · с ${esc(fmtDate(t.created_at))}</small></div>
          <div class="acts">
            <button class="btn btn-glass btn-sm" type="button" data-sp-block title="Заблокировать IP на сутки">${icon("ban")}IP</button>
            <button class="btn btn-glass btn-sm" type="button" data-sp-del>${icon("trash")}Удалить</button>
          </div>
        </div>
        <div class="sp-msgs" id="sp-amsgs"></div>
        <form class="sp-form" id="sp-reply" novalidate>
          <div class="sp-compose">
            <textarea class="input" id="sp-reply-text" rows="2" maxlength="4000" placeholder="Ответ посетителю…"></textarea>
            <button class="btn btn-primary sp-send" type="submit" aria-label="Отправить">${icon("send")}</button>
          </div>
          <p class="sp-fine">Ctrl + Enter — отправить. Ответ посетитель увидит на сайте.</p>
        </form>`;
      renderSupport();
    }
    try {
      const r = await api("GET", "/admin/api/support/" + id);
      if (spOpen !== id) return;
      spMsgs = r.messages;
      renderThreadMsgs(t);
      if (t.unread) {
        data.support.unread = Math.max(0, data.support.unread - t.unread);
        t.unread = 0;
        renderSupport();
      }
    } catch (e) { toast(e.message, true); }
  }

  async function refreshSupport() {
    try {
      const r = await api("GET", "/admin/api/support");
      data.support = { threads: r.threads, unread: r.unread };
      if (spOpen && !spThreadById(spOpen)) {
        spOpen = null;
        $("#sp-thread").innerHTML = `<div class="sp-hint">Выберите переписку в списке</div>`;
      }
      renderSupport();
      const t = spOpen && spThreadById(spOpen);
      if (t && (t.unread || t.count !== spMsgs.length)) openThread(spOpen, true);
    } catch (e) { /* попробуем позже */ }
  }
  setInterval(() => { if (!document.hidden) refreshSupport(); }, 20000);

  $("#sp-threads").addEventListener("click", (e) => {
    const b = e.target.closest("[data-thread]");
    if (b) openThread(b.dataset.thread);
  });
  $("#sp-thread").addEventListener("submit", async (e) => {
    if (e.target.id !== "sp-reply") return;
    e.preventDefault();
    const ta = $("#sp-reply-text"), btn = $(".sp-send", e.target), text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    busy(btn, true);
    try {
      const r = await api("POST", "/admin/api/support/" + spOpen, { text });
      const t = spThreadById(spOpen);
      spMsgs.push(r.message);
      ta.value = "";
      if (t) {
        t.last_text = text; t.last_from = "admin"; t.updated_at = r.message.created_at; t.count = spMsgs.length;
        renderThreadMsgs(t);
      }
      renderSupport();
    } catch (err) { toast(err.message, true); } finally { busy(btn, false); }
  });
  $("#sp-thread").addEventListener("keydown", (e) => {
    if (e.target.id === "sp-reply-text" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      $("#sp-reply").requestSubmit();
    }
  });
  $("#sp-thread").addEventListener("click", async (e) => {
    const t = spThreadById(spOpen);
    if (!t) return;
    if (e.target.closest("[data-sp-del]")) {
      if (!confirm("Удалить всю переписку с «" + (t.name || "Гость") + "»?")) return;
      try {
        await api("DELETE", "/admin/api/support/" + t.id);
        spOpen = null;
        $("#sp-thread").innerHTML = `<div class="sp-hint">Переписка удалена</div>`;
        await refreshSupport();
      } catch (err) { toast(err.message, true); }
    } else if (e.target.closest("[data-sp-block]")) {
      if (!t.ip || !confirm("Заблокировать IP " + t.ip + " на сутки? С этого адреса нельзя будет открыть сайт.")) return;
      try {
        await api("POST", "/admin/api/blocks", { ip: t.ip, minutes: 1440, reason: "Спам в сообщениях" });
        toast("IP заблокирован на сутки");
      } catch (err) { toast(err.message, true); }
    }
  });

  /* ----------------------------------------------------------------- */
  function renderAll() {
    renderStats();
    renderSupport();
    renderFiles();
    renderApk();
    renderSteps();
    renderSettings();
    renderGoogle();
    renderUsers();
    renderSecurity();
  }
  renderAll();
})();
