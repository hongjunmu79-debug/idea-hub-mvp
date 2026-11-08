"""One paid/live E2E check. Run explicitly; normal tests never spend API credit."""

import asyncio
import json
import os
import sys
from pathlib import Path

import httpx

db_path = Path("/tmp/wandernote-live-e2e.db")
db_path.unlink(missing_ok=True)
os.environ["IDEA_DB_PATH"] = str(db_path)
os.environ["JUDGMENT_PROVIDER"] = "auto"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server.app import app
from server.db import init_db


async def main() -> None:
    init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://wandernote") as client:
        created_response = await client.post(
            "/api/ideas",
            json={
                "content": "Build a five-minute walking reset and test it with five friends this weekend.",
                "source": "text",
                "mood": "Curious",
                "context": "Walk",
                "location": "Riverside",
            },
        )
        created_response.raise_for_status()
        created = created_response.json()
        assert created["verdict_source"] == "deepseek", created

        reviewed = (await client.get("/api/ideas", params={"search": "walking reset"})).json()
        assert len(reviewed) == 1 and reviewed[0]["id"] == created["id"]

        override_response = await client.patch(
            f"/api/ideas/{created['id']}/verdict", json={"verdict": "hold"}
        )
        override_response.raise_for_status()
        overridden = override_response.json()
        assert overridden["user_overridden"] is True

        markdown = "\n".join(
            [
                "# WanderNote — Idea Journal",
                "",
                f"## {overridden['created_at']}",
                "",
                overridden["content"],
                "",
                f"- **Verdict:** {overridden['verdict']}",
                f"- **Reason:** {overridden['verdict_reason']}",
            ]
        )
        assert markdown.startswith("# WanderNote") and overridden["content"] in markdown
        print(json.dumps({
            "created": {"id": created["id"], "verdict": created["verdict"], "reason": created["verdict_reason"], "source": created["verdict_source"]},
            "review_count": len(reviewed),
            "overridden_to": overridden["verdict"],
            "markdown_chars": len(markdown),
        }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
