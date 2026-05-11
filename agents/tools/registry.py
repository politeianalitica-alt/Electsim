"""
Agent Tools Registry — Brain/LLM tool-use catalog.
====================================================

Registra TODAS las herramientas públicas de `agents/tools/*.py` en un único
catálogo con esquema OpenAI tool-use, compatible con Ollama/LiteLLM.

Inspecciona los 16 módulos de `agents/tools/*`, normaliza sus distintas
convenciones de registro (CAMPAIGN_TOOLS, COMMS_TOOLS, CRM_TOOLS, …) y expone:

    TOOLS_AGENTE: list[dict]              # schemas OpenAI tool-use
    TOOLS_AGENTE_INDEX: dict[str, Callable]  # name → fn
    tools_agente_disponibles() -> list[str]
    ejecutar_tool_agente(nombre, args) -> str   # JSON string del resultado
    schema_para_ollama() -> list[dict]

Diseño:
  * Algunos módulos exponen funciones con kwargs Pythonicos (`fn(query, limit)`)
    y otros con un dict único (`fn(params: dict)`). Detectamos el patrón con
    `inspect.signature` y despachamos en consecuencia.
  * Truncamos resultados: cualquier lista de >50 items se recorta y se añade
    `"truncated": true, "total": N`.
  * Errores siempre devueltos como `{"error": "...", "herramienta": <name>}`.
  * Soporte de `limit`: si el caller pasa `limit > 500` lo capamos a 500.

Integración con `dashboard/services/llm_tools_registry.py`:
  El módulo `llm_tools_registry` importa al final TOOLS_AGENTE y los añade a su
  TOOLS_SCHEMA. Cuando `ejecutar_herramienta` reciba un nombre no nativo,
  delegará en `ejecutar_tool_agente`.
"""
from __future__ import annotations

import inspect
import json
import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)

# Límites globales
_LIMIT_DEFAULT = 50
_LIMIT_MAX = 500
_MAX_RESULT_ITEMS = 50  # truncar listas largas


# ─── Helpers de normalización ────────────────────────────────────────────────


def _coerce_to_json_schema(parameters: Any) -> dict:
    """
    Acepta los distintos formatos de `parameters` usados en los módulos y los
    convierte a JSON Schema OpenAI tool-use.

    Formatos soportados:
      - dict ya con {"type": "object", "properties": {...}} → se devuelve tal cual.
      - dict ya con {"properties": {...}} sin type → se añade type=object.
      - dict {name: "descripción str"} (economy_tools) → properties con type=string.
      - dict {name: {"type": str, ...}} suelto → se envuelve en object/properties.
      - None / {} → schema vacío.
    """
    if not parameters:
        return {"type": "object", "properties": {}, "required": []}

    if isinstance(parameters, dict):
        # Ya es un JSON Schema completo
        if "properties" in parameters or parameters.get("type") == "object":
            schema = dict(parameters)
            schema.setdefault("type", "object")
            schema.setdefault("properties", {})
            schema.setdefault("required", [])
            return schema

        # Caso economy_tools: {name: "string description"}
        if all(isinstance(v, str) for v in parameters.values()):
            properties = {
                name: {"type": "string", "description": desc}
                for name, desc in parameters.items()
            }
            return {"type": "object", "properties": properties, "required": []}

        # Caso security_tools: {name: {"type": "string", "required": True/False, "default": ...}}
        if all(isinstance(v, dict) for v in parameters.values()):
            properties: dict[str, dict] = {}
            required: list[str] = []
            for name, spec in parameters.items():
                prop = dict(spec)
                if prop.pop("required", False):
                    required.append(name)
                # No-op fields not in JSON Schema
                properties[name] = prop
            return {
                "type": "object",
                "properties": properties,
                "required": required,
            }

    # Fallback
    return {"type": "object", "properties": {}, "required": []}


def _wrap_openai_tool(name: str, description: str, parameters: dict, fn: Callable) -> tuple[dict, Callable]:
    """Construye el dict OpenAI tool-use y devuelve (schema, fn)."""
    schema = {
        "type": "function",
        "function": {
            "name": name,
            "description": description.strip() if description else "",
            "parameters": _coerce_to_json_schema(parameters),
        },
    }
    return schema, fn


def _fn_accepts_single_params_dict(fn: Callable) -> bool:
    """
    True si la función está diseñada para recibir un único dict `params`
    (patrón usado en data_ops_tools, document_tools).
    """
    try:
        sig = inspect.signature(fn)
        params = list(sig.parameters.values())
        if len(params) == 1:
            p = params[0]
            return p.name in ("params", "args") or p.kind == inspect.Parameter.VAR_KEYWORD
        return False
    except (ValueError, TypeError):
        return False


