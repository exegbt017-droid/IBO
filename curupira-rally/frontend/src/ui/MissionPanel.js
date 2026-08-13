import { t, tc } from "../i18n/index.js";

export function renderMissionPanel(posto, investigatedCount, totalAnimals) {
  const allInvestigated = investigatedCount >= totalAnimals;
  const dots = Array.from({ length: totalAnimals })
    .map((_, i) => `<span class="progress-dot ${i < investigatedCount ? "filled" : ""}"></span>`)
    .join("");

  return `
    <div class="mission-panel overlay-pointer">
      <div class="mission-title">${escapeHtml(t("mission_title"))}: ${escapeHtml(tc(posto.nome))}</div>
      <div class="mission-desc">${escapeHtml(tc(posto.missao.descricao))}</div>
      <div class="progress-row">
        <div>
          <div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.25rem;">
            ${escapeHtml(t("animals_found"))}: ${investigatedCount}/${totalAnimals}
          </div>
          <div class="progress-dots">${dots}</div>
        </div>
        <button class="primary-btn" data-action="open-question" ${allInvestigated ? "" : "disabled"}>
          ${escapeHtml(t("open_challenge"))}
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
