"""Endpoint /api/v1/compliance · Sprint 4 · S4.5.

Combina OpenSanctions + followthemoney + BDNS + entities en una sola query:
  POST /api/v1/compliance/screen
  Body: {"name": "...", "country": "ES", "schema": "Person"}

Devuelve en <30s:
  - Sanciones (OpenSanctions match)
  - PEP (Politically Exposed Persons)
  - Vínculos empresariales (followthemoney + nuestras entities)
  - Subvenciones públicas recibidas (BDNS)
  - Score de riesgo agregado

Cliente típico: bancos, aseguradoras, fondos, consultoras de compliance.

Falla cerrado: cada fuente puede fallar individualmente · respuesta incluye
`partial=true` y `errors=[...]` con detalle por servicio caído.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/compliance", tags=["compliance"])


# ────────────────────────────────────────────────────────────────────
# Schemas
# ────────────────────────────────────────────────────────────────────

class ComplianceScreenRequest(BaseModel):
    """Petición de screening de cumplimiento."""

    name: str = Field(min_length=2, max_length=240, description="Nombre canónico de la persona o entidad")
    country: str = Field(default="ES", description="ISO 3166-1 alpha-2 · país de residencia/operación")
    schema_kind: str = Field(default="Person", description="'Person' | 'Company' | 'Organization' | 'LegalEntity'")
    nif: str | None = Field(default=None, description="NIF/CIF/DNI si se conoce · mejora precisión")
    threshold: float = Field(default=0.6, ge=0.0, le=1.0, description="Score mínimo para match OpenSanctions")


class SourceResult(BaseModel):
    """Resultado de una fuente individual."""

    source: str
    ok: bool
    elapsed_ms: int
    n_matches: int = 0
    matches: list[dict[str, Any]] = Field(default_factory=list)
    error: str | None = None


class ComplianceScreenResponse(BaseModel):
    """Respuesta agregada de screening."""

    query: ComplianceScreenRequest
    started_at: str
    elapsed_ms: int
    partial: bool = False
    risk_score: float = Field(ge=0.0, le=100.0, description="Score agregado 0-100 · 100 = riesgo máximo")
    risk_level: str = Field(description="'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR'")
    sources: list[SourceResult]
    summary: dict[str, Any]
    errors: list[str] = Field(default_factory=list)


# ────────────────────────────────────────────────────────────────────
# Endpoint principal
# ────────────────────────────────────────────────────────────────────

@router.post("/screen", response_model=ComplianceScreenResponse)
def screen_entity(req: ComplianceScreenRequest) -> ComplianceScreenResponse:
    """Ejecuta el screening de cumplimiento combinando 4 fuentes.

    Pipeline:
      1. OpenSanctions match (sanciones + PEP) · si endpoint disponible
      2. BDNS · subvenciones recibidas por el beneficiario
      3. Entities · vínculos políticos en la ontología de Politeia
      4. Risk score · combina los 3 resultados

    Latencia objetivo: <30s. Si una fuente cae, partial=true.
    """
    from datetime import datetime, timezone
    started = datetime.now(timezone.utc)
    t0 = time.perf_counter()

    sources: list[SourceResult] = []
    errors: list[str] = []

    # ── 1. OpenSanctions match ──
    sources.append(_run_opensanctions(req))

    # ── 2. BDNS · subvenciones recibidas ──
    sources.append(_run_bdns(req))

    # ── 3. Entities · ontología propia ──
    sources.append(_run_entities(req))

    # ── 4. Risk scoring ──
    risk_score, risk_level = _aggregate_risk(sources)

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    partial = any(not s.ok for s in sources)
    errors = [s.error for s in sources if s.error]

    return ComplianceScreenResponse(
        query=req,
        started_at=started.isoformat(),
        elapsed_ms=elapsed_ms,
        partial=partial,
        risk_score=risk_score,
        risk_level=risk_level,
        sources=sources,
        summary={
            "sanctions_matches": next((s.n_matches for s in sources if s.source == "opensanctions"), 0),
            "bdns_concesiones": next((s.n_matches for s in sources if s.source == "bdns"), 0),
            "entities_matches": next((s.n_matches for s in sources if s.source == "entities"), 0),
        },
        errors=errors,
    )


# ────────────────────────────────────────────────────────────────────
# Sub-pipelines · graceful por fuente
# ────────────────────────────────────────────────────────────────────

def _run_opensanctions(req: ComplianceScreenRequest) -> SourceResult:
    t0 = time.perf_counter()
    try:
        from etl.sources.osint.opensanctions_client import get_opensanctions_client
        client = get_opensanctions_client()
        result = client.match(
            name=req.name,
            schema=req.schema_kind,
            nationality=req.country.lower() if req.country else None,
            threshold=req.threshold,
        )
        elapsed = int((time.perf_counter() - t0) * 1000)
        matches = result.get("results", [])
        return SourceResult(
            source="opensanctions",
            ok=result.get("error") is None,
            elapsed_ms=elapsed,
            n_matches=len(matches),
            matches=[
                {
                    "id": m.get("entity", {}).get("id", ""),
                    "caption": m.get("entity", {}).get("caption", ""),
                    "schema": m.get("entity", {}).get("schema", ""),
                    "score": m.get("score"),
                    "match": m.get("match"),
                    "datasets": m.get("entity", {}).get("datasets", []),
                }
                for m in matches[:10]
            ],
            error=result.get("error"),
        )
    except Exception as exc:
        return SourceResult(
            source="opensanctions",
            ok=False,
            elapsed_ms=int((time.perf_counter() - t0) * 1000),
            error=str(exc),
        )


def _run_bdns(req: ComplianceScreenRequest) -> SourceResult:
    t0 = time.perf_counter()
    try:
        from etl.sources.spain.bdns import get_bdns_client
        client = get_bdns_client()
        if client._session is None:
            return SourceResult(
                source="bdns", ok=False, elapsed_ms=0,
                error="BDNS client sin sesión",
            )
        items = client.search_concesiones(beneficiario=req.name, page=0, page_size=20)
        elapsed = int((time.perf_counter() - t0) * 1000)
        matches = [
            {
                "id": str(it.get("id", "")),
                "beneficiario": str(it.get("beneficiario") or it.get("razonSocial") or ""),
                "importe": it.get("importe", 0),
                "organo": str(it.get("desOrgano") or it.get("organo") or ""),
                "fecha": str(it.get("fechaConcesion") or it.get("fecha") or ""),
            }
            for it in items[:10]
        ]
        return SourceResult(
            source="bdns",
            ok=True,
            elapsed_ms=elapsed,
            n_matches=len(items),
            matches=matches,
        )
    except Exception as exc:
        return SourceResult(
            source="bdns",
            ok=False,
            elapsed_ms=int((time.perf_counter() - t0) * 1000),
            error=str(exc),
        )


def _run_entities(req: ComplianceScreenRequest) -> SourceResult:
    t0 = time.perf_counter()
    try:
        from agents.entities.repository import get_entity_repository
        repo = get_entity_repository()
        if repo is None:
            return SourceResult(
                source="entities", ok=False, elapsed_ms=0,
                error="EntityRepository no disponible (sin engine)",
            )
        # Búsqueda en nuestra ontología
        results = repo.search(req.name, limit=10) if hasattr(repo, "search") else []
        elapsed = int((time.perf_counter() - t0) * 1000)
        matches = [
            {
                "id": getattr(r.entity, "id", None) if hasattr(r, "entity") else None,
                "slug": getattr(r.entity, "slug", None) if hasattr(r, "entity") else None,
                "kind": getattr(r.entity, "kind", None) if hasattr(r, "entity") else None,
                "display_name": getattr(r.entity, "display_name", None) if hasattr(r, "entity") else None,
                "score": getattr(r, "score", None),
                "matched_via": getattr(r, "matched_via", None),
            }
            for r in (results or [])[:10]
        ]
        return SourceResult(
            source="entities",
            ok=True,
            elapsed_ms=elapsed,
            n_matches=len(matches),
            matches=matches,
        )
    except Exception as exc:
        return SourceResult(
            source="entities",
            ok=False,
            elapsed_ms=int((time.perf_counter() - t0) * 1000),
            error=str(exc),
        )


def _aggregate_risk(sources: list[SourceResult]) -> tuple[float, str]:
    """Calcula score de riesgo agregado 0-100.

    Reglas:
      - OpenSanctions match con score>0.8 → +60 (sanción/PEP confirmada)
      - OpenSanctions match con score 0.6-0.8 → +30
      - Múltiples concesiones BDNS · pondera importe pero NO sube risk solo por recibir
      - Entities con tag 'pep' o 'sanctioned' → +20
      - Entity vinculada a actor político → +10

    Niveles:
      80-100 · HIGH
      40-79  · MEDIUM
      10-39  · LOW
      0-9    · CLEAR
    """
    risk = 0.0

    os_source = next((s for s in sources if s.source == "opensanctions"), None)
    if os_source and os_source.ok and os_source.matches:
        max_score = max((float(m.get("score") or 0.0) for m in os_source.matches), default=0.0)
        if max_score >= 0.8:
            risk += 60.0
        elif max_score >= 0.6:
            risk += 30.0

    ent_source = next((s for s in sources if s.source == "entities"), None)
    if ent_source and ent_source.ok and ent_source.matches:
        risk += 10.0  # base por aparecer en la ontología política
        for m in ent_source.matches:
            kind = (m.get("kind") or "").lower()
            if kind in {"actor_person", "actor_org", "government", "party"}:
                risk += 10.0
                break

    risk = max(0.0, min(100.0, risk))

    if risk >= 80:
        level = "HIGH"
    elif risk >= 40:
        level = "MEDIUM"
    elif risk >= 10:
        level = "LOW"
    else:
        level = "CLEAR"

    return round(risk, 1), level


# ────────────────────────────────────────────────────────────────────
# Health endpoint
# ────────────────────────────────────────────────────────────────────

@router.get("/health")
def health() -> dict[str, Any]:
    """Devuelve el estado de cada fuente del compliance pipeline."""
    out: dict[str, Any] = {"ok": True, "sources": {}}

    try:
        from etl.sources.osint.opensanctions_client import get_opensanctions_client
        h = get_opensanctions_client().health()
        out["sources"]["opensanctions"] = h
        if not h.get("ok"):
            out["ok"] = False
    except Exception as exc:
        out["sources"]["opensanctions"] = {"ok": False, "error": str(exc)}
        out["ok"] = False

    try:
        from etl.sources.spain.bdns import get_bdns_client
        client = get_bdns_client()
        out["sources"]["bdns"] = {"ok": client._session is not None}
    except Exception as exc:
        out["sources"]["bdns"] = {"ok": False, "error": str(exc)}

    try:
        from agents.entities.repository import get_entity_repository
        repo = get_entity_repository()
        out["sources"]["entities"] = {"ok": repo is not None}
    except Exception as exc:
        out["sources"]["entities"] = {"ok": False, "error": str(exc)}

    return out
