"""Persistencia minima de progresso/pontuacao (SQLite, sem ORM)."""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "curupira_rally.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT NOT NULL,
    posto_id TEXT NOT NULL,
    pontuacao INTEGER NOT NULL,
    respostas_json TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(SCHEMA)
