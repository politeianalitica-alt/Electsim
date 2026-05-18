"""
ReactAgent — Orquestador agéntico con loop ReAct (Reasoning + Acting).

Patrón clásico Yao et al. 2022:
  Thought  → razonamiento sobre el estado actual y qué hacer
  Action   → invocación de una tool con argumentos
  Observation → resultado de la tool (devuelto al modelo)
  → iterar hasta Final Answer o agotar iteraciones

Tools disponibles:
  1. query_database(sql)      — ejecuta SELECT sobre PostgreSQL (db/session)
  2. search_context(query)    — RAG ChromaDB via agents.rag_retriever
  3. run_sentiment(text)      — agents.sentiment_pipeline.analyze_sentiment
  4. run_simulation(tipo, p)  — agents.simulador_campana.evaluar_mensaje
  5. get_media_summary(topic) — agents.mediatico.sentimiento_agent
  6. write_report(content)    — formatea informe político ejecutivo

El agente decide qué tool usar a partir de la query.
LLM por defecto: get_llm_client() — usa ELECTSIM_LLM_PROVIDER del .env.
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from agents.llm import get_llm_client

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# TOOLS · cada función captura excepciones y devuelve observación legible
# ──────────────────────────────────────────────────────────────────────


def _tool_query_database(sql: str) -> str:
    """Ejecuta una consulta SELECT sobre la BD principal. Solo SELECT permitido."""
    sql = (sql or "").strip()
    if not sql:
        return "Error: SQL vacío"
    # Sanitización: solo permitimos SELECT por seguridad
    forbidden = ("insert ", "update ", "delete ", "drop ", "truncate ", "alter ", "create ", "grant ", "revoke ")
    sql_lower = sql.lower().lstrip()
    if not sql_lower.startswith("select") and not sql_lower.startswith("with"):
        return f"Error: solo se permiten consultas SELECT/WITH (recibido: '{sql[:50]}...')"
    if any(f in sql_lower for f in forbidden):
        return "Error: detectada operación DML/DDL no permitida (solo SELECT)"
    try:
        from db.session import get_engine
        from sqlalchemy import text as sql_text
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(sql_text(sql))
            rows = result.fetchmany(50)  # cap a 50 filas
            cols = list(result.keys())
            if not rows:
                return f"Consulta ejecutada · 0 filas. Columnas: {', '.join(cols)}"
            # Formato compacto
            lines = [" | ".join(cols)]
            lines.append(" | ".join("-" * max(3, len(c)) for c in cols))
            for r in rows:
                lines.append(" | ".join(str(v)[:50] if v is not None else "NULL" for v in r))
            return "\n".join(lines)
    except ImportError as e:
        return f"Error: base de datos no disponible ({e})"
    except Exception as e:
        return f"Error ejecutando SQL: {type(e).__name__}: {str(e)[:200]}"


def _tool_search_context(query: str) -> str:
    """Recupera contexto relevante de ChromaDB."""
    query = (query or "").strip()
    if not query:
        return "Error: query vacía"
    try:
        # Intentar usar RAG retriever existente
        from agents import rag_retriever  # noqa: F401
        # rag_retriever.py expone construir_extra_context que requiere engine + cluster
        # Para uso genérico de búsqueda, intentamos ChromaDB directo
        try:
            import chromadb  # type: ignore
            from pathlib import Path
            root = Path(__file__).resolve().parent.parent.parent
            db_path = root / ".chroma_db"
            if not db_path.exists():
                return "Sin contexto: ChromaDB no inicializada en .chroma_db"
            client = chromadb.PersistentClient(path=str(db_path))
            collections = client.list_collections()
            if not collections:
                return "Sin contexto: ChromaDB sin colecciones indexadas"
            # Buscar en la primera colección disponible
            col = collections[0]
            results = col.query(query_texts=[query], n_results=5)
            docs = results.get("documents", [[]])[0] if results else []
            if not docs:
                return f"Sin resultados relevantes para: '{query[:80]}'"
            return "Contexto encontrado:\n" + "\n---\n".join(str(d)[:300] for d in docs[:3])
        except ImportError:
            return f"Sin contexto disponible (chromadb no instalado). Query era: '{query[:80]}'"
    except Exception as e:
        return f"Error en búsqueda RAG: {type(e).__name__}: {str(e)[:200]}"


def _tool_run_sentiment(text: str) -> str:
    """Analiza sentimiento de un texto con la pipeline existente."""
    text = (text or "").strip()
    if not text:
        return "Error: texto vacío"
    try:
        from agents.sentiment_pipeline import analyze_sentiment
        result = analyze_sentiment(text[:2000])
        if not isinstance(result, dict):
            return f"Resultado: {result}"
        label = result.get("label", "neutral")
        score = result.get("score", 0.0)
        backend = result.get("backend", "?")
        scores = result.get("scores", {})
        sd = ", ".join(f"{k}={v:.2f}" for k, v in scores.items()) if isinstance(scores, dict) else ""
        return f"Sentimiento: {label} (score={score:.2f}, backend={backend}){' · ' + sd if sd else ''}"
    except ImportError as e:
        return f"Error: sentiment_pipeline no disponible ({e})"
    except Exception as e:
        return f"Error análisis sentimiento: {type(e).__name__}: {str(e)[:200]}"


def _tool_run_simulation(tipo: str, params: dict) -> str:
    """Invoca una simulación de campaña."""
    tipo = (tipo or "campana").strip().lower()
    if not isinstance(params, dict):
        params = {}
    try:
        if tipo in ("campana", "campaign", "mensaje"):
            from agents.simulador_campana import evaluar_mensaje, MensajeCampana
            from db.session import get_engine
            mensaje_text = str(params.get("mensaje", params.get("text", "")))
            if not mensaje_text:
                return "Error: parámetro 'mensaje' requerido para simulación de campaña"
            mensaje = MensajeCampana(
                texto=mensaje_text,
                emisor=str(params.get("emisor", "Partido")),
                tema=str(params.get("tema", "general")),
                framing=str(params.get("framing", "neutro")),
                tono=str(params.get("tono", "neutro")),
                emocion=str(params.get("emocion", "neutra")),
            )
            engine = get_engine()
            resultado = evaluar_mensaje(engine, mensaje, n_perfiles=int(params.get("n_perfiles", 50)))
            return f"Simulación campaña ejecutada · {resultado}" if resultado else "Simulación ejecutada sin resultado claro"
        return f"Tipo de simulación '{tipo}' no implementado. Tipos disponibles: campana"
    except ImportError as e:
        return f"Error: módulo simulación no disponible ({e})"
    except Exception as e:
        return f"Error simulación: {type(e).__name__}: {str(e)[:200]}"


def _tool_get_media_summary(topic: str) -> str:
    """Resumen mediático sobre un tema."""
    topic = (topic or "").strip()
    if not topic:
        return "Error: tema vacío"
    try:
        # Combinación de sentimiento + framing si disponibles
        from agents.sentiment_pipeline import analyze_sentiment
        sent = analyze_sentiment(topic[:1000])
        backend = sent.get("backend", "?") if isinstance(sent, dict) else "?"
        label = sent.get("label", "neutral") if isinstance(sent, dict) else "neutral"
        score = sent.get("score", 0.0) if isinstance(sent, dict) else 0.0
        out = [
            f"Resumen mediático sobre '{topic[:60]}':",
            f"  · Sentimiento agregado: {label} (score={score:.2f}, backend={backend})",
        ]
        # Si hay BD, intentar contar noticias recientes
        try:
            from db.session import get_engine
            from sqlalchemy import text as sql_text
            engine = get_engine()
            with engine.connect() as conn:
                q = sql_text("""
                    SELECT COUNT(*) AS n
                    FROM noticias_clusterizadas
                    WHERE LOWER(titular || ' ' || COALESCE(descripcion,'')) LIKE :q
                      AND fecha_publicacion > NOW() - INTERVAL '30 days'
                """)
                row = conn.execute(q, {"q": f"%{topic.lower()}%"}).fetchone()
                if row:
                    out.append(f"  · Cobertura últimos 30 días: {row[0]} noticias en BD")
        except Exception:
            pass
        return "\n".join(out)
    except ImportError:
        return f"Resumen mediático no disponible para '{topic[:60]}'. Módulos no instalados."
    except Exception as e:
        return f"Error en resumen mediático: {type(e).__name__}: {str(e)[:200]}"


def _tool_write_report(content: str) -> str:
    """Formatea informe ejecutivo político."""
    content = (content or "").strip()
    if not content:
        return "Error: contenido vacío"
    fecha = time.strftime("%Y-%m-%d %H:%M")
    lines = [
        f"# INFORME EJECUTIVO · POLITEIA",
        f"**Fecha:** {fecha}",
        f"**Generado por:** ReactAgent (Groq LLaMA 3.3 70B)",
        "",
        "---",
        "",
        content,
        "",
        "---",
        "_Informe generado automáticamente. Verificar datos críticos con fuente primaria._",
    ]
    return "\n".join(lines)


# Registro de tools accesibles al agente
TOOLS: dict[str, dict[str, Any]] = {
    "query_database": {
        "fn": _tool_query_database,
        "desc": "Ejecuta una consulta SELECT/WITH sobre la BD PostgreSQL. Argumento: SQL como string.",
        "args": ["sql: str"],
    },
    "search_context": {
        "fn": _tool_search_context,
        "desc": "Busca contexto relevante en la base vectorial ChromaDB. Argumento: query semántica.",
        "args": ["query: str"],
    },
    "run_sentiment": {
        "fn": _tool_run_sentiment,
        "desc": "Analiza el sentimiento (positivo/negativo/neutral) de un texto.",
        "args": ["text: str"],
    },
    "run_simulation": {
        "fn": lambda tipo, params: _tool_run_simulation(tipo, params),
        "desc": "Ejecuta simulación de campaña electoral. Args: tipo ('campana') y params dict con 'mensaje', 'emisor', 'tema', 'tono'.",
        "args": ["tipo: str", "params: dict"],
    },
    "get_media_summary": {
        "fn": _tool_get_media_summary,
        "desc": "Resumen mediático agregado sobre un tema (sentimiento + cobertura).",
        "args": ["topic: str"],
    },
    "write_report": {
        "fn": _tool_write_report,
        "desc": "Genera un informe ejecutivo formateado en Markdown a partir de un análisis.",
        "args": ["content: str"],
    },
}


# ──────────────────────────────────────────────────────────────────────
# PROMPT SYSTEM · instrucciones ReAct para el modelo
# ──────────────────────────────────────────────────────────────────────

REACT_SYSTEM_PROMPT = """Eres un agente analítico político experto en España, integrado en la plataforma Politeia Analítica.