def _filter_kwargs_for_fn(fn: Callable, args: dict) -> dict:
    """Filtra `args` para que solo contenga claves aceptadas por `fn`."""
    try:
        sig = inspect.signature(fn)
    except (ValueError, TypeError):
        return args

    accepts_var_kw = any(
        p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()
    )
    if accepts_var_kw:
        return args

    allowed = {p.name for p in sig.parameters.values()}
    return {k: v for k, v in args.items() if k in allowed}


def _invoke_tool(fn: Callable, args: dict) -> Any:
    """Invoca `fn` con el patrón correcto (dict único vs kwargs)."""
    if args is None:
        args = {}

    # Capar `limit` si está presente
    if "limit" in args:
        try:
            args["limit"] = min(int(args["limit"]), _LIMIT_MAX)
        except (TypeError, ValueError):
            args["limit"] = _LIMIT_DEFAULT

    if _fn_accepts_single_params_dict(fn):
        return fn(args)
    return fn(**_filter_kwargs_for_fn(fn, args))


def _truncate_result(result: Any) -> Any:
    """Trunca listas grandes a _MAX_RESULT_ITEMS items."""
    if isinstance(result, list) and len(result) > _MAX_RESULT_ITEMS:
        return {
            "truncated": True,
            "total": len(result),
            "items": result[:_MAX_RESULT_ITEMS],
        }
    if isinstance(result, dict):
        # Buscar campos de tipo lista grandes y truncarlos
        for key, val in list(result.items()):
            if isinstance(val, list) and len(val) > _MAX_RESULT_ITEMS:
                result[key] = val[:_MAX_RESULT_ITEMS]
                result.setdefault("_truncated", {})[key] = len(val)
    return result


def _to_json(value: Any) -> str:
    """Serializa a JSON con fallback robusto."""
    try:
        return json.dumps(value, ensure_ascii=False, default=str)
    except Exception as exc:
        logger.warning("Failed to serialize tool result: %s", exc)
        return json.dumps({"error": "result_not_serializable", "repr": repr(value)[:500]})


# ─── Carga de cada módulo ────────────────────────────────────────────────────


