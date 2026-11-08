from __future__ import annotations

import json
import os
import re
import threading
from pathlib import Path
from typing import BinaryIO

import httpx

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = Path("/mnt/d/hermes-agents/director/hermes-home/.env")
_model = None
_model_lock = threading.Lock()


def _read_secret(name: str) -> str | None:
    if value := os.getenv(name):
        return value
    configured = os.getenv("IDEA_ENV_FILE")
    candidates = [Path(configured)] if configured else [ROOT / ".env", DEFAULT_ENV_FILE]
    for env_file in candidates:
        if not env_file.is_file():
            continue
        try:
            for raw_line in env_file.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key.strip() == name:
                    return value.strip().strip('"').strip("'") or None
        except OSError:
            continue
    return None


def _extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.I)
    match = re.search(r"\{.*\}", text, flags=re.S)
    if not match:
        raise ValueError("Model response did not contain JSON")
    return json.loads(match.group(0))


def _local_judgment(content: str) -> dict:
    lowered = content.lower()
    is_chinese = bool(re.search(r"[\u3400-\u9fff]", content))
    emotion_words = (
        "feel ", "felt ", "feeling", "angry", "anxious", "sad", "lonely", "happy",
        "tired", "overwhelmed", "难过", "焦虑", "生气", "孤独", "开心", "疲惫", "情绪",
    )
    action_words = (
        "build", "make", "try", "test", "call", "write", "start", "create", "ask",
        "launch", "prototype", "做一个", "试试", "联系", "写", "开始", "创建", "验证", "原型",
    )
    question_or_vague = len(content.strip()) < 18 or content.rstrip().endswith(("?", "？"))
    if any(word in lowered for word in emotion_words):
        return {
            "verdict": "emotion",
            "reason": "这更像是一种值得被看见的感受。先让它安顿下来，不必急着变成任务。" if is_chinese else "This reads mainly as a feeling worth acknowledging. Let it settle before turning it into a task.",
            "source": "local",
        }
    if any(word in lowered for word in action_words) and not question_or_vague:
        return {
            "verdict": "action",
            "reason": "这里已经有了具体方向，也能用一个小步骤验证。趁想法还新鲜，把下一步也记下来。" if is_chinese else "There is a concrete direction here and a small next step can test it. Capture that step while the idea is fresh.",
            "source": "local",
        }
    return {
        "verdict": "hold",
        "reason": "这个念头有潜力，但结果或下一步还不够清楚。先收好，等有更多线索时再回来看看。" if is_chinese else "The thought has potential, but the outcome or next step is still unclear. Keep it and revisit with more context.",
        "source": "local",
    }


async def judge_idea(content: str) -> dict:
    """Use DeepSeek when configured; fall back transparently to local rules."""
    provider = os.getenv("JUDGMENT_PROVIDER", "auto").lower()
    api_key = _read_secret("DEEPSEEK_API_KEY")
    if provider == "local" or not api_key:
        return _local_judgment(content)

    model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash-vision-exp")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1").rstrip("/")
    prompt = (
        "Classify this captured walking thought. Return JSON only with keys verdict and reason. "
        "verdict must be action, hold, or emotion. action means concrete and worth a small test; "
        "hold means interesting but underspecified; emotion means primarily emotional processing. "
        "reason must be supportive, specific, and at most two short sentences. "
        "Write the reason in the same language as the thought. Thought: " + content
    )
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a concise idea triage companion."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 180,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
        result = _extract_json(response.json()["choices"][0]["message"]["content"])
        verdict = result.get("verdict")
        reason = str(result.get("reason", "")).strip()
        if verdict not in {"action", "hold", "emotion"} or not reason:
            raise ValueError("Invalid classification payload")
        return {"verdict": verdict, "reason": reason, "source": "deepseek"}
    except (httpx.HTTPError, KeyError, ValueError, TypeError, json.JSONDecodeError):
        fallback = _local_judgment(content)
        fallback["source"] = "local-fallback"
        return fallback


def _get_whisper_model():
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            from faster_whisper import WhisperModel

            name = os.getenv("WHISPER_MODEL", "base")
            device = os.getenv("WHISPER_DEVICE", "cpu")
            compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8" if device == "cpu" else "float16")
            cache_dir = os.getenv("WHISPER_CACHE_DIR")
            kwargs = {"device": device, "compute_type": compute_type}
            if cache_dir:
                kwargs["download_root"] = cache_dir
            _model = WhisperModel(name, **kwargs)
    return _model


def transcribe_local(path: Path, language: str | None = None) -> dict:
    model = _get_whisper_model()
    segments, info = model.transcribe(
        str(path),
        language=None if language in (None, "", "auto") else language,
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
    )
    text = " ".join(segment.text.strip() for segment in segments).strip()
    if not text:
        raise ValueError("No speech was detected in the recording")
    return {"text": text, "language": info.language, "provider": "local-whisper"}


async def transcribe_openai(file: BinaryIO, filename: str, content_type: str, language: str | None) -> dict:
    api_key = _read_secret("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    data = {"model": os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1")}
    if language not in (None, "", "auto"):
        data["language"] = language
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            data=data,
            files={"file": (filename, file, content_type)},
        )
        response.raise_for_status()
    payload = response.json()
    return {"text": payload["text"].strip(), "language": language or "auto", "provider": "openai"}
