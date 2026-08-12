import { t, tc } from "../i18n/index.js";

export function renderAnimalPanel(entry, investigatedEntry, curupiraFeedback) {
  const { animal } = entry;
  const answered = investigatedEntry !== undefined;
  const correct = investigatedEntry?.correct;

  let feedback = "";
  if (answered) {
    const truth = entry.ocorre_no_local ? t("yes") : t("no");
    feedback = `
      <div class="feedback-banner ${correct ? "ok" : "bad"}">
        ${escapeHtml(curupiraFeedback)}
        ${correct ? "" : `<br/><span style="font-weight:400">${escapeHtml(t("belongs_here_question"))} ${truth}.</span>`}
      </div>
    `;
  }

  return `
    <div class="modal-backdrop" data-action="close-animal-panel">
      <div class="modal-card">
        <div class="modal-title">🔎 ${escapeHtml(t("species_info_title"))}</div>
        <div class="field-row"><span class="field-label">${escapeHtml(tc(animal.nome_comum))}</span></div>
        <div class="field-row">
          <span class="field-label">${escapeHtml(t("scientific_name"))}</span>
          <span class="field-value sci-name">${escapeHtml(animal.nome_cientifico)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">${escapeHtml(t("genus"))}</span>
          <span class="field-value">${escapeHtml(animal.genero)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">${escapeHtml(t("origin"))}</span>
          <span class="field-value">${escapeHtml(animal.origem)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">${escapeHtml(t("countries"))}</span>
          <span class="field-value">${escapeHtml(animal.paises_de_ocorrencia.join(", "))}</span>
        </div>
        <div class="field-row">
          <span class="field-label">${escapeHtml(t("biomes"))}</span>
          <span class="field-value">${escapeHtml(animal.biomas.join(", "))}</span>
        </div>

        <div style="margin-top:0.8rem;font-weight:700;font-size:0.88rem;">${escapeHtml(t("belongs_here_question"))}</div>
        <div class="yesno-row">
          <button class="secondary-btn ${answered && correct !== undefined ? "" : ""}" data-action="answer-yesno" data-answer="yes" ${answered ? "disabled" : ""}>
            ${escapeHtml(t("yes"))}
          </button>
          <button class="secondary-btn" data-action="answer-yesno" data-answer="no" ${answered ? "disabled" : ""}>
            ${escapeHtml(t("no"))}
          </button>
        </div>

        ${feedback}

        <div class="modal-actions">
          <button class="primary-btn" data-action="close-animal-panel">${escapeHtml(t("close"))}</button>
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
