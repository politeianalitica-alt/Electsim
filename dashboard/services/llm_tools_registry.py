"""
LLM Tools Registry — Registro de Herramientas para Ollama/LiteLLM
==================================================================
Registra fuentes de datos externas como herramientas (function calling)
disponibles para el modelo Ollama/Qwen/politeia-brain.

Herramientas registradas:
  - boe_search          ← boe_legalize.py (corpus legalize-es + API BOE)
  - boe_sumario         ← boe_legalize.py (sumario diario del BOE)
  - euparl_query        ← eurlex_service.py (directivas/reglamentos UE)
  - euparl_procedimiento← eurlex_service.py (trazabilidad procedimiento PE)
  - ai_act_compliance   ← mcp-eu-ai-act/data/eu_ai_act_articles.json
  - congreso_votaciones ← congreso_votaciones.py (votaciones diputados)
  - congreso_diputados  ← congreso_votaciones.py (búsqueda diputados)
  - actor_relaciones    ← actors_service.py (mapa de actores, camino)

Uso en llm_local.py::chat():
    from services.llm_tools_registry import (
        TOOLS_SCHEMA, ejecutar_herramienta, tools_disponibles
    )
    # Pasar TOOLS_SCHEMA a Ollama como tools=TOOLS_SCHEMA
    # Llamar ejecutar_herramienta(tool_name, tool_args) para ejecutar
"""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).parent.parent.parent
_AI_ACT_JSON = (
    _ROOT
    / "gits amigos"
    / "mcp-eu-ai-act-main"
    / "data"
    / "eu_ai_act_articles.json"
)

# ─── Caché de datos de AI Act ────────────────────────────────────────────────

_ai_act_data: dict | None = None
_ai_act_ts: float = 0.0
_AI_ACT_TTL = 3600.0  # 1 hora


def _load_ai_act() -> dict:
    global _ai_act_data, _ai_act_ts
    now = time.time()
    if _ai_act_data and now - _ai_act_ts < _AI_ACT_TTL:
        return _ai_act_data
    try:
        with open(_AI_ACT_JSON, encoding="utf-8") as f:
            _ai_act_data = json.load(f)
        _ai_act_ts = now
    except Exception as e:
        logger.warning("No se pudo cargar eu_ai_act_articles.json: %s", e)
        _ai_act_data = {"articles": []}
    return _ai_act_data  # type: ignore[return-value]


# ─── Definición de herramientas (esquema OpenAI / Ollama) ────────────────────

