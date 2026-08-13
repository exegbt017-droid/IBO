import { SceneManager } from "./scene/SceneManager.js";
import { loadEnvironment } from "./scene/EnvironmentLoader.js";
import { CurupiraCharacter } from "./scene/CurupiraCharacter.js";
import { spawnAnimal } from "./scene/AnimalEntity.js";
import { getState, setState, subscribe } from "./state.js";
import { getPostoIdFromUrl } from "./router.js";
import { fetchPosto, sendProgress, getParticipantId } from "./api/client.js";
import { mountUI, renderUI, INTRO_SEQUENCE } from "./ui/App.js";
import { setLocale, onLocaleChange } from "./i18n/index.js";

const canvas = document.getElementById("scene-canvas");
const overlay = document.getElementById("overlay");

const sceneManager = new SceneManager(canvas);
const curupira = new CurupiraCharacter(sceneManager);
const animalGroups = new Map();

function render() {
  overlay.innerHTML = renderUI(getState());
}

subscribe(render);
onLocaleChange(render);

mountUI(overlay, {
  onAdvanceDialogue: handleAdvanceDialogue,
  onSetLocale: (locale) => setLocale(locale),
  onOpenQuestion: () => setState({ showQuestion: true, selectedOptionId: null, lastAnswerCorrect: null }),
  onCloseAnimalPanel: () => setState({ activeAnimal: null }),
  onAnswerYesNo: handleAnswerYesNo,
  onSelectOption: (optionId) => setState({ selectedOptionId: optionId, lastAnswerCorrect: null }),
  onSubmitQuestion: handleSubmitQuestion,
});

render();

async function bootstrap() {
  const postoId = getPostoIdFromUrl();
  const posto = await fetchPosto(postoId);
  setState({ posto, loading: false, stage: "intro", dialogueIndex: 0 });

  await loadEnvironment(sceneManager, posto.ambiente);

  posto.animais.forEach((entry) => {
    const group = spawnAnimal(sceneManager, entry, handleSelectAnimal);
    animalGroups.set(entry.animal.id, group);
  });

  // Garante que todos os animais do posto e o Curupira caibam na tela, seja
  // qual for a posicao definida no conteudo do posto ou o formato do aparelho.
  const CURUPIRA_SPOT = [0, 0, -3.5];
  sceneManager.frameToFit([...posto.animais.map((entry) => entry.posicao), CURUPIRA_SPOT]);

  await curupira.enter();
  curupira.talk(true);
}

function handleAdvanceDialogue() {
  const state = getState();
  const nextIndex = state.dialogueIndex + 1;

  if (nextIndex >= INTRO_SEQUENCE.length) {
    curupira.talk(false);
    setState({ stage: "mission" });
    return;
  }
  setState({ dialogueIndex: nextIndex });
}

function handleSelectAnimal(entry) {
  setState({ activeAnimal: entry });
}

function handleAnswerYesNo(userSaysYes) {
  const state = getState();
  const entry = state.activeAnimal;
  const correct = userSaysYes === entry.ocorre_no_local;
  const investigated = new Map(state.investigated);
  investigated.set(entry.animal.id, { correct });

  const earned = correct ? state.posto.pontos_por_animal_investigado : 0;
  const marker = animalGroups.get(entry.animal.id)?.userData.marker;
  if (marker) marker.visible = true;

  setState({ investigated, score: state.score + earned });
}

function handleSubmitQuestion() {
  const state = getState();
  if (!state.selectedOptionId) return;

  const pergunta = state.posto.perguntas.find((p) => p.id === state.posto.missao.pergunta_final_id);
  const isCorrect = state.selectedOptionId === pergunta.correta;

  if (isCorrect) {
    const newScore = state.score + pergunta.pontos;
    setState({ lastAnswerCorrect: true, score: newScore });
    curupira.celebrate();

    setTimeout(async () => {
      setState({ showQuestion: false, stage: "complete" });
      await sendProgress({
        participantId: getParticipantId(),
        postoId: state.posto.id,
        pontuacao: newScore,
        respostas: { [pergunta.id]: state.selectedOptionId },
      });
    }, 1400);
  } else {
    setState({ lastAnswerCorrect: false });
  }
}

bootstrap().catch((err) => {
  console.error(err);
  overlay.innerHTML = `<div class="loading-screen"><div>⚠️ ${escapeHtml(err.message)}</div></div>`;
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}
