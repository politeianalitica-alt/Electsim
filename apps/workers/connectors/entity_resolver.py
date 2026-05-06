"""
Block 2 — Resolvedor de entidades: NER + deduplicación + enriquecimiento.

Pipeline:
  1. Extrae menciones de entidades del texto (via Ollama NER o fallback regex).
  2. Resuelve cada mención contra persona_publica / organizacion
     usando similitud trigrama (pg_trgm) + embeddings semánticos.
  3. Crea nuevas entidades si la confianza es baja.
  4. Actualiza score_influencia con el volumen de menciones recientes.
  5. Registra co-ocurrencias en relacion_politeia.
"""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import date, datetime, timezone
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from observability.logging import get_logger

log = get_logger(__name__)

OLLAMA_BASE  = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"

# ──────────────────────────────────────────────────────────────────────
# Normalización de nombres
# ──────────────────────────────────────────────────────────────────────
def normalize_name(name: str) -> str:
    """Normaliza a minúsculas sin acentos para comparación."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_ = nfkd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_.lower()).strip()


# ──────────────────────────────────────────────────────────────────────
# Extracción NER vía Ollama
# ──────────────────────────────────────────────────────────────────────
_NER_PROMPT = """\
Extrae las entidades nombradas de este texto en español.
Devuelve JSON:
{{
  "personas": ["nombre completo1", ...],
  "organizaciones": ["org1", ...],
  "lugares": ["lugar1", ...]
}}

Solo entidades claramente nombradas. Máximo 10 por categoría.

