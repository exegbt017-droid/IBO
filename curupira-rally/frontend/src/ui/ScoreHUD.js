import { t, getLocale } from "../i18n/index.js";

export function renderTopBar(score) {
  const locale = getLocale();
  return `
    <div class="topbar">
      <div class="brand overlay-pointer">🌳 Curupira Rally</div>
      <div style="display:flex;gap:0.4rem;align-items:center;">
        <div class="lang-switch overlay-pointer">
          <button data-action="set-locale" data-locale="pt-BR" class="${locale === "pt-BR" ? "active" : ""}">PT</button>
          <button data-action="set-locale" data-locale="es" class="${locale === "es" ? "active" : ""}">ES</button>
        </div>
        <div class="score-pill overlay-pointer">${escapeHtml(t("score"))}: ${score}</div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}