def _load_module_tools() -> tuple[list[dict], dict[str, Callable]]:
    """
    Carga las herramientas de cada módulo del paquete `agents.tools`.
    Devuelve (schemas, index_por_nombre).

    Cada import está envuelto en try/except para evitar que un fallo aislado
    en un módulo (p. ej. dependencias opcionales) impida cargar el resto.
    """
    schemas: list[dict] = []
    index: dict[str, Callable] = {}

    def _add(name: str, description: str, parameters: dict, fn: Callable) -> None:
        if name in index:
            logger.debug("Tool %s ya registrada, ignorando duplicado.", name)
            return
        schema, fn_ref = _wrap_openai_tool(name, description, parameters, fn)
        schemas.append(schema)
        index[name] = fn_ref

    # ── campaign_tools (CAMPAIGN_TOOLS: name/fn/description/parameters) ───
    try:
        from agents.tools.campaign_tools import CAMPAIGN_TOOLS
        for t in CAMPAIGN_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("parameters", {}), t["fn"])
    except Exception as exc:
        logger.debug("Loading campaign_tools failed: %s", exc)

    # ── comms_tools (COMMS_TOOLS: name/function/description/input_schema) ─
    try:
        from agents.tools.comms_tools import COMMS_TOOLS
        for t in COMMS_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("input_schema", {}), t["function"])
    except Exception as exc:
        logger.debug("Loading comms_tools failed: %s", exc)

    # ── crm_tools (CRM_TOOLS) ─────────────────────────────────────────────
    try:
        from agents.tools.crm_tools import CRM_TOOLS
        for t in CRM_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("input_schema", {}), t["function"])
    except Exception as exc:
        logger.debug("Loading crm_tools failed: %s", exc)

    # ── data_ops_tools (DATA_OPS_TOOLS: fn toma params dict) ──────────────
    try:
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        for t in DATA_OPS_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("input_schema", {}), t["function"])
    except Exception as exc:
        logger.debug("Loading data_ops_tools failed: %s", exc)

    # ── document_tools (DOCUMENT_TOOLS: fn toma params dict) ──────────────
    try:
        from agents.tools.document_tools import DOCUMENT_TOOLS
        for t in DOCUMENT_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("input_schema", {}), t["function"])
    except Exception as exc:
        logger.debug("Loading document_tools failed: %s", exc)

    # ── economy_tools (ECONOMY_TOOLS: parameters = dict de strings) ───────
    try:
        from agents.tools.economy_tools import ECONOMY_TOOLS
        for t in ECONOMY_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("parameters", {}), t["fn"])
    except Exception as exc:
        logger.debug("Loading economy_tools failed: %s", exc)

    # ── electoral_tools (ELECTORAL_TOOLS) ─────────────────────────────────
    try:
        from agents.tools.electoral_tools import ELECTORAL_TOOLS
        for t in ELECTORAL_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("parameters", {}), t["fn"])
    except Exception as exc:
        logger.debug("Loading electoral_tools failed: %s", exc)

    # ── geopolitics_tools (GEOPOLITICS_TOOLS: solo name/desc/function) ────
    try:
        from agents.tools.geopolitics_tools import GEOPOLITICS_TOOLS
        for t in GEOPOLITICS_TOOLS:
            fn = t["function"]
            params = _params_from_signature(fn)
            _add(t["name"], t.get("description", ""), params, fn)
    except Exception as exc:
        logger.debug("Loading geopolitics_tools failed: %s", exc)

    # ── legislative_tools (sin registro propio: lo construimos) ────────────
    try:
        from agents.tools import legislative_tools as lt
        _legislative_specs = [
            ("search_legal_items", lt.search_legal_items,
             "Busca ítems legislativos (BOE + Congreso) por texto libre.",
             {"query": {"type": "string", "description": "Texto a buscar"},
              "limit": {"type": "integer", "description": "Máximo de resultados", "default": 10},
              "source": {"type": "string", "description": "Filtrar: 'boe' o 'congreso'"}}, ["query"]),
            ("get_recent_boe_items", lt.get_recent_boe_items,
             "Retorna ítems BOE recientes, opcionalmente filtrados por nivel de impacto.",
             {"days": {"type": "integer", "description": "Días atrás", "default": 7},
              "impact_filter": {"type": "array", "items": {"type": "string"},
                                "description": "Niveles: CRÍTICO, ALTO, MEDIO, BAJO, INFORMATIVO"},
              "limit": {"type": "integer", "default": 20}}, []),
            ("get_recent_parliamentary_initiatives", lt.get_recent_parliamentary_initiatives,
             "Retorna iniciativas parlamentarias recientes.",
             {"days": {"type": "integer", "default": 30},
              "tipos": {"type": "array", "items": {"type": "string"},
                        "description": "Tipos: PL, PPL, PNL…"},
              "legislatura": {"type": "string", "default": "15"},
              "limit": {"type": "integer", "default": 20}}, []),
            ("summarize_legislative_item", lt.summarize_legislative_item,
             "Genera un resumen Markdown de un ítem legislativo (BOE o Congreso).",
             {"item_id": {"type": "string", "description": "ID (ej. 'BOE-A-2026-XXXXX')"}}, ["item_id"]),
            ("get_legislative_kpis", lt.get_legislative_kpis,
             "Retorna los KPIs del módulo legislativo.",
             {}, []),
            ("classify_text_impact", lt.classify_text_impact,
             "Clasifica el impacto de un texto legislativo: CRÍTICO/ALTO/MEDIO/BAJO/INFORMATIVO.",
             {"titulo": {"type": "string"},
              "seccion": {"type": "string", "default": ""},
              "departamento": {"type": "string", "default": ""}}, ["titulo"]),
            ("get_boe_today_from_api", lt.get_boe_today_from_api,
             "Descarga el sumario BOE del día directamente desde la API.",
             {}, []),
        ]
        for name, fn, desc, props, req in _legislative_specs:
            _add(name, desc, {"type": "object", "properties": props, "required": req}, fn)
    except Exception as exc:
        logger.debug("Loading legislative_tools failed: %s", exc)

    # ── media_tools (sin registro propio) ──────────────────────────────────
    try:
        from agents.tools import media_tools as mt
        _media_specs = [
            ("search_media_items", mt.search_media_items,
             "Busca artículos de medios por texto libre (título + resumen).",
             {"query": {"type": "string"},
              "limit": {"type": "integer", "default": 10},
              "hours": {"type": "integer", "description": "Ventana temporal", "default": 168}}, ["query"]),
            ("get_recent_narratives", mt.get_recent_narratives,
             "Retorna las narrativas activas con mayor cobertura mediática.",
             {"hours": {"type": "integer", "default": 48},
              "limit": {"type": "integer", "default": 12},
              "min_volume": {"type": "integer", "default": 2}}, []),
            ("get_actor_media_profile", mt.get_actor_media_profile,
             "Perfil mediático de un actor: cobertura, sentimiento y narrativas.",
             {"actor_name": {"type": "string"},
              "hours": {"type": "integer", "default": 168}}, ["actor_name"]),
            ("summarize_narrative", mt.summarize_narrative,
             "Genera un resumen Markdown de una narrativa activa por cluster_id.",
             {"cluster_id": {"type": "string"}}, ["cluster_id"]),
            ("get_media_items_for_sector", mt.get_media_items_for_sector,
             "Retorna artículos recientes para un sector temático.",
             {"sector": {"type": "string", "description": "Ej: 'economía', 'sanidad', 'vivienda'"},
              "hours": {"type": "integer", "default": 48},
              "limit": {"type": "integer", "default": 10}}, ["sector"]),
            ("get_media_kpis", mt.get_media_kpis,
             "KPIs del módulo de medios: artículos hoy/24h, fuentes activas, etc.",
             {}, []),
            ("classify_text_narrative", mt.classify_text_narrative,
             "Clasifica un texto libre contra las narrativas definidas.",
             {"text": {"type": "string"}}, ["text"]),
            ("fetch_rss_now", mt.fetch_rss_now,
             "Descarga feeds RSS directamente sin pasar por BD (tiempo real).",
             {"max_per_source": {"type": "integer", "default": 5},
              "region": {"type": "string", "description": "Ej: 'local_spain'"}}, []),
        ]
        for name, fn, desc, props, req in _media_specs:
            _add(name, desc, {"type": "object", "properties": props, "required": req}, fn)
    except Exception as exc:
        logger.debug("Loading media_tools failed: %s", exc)

    # ── opendata_tools (OPENDATA_TOOLS) ────────────────────────────────────
    try:
        from agents.tools.opendata_tools import OPENDATA_TOOLS
        for t in OPENDATA_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("input_schema", {}), t["function"])
    except Exception as exc:
        logger.debug("Loading opendata_tools failed: %s", exc)

    # ── risk_tools (sin registro estándar) ─────────────────────────────────
    try:
        from agents.tools import risk_tools as rt
        _risk_specs = [
            ("search_risk_entities", rt.search_risk_entities,
             "Busca entidades de riesgo (personas, empresas, organizaciones) por nombre.",
             {"query": {"type": "string"},
              "k": {"type": "integer", "default": 10}}, ["query"]),
            ("get_entity_risk_profile", rt.get_entity_risk_profile,
             "Perfil completo de riesgo de una entidad: flags, relaciones, identidades.",
             {"entity_id": {"type": "integer"}}, ["entity_id"]),
            ("get_high_risk_relations", rt.get_high_risk_relations,
             "Subgrafo de relaciones de alto riesgo de una entidad.",
             {"entity_id": {"type": "integer"},
              "depth": {"type": "integer", "default": 2, "description": "1 o 2"}}, ["entity_id"]),
            ("get_top_risk_entities", rt.get_top_risk_entities,
             "Entidades con mayor risk_score.",
             {"limit": {"type": "integer", "default": 20}}, []),
            ("get_unverified_social_identities", rt.get_unverified_social_identities,
             "Identidades sociales candidatas pendientes de verificación humana.",
             {"limit": {"type": "integer", "default": 50}}, []),
            ("explain_risk_score", rt.explain_risk_score,
             "Explicación detallada del risk score de una entidad.",
             {"entity_id": {"type": "integer"}}, ["entity_id"]),
            ("get_geopolitical_exposure", rt.get_geopolitical_exposure,
             "Exposición geopolítica por país para el módulo de Geopolítica.",
             {}, []),
        ]
        for name, fn, desc, props, req in _risk_specs:
            _add(name, desc, {"type": "object", "properties": props, "required": req}, fn)
    except Exception as exc:
        logger.debug("Loading risk_tools failed: %s", exc)

    # ── security_tools (SECURITY_TOOLS: parameters loose dict) ─────────────
    try:
        from agents.tools.security_tools import SECURITY_TOOLS
        for t in SECURITY_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("parameters", {}), t["function"])
    except Exception as exc:
        logger.debug("Loading security_tools failed: %s", exc)

    # ── simulation_tools (SIMULATION_TOOLS + dispatch_simulation_tool) ─────
    try:
        from agents.tools.simulation_tools import (
            SIMULATION_TOOLS, dispatch_simulation_tool,
        )
        # Cada tool delega en dispatch_simulation_tool(name, args)
        for t in SIMULATION_TOOLS:
            name = t["name"]
            # Closure capturando el nombre
            def _make_handler(tool_name: str):
                def _handler(**kwargs):
                    return dispatch_simulation_tool(tool_name, kwargs)
                _handler.__name__ = f"_sim_{tool_name}"
                return _handler
            _add(name, t.get("description", ""), t.get("input_schema", {}), _make_handler(name))
    except Exception as exc:
        logger.debug("Loading simulation_tools failed: %s", exc)

    # ── system_tools (sin registro propio) ─────────────────────────────────
    try:
        from agents.tools import system_tools as st
        _system_specs = [
            ("get_ai_status", st.get_ai_status,
             "Estado del gateway LLM (Ollama, Chroma, embeddings, LiteLLM…).",
             {}, []),
            ("get_rag_status", st.get_rag_status,
             "Estado del RAG indexer: Chroma, documentos indexados, colecciones.",
             {}, []),
            ("get_recent_alerts", st.get_recent_alerts,
             "Alertas activas del sistema (legislativas + medios).",
             {"hours": {"type": "integer", "default": 24},
              "limit": {"type": "integer", "default": 20}}, []),
            ("get_pipeline_status", st.get_pipeline_status,
             "Estado de los pipelines ETL (BOE, Congreso, Media).",
             {}, []),
            ("get_data_health", st.get_data_health,
             "Health check de las tablas principales de datos.",
             {}, []),
        ]
        for name, fn, desc, props, req in _system_specs:
            _add(name, desc, {"type": "object", "properties": props, "required": req}, fn)
    except Exception as exc:
        logger.debug("Loading system_tools failed: %s", exc)

    # ── territorial_tools (TERRITORIAL_TOOLS) ──────────────────────────────
    try:
        from agents.tools.territorial_tools import TERRITORIAL_TOOLS
        for t in TERRITORIAL_TOOLS:
            _add(t["name"], t.get("description", ""), t.get("input_schema", {}), t["function"])
    except Exception as exc:
        logger.debug("Loading territorial_tools failed: %s", exc)

    return schemas, index


