from pathlib import Path

import pytest

from server.app import transcribe


class InMemoryUpload:
    def __init__(self, path: Path):
        self.filename = path.name
        self.content_type = "audio/wav"
        self._data = path.read_bytes()

    async def read(self, _: int) -> bytes:
        return self._data


@pytest.mark.asyncio
async def test_real_local_whisper_transcription():
    """Set WANDERNOTE_STT_SAMPLE to a real WAV/WebM file to run this integration test."""
    import os

    sample = os.getenv("WANDERNOTE_STT_SAMPLE")
    if not sample:
        pytest.skip("Set WANDERNOTE_STT_SAMPLE to run real audio transcription")
    path = Path(sample)
    payload = await transcribe(audio=InMemoryUpload(path), language="en")
    assert payload["provider"] == "local-whisper"
    assert "country" in payload["text"].lower()
