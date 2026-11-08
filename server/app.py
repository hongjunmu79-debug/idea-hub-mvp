from __future__ import annotations

import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .db import connect, init_db, row_to_dict
from .services import judge_idea, transcribe_local, transcribe_openai

Verdict = Literal["action", "hold", "emotion"]


class IdeaCreate(BaseModel):
    content: str = Field(min_length=2, max_length=8000)
    source: Literal["text", "voice"] = "text"
    mood: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=120)
    context: str | None = Field(default=None, max_length=40)


class VerdictUpdate(BaseModel):
    verdict: Verdict
    reason: str | None = Field(default=None, max_length=500)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="WanderNote API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "wandernote-api"}


@app.post("/api/ideas", status_code=201)
async def create_idea(payload: IdeaCreate):
    content = payload.content.strip()
    if len(content) < 2:
        raise HTTPException(422, "Idea is too short")
    judgment = await judge_idea(content)
    with connect() as db:
        cursor = db.execute(
            """
            INSERT INTO ideas(content, source, mood, location, context, verdict, verdict_reason, verdict_source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                content, payload.source, payload.mood or None, payload.location or None,
                payload.context or None, judgment["verdict"], judgment["reason"], judgment["source"],
            ),
        )
        row = db.execute("SELECT * FROM ideas WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_dict(row)


@app.get("/api/ideas")
async def list_ideas(
    verdict: Verdict | None = None,
    search: str | None = Query(default=None, max_length=200),
):
    conditions: list[str] = []
    params: list[str] = []
    if verdict:
        conditions.append("verdict = ?")
        params.append(verdict)
    if search and search.strip():
        conditions.append("(content LIKE ? OR verdict_reason LIKE ? OR mood LIKE ? OR location LIKE ?)")
        needle = f"%{search.strip()}%"
        params.extend([needle] * 4)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    with connect() as db:
        rows = db.execute(f"SELECT * FROM ideas {where} ORDER BY created_at DESC", params).fetchall()
    return [row_to_dict(row) for row in rows]


@app.patch("/api/ideas/{idea_id}/verdict")
async def update_verdict(idea_id: int, payload: VerdictUpdate):
    default_reasons = {
        "action": "You marked this as worth acting on.",
        "hold": "You chose to let this idea rest for now.",
        "emotion": "You recognized this as a feeling to acknowledge.",
    }
    with connect() as db:
        existing = db.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Idea not found")
        reason = payload.reason.strip() if payload.reason and payload.reason.strip() else default_reasons[payload.verdict]
        db.execute(
            """
            UPDATE ideas SET verdict = ?, verdict_reason = ?, verdict_source = 'user',
                user_overridden = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE id = ?
            """,
            (payload.verdict, reason, idea_id),
        )
        row = db.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,)).fetchone()
    return row_to_dict(row)


@app.post("/api/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default="auto"),
):
    allowed = {"audio/webm", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/ogg"}
    content_type = (audio.content_type or "").split(";")[0]
    if content_type not in allowed:
        raise HTTPException(415, f"Unsupported audio type: {content_type or 'unknown'}")
    max_bytes = 25 * 1024 * 1024
    contents = await audio.read(max_bytes + 1)
    if len(contents) > max_bytes:
        raise HTTPException(413, "Recording exceeds the 25 MB limit")
    if not contents:
        raise HTTPException(422, "Recording is empty")

    provider = os.getenv("STT_PROVIDER", "local").lower()
    if provider == "openai":
        import io
        try:
            return await transcribe_openai(io.BytesIO(contents), audio.filename or "recording.webm", content_type, language)
        except Exception as exc:
            raise HTTPException(502, f"OpenAI transcription failed: {exc}") from exc

    suffix = Path(audio.filename or ".webm").suffix or ".webm"
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(prefix="wandernote-", suffix=suffix, delete=False) as temp:
            temp.write(contents)
            temp_path = Path(temp.name)
        # faster-whisper/ctranslate2 owns its native worker threads. Calling it
        # directly avoids nested executor deadlocks seen on some constrained hosts.
        return transcribe_local(temp_path, language)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(503, f"Local transcription failed: {exc}") from exc
    finally:
        if temp_path:
            temp_path.unlink(missing_ok=True)
