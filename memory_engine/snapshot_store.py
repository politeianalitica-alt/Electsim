"""Snapshot store — captures point-in-time state of any module."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from .schemas import Snapshot

_SNAPSHOTS: dict[str, list[Snapshot]] = {}


def capture_snapshot(
    tenant_id: str,
    name: str,
    description: str,
    captured_by: str,
    data: dict[str, Any],
    tags: list[str] | None = None,
) -> Snapshot:
    """Capture a point-in-time snapshot."""

    snap = Snapshot(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        name=name,
        description=description,
        captured_at=datetime.utcnow(),
        captured_by=captured_by,
        data=data,
        tags=tags or [],
    )
    _SNAPSHOTS.setdefault(tenant_id, []).append(snap)
    return snap


def get_snapshot(snapshot_id: str) -> Snapshot | None:
    """Find a snapshot by id across tenants."""

    for snaps in _SNAPSHOTS.values():
        for s in snaps:
            if s.id == snapshot_id:
                return s
    return None


def list_snapshots(
    tenant_id: str, tag: str | None = None, limit: int = 20
) -> list[Snapshot]:
    """List snapshots for a tenant, optionally filtered by tag."""

    items = _SNAPSHOTS.get(tenant_id, [])
    if tag is not None:
        items = [s for s in items if tag in s.tags]
    items = sorted(items, key=lambda s: s.captured_at, reverse=True)
    return items[:limit]


def compare_snapshots(snapshot_id_a: str, snapshot_id_b: str) -> dict:
    """Diff two snapshots; returns {added, removed, changed}."""

    a = get_snapshot(snapshot_id_a)
    b = get_snapshot(snapshot_id_b)
    if a is None or b is None:
        return {"added": {}, "removed": {}, "changed": {}, "error": "snapshot_not_found"}

    keys_a = set(a.data.keys())
    keys_b = set(b.data.keys())
    added = {k: b.data[k] for k in keys_b - keys_a}
    removed = {k: a.data[k] for k in keys_a - keys_b}
    changed = {
        k: {"before": a.data[k], "after": b.data[k]}
        for k in keys_a & keys_b
        if a.data[k] != b.data[k]
    }
    return {"added": added, "removed": removed, "changed": changed}


def delete_snapshot(snapshot_id: str) -> bool:
    """Delete a snapshot by id."""

    for tenant_id, snaps in _SNAPSHOTS.items():
        for i, s in enumerate(snaps):
            if s.id == snapshot_id:
                del _SNAPSHOTS[tenant_id][i]
                return True
    return False
