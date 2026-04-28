from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from agents.backend_manager import get_backend_manager
from agents.local_intelligence import ScraperRecord, get_local_store
from api.dependencies import UserContext, get_user_context

router = APIRouter()


class IngestPathRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Archivo o carpeta local con salidas de scrapers.")
    recursive: bool = True
    max_records: int | None = Field(default=None, ge=1, le=100_000)


class IngestRecordsRequest(BaseModel):
    records: list[dict[str, Any]] = Field(..., min_length=1, max_length=10_000)
    default_source: str = "api"


class LocalSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    k: int = Field(default=8, ge=1, le=50)
    domain: str | None = None


class LocalChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=4000)
    k: int = Field(default=8, ge=1, le=30)
    domain: str | None = None
    use_llm: bool = True
    allow_tools: bool = True


class ManagerChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=6000)
    k: int = Field(default=10, ge=1, le=30)
    provider: str | None = Field(default=None, description="ollama, openai, anthropic o stub")
    repo: str | None = None
    domain: str | None = None
    use_llm: bool = True
    include_project_context: bool = True


class ReindexGitsRequest(BaseModel):
    max_file_bytes: int = Field(default=750_000, ge=10_000, le=5_000_000)
    max_chars_per_file: int = Field(default=80_000, ge=2_000, le=500_000)
    max_files_per_repo: int | None = Field(default=None, ge=1, le=100_000)
    docs_only: bool = False


@router.get("/health")
def ai_health(ctx: UserContext = Depends(get_user_context)) -> dict[str, Any]:
    store = get_local_store()
    summary = store.ontology_summary()
    return {
        "status": "ok",
        "tenant_id": ctx.tenant_id,
        "store_path": summary["store_path"],
        "documents": summary["documents"],
        "nodes": summary["nodes"],
    }


@router.post("/ingest/path")
def ingest_path(payload: IngestPathRequest, ctx: UserContext = Depends(get_user_context)) -> dict[str, Any]:
    _ = ctx
    store = get_local_store()
    result = store.ingest_path(payload.path, recursive=payload.recursive, max_records=payload.max_records)
    return asdict(result)


@router.post("/ingest/records")
def ingest_records(payload: IngestRecordsRequest, ctx: UserContext = Depends(get_user_context)) -> dict[str, Any]:
    _ = ctx
    records = []
    for row in payload.records:
        text = str(row.get("text") or row.get("texto") or row.get("body_text") or row.get("content") or "")
        title = str(row.get("title") or row.get("titular") or row.get("titulo") or "")
        if not text and not title:
            continue
        records.append(
            ScraperRecord(
                source=str(row.get("source") or row.get("fuente") or payload.default_source),
                title=title,
                text=text or title,
                url=str(row.get("url") or ""),
                published_at=str(row.get("published_at") or row.get("fecha_publicacion") or "")
                or None,
                raw=row,
            )
        )
    store = get_local_store()
    result = store.ingest_records(records)
    return asdict(result)


@router.post("/search")
def local_search(payload: LocalSearchRequest, ctx: UserContext = Depends(get_user_context)) -> list[dict[str, Any]]:
    _ = ctx
    store = get_local_store()
    return store.search(payload.query, k=payload.k, domain=payload.domain)


@router.post("/chat")
def local_chat(payload: LocalChatRequest, ctx: UserContext = Depends(get_user_context)) -> dict[str, Any]:
    _ = ctx
    store = get_local_store()
    result = store.chat(
        payload.question,
        k=payload.k,
        domain=payload.domain,
        use_llm=payload.use_llm,
        allow_tools=payload.allow_tools,
    )
    return asdict(result)


@router.get("/manager/status")
def manager_status(
    provider: str | None = None,
    ctx: UserContext = Depends(get_user_context),
) -> dict[str, Any]:
    _ = ctx
    return get_backend_manager(provider=provider, use_llm=False).status()