TOOLS_SCHEMA: list[dict] = [
    # ── 1. BOE Search ────────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "boe_search",
            "description": (
                "Busca normas jurídicas españolas en el corpus del BOE y en la base "
                "de legislación consolidada. Devuelve título, rango normativo, sector, "
                "fecha de publicación y un extracto del texto."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Términos de búsqueda (ej: 'ley de inteligencia artificial', 'RGPD', 'protección de datos')",
                    },
                    "sector": {
                        "type": "string",
                        "description": "Sector normativo: fiscal, digital, laboral, energia, salud, educacion, social, justicia",
                        "enum": ["fiscal", "digital", "laboral", "energia", "salud", "educacion", "social", "justicia", ""],
                    },
                    "rango": {
                        "type": "string",
                        "description": "Rango normativo: ley, real_decreto, orden_ministerial, reglamento",
                        "enum": ["ley", "real_decreto", "orden_ministerial", "reglamento", ""],
                    },
                    "max_resultados": {
                        "type": "integer",
                        "description": "Número máximo de resultados (por defecto 5)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    # ── 2. BOE Sumario ───────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "boe_sumario",
            "description": (
                "Obtiene el sumario del BOE (Boletín Oficial del Estado) para una fecha "
                "concreta o el más reciente. Devuelve los ítems publicados con título, "
                "tipo de norma y enlace."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "fecha": {
                        "type": "string",
                        "description": "Fecha en formato YYYY-MM-DD (por defecto: hoy)",
                    },
                },
                "required": [],
            },
        },
    },
    # ── 3. EUR-Lex / euparl query ────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "euparl_query",
            "description": (
                "Busca directivas, reglamentos y decisiones de la Unión Europea "
                "en EUR-Lex. Ideal para consultas sobre legislación comunitaria reciente, "
                "Reglamento de IA, Data Act, DORA, etc."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "tema": {
                        "type": "string",
                        "description": "Tema o palabras clave (ej: 'inteligencia artificial', 'datos personales', 'energía renovable')",
                    },
                    "tipo": {
                        "type": "string",
                        "description": "Tipo de norma UE",
                        "enum": ["directiva", "reglamento", "decision", "todos"],
                        "default": "todos",
                    },
                    "dias": {
                        "type": "integer",
                        "description": "Rango de días hacia atrás para buscar (por defecto 90)",
                        "default": 90,
                    },
                    "max_resultados": {
                        "type": "integer",
                        "description": "Máximo número de resultados (por defecto 5)",
                        "default": 5,
                    },
                },
                "required": ["tema"],
            },
        },
    },
    # ── 4. EUR-Lex procedimiento PE ──────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "euparl_procedimiento",
            "description": (
                "Obtiene la trazabilidad completa de un procedimiento legislativo "
                "del Parlamento Europeo: desde la propuesta de la Comisión hasta la "
                "adopción final. Útil para seguimiento de tramitación de una norma UE."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "referencia": {
                        "type": "string",
                        "description": "Referencia del procedimiento (ej: '2021/0106(COD)'para el Reglamento IA)",
                    },
                },
                "required": ["referencia"],
            },
        },
    },
    # ── 5. AI Act compliance ─────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "ai_act_compliance",
            "description": (
                "Consulta los artículos del Reglamento Europeo de Inteligencia Artificial "
                "(EU AI Act). Devuelve requisitos de cumplimiento, checklist y plazos "
                "para un tipo de sistema de IA o stakeholder concreto."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Consulta sobre el AI Act (ej: 'sistemas de alto riesgo', 'obligaciones del proveedor', 'IA prohibida')",
                    },
                    "stakeholder": {
                        "type": "string",
                        "description": "Rol del actor (provider=proveedor, deployer=desplegador, importer=importador)",
                        "enum": ["provider", "deployer", "importer", "distributor", ""],
                        "default": "",
                    },
                    "articulo": {
                        "type": "string",
                        "description": "Número de artículo específico a consultar (ej: '5', '10', '13')",
                        "default": "",
                    },
                },
                "required": ["query"],
            },
        },
    },
    # ── 6. Congreso votaciones ───────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "congreso_votaciones",
            "description": (
                "Consulta las votaciones recientes del Congreso de los Diputados. "
                "Permite filtrar por fecha, tipo de iniciativa y ver la posición "
                "de cada partido político."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "dias": {
                        "type": "integer",
                        "description": "Días hacia atrás para buscar votaciones (por defecto 30)",
                        "default": 30,
                    },
                    "tipo": {
                        "type": "string",
                        "description": "Tipo de votación: proposicion_ley, presupuestos, mocion, enmienda",
                        "default": "",
                    },
                    "max_resultados": {
                        "type": "integer",
                        "description": "Número máximo de votaciones (por defecto 10)",
                        "default": 10,
                    },
                },
                "required": [],
            },
        },
    },
    # ── 7. Congreso diputados ────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "congreso_diputados",
            "description": (
                "Busca información sobre diputados del Congreso: nombre, partido, "
                "circunscripción, grupo parlamentario y actividad reciente."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "partido": {
                        "type": "string",
                        "description": "Partido político para filtrar (ej: 'PSOE', 'PP', 'VOX', 'PODEMOS')",
                        "default": "",
                    },
                    "nombre": {
                        "type": "string",
                        "description": "Nombre del diputado a buscar",
                        "default": "",
                    },
                },
                "required": [],
            },
        },
    },
    # ── 8. Actor relaciones ──────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "actor_relaciones",
            "description": (
                "Consulta el mapa de actores políticos españoles: encuentra relaciones "
                "entre actores, calcula el camino más corto entre dos actores, "
                "identifica los actores más influyentes (PageRank) o los brokers "
                "de información (betweenness)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "accion": {
                        "type": "string",
                        "description": "Tipo de consulta",
                        "enum": ["top_pagerank", "top_betweenness", "camino", "ego_network", "relaciones_actor"],
                    },
                    "actor_a": {
                        "type": "string",
                        "description": "ID o nombre del primer actor (ej: 'pedro_sanchez', 'pp', 'feijoo')",
                        "default": "",
                    },
                    "actor_b": {
                        "type": "string",
                        "description": "ID del segundo actor (solo para accion='camino')",
                        "default": "",
                    },
                    "top_n": {
                        "type": "integer",
                        "description": "Número de resultados para rankings (por defecto 5)",
                        "default": 5,
                    },
                },
                "required": ["accion"],
            },
        },
    },
]

