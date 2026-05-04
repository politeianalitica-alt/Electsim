"""
Schemas Pydantic del Politeia Brain Core.

EvidenceItem       → una fuente de evidencia (BOE, Congreso, Media…)
EvidencePack       → conjunto de evidencias + metadata de la respuesta
BrainContext       → contexto enriquecido pasado al LLM
AgentRunRequest    → solicitud de ejecución de un agente
AgentRunResult     → resultado de ejecución con evidencias y trazabilidad
ToolCallRecord     → registro de llamada a una herramienta
ModelRoute         → ruta modelo → provider/model/params
RAGDocumentRef     → referencia a documento indexado en el vector store
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Iterator

from pydantic import BaseModel, Field


# ── EvidenceItem ──────────────────────────────────────────────────────────────

class EvidenceItem(BaseModel):
    """Una pieza de evidencia recuperada (RAG, tool, BD)."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    object_type: str                          # "legal_item" | "media_item" | "narrative" | …
    object_id: str                            # id o source_id del objeto
    title: str
    source: str                               # "boe" | "congreso" | "El País" | …
    url: str | None = None
    published_at: datetime | None = None
    snippet: str = ""                         # fragmento relevante
    score: float | None = None               # relevancia semántica [0,1]
    domain: str | None = None               # "legislativo" | "medios" | …
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


# ── EvidencePack ─────────────────────────────────────────────────────────────

class EvidencePack(BaseModel):
    """Conjunto de evidencias + metadatos de una respuesta del Brain."""
    query: str
    evidence: list[EvidenceItem] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    model_used: str = ""
    provider: str = ""
    confidence: float = 0.0               # [0, 1]
    warnings: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def n_sources(self) -> int:
        return len(self.evidence)

    def to_markdown(self) -> str:
        """Resumen Markdown de las fuentes para mostrar en UI."""
        if not self.evidence:
            return "_Sin fuentes recuperadas._"
        lines = ["**Fuentes usadas:**"]
        for ev in self.evidence[:8]:
            line = f"- **{ev.source}** — {ev.title[:80]}"
            if ev.url:
                line += f" [↗]({ev.url})"
            lines.append(line)
        if len(self.evidence) > 8:
            lines.append(f"- _… y {len(self.evidence) - 8} más_")
        return "\n".join(lines)


# ── BrainContext ──────────────────────────────────────────────────────────────

class BrainContext(BaseModel):
    """Contexto enriquecido pasado al LLM antes de responder."""
    user_question: str = ""
    module: str = "general"               # "legislativo" | "medios" | "actores" | …
    dashboard_state: dict[str, Any] = Field(default_factory=dict)
    retrieved_evidence: list[EvidenceItem] = Field(default_factory=list)
    selected_objects: list[dict[str, Any]] = Field(default_factory=list)
    active_alerts: list[dict[str, Any]] = Field(default_factory=list)
    recent_legal_items: list[dict[str, Any]] = Field(default_factory=list)
    recent_media_items: list[dict[str, Any]] = Field(default_factory=list)
    narrative_clusters: list[dict[str, Any]] = Field(default_factory=list)
    system_state: dict[str, Any] = Field(default_factory=dict)
    token_budget: int = 6000              # tokens estimados disponibles para contexto

    def to_prompt_string(self) -> str:
        """Serializa el contexto a texto para el prompt del LLM."""
        parts: list[str] = []

        if self.active_alerts:
            parts.append("## Alertas activas")
            for a in self.active_alerts[:5]:
                parts.append(f"- {a.get('titulo', a.get('title', '—'))}: {a.get('nivel', '')}")

        if self.recent_legal_items:
            parts.append(f"\n## BOE / Legislativo reciente ({len(self.recent_legal_items)} items)")
            for li in self.recent_legal_items[:8]:
                parts.append(f"- [{li.get('impact_level','—')}] {li.get('title', li.get('titulo',''))[:100]}")

        if self.recent_media_items:
            parts.append(f"\n## Noticias recientes ({len(self.recent_media_items)} items)")
            for mi in self.recent_media_items[:8]:
                parts.append(f"- {mi.get('source','')}: {mi.get('title','')[:100]}")

        if self.narrative_clusters:
            parts.append(f"\n## Narrativas activas ({len(self.narrative_clusters)})")
            for nc in self.narrative_clusters[:5]:
                parts.append(f"- {nc.get('nombre', nc.get('cluster_id',''))}: volumen {nc.get('volume',0)}")

        if self.retrieved_evidence:
            parts.append(f"\n## Evidencias recuperadas por RAG ({len(self.retrieved_evidence)})")
            for ev in self.retrieved_evidence[:6]:
                parts.append(f"- [{ev.object_type}] {ev.title[:80]} — {ev.snippet[:120]}")

        return "\n".join(parts) or "_Sin contexto adicional._"


# ── AgentRunRequest ───────────────────────────────────────────────────────────

class AgentRunRequest(BaseModel):
    """Solicitud de ejecución de un agente tipado."""
    agent_name: str
    task: str
    module: str = "general"
    input_objects: list[str] = Field(default_factory=list)
    user_context: dict[str, Any] = Field(default_factory=dict)
    allow_tools: bool = True
    allow_rag: bool = True
    mode: str = "normal"              # "fast" | "normal" | "deep"
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── AgentRunResult ────────────────────────────────────────────────────────────

class AgentRunResult(BaseModel):
    """Resultado completo y trazable de una ejecución de agente."""
    run_id: str
    agent_name: str
    task: str
    module: str = "general"
    answer: str
    structured_output: dict[str, Any] | None = None
    evidence_pack: EvidencePack
    tools_used: list[str] = Field(default_factory=list)
    model_used: str = ""
    provider: str = ""
    confidence: float = 0.0
    latency_ms: int = 0
    status: str = "completed"
    error: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── ToolCallRecord ────────────────────────────────────────────────────────────

class ToolCallRecord(BaseModel):
    """Registro de una llamada a una herramienta."""
    run_id: str
    tool_name: str
    input: dict[str, Any] = Field(default_factory=dict)
    output: Any = None
    status: str = "ok"
    error: str | None = None
    latency_ms: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── ModelRoute ────────────────────────────────────────────────────────────────

class ModelRoute(BaseModel):
    """Ruta de modelo para un task_type dado."""
    task_type: str
    provider: str                   # "ollama" | "anthropic" | "openai" | "litellm"
    model: str
    fallback_provider: str | None = None
    fallback_model: str | None = None
    params: dict[str, Any] = Field(default_factory=dict)


# ── RAGDocumentRef ────────────────────────────────────────────────────────────

class RAGDocumentRef(BaseModel):
    """Referencia a un documento indexado en el vector store."""
    object_type: str
    object_id: str
    domain: str
    collection: str
    title: str | None = None
    source: str | None = None
    url: str | None = None
    text_hash: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    indexed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
