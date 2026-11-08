from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.getenv("IDEA_DB_PATH", ROOT / "data" / "ideas.db"))


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                source TEXT NOT NULL CHECK(source IN ('text', 'voice')),
                mood TEXT,
                location TEXT,
                context TEXT,
                verdict TEXT NOT NULL CHECK(verdict IN ('action', 'hold', 'emotion')),
                verdict_reason TEXT NOT NULL,
                verdict_source TEXT NOT NULL DEFAULT 'local',
                user_overridden INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            )
            """
        )
        db.execute("CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_ideas_verdict ON ideas(verdict)")


@contextmanager
def connect():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("PRAGMA journal_mode = WAL")
    try:
        yield db
        db.commit()
    finally:
        db.close()


def row_to_dict(row: sqlite3.Row) -> dict:
    item = dict(row)
    item["user_overridden"] = bool(item["user_overridden"])
    return item

