import { t, tc } from "../i18n/index.js";

export function renderDialogueBox(dialogo) {
  if (!dialogo) return "";
  return `
    <div class="dialogue-box overlay-pointer" data-action="advance-dialogue">
      <div class="dialogue-name font-display">Curupira</div>
      <div class="dialogue-text">${escapeHtml(tc(dialogo.texto))}</div>
      <div class="dialogue-hint">${escapeHtml(t("tap_to_continue"))} →</div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
