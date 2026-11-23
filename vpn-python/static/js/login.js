(function () {
  "use strict";
  const pw = document.getElementById("pw");
  const btn = document.getElementById("pw-toggle");
  if (!pw || !btn) return;
  btn.addEventListener("click", () => {
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Скрыть пароль" : "Показать пароль");
    btn.classList.toggle("on", show);
    pw.focus();
  });
})();
