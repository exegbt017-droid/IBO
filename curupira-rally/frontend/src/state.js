/** Estado simples do posto atual, com pub/sub minimo para re-renderizar a UI. */
const listeners = new Set();

const state = {
  posto: null,
  loading: true,
  error: null,
  stage: "loading", // loading | intro | mission | question | complete
  dialogueIndex: 0,
  investigated: new Map(),
  activeAnimal: null,
  showQuestion: false,
  lastAnswerCorrect: null,
  score: 0,
};

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}
