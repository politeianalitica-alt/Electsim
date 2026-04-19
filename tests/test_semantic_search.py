from __future__ import annotations

from agents import semantic_search as ss


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows

    def mappings(self):
        return self

    def all(self):
        return self._rows


class _FakeSession:
    def __init__(self):
        self.calls = []

    def execute(self, sql, params=None):
        text_sql = str(sql)
        self.calls.append((text_sql, params))
        if "information_schema.columns" in text_sql:
            return _FakeResult([("embedding",), ("tenant_id",)])
        return _FakeResult(
            [
                {
                    "id": 1,
                    "texto": "mensaje sobre vivienda",
                    "plataforma": "twitter",
                    "partido_id": 10,
                    "fecha_publicacion": None,
                    "distance": 0.2,
                }
            ]
        )


class _FakeEmbedClient:
    def embed_text(self, _: str):
        return [0.1] * 1536


def test_semantic_search_applies_tenant_and_filters(monkeypatch):
    monkeypatch.setattr(ss, "get_embedding_client", lambda: _FakeEmbedClient())
    monkeypatch.setattr(ss, "_SCHEMA_VALIDATED", False)

    session = _FakeSession()
    out = ss.semantic_search_posts(
        session,
        "vivienda asequible",
        tenant_id="tenant-a",
        limit=5,
        filters={"plataforma": "twitter", "partido_id": 10, "q": "vivienda"},
    )

    assert len(out) == 1
    _, params = session.calls[-1]
    assert params["tenant_id"] == "tenant-a"
    assert params["f_plataforma"] == "twitter"
    assert params["f_partido_id"] == 10
    assert params["ts_query"] == "vivienda"
    assert out[0]["score"] == 0.8
