/**
 * Baixa as fontes do projeto e gera src/ui/fonts.css com as fontes embutidas
 * (data URI), eliminando a dependencia de CDN.
 *
 * Motivo: no evento a conexao pode faltar, e o build offline (um .html por
 * posto) precisa manter a identidade visual sem rede. Rodar so quando as
 * fontes mudarem — o arquivo gerado fica versionado.
 *
 * Uso: node scripts/fetch-fonts.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "src", "ui", "fonts.css");

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700&family=Nunito:wght@400;600;800&display=swap";

// Navegador moderno para receber woff2 (o mais leve).
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

// Cada @font-face vem precedido por um comentario com o nome do subset.
// So o subset "latin" e necessario: ele cobre os acentos de portugues e
// espanhol (a-til, c-cedilha, n-til, agudos, circunflexos).
const blocks = css.split("/*").slice(1);
const wanted = blocks.filter((b) => /^\s*latin\s*\*\//.test(b));

if (wanted.length === 0) throw new Error("Nenhum subset latin encontrado no CSS das fontes.");

let out =
  "/* Gerado por scripts/fetch-fonts.mjs — nao editar a mao.\n" +
  "   Fontes embutidas para o projeto funcionar sem internet. */\n";

for (const block of wanted) {
  const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
  if (!url) continue;

  const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
  const dataUri = `data:font/woff2;base64,${buffer.toString("base64")}`;

  const face = "@font-face {" + block.slice(block.indexOf("{") + 1);
  out += face.replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(${dataUri})`).trim() + "\n";
}

writeFileSync(OUT, out, "utf8");
console.log(`gerado: src/ui/fonts.css (${(out.length / 1024).toFixed(0)} KB, ${wanted.length} faces)`);
