const API_BASE = "";

/**
 * Conteudo embutido na propria pagina (build offline, um arquivo .html por
 * posto). Existindo, o posto roda sem servidor e sem internet — util como
 * plano B em campo, onde a conexao pode falhar.
 */
function embeddedPosto() {
  return typeof window !== "undefined" ? window.__CURUPIRA_POSTO__ : undefined;
}

export function isOffline() {
  return embeddedPosto() !== undefined;
}

export async function fetchPosto(postoId) {
  const embedded = embeddedPosto();
  if (embedded) return embedded;

  const response = await fetch(`${API_BASE}/api/postos/${postoId}`);
  if (!response.ok) {
    throw new Error(`Posto '${postoId}' nao encontrado (HTTP ${response.status}).`);
  }
  return response.json();
}

export async function sendProgress({ participantId, postoId, pontuacao, respostas }) {
  // No modo offline nao ha servidor para receber: o progresso fica no aparelho.
  if (isOffline()) {
    localStorage.setItem(
      `curupira_progresso_${postoId}`,
      JSON.stringify({ participantId, pontuacao, respostas, em: new Date().toISOString() })
    );
    return;
  }

  try {
    await fetch(`${API_BASE}/api/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: participantId,
        posto_id: postoId,
        pontuacao,
        respostas,
      }),
    });
  } catch {
    // Best-effort: sem conexao no local do evento, o progresso fica so local (localStorage).
  }
}

export function getParticipantId() {
  let id = localStorage.getItem("curupira_participant_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("curupira_participant_id", id);
  }
  return id;
}
