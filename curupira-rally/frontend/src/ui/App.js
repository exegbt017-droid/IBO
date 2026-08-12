import { t, tc } from "../i18n/index.js";
import { renderTopBar } from "./ScoreHUD.js";
import { renderDialogueBox } from "./DialogueBox.js";
import { renderMissionPanel } from "./MissionPanel.js";
import { renderAnimalPanel } from "./AnimalPanel.js";
import { renderQuestionModal } from "./QuestionModal.js";
import { renderCompletionScreen } from "./CompletionScreen.js";

export const INTRO_SEQUENCE = ["boas-vindas", "missao"];

function findDialogo(posto, id) {
  return posto.curupira.dialogos.find((d) => d.id === id);
}

export function mountUI(overlayEl, handlers) {
  overlayEl.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    switch (action) {
      case "advance-dialogue":
        handlers.onAdvanceDialogue();
        break;
      case "set-locale":
        handlers.onSetLocale(actionEl.dataset.locale);
        break;
      case "open-question":
        if (!actionEl.disabled) handlers.onOpenQuestion();
        break;
      case "close-animal-panel":
        if (event.target === actionEl) handlers.onCloseAnimalPanel();
        break;
      case "answer-yesno":
        if (!actionEl.disabled) handlers.onAnswerYesNo(actionEl.dataset.answer === "yes");
        break;
      case "select-option":
        handlers.onSelectOption(actionEl.dataset.optionId);
        break;
      case "submit-question":
        if (!actionEl.disabled) handlers.onSubmitQuestion();
        break;
      default:
        break;
    }
  });
}

export function renderUI(state) {
  const { posto, stage, dialogueIndex, investigated, activeAnimal, showQuestion, selectedOptionId, lastAnswerCorrect, score } = state;

  if (stage === "loading" || !posto) {
    return `<div class="loading-screen"><div class="spinner"></div><div>${escapeHtml(t("loading"))}</div></div>`;
  }

  const blocks = [renderTopBar(score)];

  if (stage === "intro") {
    const dialogo = findDialogo(posto, INTRO_SEQUENCE[dialogueIndex]);
    blocks.push(`<div>${renderDialogueBox(dialogo)}</div>`);
  } else if (stage === "mission" || stage === "question") {
    blocks.push(`<div>${renderMissionPanel(posto, investigated.size, posto.animais.length)}</div>`);
  } else {
    blocks.push("<div></div>");
  }

  let extra = "";
  if (activeAnimal) {
    const investigatedEntry = investigated.get(activeAnimal.animal.id);
    const feedbackText = investigatedEntry
      ? tc(findDialogo(posto, investigatedEntry.correct ? "acerto" : "erro").texto)
      : "";
    extra += renderAnimalPanel(activeAnimal, investigatedEntry, feedbackText);
  }
  if (showQuestion) {
    const pergunta = posto.perguntas.find((p) => p.id === posto.missao.pergunta_final_id);
    const feedbackText =
      lastAnswerCorrect === null
        ? ""
        : tc(findDialogo(posto, lastAnswerCorrect ? "acerto" : "erro").texto);
    extra += renderQuestionModal(pergunta, selectedOptionId, lastAnswerCorrect, feedbackText);
  }
  if (stage === "complete") {
    extra += renderCompletionScreen(posto, score, tc(findDialogo(posto, "conclusao").texto));
  }

  return blocks.join("") + extra;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}
