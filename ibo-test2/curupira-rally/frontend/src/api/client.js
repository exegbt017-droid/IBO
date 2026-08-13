const API_BASE = "";

export async function fetchPosto(postoId) {
  const response = await fetch(`${API_BASE}/api/postos/${postoId}`);
  if (!response.ok) {
    throw new Error(`Posto '${postoId}' nao encontrado (HTTP ${response.status}).`);
  }
  return response.json();
}

export async function sendProgress({ participantId, postoId, pontuacao, respostas }) {
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
