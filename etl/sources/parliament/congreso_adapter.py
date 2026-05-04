"""
Adaptador Congreso → ParliamentaryInitiative.

Portado desde congreso-scrapper (Node/Axios/Cheerio) a Python.
Transforma los datos crudos del Congreso al modelo normalizado.
"""
from __future__ import annotations

import logging
import re
from datetime import date, datetime
from typing import Any

from .schemas import (
    ParliamentaryActorRef,
    ParliamentaryBodyRef,
    ParliamentaryDocumentRef,
    ParliamentaryInitiative,
)

logger = logging.getLogger(__name__)


# ── Mapas de tipos de iniciativa ──────────────────────────────────────────────

_TIPO_LABEL: dict[str, str] = {
    "PPL":   "Proposición de Ley",
    "PL":    "Proyecto de Ley",
    "PNL":   "Proposición No de Ley",
    "MOCI":  "Moción",
    "MOCSC": "Moción consecuencia de interpelación",
    "INTER": "Interpelación",
    "PREG":  "Pregunta oral",
    "PRESC": "Pregunta escrita",
    "ENMI":  "Enmienda",
    "RDL":   "Real Decreto-ley (convalidación)",
    "COMP":  "Comparecencia",
    "COMUN": "Comunicación del Gobierno",
    "INFO":  "Informe",
    "PROP":  "Propuesta de resolución",
}

# Reutilizamos la lógica de impacto del módulo BOE
_CRITICO_TIPOS = {"PPL", "PL", "RDL"}
_ALTO_TIPOS = {"PNL", "MOCI", "MOCSC", "INTER"}


def clasificar_impacto_iniciativa(tipo: str | None, titulo: str) -> str:
    """Clasifica el impacto de una iniciativa parlamentaria."""
    t = (tipo or "").upper().strip()
    tl = titulo.lower()

    if t in _CRITICO_TIPOS:
        return "CRÍTICO"
    if t in _ALTO_TIPOS:
        return "ALTO"
    if any(k in tl for k in ["presupuesto", "reforma constitucional", "ley orgánica"]):
        return "CRÍTICO"
    if any(k in tl for k in ["fiscal", "pensiones", "sanidad", "defensa"]):
        return "ALTO"
    return "MEDIO" if t else "INFORMATIVO"


def detectar_sectores_iniciativa(titulo: str) -> list[str]:
    """Detecta sectores para iniciativas parlamentarias."""
    from etl.sources.legislative.boe_adapter import detectar_sectores
    return detectar_sectores(titulo)


# ── Parsers de campos específicos ─────────────────────────────────────────────

def _parse_date(raw: Any) -> date | None:
    """Parsea fecha flexible (str 'YYYY-MM-DD', 'DD/MM/YYYY', timestamp)."""
    if not raw:
        return None
    if isinstance(raw, date):
        return raw
    if isinstance(raw, (int, float)):
        return datetime.utcfromtimestamp(raw / 1000).date()
    s = str(raw).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y%m%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except ValueError:
            continue
    return None


def _parse_autores(raw: Any) -> list[ParliamentaryActorRef]:
    """Parsea la lista de autores de una iniciativa."""
    if not raw:
        return []
    if isinstance(raw, dict):
        raw = [raw]
    result: list[ParliamentaryActorRef] = []
    for a in raw:
        if not isinstance(a, dict):
            continue
        name = (
            a.get("nombre") or a.get("name") or
            f"{a.get('primer_apellido','')} {a.get('segundo_apellido','')} {a.get('nombre_p','')}".strip()
        )
        if not name:
            continue
        result.append(ParliamentaryActorRef(
            actor_id=str(a.get("id_diputado") or a.get("id") or ""),
            name=name,
            party=a.get("grupo_parlamentario") or a.get("partido") or a.get("grupo"),
            role=a.get("rol") or "firmante",
        ))
    return result


def _parse_comisiones(raw: Any) -> list[ParliamentaryBodyRef]:
    if not raw:
        return []
    if isinstance(raw, dict):
        raw = [raw]
    result: list[ParliamentaryBodyRef] = []
    for c in raw:
        if not isinstance(c, dict):
            continue
        name = c.get("nombre") or c.get("name") or ""
        if not name:
            continue
        result.append(ParliamentaryBodyRef(
            body_id=str(c.get("id") or c.get("codigo") or ""),
            name=name,
            body_type=c.get("tipo") or "comision",
            competency=c.get("competencia"),
        ))
    return result