# ─── Tools del agente (agents/tools/*) ──────────────────────────────────────
# Extiende el catálogo del Brain con TODAS las herramientas registradas en
# `agents/tools/registry.py` (electoral, media, legislative, risk, …).
try:
    from agents.tools.registry import (
        TOOLS_AGENTE,
        TOOLS_AGENTE_INDEX as _AGENT_TOOLS_INDEX,
        ejecutar_tool_agente,
    )
    TOOLS_SCHEMA.extend(TOOLS_AGENTE)
    _AGENT_TOOLS_AVAILABLE = True
except ImportError as _exc:  # pragma: no cover - defensivo
    logger.debug("agents.tools.registry no disponible: %s", _exc)
    _AGENT_TOOLS_AVAILABLE = False
    _AGENT_TOOLS_INDEX: dict = {}

    def ejecutar_tool_agente(nombre: str, args: dict) -> str:  # type: ignore[misc]
        return json.dumps({"error": "agents.tools.registry no disponible"})


# ─── Dispatcher de herramientas ──────────────────────────────────────────────


def ejecutar_herramienta(nombre: str, args: dict) -> str:
    """
    Ejecuta una herramienta por nombre y retorna el resultado como string.
    Diseñado para integrarse en el loop tool-use de Ollama/LiteLLM.

    Args:
        nombre: Nombre de la herramienta (ej: 'boe_search')
        args: Argumentos de la herramienta según su esquema

    Returns:
        JSON string con el resultado, listo para añadir al historial como
        un mensaje role='tool'.
    """
    try:
        if nombre == "boe_search":
            return _tool_boe_search(**args)
        elif nombre == "boe_sumario":
            return _tool_boe_sumario(**args)
        elif nombre == "euparl_query":
            return _tool_euparl_query(**args)
        elif nombre == "euparl_procedimiento":
            return _tool_euparl_procedimiento(**args)
        elif nombre == "ai_act_compliance":
            return _tool_ai_act_compliance(**args)
        elif nombre == "congreso_votaciones":
            return _tool_congreso_votaciones(**args)
        elif nombre == "congreso_diputados":
            return _tool_congreso_diputados(**args)
        elif nombre == "actor_relaciones":
            return _tool_actor_relaciones(**args)

        # Delegar en las tools del agente (agents/tools/*) si están disponibles
        if _AGENT_TOOLS_AVAILABLE and nombre in _AGENT_TOOLS_INDEX:
            return ejecutar_tool_agente(nombre, args)

        return json.dumps({"error": f"Herramienta desconocida: {nombre}"})
    except Exception as exc:
        logger.error("Error ejecutando herramienta %s: %s", nombre, exc)
        return json.dumps({"error": str(exc), "herramienta": nombre})


def tools_disponibles() -> list[str]:
    """Retorna la lista de nombres de herramientas registradas."""
    return [t["function"]["name"] for t in TOOLS_SCHEMA]


def schema_para_ollama() -> list[dict]:
    """
    Retorna el esquema de herramientas en formato compatible con Ollama.
    Uso: ollama.chat(model=..., messages=..., tools=schema_para_ollama())
    """
    return TOOLS_SCHEMA


