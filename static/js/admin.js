/* Админ-панель: файлы .py, APK, фото инструкции, настройки. */
(function () {
  "use strict";
  const { $, $$, esc, icon, logo, fmtSize, plural, fmtDate, toast } = window.UI;

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
      if (on) atabs.style.setProperty("--i", i);
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
      ? `<div class="apk-box"><span class="m-file-ico">${icon("package")}</span>
          <div class="grow" style="flex:1;min-width:0"><b>${esc(a.name)}</b>
          <small>${fmtSize(a.size)}${a.version ? " · версия " + esc(a.version) : ""} · скачиваний: ${a.downloads}<br>
          Обновлён ${esc(fmtDate(a.updated_at))}</small></div>
          <button class="icon-btn" type="button" id="apk-del" aria-label="Удалить APK">${icon("trash")}</button></div>`
      : `<div class="apk-box none"><span class="m-file-ico" style="background:#f5b400">${icon("alert")}</span>
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
    $("#asteps").innerHTML = data.steps.map((s, i) => `
      <div class="aitem" data-key="${esc(s.key)}">
        <span class="thumb">${s.photo ? `<img src="${esc(s.photo)}" alt="">` : "Рисунок"}</span>
        <div class="grow">
          <b>${i + 1}. ${esc(s.title)}</b>
          <small>${s.photo ? "Показано ваше фото" : "Показан нарисованный экран"}</small>
          <div class="acts" style="margin-top:10px">
            <label class="btn btn-glass btn-sm">${icon("upload")}${s.photo ? "Заменить" : "Загрузить фото"}
              <input class="vh" type="file" accept="image/*" data-act="photo"></label>
            ${s.photo ? `<button class="btn btn-danger btn-sm" type="button" data-act="del-photo" aria-label="Удалить фото">${icon("trash")}</button>` : ""}
          </div>
        </div>
      </div>`).join("");
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
    if (!input || !input.files[0]) return;
    const key = input.closest(".aitem").dataset.key;
    const label = input.closest("label");
    label.classList.add("loading");
    try {
      const img = await compressImage(input.files[0]);
      const fd = new FormData();
      fd.append("photo", img, "photo.jpg");
      await upload("/admin/api/steps/" + encodeURIComponent(key) + "/photo", fd);
      toast("Фото загружено");
      await reload();
    } catch (err) {
      toast(err.message, true);
      label.classList.remove("loading");
      input.value = "";
    }
  });

  $("#asteps").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act=del-photo]");
    if (!btn) return;
    const key = btn.closest(".aitem").dataset.key;
    if (!confirm("Удалить фото? Вместо него будет нарисованный экран.")) return;
    try {
      await api("DELETE", "/admin/api/steps/" + encodeURIComponent(key) + "/photo");
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
    if (nw.length < 6) return msg(out, "Новый пароль — минимум 6 символов");
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

  /* ----------------------------------------------------------------- */
  function renderAll() {
    renderStats();
    renderFiles();
    renderApk();
    renderSteps();
    renderSettings();
  }
  renderAll();
})();