def _params_from_signature(fn: Callable) -> dict:
    """Genera un JSON Schema mínimo desde la firma de la función."""
    try:
        sig = inspect.signature(fn)
    except (ValueError, TypeError):
        return {"type": "object", "properties": {}, "required": []}

    properties: dict[str, dict] = {}
    required: list[str] = []

    type_map = {
        int: "integer",
        float: "number",
        str: "string",
        bool: "boolean",
        list: "array",
        dict: "object",
    }

    for pname, param in sig.parameters.items():
        if pname in ("self", "cls"):
            continue
        annot = param.annotation
        # Intentar mapear el tipo (best-effort)
        json_type = "string"
        if annot is not inspect.Parameter.empty:
            origin = getattr(annot, "__origin__", None)
            if origin is None and annot in type_map:
                json_type = type_map[annot]
            elif origin in type_map:
                json_type = type_map[origin]
        prop: dict[str, Any] = {"type": json_type}
        if param.default is not inspect.Parameter.empty:
            if param.default is not None:
                prop["default"] = param.default
        else:
            required.append(pname)
        properties[pname] = prop

    return {"type": "object", "properties": properties, "required": required}


# ─── Carga inicial ────────────────────────────────────────────────────────────


TOOLS_AGENTE, TOOLS_AGENTE_INDEX = _load_module_tools()


