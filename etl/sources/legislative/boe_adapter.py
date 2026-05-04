"""
Adaptador BOE → LegalItem.

Convierte las respuestas crudas del BOE al esquema normalizado LegalItem,
calcula text_hash, clasifica impacto con reglas simples y detecta sectores.
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import date
from typing import Any

from .schemas import LegalItem, IMPACT_LEVELS

logger = logging.getLogger(__name__)


# ── Clasificación de impacto por rango legal ──────────────────────────────────

_CRITICO_TIPOS = {
    "real decreto-ley", "real decreto ley", "ley orgánica", "ley organica",
    "ley de presupuestos", "presupuestos generales", "estado de alarma",
    "estado de excepción", "estado de sitio",
}
_CRITICO_KWORDS = {
    "presupuesto", "estado de alarma", "emergencia nacional", "reforma constitucional",
    "energía estratégica", "defensa nacional", "seguridad nacional",
}
_ALTO_TIPOS = {"real decreto legislativo", "real decreto", "ley "}
_ALTO_KWORDS = {
    "fiscal", "impuesto", "tributario", "pensiones", "sanidad pública", "vivienda",
    "contratación pública", "licitación", "concesión estratégica",
}
_MEDIO_TIPOS = {"orden ministerial", "orden", "resolución", "instrucción", "convenio"}
_BAJO_TIPOS = {"anuncio", "convocatoria", "licitación", "edicto", "corrección"}


def clasificar_impacto(
    titulo: str,
    seccion: str = "",
    departamento: str = "",
    legal_rank: str | None = None,
) -> str:
    """
    Clasifica el impacto de un ítem BOE con reglas deterministas.
    No usa IA — opera en microsegundos.

    Returns:
        "CRÍTICO" | "ALTO" | "MEDIO" | "BAJO" | "INFORMATIVO"
    """
    tl = titulo.lower()
    rl = (legal_rank or "").lower()

    # Crítico por tipo legal
    if any(t in tl or t in rl for t in _CRITICO_TIPOS):
        return "CRÍTICO"
    # Crítico por sección I + palabras clave estratégicas
    if seccion == "I" and any(k in tl for k in _CRITICO_KWORDS):
        return "CRÍTICO"

    # Alto por tipo legal
    if any(t in tl or t in rl for t in _ALTO_TIPOS):
        return "ALTO"
    # Alto por palabras clave en sección I
    if seccion in ("I", "II") and any(k in tl for k in _ALTO_KWORDS):
        return "ALTO"

    # Medio
    if any(t in tl or t in rl for t in _MEDIO_TIPOS):
        return "MEDIO"
    if seccion in ("II", "III"):
        return "MEDIO"

    # Bajo
    if any(t in tl or t in rl for t in _BAJO_TIPOS):
        return "BAJO"
    if seccion in ("IV", "V"):
        return "BAJO"

    return "INFORMATIVO"


# ── Detección de sectores ─────────────────────────────────────────────────────

_SECTOR_PATTERNS: list[tuple[str, list[str]]] = [
    ("energía",               ["energía", "energia", "eléctric", "electric", "gas", "petróleo", "hidrocarb", "renovabl", "nucleare"]),
    ("defensa",               ["defensa", "ffaa", "armada", "ejército", "ejercito", "otan", "nato", "militar"]),
    ("vivienda",              ["vivienda", "alquiler", "arrendamiento", "hipoteca", "suelo urbano"]),
    ("fiscalidad",            ["fiscal", "tributar", "irpf", "iva", "impuesto", "hacienda", "recaudación"]),
    ("contratación pública",  ["contratación", "licitación", "concurso público", "adjudicación", "pliego"]),
    ("tecnología",            ["digital", "inteligencia artificial", "ia ", "ciberseguridad", "telecomunicacion", "datos personales", "rgpd"]),
    ("sanidad",               ["sanidad", "salud pública", "farmacéutic", "medicament", "vacun", "epidemia", "pandemia"]),
    ("justicia",              ["justicia", "judicial", "tribunal", "fiscalía", "poder judicial", "cgpj", "prisiones"]),
    ("trabajo",               ["trabajo", "laboral", "empleo", "desempleo", "paro", "convenio colectivo", "salario mínimo"]),
    ("educación",             ["educación", "educacion", "universidad", "escuel", "formación profesional"]),
    ("agricultura",           ["agricultur", "ganadería", "pesca", "rural", "campo", "suelo agrícol"]),
    ("industria",             ["industria", "manufactura", "pyme", "reindustrializ"]),
    ("medioambiente",         ["medioambiente", "medio ambiente", "clima", "emisiones", "carbono", "biodiversidad"]),
    ("transporte",            ["transporte", "infraestructura", "carretera", "ferroviario", "puertos", "aeropuertos"]),
    ("exteriores",            ["exterior", "diplomátic", "tratado", "acuerdo internacional", "ue ", "unión europea"]),
]


def detectar_sectores(titulo: str, summary: str | None = None) -> list[str]:
    """
    Detecta los sectores relevantes de un ítem legislativo por palabras clave.
    Máximo 4 sectores por ítem para evitar ruido.
    """
    text = (titulo + " " + (summary or "")).lower()
    found: list[str] = []
    for sector, keywords in _SECTOR_PATTERNS:
        if any(kw in text for kw in keywords):
            found.append(sector)
        if len(found) >= 4:
            break
    return found


# ── Extractor de rango legal ──────────────────────────────────────────────────

_RANK_RE = re.compile(
    r"^(real decreto-ley|real decreto legislativo|real decreto|ley orgánica|ley organica|"
    r"ley de presupuestos|ley |orden ministerial|orden |resolución|resolucion|instrucción|"
    r"acuerdo|convenio|anuncio|convocatoria|licitación|licitacion|corrección|correccion)",
    re.IGNORECASE,
)

_RANK_MAP = {
    "real decreto-ley":        "Real Decreto-ley",
    "real decreto legislativo":"Real Decreto Legislativo",
    "real decreto":            "Real Decreto",
    "ley orgánica":            "Ley Orgánica",
    "ley organica":            "Ley Orgánica",
    "ley de presupuestos":     "Ley de Presupuestos",
    "ley ":                    "Ley",
    "orden ministerial":       "Orden Ministerial",
    "orden ":                  "Orden",
    "resolución":              "Resolución",
    "resolucion":              "Resolución",
    "instrucción":             "Instrucción",
    "acuerdo":                 "Acuerdo",
    "convenio":                "Convenio",
    "anuncio":                 "Anuncio",
    "convocatoria":            "Convocatoria",
    "licitación":              "Licitación",
    "licitacion":              "Licitación",
    "corrección":              "Corrección de errores",
    "correccion":              "Corrección de errores",
}


def extraer_rango_legal(titulo: str) -> str | None:
    """Extrae el rango normativo del título de la disposición."""
    m = _RANK_RE.match(titulo.strip())
    if not m:
        return None
    matched = m.group(0).lower().rstrip()
    for pattern, canon in _RANK_MAP.items():
        if matched.startswith(pattern):
            return canon
    return m.group(0).title()


# ── Adapter principal ─────────────────────────────────────────────────────────

class BOEAdapter:
    """
    Convierte ítems crudos del BOE al modelo LegalItem.

    Métodos:
        adapt_sumario_item(raw, fecha) → LegalItem
        adapt_many(items, fecha) → list[LegalItem]
    """

    @staticmethod
    def _compute_hash(title: str, source_id: str) -> str:
        return hashlib.sha256(f"{source_id}::{title}".encode()).hexdigest()

    @staticmethod
    def _parse_date(raw: str | None) -> date | None:
        if not raw:
            return None
        # Formato BOE: "20260428" o "2026-04-28"
        raw = raw.strip()
        try:
            if len(raw) == 8 and raw.isdigit():
                return date(int(raw[:4]), int(raw[4:6]), int(raw[6:8]))
            from datetime import datetime
            return datetime.fromisoformat(raw).date()
        except (ValueError, TypeError):
            return None

    def adapt_sumario_item(
        self,
        raw: dict[str, Any],
        fecha: date | None = None,
    ) -> LegalItem:
        """
        Convierte un ítem del sumario BOE en LegalItem.

        Args:
            raw: dict con campos 'id', 'titulo', 'seccion', 'departamento', etc.
            fecha: fecha de publicación (la del sumario).
        """
        titulo = raw.get("titulo", "Sin título")
        source_id = raw.get("id", "")
        seccion = raw.get("seccion", "")
        dept = raw.get("departamento", "")

        fecha_pub = fecha or self._parse_date(raw.get("fecha_publicacion"))

        legal_rank = extraer_rango_legal(titulo)
        impact = clasificar_impacto(titulo, seccion, dept, legal_rank)
        sectors = detectar_sectores(titulo)

        return LegalItem(
            source="boe",
            source_id=source_id or f"boe_unknown_{abs(hash(titulo))}",
            title=titulo,
            legal_rank=legal_rank,
            department=dept or None,
            section=seccion or None,
            publication_date=fecha_pub,
            effective_date=None,  # se puede enriquecer con el doc completo
            status="vigente",
            impact_level=impact,
            sectors=sectors,
            actors=[],
            subjects=[],
            summary=raw.get("epigrafe") or None,
            url_html=raw.get("url_html") or raw.get("urlHtml") or None,
            url_pdf=raw.get("url_pdf") or raw.get("urlPdf") or None,
            raw_payload=raw,
            text_hash=self._compute_hash(titulo, source_id),
        )

    def adapt_many(
        self,
        items: list[dict[str, Any]],
        fecha: date | None = None,
    ) -> list[LegalItem]:
        """Convierte una lista de ítems crudos."""
        result: list[LegalItem] = []
        for raw in items:
            try:
                result.append(self.adapt_sumario_item(raw, fecha))
            except Exception as exc:
                logger.warning("BOEAdapter.adapt_many skip: %s — %s", raw.get("id", "?"), exc)
        return result