def _parse_documentos(raw: Any, doc_type: str) -> list[ParliamentaryDocumentRef]:
    if not raw:
        return []
    if isinstance(raw, dict):
        raw = [raw]
    result: list[ParliamentaryDocumentRef] = []
    for d in raw:
        if not isinstance(d, dict):
            continue
        result.append(ParliamentaryDocumentRef(
            doc_type=doc_type,
            number=str(d.get("numero") or d.get("number") or ""),
            date_published=_parse_date(d.get("fecha") or d.get("date")),
            url=d.get("url") or d.get("urlHtml"),
            boe_ref=d.get("boe_ref") or d.get("boe_id"),
        ))
    return result


_BOE_REF_RE = re.compile(r"BOE-[A-Z]-\d{4}-\d+", re.IGNORECASE)


def _extract_boe_refs(raw: Any) -> list[str]:
    """Extrae referencias BOE-A-YYYY-NNNNN de cualquier campo."""
    if not raw:
        return []
    text = str(raw) if not isinstance(raw, str) else raw
    return list(set(_BOE_REF_RE.findall(text)))


# ── Adapter principal ─────────────────────────────────────────────────────────

class CongresoAdapter:
    """
    Convierte datos crudos del Congreso a ParliamentaryInitiative.

    La API del Congreso tiene varios formatos según el endpoint — este
    adapter los normaliza todos.
    """

    def adapt(self, raw: dict[str, Any]) -> ParliamentaryInitiative:
        """Convierte un ítem crudo de la API del Congreso."""
        # Campos base — la API puede usar snake_case o camelCase
        source_id = str(
            raw.get("id") or raw.get("identificador") or raw.get("codigo") or
            raw.get("numeroBOCG") or f"cong_{abs(hash(str(raw)))}"
        )
        titulo = (
            raw.get("titulo") or raw.get("title") or
            raw.get("denominacion") or raw.get("asunto") or
            "Sin título"
        )
        tipo = (raw.get("tipo") or raw.get("type") or "").upper()

        return ParliamentaryInitiative(
            source="congreso",
            source_id=source_id,
            legislature=str(
                raw.get("legislatura") or raw.get("numLegislatura") or "XV"
            ),
            initiative_type=tipo or None,
            initiative_type_label=_TIPO_LABEL.get(tipo),
            title=titulo,
            presented_date=_parse_date(
                raw.get("fechaPresentacion") or raw.get("fecha_presentacion") or
                raw.get("fecha") or raw.get("date")
            ),
            qualified_date=_parse_date(
                raw.get("fechaCalificacion") or raw.get("fecha_calificacion")
            ),
            status=(
                raw.get("estado") or raw.get("status") or
                raw.get("situacion") or None
            ),
            result=raw.get("resultado") or raw.get("result") or None,
            tramitation_type=(
                raw.get("tipoTramitacion") or raw.get("tipo_tramitacion") or None
            ),
            authors=_parse_autores(
                raw.get("autores") or raw.get("authors") or
                raw.get("firmantes") or []
            ),
            competent_commissions=_parse_comisiones(
                raw.get("comisiones") or raw.get("commissions") or []
            ),
            rapporteurs=list(
                raw.get("ponentes") or raw.get("rapporteurs") or []
            ),
            bulletins=_parse_documentos(
                raw.get("boletines") or raw.get("bulletins") or [], "boletin"
            ),
            diaries=_parse_documentos(
                raw.get("diarios") or raw.get("diarios_sesion") or [], "diario"
            ),
            boe_refs=_extract_boe_refs(
                raw.get("boe_refs") or raw.get("boeRefs") or
                raw.get("referenciasBOE") or str(raw)
            ),
            impact_level=clasificar_impacto_iniciativa(tipo, titulo),
            sectors=detectar_sectores_iniciativa(titulo),
            raw_url=(
                raw.get("url") or raw.get("urlHtml") or raw.get("enlace") or None
            ),
            raw_payload=raw,
        )

    def adapt_many(
        self, items: list[dict[str, Any]]
    ) -> list[ParliamentaryInitiative]:
        result: list[ParliamentaryInitiative] = []
        for raw in items:
            try:
                result.append(self.adapt(raw))
            except Exception as exc:
                logger.warning("CongresoAdapter.adapt_many skip: %s", exc)
        return result