@router.post("/manager/chat")
def manager_chat(payload: ManagerChatRequest, ctx: UserContext = Depends(get_user_context)) -> dict[str, Any]:
    _ = ctx
    result = get_backend_manager(provider=payload.provider, use_llm=payload.use_llm).chat(
        payload.question,
        k=payload.k,
        repo=payload.repo,
        domain=payload.domain,
        include_project_context=payload.include_project_context,
    )
    return asdict(result)


@router.post("/manager/reindex-gits")
def manager_reindex_gits(payload: ReindexGitsRequest, ctx: UserContext = Depends(get_user_context)) -> dict[str, Any]:
    _ = ctx
    return get_backend_manager(use_llm=False).reindex_gits(
        max_file_bytes=payload.max_file_bytes,
        max_chars_per_file=payload.max_chars_per_file,
        max_files_per_repo=payload.max_files_per_repo,
        docs_only=payload.docs_only,
    )


@router.get("/manager/ui", response_class=HTMLResponse)
def manager_ui() -> str:
    return """
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Politeia Backend Manager</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0b1020; color: #e5edf7; }
    main { max-width: 980px; margin: 0 auto; padding: 28px 18px; }
    h1 { margin: 0 0 4px; font-size: 26px; }
    p { color: #9fb0c7; }
    textarea { width: 100%; min-height: 118px; box-sizing: border-box; resize: vertical; border: 1px solid #263247; border-radius: 8px; padding: 12px; background: #101827; color: #e5edf7; font-size: 15px; }
    button, select { border: 1px solid #2f405c; border-radius: 8px; background: #162237; color: #e5edf7; padding: 9px 12px; font-size: 14px; }
    button { background: #0ea5e9; border-color: #38bdf8; color: #04111d; font-weight: 700; cursor: pointer; }
    .row { display: flex; gap: 10px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
    .answer, .meta { white-space: pre-wrap; background: #111827; border: 1px solid #263247; border-radius: 8px; padding: 14px; margin-top: 14px; }
    .meta { color: #9fb0c7; font-size: 13px; max-height: 260px; overflow: auto; }
  </style>
</head>
<body>
  <main>
    <h1>Politeia Backend Manager</h1>
    <p>Chatbot local con memoria de <code>gits amigos</code>, backend actual y LLM vía Ollama/OpenAI/Anthropic.</p>
    <textarea id="q" placeholder="Pregunta qué backend montar, qué repo de gits amigos usar o cómo integrar un scraper..."></textarea>
    <div class="row">
      <select id="provider">
        <option value="ollama">Ollama local</option>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="stub">Sin LLM</option>
      </select>
      <label><input id="use_llm" type="checkbox" checked /> usar LLM</label>
      <button id="send">Preguntar</button>
    </div>
    <div id="answer" class="answer">Listo.</div>
    <div id="meta" class="meta"></div>
  </main>
  <script>
    const $ = (id) => document.getElementById(id);
    $("send").onclick = async () => {
      $("answer").textContent = "Analizando...";
      $("meta").textContent = "";
      const res = await fetch("/ai/manager/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          question: $("q").value,
          provider: $("provider").value,
          use_llm: $("use_llm").checked,
          k: 10,
          include_project_context: true
        })
      });
      const data = await res.json();
      $("answer").textContent = data.answer || JSON.stringify(data, null, 2);
      $("meta").textContent = JSON.stringify({model: data.model, provider: data.provider, used_llm: data.used_llm, citations: data.citations}, null, 2);
    };
  </script>
</body>
</html>
"""


@router.get("/ontology/summary")
def ontology_summary(ctx: UserContext = Depends(get_user_context)) -> dict[str, Any]:
    _ = ctx
    return get_local_store().ontology_summary()


@router.get("/search")
def local_search_get(
    q: str = Query(..., min_length=2, max_length=1000),
    k: int = Query(default=8, ge=1, le=50),
    domain: str | None = None,
    ctx: UserContext = Depends(get_user_context),
) -> list[dict[str, Any]]:
    _ = ctx
    return get_local_store().search(q, k=k, domain=domain)
