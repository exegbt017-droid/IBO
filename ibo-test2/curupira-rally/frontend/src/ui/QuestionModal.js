import { t, tc } from "../i18n/index.js";

export function renderQuestionModal(pergunta, selectedOptionId, lastAnswerCorrect, curupiraFeedback) {
  const options = pergunta.opcoes
    .map((opt) => {
      let cls = "";
      if (selectedOptionId === opt.animal_id) {
        cls = lastAnswerCorrect ? "correct" : "wrong";
      }
      return `<button class="option-btn ${cls}" data-action="select-option" data-option-id="${opt.animal_id}">
        ${escapeHtml(tc(opt.texto))}
      </button>`;
    })
    .join("");

  const feedback =
    lastAnswerCorrect === null
      ? ""
      : `<div class="feedback-banner ${lastAnswerCorrect ? "ok" : "bad"}">
          ${escapeHtml(curupiraFeedback)}
        </div>`;

  return `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-title">🌿 ${escapeHtml(tc(pergunta.texto))}</div>
        <div class="options-list">${options}</div>
        ${feedback}
        <div class="modal-actions">
          <button class="primary-btn" data-action="submit-question" ${selectedOptionId ? "" : "disabled"}>
            ${escapeHtml(lastAnswerCorrect === false ? t("try_again") : t("submit_answer"))}
          </button>
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
