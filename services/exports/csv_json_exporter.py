from __future__ import annotations

import csv
import io
import json
from datetime import date, datetime
from typing import Any


def _json_default(o: Any) -> Any:
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    try:
        return str(o)
    except Exception:  # noqa: BLE001
        return None


def export_to_json(data: dict, pretty: bool = True) -> bytes:
    try:
        if pretty:
            text = json.dumps(data, indent=2, ensure_ascii=False, default=_json_default)
        else:
            text = json.dumps(data, ensure_ascii=False, default=_json_default)
    except Exception as e:  # noqa: BLE001
        text = json.dumps({"error": str(e)}, ensure_ascii=False)
    return text.encode("utf-8")


def export_to_csv(data: dict, table_key: str = "table") -> bytes:
    rows: list[dict[str, Any]] = []
    candidate = data.get(table_key)
    if isinstance(candidate, list) and candidate and isinstance(candidate[0], dict):
        rows = candidate
    else:
        # search the first list-of-dicts
        for v in data.values():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                rows = v
                break

    buf = io.StringIO()
    if not rows:
        buf.write("(sin datos)\n")
    else:
        cols = list(rows[0].keys())
        writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        for r in rows:
            clean = {k: (v if not isinstance(v, (dict, list)) else json.dumps(v, ensure_ascii=False, default=_json_default)) for k, v in r.items()}
            writer.writerow(clean)

    # UTF-8 with BOM
    return b"\xef\xbb\xbf" + buf.getvalue().encode("utf-8")
