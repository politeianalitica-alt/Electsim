"""
JSON-on-disk briefing store for development.
Saves and loads BriefingDocument objects as JSON files.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from api.schemas.briefings import BriefingDocument, BriefingListItem

STORE_DIR = Path(__file__).parent.parent.parent / "data" / "outputs" / "briefings"


def _ensure_store() -> None:
    STORE_DIR.mkdir(parents=True, exist_ok=True)


def save_briefing(briefing: BriefingDocument) -> None:
    _ensure_store()
    path = STORE_DIR / f"{briefing.id}.json"
    path.write_text(briefing.model_dump_json(indent=2), encoding="utf-8")


def load_briefing(briefing_id: str) -> BriefingDocument | None:
    _ensure_store()
    path = STORE_DIR / f"{briefing_id}.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return BriefingDocument.model_validate(data)
    except Exception:
        return None


def list_saved_briefings(workspace_id: str | None = None, limit: int = 20) -> list[BriefingListItem]:
    _ensure_store()
    items: list[BriefingListItem] = []
    files = sorted(STORE_DIR.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
    for f in files:
        if len(items) >= limit:
            break
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            doc = BriefingDocument.model_validate(data)
            if workspace_id and doc.workspace_id != workspace_id:
                continue
            items.append(BriefingListItem(
                id=doc.id,
                title=doc.title,
                briefing_type=doc.briefing_type,
                audience=doc.audience,
                generated_at=doc.generated_at,
                mode=doc.mode,
                workspace_id=doc.workspace_id,
                client_id=doc.client_id,
                period=doc.period,
                summary_preview=doc.executive_summary[:200],
            ))
        except Exception:
            continue
    return items
