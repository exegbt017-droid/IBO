/** Le o ID do posto a partir da URL, ex: /posto/01 -> "01". Sem posto na URL, cai no posto 01. */
export function getPostoIdFromUrl() {
  const match = window.location.pathname.match(/\/posto\/([^/]+)/);
  return match ? match[1] : "01";
}