# ─── Implementaciones ────────────────────────────────────────────────────────


def _tool_boe_search(
    query: str,
    sector: str = "",
    rango: str = "",
    max_resultados: int = 5,
) -> str:
    try:
        from services.boe_legalize import buscar_normas_local

        normas = buscar_normas_local(
            query=query,
            sector=sector or None,
            rango=rango or None,
            max_results=max_resultados,
        )
        if not normas:
            return json.dumps({"mensaje": "No se encontraron normas para la consulta.", "resultados": []})

        resultados = [
            {
                "titulo": n.titulo,
                "rango": n.rango,
                "sector": n.sector,
                "fecha": n.fecha_publicacion,
                "norma_id": n.norma_id,
                "extracto": n.cuerpo[:400] + "…"if len(n.cuerpo) > 400 else n.cuerpo,
            }
            for n in normas
        ]
        return json.dumps({"total": len(resultados), "resultados": resultados}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _tool_boe_sumario(fecha: str = "") -> str:
    try:
        from services.boe_legalize import sumario_boe

        fecha_dt = datetime.fromisoformat(fecha).date() if fecha else date.today()
        items = sumario_boe(fecha_dt)
        if not items:
            return json.dumps({"mensaje": f"Sin publicaciones en BOE para {fecha_dt}", "items": []})

        result = [
            {
                "identificador": i.identificador,
                "titulo": i.titulo[:200],
                "tipo": i.tipo,
                "fecha": i.fecha,
                "url": i.url,
            }
            for i in items[:20]
        ]
        return json.dumps({"fecha": str(fecha_dt), "total": len(items), "muestra": result}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _tool_euparl_query(
    tema: str,
    tipo: str = "todos",
    dias: int = 90,
    max_resultados: int = 5,
) -> str:
    try:
        from services.eurlex_service import buscar_normas_ue_por_tema, buscar_directivas_recientes, buscar_reglamentos_recientes

        if tipo == "directiva":
            normas = buscar_directivas_recientes(dias=dias, max_items=max_resultados * 2)
            # Filtrar por tema
            tema_low = tema.lower()
            normas = [n for n in normas if tema_low in n.titulo.lower() or tema_low in (n.materia or "").lower()]
        elif tipo == "reglamento":
            normas = buscar_reglamentos_recientes(dias=dias, max_items=max_resultados * 2)
            tema_low = tema.lower()
            normas = [n for n in normas if tema_low in n.titulo.lower() or tema_low in (n.materia or "").lower()]
        else:
            normas = buscar_normas_ue_por_tema(tema=tema, tipo=tipo, max_items=max_resultados)

        if not normas:
            return json.dumps({"mensaje": f"Sin resultados UE para: {tema}", "resultados": []})

        resultados = [
            {
                "celex": n.celex_id,
                "titulo": n.titulo,
                "tipo": n.tipo,
                "fecha": n.fecha_publicacion,
                "diario_oficial": n.diario_oficial,
                "en_vigor": n.en_vigor,
                "resumen": (n.resumen or "")[:300] + "…"if len(n.resumen or "") > 300 else (n.resumen or ""),
            }
            for n in normas[:max_resultados]
        ]
        return json.dumps({"total": len(resultados), "resultados": resultados}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _tool_euparl_procedimiento(referencia: str) -> str:
    try:
        from services.eurlex_service import trazabilidad_procedimiento

        timeline = trazabilidad_procedimiento(referencia)
        if not timeline:
            return json.dumps({"mensaje": f"Sin datos de trazabilidad para: {referencia}", "timeline": []})
        return json.dumps({"referencia": referencia, "timeline": timeline}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _tool_ai_act_compliance(
    query: str,
    stakeholder: str = "",
    articulo: str = "",
) -> str:
    try:
        data = _load_ai_act()
        articles: list[dict] = data.get("articles", [])
        if not articles:
            return json.dumps({"error": "Base de datos AI Act no disponible"})

        # Filtrar por artículo específico
        if articulo:
            arts_match = [a for a in articles if str(a.get("article", "")) == str(articulo)]
        else:
            # Búsqueda por texto en query
            query_low = query.lower()
            terms = query_low.split()
            scored: list[tuple[float, dict]] = []
            for art in articles:
                score = 0.0
                texto_busqueda = (
                    art.get("title", "").lower()
                    + " "
                    + art.get("summary", "").lower()
                    + " "
                    + " ".join(art.get("content_keywords", [])).lower()
                )
                for term in terms:
                    if term in texto_busqueda:
                        score += 1.0
                # Bonus por stakeholder match
                if stakeholder and stakeholder in art.get("stakeholder", []):
                    score += 0.5
                if score > 0:
                    scored.append((score, art))
            scored.sort(key=lambda x: -x[0])
            arts_match = [a for _, a in scored[:3]]

        if not arts_match:
            return json.dumps({
                "mensaje": f"No se encontraron artículos relevantes para: {query}",
                "meta": {
                    "version": data.get("version", ""),
                    "enforcement_deadline": data.get("enforcement_deadline", ""),
                },
            })

        resultados = []
        for art in arts_match:
            reqs = art.get("requirements", [])
            checklist = art.get("checklist", [])
            resultados.append({
                "articulo": art.get("article"),
                "titulo": art.get("title"),
                "aplica_a": art.get("applies_to", []),
                "stakeholder": art.get("stakeholder", []),
                "resumen": art.get("summary", ""),
                "requisitos_clave": reqs[:5],
                "checklist": checklist[:5],
                "plazo_critico": art.get("deadline_critical", False),
                "esfuerzo_dias": art.get("effort_days"),
                "eur_lex_ref": art.get("eur_lex_ref", ""),
            })

        return json.dumps({
            "query": query,
            "meta": {
                "version": data.get("version", ""),
                "regulation": data.get("regulation", ""),
                "enforcement_deadline": data.get("enforcement_deadline", ""),
            },
            "articulos_relevantes": resultados,
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _tool_congreso_votaciones(
    dias: int = 30,
    tipo: str = "",
    max_resultados: int = 10,
) -> str:
    try:
        from services.congreso_votaciones import get_votaciones

        desde = datetime.now() - timedelta(days=dias)
        votaciones = get_votaciones(desde=desde, tipo=tipo or None)
        if not votaciones:
            return json.dumps({"mensaje": "Sin votaciones en el rango solicitado", "votaciones": []})

        muestra = votaciones[:max_resultados]
        result = [
            {
                "id": v.get("id", ""),
                "fecha": v.get("fecha", ""),
                "titulo": (v.get("titulo") or "")[:200],
                "tipo": v.get("tipo", ""),
                "resultado": v.get("resultado", ""),
                "votos_favor": v.get("votos_favor"),
                "votos_contra": v.get("votos_contra"),
                "abstenciones": v.get("abstenciones"),
            }
            for v in muestra
        ]
        return json.dumps({"total": len(votaciones), "muestra": result}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _tool_congreso_diputados(
    partido: str = "",
    nombre: str = "",
) -> str:
    try:
        from services.congreso_votaciones import get_diputados

        diputados = get_diputados(partido=partido or None)
        if nombre:
            nombre_low = nombre.lower()
            diputados = [
                d for d in diputados
                if nombre_low in (d.get("nombre") or "").lower()
            ]
        if not diputados:
            return json.dumps({"mensaje": "Sin diputados encontrados con ese filtro", "diputados": []})

        result = [
            {
                "id": d.get("id", ""),
                "nombre": d.get("nombre", ""),
                "partido": d.get("partido", ""),
                "grupo_parlamentario": d.get("grupo_parlamentario", ""),
                "circunscripcion": d.get("circunscripcion", ""),
            }
            for d in diputados[:20]
        ]
        return json.dumps({"total": len(diputados), "diputados": result}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _tool_actor_relaciones(
    accion: str,
    actor_a: str = "",
    actor_b: str = "",
    top_n: int = 5,
) -> str:
    try:
        from services import actors_service

        if accion == "top_pagerank":
            top = actors_service.top_actores_por_metrica("pagerank", top_n)
            resultado = []
            for aid, score in top:
                obj = actors_service.get_actor(aid) or {}
                resultado.append({
                    "actor": obj.get("nombre", aid),
                    "partido": obj.get("partido", ""),
                    "score": round(score, 4),
                })
            return json.dumps({"ranking_pagerank": resultado}, ensure_ascii=False)

        elif accion == "top_betweenness":
            top = actors_service.top_actores_por_metrica("betweenness", top_n)
            resultado = []
            for aid, score in top:
                obj = actors_service.get_actor(aid) or {}
                resultado.append({
                    "actor": obj.get("nombre", aid),
                    "partido": obj.get("partido", ""),
                    "score": round(score, 4),
                })
            return json.dumps({"ranking_betweenness": resultado}, ensure_ascii=False)

        elif accion == "camino":
            if not actor_a or not actor_b:
                return json.dumps({"error": "Se requieren actor_a y actor_b para calcular el camino"})
            camino = actors_service.camino_entre_actores(actor_a, actor_b)
            if not camino:
                return json.dumps({"mensaje": f"No hay camino entre {actor_a} y {actor_b}", "camino": []})
            return json.dumps({"camino": camino, "longitud": len(camino) - 1}, ensure_ascii=False)

        elif accion == "ego_network":
            if not actor_a:
                return json.dumps({"error": "Se requiere actor_a para ego_network"})
            ego = actors_service.egocentric_network(actor_a)
            nodos = [n["id"] for n in ego.get("actores", [])]
            return json.dumps({
                "centro": actor_a,
                "vecinos": nodos,
                "num_relaciones": len(ego.get("relaciones", [])),
            }, ensure_ascii=False)

        elif accion == "relaciones_actor":
            if not actor_a:
                return json.dumps({"error": "Se requiere actor_a"})
            relaciones = actors_service.get_relaciones()
            rels_actor = [
                r for r in relaciones
                if r.get("from") == actor_a or r.get("to") == actor_a
                or r.get("origen") == actor_a or r.get("destino") == actor_a
            ]
            resultado_rels = []
            for r in rels_actor[:15]:
                src = r.get("from") or r.get("origen", "")
                dst = r.get("to") or r.get("destino", "")
                con = dst if src == actor_a else src
                obj_con = actors_service.get_actor(con) or {}
                resultado_rels.append({
                    "con": obj_con.get("nombre", con),
                    "tipo": r.get("tipo", ""),
                    "label": r.get("label", ""),
                    "fuerza": r.get("fuerza", 1),
                    "fuente": r.get("fuente", ""),
                })
            return json.dumps({
                "actor": actor_a,
                "relaciones": resultado_rels,
            }, ensure_ascii=False)

        else:
            return json.dumps({"error": f"Acción desconocida: {accion}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ─── Integración con llm_local.chat() ────────────────────────────────────────


def chat_con_herramientas(
    mensaje: str,
    historia: list[dict] | None = None,
    contexto: str = "",
    modelo: str = "",
    herramientas: list[str] | None = None,
    max_iteraciones: int = 3,
) -> str:
    """
    Envía un mensaje al modelo con acceso a herramientas (tool use).
    Si el modelo decide usar una herramienta, la ejecuta y devuelve el
    resultado al modelo para que formule la respuesta final.

    Args:
        mensaje: Pregunta del usuario
        historia: Historial de conversación previo
        contexto: Contexto adicional del dashboard
        modelo: Modelo Ollama a usar (auto si vacío)
        herramientas: Lista de nombres de herramientas a exponer (todas si None)
        max_iteraciones: Máximo de ciclos tool-use antes de forzar respuesta

    Returns:
        Respuesta final del modelo como string
    """
    try:
        import ollama  # type: ignore
    except ImportError:
        from services.llm_local import chat
        return chat(mensaje, historia=historia, contexto=contexto)

    from services.llm_local import SYSTEM_BRAIN, modelo_principal, _PARAMS_NORMAL

    mod = modelo or modelo_principal()
    if not mod:
        from services.llm_local import chat
        return chat(mensaje, historia=historia, contexto=contexto)

    # Filtrar herramientas disponibles
    if herramientas:
        tools_activos = [t for t in TOOLS_SCHEMA if t["function"]["name"] in herramientas]
    else:
        tools_activos = TOOLS_SCHEMA

    # Construir historial
    mensajes: list[dict] = [{"role": "system", "content": SYSTEM_BRAIN}]
    if contexto:
        mensajes.append({"role": "user", "content": f"[CONTEXTO]\n{contexto[:4000]}\n[/CONTEXTO]"})
        mensajes.append({"role": "assistant", "content": "Contexto del dashboard recibido."})
    if historia:
        mensajes.extend([
            m for m in historia[-8:]
            if isinstance(m, dict) and m.get("role") in ("user", "assistant")
        ])
    mensajes.append({"role": "user", "content": mensaje})

    # Loop tool-use
    for iteracion in range(max_iteraciones):
        try:
            resp = ollama.chat(
                model=mod,
                messages=mensajes,
                tools=tools_activos,
                options=_PARAMS_NORMAL,
                stream=False,
            )
        except Exception as e:
            # Ollama sin soporte tool-use → respuesta directa
            from services.llm_local import chat
            return chat(mensaje, historia=historia, contexto=contexto, modelo=mod)

        msg = resp.message if hasattr(resp, "message") else resp.get("message", {})

        # Sin tool calls → respuesta final
        tool_calls = getattr(msg, "tool_calls", None) or (msg.get("tool_calls") if isinstance(msg, dict) else None)
        if not tool_calls:
            if hasattr(msg, "content"):
                return msg.content or ""
            if isinstance(msg, dict):
                return msg.get("content", "")
            return str(msg)

        # Ejecutar herramientas
        if hasattr(msg, "content") or isinstance(msg, dict):
            content = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else None) or ""
            mensajes.append({"role": "assistant", "content": content, "tool_calls": tool_calls})
        else:
            mensajes.append({"role": "assistant", "content": "", "tool_calls": tool_calls})

        for tc in tool_calls:
            fn = tc.function if hasattr(tc, "function") else tc.get("function", {})
            nombre_herr = getattr(fn, "name", None) or fn.get("name", "")
            args_raw = getattr(fn, "arguments", None) or fn.get("arguments", {})
            if isinstance(args_raw, str):
                try:
                    args_raw = json.loads(args_raw)
                except Exception:
                    args_raw = {}
            resultado_herr = ejecutar_herramienta(nombre_herr, args_raw)
            mensajes.append({
                "role": "tool",
                "content": resultado_herr,
                "name": nombre_herr,
            })
            logger.info("Tool ejecutada: %s → %s chars", nombre_herr, len(resultado_herr))

    # Si llegamos aquí sin respuesta final, hacer una última llamada sin tools
    try:
        resp_final = ollama.chat(
            model=mod,
            messages=mensajes,
            options=_PARAMS_NORMAL,
            stream=False,
        )
        msg_final = resp_final.message if hasattr(resp_final, "message") else resp_final.get("message", {})
        if hasattr(msg_final, "content"):
            return msg_final.content or ""
        if isinstance(msg_final, dict):
            return msg_final.get("content", "")
        return str(msg_final)
    except Exception as e:
        return f"Error en tool-use loop: {e}"


# ─── Utilidades de diagnóstico ────────────────────────────────────────────────


def status_herramientas() -> dict[str, Any]:
    """
    Retorna el estado de disponibilidad de cada herramienta.
    Útil para mostrar en el dashboard qué fuentes están activas.
    """
    estado: dict[str, Any] = {}

    # BOE tools
    try:
        from services.boe_legalize import stats_corpus
        st = stats_corpus()
        estado["boe_search"] = {"ok": True, "normas_corpus": st.get("total_normas", 0), "fuente": "legalize-es + BOE API"}
        estado["boe_sumario"] = {"ok": True, "fuente": "BOE API REST"}
    except Exception as e:
        estado["boe_search"] = {"ok": False, "error": str(e)}
        estado["boe_sumario"] = {"ok": False, "error": str(e)}

    # EUR-Lex tools
    try:
        from services.eurlex_service import resumen_actividad_ue
        estado["euparl_query"] = {"ok": True, "fuente": "EUR-Lex SPARQL"}
        estado["euparl_procedimiento"] = {"ok": True, "fuente": "EUR-Lex SPARQL"}
    except Exception as e:
        estado["euparl_query"] = {"ok": False, "error": str(e)}
        estado["euparl_procedimiento"] = {"ok": False, "error": str(e)}

    # AI Act
    try:
        data = _load_ai_act()
        arts = data.get("articles", [])
        estado["ai_act_compliance"] = {
            "ok": len(arts) > 0,
            "articulos": len(arts),
            "version": data.get("version", ""),
            "fuente": _AI_ACT_JSON.name if _AI_ACT_JSON.exists() else "no disponible",
        }
    except Exception as e:
        estado["ai_act_compliance"] = {"ok": False, "error": str(e)}

    # Congreso
    try:
        from services.congreso_votaciones import stats
        st = stats()
        estado["congreso_votaciones"] = {"ok": True, "votaciones": st.get("total_votaciones", 0), "fuente": "congreso.es"}
        estado["congreso_diputados"] = {"ok": True, "diputados": st.get("total_diputados", 0), "fuente": "congreso.es"}
    except Exception as e:
        estado["congreso_votaciones"] = {"ok": False, "error": str(e)}
        estado["congreso_diputados"] = {"ok": False, "error": str(e)}

    # Actors
    try:
        from services.actors_service import get_actores, get_relaciones
        estado["actor_relaciones"] = {
            "ok": True,
            "actores": len(get_actores()),
            "relaciones": len(get_relaciones()),
            "fuente": "actors_service",
        }
    except Exception as e:
        estado["actor_relaciones"] = {"ok": False, "error": str(e)}

    return estado


def briefing_legislativo_matutino(dias: int = 1) -> str:
    """
    Genera un briefing legislativo automático usando todas las herramientas.
    Diseñado para ejecutarse cada mañana (06:30 UTC) como tarea programada.

    Returns:
        Texto del briefing formateado en markdown
    """
    partes: list[str] = [
        f"##  Briefing Legislativo — {datetime.now().strftime('%d/%m/%Y')}",
        "",
    ]

    # BOE del día
    try:
        boe_result = json.loads(_tool_boe_sumario())
        items = boe_result.get("muestra", [])
        if items:
            partes.append("###  BOE de Hoy")
            for item in items[:5]:
                partes.append(f"- **{item['tipo']}**: {item['titulo'][:100]}")
            partes.append("")
    except Exception:
        pass

    # Actividad UE reciente
    try:
        from services.eurlex_service import resumen_actividad_ue
        resumen_ue = resumen_actividad_ue(dias=7)
        partes.append("###  Actividad Legislativa UE (7 días)")
        partes.append(f"- Directivas nuevas: {resumen_ue.get('directivas', 0)}")
        partes.append(f"- Reglamentos nuevos: {resumen_ue.get('reglamentos', 0)}")
        partes.append(f"- Procedimientos activos: {resumen_ue.get('procedimientos_activos', 0)}")
        partes.append("")
    except Exception:
        pass

    # Votaciones recientes
    try:
        vot_result = json.loads(_tool_congreso_votaciones(dias=dias * 7, max_resultados=5))
        votaciones = vot_result.get("muestra", [])
        if votaciones:
            partes.append("###  Últimas Votaciones en el Congreso")
            for v in votaciones:
                resultado_emoji = "✓"if v.get("resultado") == "aprobado"else "✗"
                partes.append(f"- {resultado_emoji} {v.get('titulo','')[:100]}")
            partes.append("")
    except Exception:
        pass

    if len(partes) <= 4:
        partes.append("_Sin datos disponibles. Verifica la conexión con las fuentes legislativas._")

    return "\n".join(partes)