TEXTO: {texto}
"""


async def extract_entities_llm(texto: str) -> dict[str, list[str]]:
    """Extrae entidades vía Ollama."""
    try:
        async with httpx.AsyncClient(timeout=20, base_url=OLLAMA_BASE) as c:
            r = await c.post("/api/generate", json={
                "model":  OLLAMA_MODEL,
                "prompt": _NER_PROMPT.format(texto=texto[:800]),
                "format": "json",
                "stream": False,
            })
            data = json.loads(r.json().get("response", "{}"))
            return {
                "personas":       [p for p in data.get("personas", []) if isinstance(p, str)],
                "organizaciones": [o for o in data.get("organizaciones", []) if isinstance(o, str)],
                "lugares":        [l for l in data.get("lugares", []) if isinstance(l, str)],
            }
    except Exception:
        return {"personas": [], "organizaciones": [], "lugares": []}


def extract_entities_regex(texto: str) -> dict[str, list[str]]:
    """
    Fallback: detecta menciones a partidos y patrones de nombre propio.
    Conservador — solo devuelve lo que estamos seguros que es entidad.
    """
    _PARTIDOS = [
        "PP", "PSOE", "Vox", "Sumar", "Podemos",
        "Junts", "ERC", "PNV", "Bildu", "CC",
        "BNG", "CUP", "Cs", "UPN",
    ]
    _INSTITUCIONES = [
        "Gobierno", "Congreso", "Senado", "Tribunal Supremo",
        "Tribunal Constitucional", "Fiscalía", "Moncloa",
        "Generalitat", "Junta", "Consell", "Xunta",
        "Banco de España", "INE", "CNMV", "SEPE",
        "Unión Europea", "Comisión Europea", "Parlamento Europeo",
    ]

    personas: list[str] = []
    orgs: list[str] = []

    # Nombres propios (dos palabras capitalizadas no al inicio de frase)
    for m in re.finditer(r"(?<=[,;:·\-] )[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+ [A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+", texto):
        personas.append(m.group())

    # Partidos
    for p in _PARTIDOS:
        if re.search(r"\b" + re.escape(p) + r"\b", texto):
            orgs.append(p)

    # Instituciones
    for inst in _INSTITUCIONES:
        if inst.lower() in texto.lower():
            orgs.append(inst)

    return {
        "personas":       list(dict.fromkeys(personas))[:10],
        "organizaciones": list(dict.fromkeys(orgs))[:10],
        "lugares":        [],
    }


# ──────────────────────────────────────────────────────────────────────
# Resolución contra BD (trigrama)
# ──────────────────────────────────────────────────────────────────────
async def resolve_persona(
    nombre: str,
    db: AsyncSession,
    threshold: float = 0.35,
) -> dict | None:
    """
    Busca la persona_publica más similar por trigrama.
    Retorna el row dict si similarity >= threshold, else None.
    """
    nombre_norm = normalize_name(nombre)
    try:
        r = await db.execute(text("""
            SELECT id::text, nombre_completo, partido, cargo_actual,
                   score_influencia, sentimiento_actual,
                   similarity(nombre_norm, :q) AS sim
            FROM persona_publica
            WHERE similarity(nombre_norm, :q) >= :thr
            ORDER BY sim DESC
            LIMIT 1
        """), {"q": nombre_norm, "thr": threshold})
        row = r.mappings().fetchone()
        return dict(row) if row else None
    except Exception as e:
        log.warning(f"Error resolviendo persona '{nombre}': {e}")
        return None


async def resolve_organizacion(
    nombre: str,
    db: AsyncSession,
    threshold: float = 0.35,
) -> dict | None:
    nombre_norm = normalize_name(nombre)
    try:
        r = await db.execute(text("""
            SELECT id::text, nombre, tipo, sector,
                   score_influencia,
                   similarity(nombre_norm, :q) AS sim
            FROM organizacion
            WHERE similarity(nombre_norm, :q) >= :thr
            ORDER BY sim DESC
            LIMIT 1
        """), {"q": nombre_norm, "thr": threshold})
        row = r.mappings().fetchone()
        return dict(row) if row else None
    except Exception as e:
        log.warning(f"Error resolviendo org '{nombre}': {e}")
        return None


# ──────────────────────────────────────────────────────────────────────
# Creación de entidades nuevas
# ──────────────────────────────────────────────────────────────────────
async def create_persona(nombre: str, db: AsyncSession) -> str | None:
    """Inserta una nueva persona_publica básica. Retorna su UUID."""
    try:
        r = await db.execute(text("""
            INSERT INTO persona_publica (nombre_completo, nombre_norm, tipo)
            VALUES (:nombre, :norm, 'politico')
            ON CONFLICT DO NOTHING
            RETURNING id::text
        """), {"nombre": nombre, "norm": normalize_name(nombre)})
        row = r.scalar()
        await db.commit()
        return row
    except Exception as e:
        await db.rollback()
        log.warning(f"Error creando persona '{nombre}': {e}")
        return None


async def create_organizacion(nombre: str, db: AsyncSession) -> str | None:
    """Inserta una nueva organizacion básica. Retorna su UUID."""
    tipo = "partido" if nombre in {
        "PP", "PSOE", "Vox", "Sumar", "Podemos", "Junts", "ERC", "PNV", "Bildu"
    } else "institucion"
    try:
        r = await db.execute(text("""
            INSERT INTO organizacion (nombre, nombre_norm, tipo)
            VALUES (:nombre, :norm, :tipo)
            ON CONFLICT DO NOTHING
            RETURNING id::text
        """), {"nombre": nombre, "norm": normalize_name(nombre), "tipo": tipo})
        row = r.scalar()
        await db.commit()
        return row
    except Exception as e:
        await db.rollback()
        log.warning(f"Error creando org '{nombre}': {e}")
        return None


# ──────────────────────────────────────────────────────────────────────
# Registro de relaciones por co-ocurrencia
# ──────────────────────────────────────────────────────────────────────
async def register_cooccurrence(
    id_a: str, tipo_a: str,
    id_b: str, tipo_b: str,
    db: AsyncSession,
    fuente_url: str = "",
) -> None:
    """Registra o refuerza una relación de co-ocurrencia entre dos entidades."""
    try:
        await db.execute(text("""
            INSERT INTO relacion_politeia
                (elemento_a_id, elemento_a_tipo, tipo_relacion,
                 elemento_b_id, elemento_b_tipo, peso, fuente_url)
            VALUES (:a, :ta, 'coocurrencia', :b, :tb, 1.0, :url)
            ON CONFLICT (elemento_a_id, tipo_relacion, elemento_b_id)
            DO UPDATE SET
                peso = relacion_politeia.peso + 0.1,
                activa = true
        """), {"a": id_a, "ta": tipo_a, "b": id_b, "tb": tipo_b, "url": fuente_url})
        await db.commit()
    except Exception as e:
        await db.rollback()
        log.warning(f"Error registrando co-ocurrencia: {e}")


# ──────────────────────────────────────────────────────────────────────
# Actualización de scores de influencia
# ──────────────────────────────────────────────────────────────────────
async def refresh_influence_scores(db: AsyncSession) -> dict:
    """
    Recalcula score_influencia de personas y orgs
    basado en menciones en artículos de los últimos 7 días.
    """
    stats = {"personas": 0, "organizaciones": 0}
    try:
        # Para personas: contar apariciones en entidades de artículos recientes
        await db.execute(text("""
            UPDATE persona_publica pp
            SET score_influencia = COALESCE((
                SELECT COUNT(*)::float / 7.0
                FROM article a
                WHERE a.entidades::text ILIKE '%' || pp.nombre_norm || '%'
                  AND a.publicado_en >= NOW() - INTERVAL '7 days'
            ), 0),
            updated_at = NOW()
        """))

        # Para orgs: idem
        await db.execute(text("""
            UPDATE organizacion o
            SET score_influencia = COALESCE((
                SELECT COUNT(*)::float / 7.0
                FROM article a
                WHERE a.entidades::text ILIKE '%' || o.nombre_norm || '%'
                  AND a.publicado_en >= NOW() - INTERVAL '7 days'
            ), 0),
            updated_at = NOW()
        """))

        await db.commit()

        r = await db.execute(text("SELECT COUNT(*) FROM persona_publica WHERE updated_at >= NOW() - INTERVAL '1 minute'"))
        stats["personas"] = r.scalar() or 0
        r2 = await db.execute(text("SELECT COUNT(*) FROM organizacion WHERE updated_at >= NOW() - INTERVAL '1 minute'"))
        stats["organizaciones"] = r2.scalar() or 0
    except Exception as e:
        await db.rollback()
        log.error(f"Error actualizando scores influencia: {e}")

    return stats


# ──────────────────────────────────────────────────────────────────────
# Pipeline de resolución de un documento
# ──────────────────────────────────────────────────────────────────────
async def resolve_document_entities(
    texto: str,
    db: AsyncSession,
    source_url: str = "",
    use_llm: bool = True,
) -> dict[str, list[str]]:
    """
    Extrae y resuelve entidades de un texto. Retorna IDs resueltos.
    """
    # 1. Extracción
    if use_llm:
        raw = await extract_entities_llm(texto)
    else:
        raw = extract_entities_regex(texto)

    resolved_personas: list[str] = []
    resolved_orgs: list[str] = []

    # 2. Resolver personas
    for nombre in raw["personas"]:
        match = await resolve_persona(nombre, db)
        if match:
            resolved_personas.append(match["id"])
        else:
            new_id = await create_persona(nombre, db)
            if new_id:
                resolved_personas.append(new_id)

    # 3. Resolver organizaciones
    for nombre in raw["organizaciones"]:
        match = await resolve_organizacion(nombre, db)
        if match:
            resolved_orgs.append(match["id"])
        else:
            new_id = await create_organizacion(nombre, db)
            if new_id:
                resolved_orgs.append(new_id)

    # 4. Co-ocurrencias persona-persona
    for i, pid_a in enumerate(resolved_personas):
        for pid_b in resolved_personas[i + 1:]:
            await register_cooccurrence(pid_a, "persona", pid_b, "persona", db, source_url)

    # 5. Co-ocurrencias persona-org
    for pid in resolved_personas:
        for oid in resolved_orgs:
            await register_cooccurrence(pid, "persona", oid, "organizacion", db, source_url)

    return {
        "personas":       resolved_personas,
        "organizaciones": resolved_orgs,
    }


# ──────────────────────────────────────────────────────────────────────
# Enriquecimiento desde Wikidata (opcional, best-effort)
# ──────────────────────────────────────────────────────────────────────
async def enrich_from_wikidata(persona_id: str, db: AsyncSession) -> bool:
    """
    Consulta Wikidata para una persona y rellena campos faltantes.
    Solo se ejecuta si wikidata_id es NULL.
    """
    try:
        r = await db.execute(text("""
            SELECT nombre_completo, wikidata_id, partido, cargo_actual
            FROM persona_publica WHERE id = :id
        """), {"id": persona_id})
        row = r.mappings().fetchone()
        if not row or row["wikidata_id"]:
            return False

        nombre = row["nombre_completo"]
        async with httpx.AsyncClient(timeout=10) as c:
            r2 = await c.get("https://www.wikidata.org/w/api.php", params={
                "action":   "wbsearchentities",
                "search":   nombre,
                "language": "es",
                "type":     "item",
                "limit":    3,
                "format":   "json",
            })
            data = r2.json()
            items = data.get("search", [])
            if not items:
                return False

            qid = items[0]["id"]
            label = items[0].get("label", nombre)
            desc  = items[0].get("description", "")

            # Solo actualizar wikidata_id
            await db.execute(text("""
                UPDATE persona_publica
                SET wikidata_id = :qid, updated_at = NOW()
                WHERE id = :id AND wikidata_id IS NULL
            """), {"qid": qid, "id": persona_id})
            await db.commit()
            log.info(f"Enriquecida '{nombre}' → Wikidata {qid} ({desc[:60]})")
            return True

    except Exception as e:
        log.warning(f"Error Wikidata para {persona_id}: {e}")
        await db.rollback()
        return False