# ─── API pública ──────────────────────────────────────────────────────────────


def tools_agente_disponibles() -> list[str]:
    """Devuelve los nombres de todas las tools registradas."""
    return [s["function"]["name"] for s in TOOLS_AGENTE]


def schema_para_ollama() -> list[dict]:
    """Devuelve el catálogo OpenAI tool-use, listo para `ollama.chat(tools=...)`."""
    return TOOLS_AGENTE


def ejecutar_tool_agente(nombre: str, args: dict | None = None) -> str:
    """
    Ejecuta una herramienta por nombre y devuelve el resultado como JSON string.

    Args:
        nombre: nombre de la tool (debe coincidir con TOOLS_AGENTE_INDEX).
        args: kwargs a pasar a la función.

    Returns:
        JSON string. En caso de error: '{"error": "...", "herramienta": "..."}'.
    """
    if args is None:
        args = {}
    if not isinstance(args, dict):
        return _to_json({"error": "args debe ser un dict", "herramienta": nombre})

    fn = TOOLS_AGENTE_INDEX.get(nombre)
    if fn is None:
        return _to_json({"error": f"Herramienta desconocida: {nombre}", "herramienta": nombre})

    try:
        result = _invoke_tool(fn, dict(args))
        result = _truncate_result(result)
        return _to_json(result)
    except Exception as exc:
        logger.warning("Error ejecutando %s(%s): %s", nombre, args, exc)
        return _to_json({"error": str(exc), "herramienta": nombre})
