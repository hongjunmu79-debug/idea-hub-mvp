import os
import tempfile
from pathlib import Path

db_file = Path(tempfile.gettempdir()) / "wandernote-pytest.db"
db_file.unlink(missing_ok=True)
os.environ["IDEA_DB_PATH"] = str(db_file)
os.environ["JUDGMENT_PROVIDER"] = "local"

import httpx
import pytest

from server.app import app
from server.db import init_db


@pytest.mark.asyncio
async def test_capture_judge_review_override_and_search():
    init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        assert (await client.get("/api/health")).json()["status"] == "ok"

        response = await client.post(
            "/api/ideas",
            json={
                "content": "Build a tiny walking ritual app and test it with five friends this weekend.",
                "source": "text",
                "mood": "Curious",
                "context": "Walk",
                "location": "Riverside",
            },
        )
        assert response.status_code == 201
        idea = response.json()
        assert idea["verdict"] == "action"
        assert idea["verdict_reason"]

        listed = (await client.get("/api/ideas", params={"verdict": "action"})).json()
        assert [item["id"] for item in listed] == [idea["id"]]

        overridden = (await client.patch(
            f"/api/ideas/{idea['id']}/verdict", json={"verdict": "hold"}
        )).json()
        assert overridden["verdict"] == "hold"
        assert overridden["verdict_source"] == "user"
        assert overridden["user_overridden"] is True

        searched = (await client.get("/api/ideas", params={"search": "walking ritual"})).json()
        assert len(searched) == 1
