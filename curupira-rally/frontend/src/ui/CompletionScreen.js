import { t, tc } from "../i18n/index.js";

export function renderCompletionScreen(posto, score, conclusaoText) {
  return `
    <div class="complete-screen">
      <div class="complete-card">
        <div style="font-size:2.2rem;">🏆</div>
        <h1 class="complete-title font-display">${escapeHtml(t("posto_complete_title"))}</h1>
        <div style="font-size:0.9rem;color:var(--muted);">${escapeHtml(conclusaoText)}</div>
        <div class="complete-score font-display">${score} / ${posto.pontuacao_maxima}</div>
        <div class="clue-box">
          <div class="clue-label">${escapeHtml(t("next_clue"))}</div>
          <div>${escapeHtml(tc(posto.pistas.proximo_posto))}</div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}
