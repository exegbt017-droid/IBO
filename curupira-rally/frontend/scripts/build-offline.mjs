/**
 * Gera um arquivo .html autossuficiente por posto.
 *
 * O arquivo carrega a experiencia inteira (cena 3D, Curupira, animais,
 * desafios) sem servidor e sem internet: o conteudo do posto vai embutido
 * na pagina e o codigo/estilo sao inlinados. Serve como plano B em campo,
 * onde a conexao pode faltar — basta abrir o arquivo no navegador.
 *
 * Uso: node scripts/build-offline.mjs   (rodar depois de `npm run build`)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..");
const BACKEND = join(FRONTEND, "..", "backend");
const WEB_DIR = join(BACKEND, "app", "static", "web");
const CONTENT = join(BACKEND, "app", "content");
const OUT_DIR = join(FRONTEND, "..", "offline");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Mesma expansao que o backend faz em GET /api/postos/{id}. */
function buildPosto(postoFile, animals) {
  const posto = readJson(join(CONTENT, "postos", postoFile));
  const byId = new Map(animals.map((a) => [a.id, a]));

  for (const entry of posto.animais ?? []) {
    const animal = byId.get(entry.animal_id);
    if (!animal) {
      throw new Error(`Animal '${entry.animal_id}' nao existe em animals.json`);
    }
    entry.animal = animal;
  }
  return posto;
}

function assetContents() {
  const assetsDir = join(WEB_DIR, "assets");
  const files = readdirSync(assetsDir);

  const jsFile = files.find((f) => f.endsWith(".js"));
  const cssFile = files.find((f) => f.endsWith(".css"));
  if (!jsFile || !cssFile) {
    throw new Error("Build nao encontrado. Rode `npm run build` antes.");
  }

  const js = readFileSync(join(assetsDir, jsFile), "utf8");
  // Sem rede a fonte remota nao carrega, entao nem chega a ser pedida; a pilha
  // de fallback da propria folha de estilo cobre a tipografia.
  // Cobre as duas formas: `@import url("...")` e a minificada `@import"..."`.
  const css = readFileSync(join(assetsDir, cssFile), "utf8")
    .replace(/@import\s*(url\()?\s*["'][^"']*["']\s*\)?\s*;?/g, "");

  if (css.includes("fonts.googleapis.com")) {
    throw new Error("Sobrou referencia a fonte remota no CSS offline.");
  }

  return { js, css };
}

const animals = readJson(join(CONTENT, "animals.json"));
const { js, css } = assetContents();
const postoFiles = readdirSync(join(CONTENT, "postos")).filter((f) => f.endsWith(".json"));

mkdirSync(OUT_DIR, { recursive: true });

for (const postoFile of postoFiles) {
  const posto = buildPosto(postoFile, animals);
  const nome = posto.nome?.["pt-BR"] ?? `Posto ${posto.id}`;

  const html = `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Curupira Rally — ${nome}</title>
<style>${css}</style>
</head>
<body>
<div id="app">
  <canvas id="scene-canvas"></canvas>
  <div id="overlay"></div>
</div>
<script>window.__CURUPIRA_POSTO__ = ${JSON.stringify(posto)};</script>
<script type="module">${js}</script>
</body>
</html>
`;

  const outFile = join(OUT_DIR, `posto-${posto.id}.html`);
  writeFileSync(outFile, html, "utf8");
  console.log(`gerado: offline/posto-${posto.id}.html  (${(html.length / 1024).toFixed(0)} KB)`);
}