Tu trabajo: responder consultas sobre política, elecciones, opinión pública, narrativas mediáticas, simulaciones electorales y análisis institucional.

DISPONES DE LAS SIGUIENTES HERRAMIENTAS (tools):
{tools_desc}

PROTOCOLO ReAct estricto · responde EXCLUSIVAMENTE con este formato:

Thought: [tu razonamiento sobre qué hacer]
Action: [nombre_tool]
Action Input: [JSON con los argumentos · ej: {{"sql": "SELECT ..."}} o {{"query": "..."}} o {{"text": "..."}}]

Cuando recibas una Observation, vuelves a generar Thought + Action + Action Input, o terminas con:

Thought: [conclusión]
Final Answer: [respuesta final en español, clara y orientada al usuario político/analista]

REGLAS:
- Una sola Action por turno
- Action Input SIEMPRE en formato JSON válido
- Si una tool falla, intenta otra o concluye con la información disponible
- Máximo 10 iteraciones · sé eficiente
- La respuesta final debe ser concisa pero completa, en español
- Usa write_report SOLO al final si el usuario pidió explícitamente un informe formal"""


# ──────────────────────────────────────────────────────────────────────
# AGENT · loop ReAct
# ──────────────────────────────────────────────────────────────────────


@dataclass
class AgentStep:
    iteration: int
    thought: str
    action: str | None
    action_input: dict[str, Any] | None
    observation: str | None
    final_answer: str | None = None


@dataclass
class AgentResult:
    answer: str
    steps: list[AgentStep] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)
    iterations: int = 0
    error: str | None = None


class ReactAgent:
    """Loop ReAct sobre el LLM configurado (Groq/OpenAI/Anthropic/Ollama)."""

    def __init__(
        self,
        llm_client: Any | None = None,
        max_iterations: int = 10,
        temperature: float = 0.3,
    ) -> None:
        self.llm = llm_client or get_llm_client()
        self.max_iterations = max_iterations
        self.temperature = temperature
        self.tools = TOOLS

    def _format_tools_desc(self) -> str:
        lines = []
        for name, t in self.tools.items():
            lines.append(f"- **{name}**({', '.join(t['args'])}): {t['desc']}")
        return "\n".join(lines)

    def _build_system_prompt(self) -> str:
        return REACT_SYSTEM_PROMPT.format(tools_desc=self._format_tools_desc())

    @staticmethod
    def _parse_response(text: str) -> tuple[str, str | None, dict[str, Any] | None, str | None]:
        """Parsea Thought/Action/Action Input/Final Answer del LLM."""
        thought = ""
        action = None
        action_input: dict[str, Any] | None = None
        final_answer = None

        # Thought
        m = re.search(r"Thought:\s*(.+?)(?=Action:|Final Answer:|$)", text, re.DOTALL | re.IGNORECASE)
        if m:
            thought = m.group(1).strip()

        # Final Answer (si existe, ignoramos action)
        m = re.search(r"Final Answer:\s*(.+?)$", text, re.DOTALL | re.IGNORECASE)
        if m:
            final_answer = m.group(1).strip()
            return thought, None, None, final_answer

        # Action
        m = re.search(r"Action:\s*(.+?)(?=Action Input:|$)", text, re.DOTALL | re.IGNORECASE)
        if m:
            action = m.group(1).strip().split("\n")[0].strip()

        # Action Input (JSON)
        m = re.search(r"Action Input:\s*(.+?)(?=Thought:|Observation:|$)", text, re.DOTALL | re.IGNORECASE)
        if m:
            raw = m.group(1).strip()
            # Limpiar fenced code
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            try:
                action_input = json.loads(raw)
            except json.JSONDecodeError:
                # Fallback: tratar como dict simple {key: value}
                action_input = {"input": raw}

        return thought, action, action_input, final_answer

    def _invoke_tool(self, action: str, action_input: dict[str, Any]) -> str:
        """Invoca una tool con manejo de excepciones."""
        action = action.strip().lower().replace(" ", "_")
        if action not in self.tools:
            return f"Error: tool desconocida '{action}'. Disponibles: {', '.join(self.tools.keys())}"
        tool = self.tools[action]
        try:
            # Mapeo de argumentos para tools especiales
            if action == "query_database":
                return str(tool["fn"](action_input.get("sql", action_input.get("input", ""))))
            if action == "search_context":
                return str(tool["fn"](action_input.get("query", action_input.get("input", ""))))
            if action == "run_sentiment":
                return str(tool["fn"](action_input.get("text", action_input.get("input", ""))))
            if action == "run_simulation":
                tipo = action_input.get("tipo", "campana")
                params = action_input.get("params", action_input)
                return str(tool["fn"](tipo, params))
            if action == "get_media_summary":
                return str(tool["fn"](action_input.get("topic", action_input.get("input", ""))))
            if action == "write_report":
                return str(tool["fn"](action_input.get("content", action_input.get("input", ""))))
            # Fallback genérico
            return str(tool["fn"](**action_input))
        except TypeError as e:
            return f"Error: argumentos inválidos para '{action}': {str(e)[:200]}"
        except Exception as e:
            logger.exception("Error en tool %s", action)
            return f"Error inesperado en tool '{action}': {type(e).__name__}: {str(e)[:200]}"

    def run(self, query: str, context: str | None = None) -> AgentResult:
        """Ejecuta el loop ReAct hasta Final Answer o agotar max_iterations."""
        if not query or not query.strip():
            return AgentResult(answer="Error: query vacía", error="empty_query")

        system = self._build_system_prompt()
        user_msg = query.strip()
        if context:
            user_msg = f"Contexto adicional:\n{context.strip()}\n\nConsulta: {query.strip()}"

        messages: list[dict[str, str]] = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ]

        result = AgentResult(answer="")
        scratchpad = ""  # Historial Thought/Action/Observation acumulado

        for i in range(1, self.max_iterations + 1):
            # Componer mensaje con scratchpad si hay
            messages_iter = list(messages)
            if scratchpad:
                messages_iter.append({"role": "assistant", "content": scratchpad})

            try:
                raw = self.llm.complete(messages_iter, temperature=self.temperature, max_tokens=2048)
            except Exception as e:
                logger.exception("Error LLM en iteración %d", i)
                result.error = f"llm_error: {type(e).__name__}: {str(e)[:200]}"
                result.iterations = i
                result.answer = f"El agente no pudo completar la consulta · {result.error}"
                return result

            thought, action, action_input, final_answer = self._parse_response(raw)

            step = AgentStep(iteration=i, thought=thought, action=action,
                             action_input=action_input, observation=None, final_answer=final_answer)

            if final_answer:
                step.final_answer = final_answer
                result.steps.append(step)
                result.answer = final_answer
                result.iterations = i
                return result

            if not action:
                # El modelo no devolvió ni Action ni Final Answer · forzar respuesta
                step.observation = "(no action parsed)"
                result.steps.append(step)
                result.answer = thought or raw
                result.iterations = i
                return result

            # Ejecutar tool
            observation = self._invoke_tool(action, action_input or {})
            step.observation = observation
            result.steps.append(step)
            if action and action not in result.tools_used:
                result.tools_used.append(action)

            # Acumular en scratchpad para próxima iteración
            scratchpad += f"\nThought: {thought}\nAction: {action}\nAction Input: {json.dumps(action_input or {}, ensure_ascii=False)}\nObservation: {observation[:1500]}\n"

        # Agotadas iteraciones
        result.iterations = self.max_iterations
        result.answer = f"Agotadas {self.max_iterations} iteraciones sin respuesta final. Última observación: {result.steps[-1].observation if result.steps else 'n/a'}"
        result.error = "max_iterations_exceeded"
        return result


# ──────────────────────────────────────────────────────────────────────
# UTILIDAD para CLI/tests
# ──────────────────────────────────────────────────────────────────────


def run_query(query: str, context: str | None = None, max_iter: int = 10) -> dict[str, Any]:
    """Helper sincrónico que devuelve dict listo para serializar."""
    agent = ReactAgent(max_iterations=max_iter)
    result = agent.run(query, context=context)
    return {
        "answer": result.answer,
        "steps": [
            {
                "iteration": s.iteration,
                "thought": s.thought,
                "action": s.action,
                "action_input": s.action_input,
                "observation": (s.observation or "")[:1000],
                "final_answer": s.final_answer,
            }
            for s in result.steps
        ],
        "tools_used": result.tools_used,
        "iterations": result.iterations,
        "error": result.error,
    }


if __name__ == "__main__":
    import sys
    q = " ".join(sys.argv[1:]) or "¿Cuál es la situación política actual en España?"
    print(f"Query: {q}\n")
    out = run_query(q)
    print(f"Iteraciones: {out['iterations']}")
    print(f"Tools usadas: {out['tools_used']}")
    print(f"\n=== RESPUESTA ===\n{out['answer']}")
