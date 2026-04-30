"""
LLM Local Service — Cerebro IA de ElectSim España
===================================================
Integra Ollama (politeia-brain / qwen2.5 / llama3.2) como motor de IA local
con RAG sobre datos del dashboard usando ChromaDB + nomic-embed-text.

Modelos disponibles (auto-detectados):
  - politeia-brain:latest  — modelo custom especializado en política española
  - qwen2.5:7b             — análisis general, multilingüe
  - llama3.2:3b            — respuestas rápidas
  - Claude API             — fallback cloud si ANTHROPIC_API_KEY

Funciones principales:
  - chat(mensaje, historia, contexto) → respuesta streaming
  - analizar_datos(datos_df, pregunta) → análisis inteligente de datos
  - resumir_noticias(noticias) → briefing ejecutivo
  - analizar_coalicion(escanos) → análisis político
  - generar_insight(tipo, datos) → insight contextual
  - indexar_datos(coleccion, docs) → RAG indexing
  - buscar_contexto(query, coleccion) → RAG retrieval
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Generator, Iterator

import pandas as pd

_ROOT = Path(__file__).parent.parent.parent

# ─── Constantes ──────────────────────────────────────────────────────────────

MODELO_BRAIN  = os.environ.get("ELECTSIM_OLLAMA_MODEL", "politeia-brain:latest")
MODELO_RAPIDO = os.environ.get("ELECTSIM_OLLAMA_FAST_MODEL", "llama3.2:3b")
MODELO_GENERAL = os.environ.get("ELECTSIM_OLLAMA_GENERAL_MODEL", "qwen2.5:7b")
MODELO_EMBED  = os.environ.get("ELECTSIM_OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")

# ── Parámetros de inferencia por modo ────────────────────────────────────────
_PARAMS_FAST = {
    "num_ctx":     int(os.environ.get("ELECTSIM_OLLAMA_NUM_CTX", "4096")),
    "num_predict": 256,
    "temperature": 0.2,
    "top_p":       0.85,
}
_PARAMS_NORMAL = {
    "num_ctx":     int(os.environ.get("ELECTSIM_OLLAMA_NUM_CTX", "8192")),
    "num_predict": int(os.environ.get("ELECTSIM_BACK_MANAGER_MAX_TOKENS", "700")),
    "temperature": 0.3,
    "top_p":       0.9,
}
_PARAMS_DEEP = {
    "num_ctx":     int(os.environ.get("ELECTSIM_OLLAMA_CTX_DEEP", "16384")),
    "num_predict": int(os.environ.get("ELECTSIM_OLLAMA_DEEP_TOKENS", "2048")),
    "temperature": 0.25,
    "top_p":       0.92,
    "repeat_penalty": 1.1,
}

SYSTEM_BRAIN = (
    "Eres Politeia Brain, el asistente de inteligencia electoral de ElectSim España. "
    "Eres un analista político senior especializado en: elecciones españolas, partidos políticos, "
    "encuestas demoscópicas, coaliciones, campaña electoral y economía política. "
    "Tienes acceso a datos en tiempo real del dashboard. Responde siempre en español, "
    "con rigor analítico, citando datos cuando los tengas disponibles. "
    "Sé conciso pero completo. Usa markdown para estructurar respuestas largas."
)

SYSTEM_ANALISTA = (
    "Eres un analista de datos políticos. Analiza los datos que se te proporcionan "
    "y extrae insights clave, tendencias y anomalías. Responde en español con precisión estadística."
)

# ─── Disponibilidad ──────────────────────────────────────────────────────────

_ollama_client = None
_chroma_client = None
_embed_fn = None
_status_cache: dict = {}
_status_ts: float = 0.0
_STATUS_TTL = 30.0  # segundos


def _get_ollama():
    global _ollama_client
    if _ollama_client is None:
        try:
            import ollama  # type: ignore
            _ollama_client = ollama
        except ImportError:
            pass
    return _ollama_client


def _get_chroma():
    global _chroma_client
    if _chroma_client is None:
        try:
            from agents.ai_engine import get_ai_engine

            _chroma_client = get_ai_engine().chroma
        except Exception:
            pass
    return _chroma_client


def disponible() -> dict[str, bool | str]:
    """Retorna estado de disponibilidad de todos los componentes de IA."""
    global _status_cache, _status_ts
    now = time.time()
    if now - _status_ts < _STATUS_TTL and _status_cache:
        return _status_cache

    resultado: dict[str, bool | str] = {}

    # Motor comun AIEngine
    try:
        from agents.ai_engine import get_ai_engine

        engine_status = get_ai_engine().status()
        resultado["engine"] = engine_status
        if engine_status.get("ollama"):
            resultado["ollama"] = True
            resultado["brain"] = str(engine_status.get("model") or "") == MODELO_BRAIN
            resultado["modelo_activo"] = str(engine_status.get("model") or MODELO_BRAIN)
            resultado["embed"] = str(engine_status.get("embedding_model") or "").split(":")[0] == MODELO_EMBED.split(":")[0]
            resultado["rag"] = bool(engine_status.get("chroma"))
    except Exception:
        resultado["engine"] = {}

    # Ollama
    ollama = _get_ollama()
    if ollama:
        try:
            modelos_raw = ollama.list()
            modelos = [m.model for m in modelos_raw.models]
            resultado["ollama"] = True
            resultado["modelos"] = modelos
            resultado["brain"]   = MODELO_BRAIN in modelos
            resultado["rapido"]  = MODELO_RAPIDO in modelos
            resultado["general"] = MODELO_GENERAL in modelos
            resultado["embed"]   = any(str(model).split(":")[0] == MODELO_EMBED.split(":")[0] for model in modelos)
            resultado["modelo_activo"] = (
                MODELO_BRAIN if MODELO_BRAIN in modelos
                else MODELO_GENERAL if MODELO_GENERAL in modelos
                else modelos[0] if modelos else ""
            )
        except Exception:
            resultado["ollama"] = bool(resultado.get("ollama"))
    else:
        resultado["ollama"] = bool(resultado.get("ollama"))

    # ChromaDB
    chroma = _get_chroma()
    resultado["rag"] = bool(resultado.get("rag")) or chroma is not None

    # Claude API fallback
    resultado["claude_api"] = bool(os.getenv("ANTHROPIC_API_KEY", "").strip())

    _status_cache = resultado
    _status_ts = now
    return resultado


def esta_disponible() -> bool:
    """True si hay al menos un modelo de lenguaje disponible."""
    s = disponible()
    return bool(s.get("ollama")) or bool(s.get("claude_api"))


def modelo_principal() -> str:
    """Retorna el mejor modelo disponible."""
    s = disponible()
    if s.get("brain"):
        return MODELO_BRAIN
    if s.get("general"):
        return MODELO_GENERAL
    if s.get("rapido"):
        return MODELO_RAPIDO
    return ""


# ─── Chat principal ──────────────────────────────────────────────────────────

def chat(
    mensaje: str,
    historia: list[dict] | None = None,
    contexto: str = "",
    modelo: str = "",
    sistema: str = "",
    stream: bool = False,
    modo: str = "normal",  # "fast" | "normal" | "deep"
) -> str | Generator[str, None, None]:
    """
    Envía un mensaje al modelo y retorna la respuesta.

    Args:
        mensaje: Mensaje del usuario
        historia: Lista de mensajes previos [{role, content}]
        contexto: Contexto adicional (datos del dashboard, noticias, etc.)
        modelo: Modelo a usar (auto si vacío)
        sistema: System prompt (usa SYSTEM_BRAIN si vacío)
        stream: Si True, retorna generator de tokens
        modo: 'fast' (256 tokens), 'normal' (700 tokens), 'deep' (2048 tokens)

    Returns:
        str con respuesta completa, o generator si stream=True
    """
    mod = modelo or modelo_principal()
    sys_prompt = sistema or SYSTEM_BRAIN

    if not mod:
        return _chat_claude(mensaje, historia, contexto, sys_prompt, stream)

    ollama = _get_ollama()
    if not ollama:
        return _chat_claude(mensaje, historia, contexto, sys_prompt, stream)

    params = {"fast": _PARAMS_FAST, "deep": _PARAMS_DEEP}.get(modo, _PARAMS_NORMAL)

    # Construir mensajes
    mensajes: list[dict] = [{"role": "system", "content": sys_prompt}]
    if contexto:
        # Truncar contexto según el num_ctx disponible para no sobrepasar el límite
        ctx_max = params["num_ctx"] - 1024
        ctx_truncado = contexto[:ctx_max * 3]  # aprox 3 chars/token
        mensajes.append({
            "role": "user",
            "content": f"[CONTEXTO DEL DASHBOARD]\n{ctx_truncado}\n[FIN CONTEXTO]",
        })
        mensajes.append({
            "role": "assistant",
            "content": "Entendido, tengo el contexto del dashboard. ¿En qué puedo ayudarte?",
        })

    if historia:
        # Filtrar solo roles válidos y últimos mensajes
        hist_valida = [
            m for m in historia
            if isinstance(m, dict) and m.get("role") in ("user", "assistant")
            and m.get("content", "").strip()
        ]
        mensajes.extend(hist_valida[-10:])

    mensajes.append({"role": "user", "content": mensaje})

    try:
        if stream:
            return _stream_ollama(ollama, mod, mensajes, params)
        else:
            resp = ollama.chat(
                model=mod,
                messages=mensajes,
                options=params,
                stream=False,
            )
            if hasattr(resp, "message"):
                return resp.message.content or ""
            if isinstance(resp, dict):
                return resp.get("message", {}).get("content", "")
            return str(resp)
    except Exception as exc:
        fallback = _chat_claude(mensaje, historia, contexto, sys_prompt, stream)
        return fallback if fallback else f"Error Ollama: {exc}"


def razonar(
    pregunta: str,
    contexto: str = "",
    sistema: str = "",
    pasos: list[str] | None = None,
) -> dict[str, str]:
    """
    Razonamiento profundo multi-paso con Ollama (chain-of-thought).
    Llama al modelo N veces con preguntas progresivas y devuelve cada paso.

    Args:
        pregunta: Pregunta principal
        contexto: Contexto del dashboard
        sistema: System prompt
        pasos: Lista de sub-preguntas (por defecto usa 3 pasos estándar)

    Returns:
        dict con las respuestas de cada paso: {"paso_1": "...", "paso_2": "...", ...}
    """
    sys_p = sistema or SYSTEM_BRAIN
    pasos_default = [
        f"Analiza los hechos disponibles sobre: {pregunta}",
        f"¿Cuáles son las implicaciones y consecuencias de lo anterior?",
        f"¿Qué recomendaciones o predicciones puedes hacer sobre: {pregunta}?",
    ]
    pasos_usar = pasos or pasos_default
    resultados: dict[str, str] = {}
    historia_interna: list[dict] = []

    for i, paso in enumerate(pasos_usar, start=1):
        resp = chat(
            paso,
            historia=historia_interna,
            contexto=contexto if i == 1 else "",
            sistema=sys_p,
            modo="deep",
        )
        texto = str(resp) if resp else ""
        resultados[f"paso_{i}"] = texto
        if texto:
            historia_interna.append({"role": "user", "content": paso})
            historia_interna.append({"role": "assistant", "content": texto[:800]})

    return resultados


def optimizar_modulo(
    modulo: str,
    datos_resumen: str,
    pregunta_especifica: str = "",
) -> str:
    """
    El brain analiza los datos de un módulo y sugiere optimizaciones
    o detecta anomalías que el analista debe revisar.
    """
    prompt = (
        f"Analiza los datos del módulo '{modulo}' del dashboard de inteligencia política. "
        f"{pregunta_especifica or 'Detecta anomalías, tendencias y genera recomendaciones accionables.'}\n\n"
        f"DATOS:\n{datos_resumen[:2000]}"
    )
    return chat(prompt, sistema=SYSTEM_BRAIN, modo="normal")


def _stream_ollama(ollama, modelo: str, mensajes: list, params: dict) -> Generator[str, None, None]:
    """Generator que hace streaming de tokens desde Ollama."""
    try:
        stream = ollama.chat(
            model=modelo,
            messages=mensajes,
            options=params,
            stream=True,
        )
        for chunk in stream:
            if hasattr(chunk, "message"):
                token = chunk.message.content
            elif isinstance(chunk, dict):
                token = chunk.get("message", {}).get("content", "")
            else:
                token = ""
            if token:
                yield token
    except Exception as exc:
        yield f"\n[Error de streaming: {exc}]"


def _chat_claude(
    mensaje: str,
    historia: list | None,
    contexto: str,
    sistema: str,
    stream: bool,
) -> str:
    """Fallback a Claude API cuando Ollama no está disponible."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "⚠️ Sin modelo disponible. Configura ANTHROPIC_API_KEY o inicia Ollama."
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        msgs = []
        if contexto:
            msgs.append({"role": "user", "content": f"[CONTEXTO]\n{contexto}\n[FIN]"})
            msgs.append({"role": "assistant", "content": "Contexto recibido."})
        if historia:
            msgs.extend(historia[-10:])
        msgs.append({"role": "user", "content": mensaje})
        resp = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            max_tokens=1024,
            system=sistema,
            messages=msgs,
        )
        return resp.content[0].text if resp.content else ""
    except Exception as e:
        return f"Error Claude API: {e}"


# ─── Análisis de datos ────────────────────────────────────────────────────────

def analizar_datos(
    df: pd.DataFrame,
    pregunta: str = "Analiza estos datos y extrae los insights más importantes.",
    modelo: str = "",
) -> str:
    """
    Analiza un DataFrame con el modelo de IA y responde la pregunta.
    Convierte el DataFrame a un resumen textual antes de enviarlo al modelo.
    """
    if df is None or df.empty:
        return "No hay datos para analizar."

    # Generar resumen estadístico del DataFrame
    resumen = _df_to_context(df)
    return chat(pregunta, contexto=resumen, modelo=modelo, sistema=SYSTEM_ANALISTA)


def _df_to_context(df: pd.DataFrame, max_rows: int = 20) -> str:
    """Convierte un DataFrame a texto contextual para el LLM."""
    lines = [
        f"Dataset: {len(df)} filas × {len(df.columns)} columnas",
        f"Columnas: {', '.join(df.columns.tolist())}",
        "",
        "Estadísticas:",
    ]
    try:
        num_cols = df.select_dtypes("number").columns.tolist()
        if num_cols:
            stats = df[num_cols].describe().round(2)
            lines.append(stats.to_string())
    except Exception:
        pass

    lines.append("\nÚltimas filas:")
    try:
        lines.append(df.tail(min(max_rows, len(df))).to_string(index=False))
    except Exception:
        pass

    return "\n".join(lines)


# ─── Análisis político especializado ─────────────────────────────────────────

def resumir_noticias(noticias: list[dict], max_noticias: int = 15) -> str:
    """Genera un briefing ejecutivo a partir de una lista de noticias."""
    if not noticias:
        return "No hay noticias disponibles."

    muestra = noticias[:max_noticias]
    texto = "\n".join([
        f"- [{n.get('medio','?')}] {n.get('titulo','')}: {n.get('resumen','')[:200]}"
        for n in muestra
    ])

    prompt = (
        f"Resume estas {len(muestra)} noticias políticas españolas en un briefing ejecutivo. "
        f"Estructura: 1) Tema principal, 2) Tendencias clave, 3) Partidos involucrados, "
        f"4) Vectores de riesgo.\n\nNOTICIAS:\n{texto}"
    )
    return chat(prompt, sistema=SYSTEM_BRAIN)


def analizar_coalicion(escanos: dict[str, int]) -> str:
    """Analiza un resultado electoral y sus posibles coaliciones."""
    total = sum(escanos.values())
    mayoria = total // 2 + 1
    datos = json.dumps(escanos, ensure_ascii=False)

    prompt = (
        f"Analiza este resultado electoral del Congreso (total: {total} escaños, "
        f"mayoría absoluta: {mayoria}):\n{datos}\n\n"
        "Responde: 1) ¿Quién tiene más opciones de gobernar? "
        "2) Coaliciones posibles con sus dificultades, "
        "3) Escenarios de bloqueo, "
        "4) Predicción de escenario más probable."
    )
    return chat(prompt, sistema=SYSTEM_BRAIN)


def generar_insight(tipo: str, datos: dict | str) -> str:
    """
    Genera un insight contextual según el tipo de análisis.

    tipo: 'sondeo' | 'tendencia' | 'economia' | 'campaña' | 'institucional'
    """
    prompts = {
        "sondeo": "Analiza esta encuesta electoral y da 3 insights clave para un consultor:",
        "tendencia": "¿Qué explica esta tendencia electoral? Dame hipótesis y factores causales:",
        "economia": "¿Cómo afectan estos datos económicos al panorama electoral español?",
        "campaña": "Como consultor de campaña, ¿qué oportunidades y riesgos ves en estos datos?",
        "institucional": "Analiza esta actividad parlamentaria desde una perspectiva de gobernabilidad:",
    }
    base = prompts.get(tipo, "Analiza estos datos políticos:")
    datos_str = json.dumps(datos, ensure_ascii=False, default=str) if isinstance(datos, dict) else str(datos)
    return chat(f"{base}\n\n{datos_str[:2000]}", sistema=SYSTEM_BRAIN)


def evaluar_partido(partido: str, datos_contexto: str = "") -> str:
    """Genera un análisis DAFO rápido de un partido político."""
    prompt = (
        f"Haz un análisis DAFO conciso del {partido} en el contexto político español actual. "
        f"{'Contexto adicional: ' + datos_contexto if datos_contexto else ''}"
        "\nFormato: tabla markdown con Fortalezas | Debilidades | Oportunidades | Amenazas"
    )
    return chat(prompt, sistema=SYSTEM_BRAIN)


# ─── RAG — Retrieval Augmented Generation ────────────────────────────────────

def _get_embedding(texto: str) -> list[float] | None:
    """Obtiene embedding con nomic-embed-text via Ollama."""
    try:
        from agents.ai_engine import get_ai_engine

        return get_ai_engine().embed([texto[:2000]])[0]
    except Exception:
        return None


def indexar_datos(
    coleccion: str,
    documentos: list[str],
    metadatos: list[dict] | None = None,
    ids: list[str] | None = None,
) -> bool:
    """
    Indexa documentos en ChromaDB para búsqueda semántica.

    Args:
        coleccion: Nombre de la colección (ej: 'noticias', 'sondeos', 'congreso')
        documentos: Lista de textos a indexar
        metadatos: Lista de dicts con metadata por documento
        ids: IDs únicos (se generan automáticamente si no se proporcionan)
    """
    chroma = _get_chroma()
    if not chroma or not documentos:
        return False

    try:
        col = chroma.get_or_create_collection(
            name=coleccion,
            metadata={"hnsw:space": "cosine"},
        )

        # Generar IDs si no se proporcionan
        if not ids:
            ids = [
                hashlib.md5(doc[:100].encode()).hexdigest()[:16]
                for doc in documentos
            ]

        metas = metadatos or [{"indexed_at": datetime.now().isoformat()} for _ in documentos]

        # Intentar con embeddings de Ollama primero
        embeddings = None
        s = disponible()
        if s.get("embed"):
            ollama = _get_ollama()
            embs = []
            for doc in documentos:
                emb = _get_embedding(doc)
                if emb:
                    embs.append(emb)
                else:
                    embs = []  # Si falla uno, usar embeddings de Chroma
                    break
            if embs:
                embeddings = embs

        if embeddings:
            col.upsert(
                documents=documentos,
                embeddings=embeddings,
                metadatas=metas,
                ids=ids,
            )
        else:
            # Chroma usa su propio modelo de embeddings
            col.upsert(
                documents=documentos,
                metadatas=metas,
                ids=ids,
            )
        return True
    except Exception:
        return False


def buscar_contexto(
    query: str,
    coleccion: str = "general",
    n_resultados: int = 5,
) -> list[dict]:
    """
    Busca documentos relevantes en ChromaDB (RAG retrieval).

    Returns:
        Lista de dicts con {documento, metadata, distancia}
    """
    chroma = _get_chroma()
    if not chroma:
        return []

    try:
        col = chroma.get_or_create_collection(name=coleccion)

        # Usar embedding de Ollama para la query
        query_emb = _get_embedding(query)

        if query_emb:
            results = col.query(
                query_embeddings=[query_emb],
                n_results=min(n_resultados, col.count() or 1),
            )
        else:
            results = col.query(
                query_texts=[query],
                n_results=min(n_resultados, col.count() or 1),
            )

        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]

        return [
            {"documento": d, "metadata": m, "distancia": round(float(dist), 4)}
            for d, m, dist in zip(docs, metas, dists)
        ]
    except Exception:
        return []


def chat_con_rag(
    mensaje: str,
    colecciones: list[str] | None = None,
    historia: list[dict] | None = None,
    modelo: str = "",
) -> str:
    """
    Chat con RAG: busca contexto relevante antes de responder.

    Args:
        mensaje: Pregunta del usuario
        colecciones: Colecciones a consultar (todas si None)
        historia: Historia del chat
        modelo: Modelo a usar
    """
    cols = colecciones or ["noticias", "sondeos", "congreso", "general"]
    fragmentos: list[str] = []

    for col in cols:
        resultados = buscar_contexto(mensaje, col, n_resultados=3)
        for r in resultados:
            if r["distancia"] < 0.8:  # Solo resultados relevantes
                fragmentos.append(
                    f"[{col.upper()} | distancia={r['distancia']}]\n{r['documento']}"
                )

    contexto = "\n\n---\n".join(fragmentos[:8]) if fragmentos else ""
    return chat(mensaje, historia=historia, contexto=contexto, modelo=modelo)


# ─── Análisis autónomo (para background tasks) ───────────────────────────────

def analisis_autonomo_semanal(datos_dashboard: dict) -> dict:
    """
    Análisis semanal autónomo de todos los datos del dashboard.
    Diseñado para ejecutarse como tarea programada.

    Returns:
        {
          "briefing": str,
          "alertas": list[str],
          "tendencias": str,
          "recomendaciones": str,
          "timestamp": str,
        }
    """
    ts = datetime.now().isoformat()

    resumen_datos = json.dumps(datos_dashboard, ensure_ascii=False, default=str, indent=2)[:3000]

    briefing = chat(
        f"Genera el briefing político semanal basado en estos datos:\n{resumen_datos}",
        sistema=SYSTEM_BRAIN,
    )

    tendencias = chat(
        f"Identifica las 5 tendencias electorales más importantes esta semana:\n{resumen_datos}",
        sistema=SYSTEM_ANALISTA,
    )

    return {
        "briefing": briefing,
        "tendencias": tendencias,
        "alertas": [],
        "timestamp": ts,
    }


# ─── Función de contexto del dashboard ───────────────────────────────────────

def construir_contexto_dashboard(
    sondeos: pd.DataFrame | None = None,
    noticias: list[dict] | None = None,
    escanos: dict | None = None,
    indicadores_eco: dict | None = None,
) -> str:
    """
    Construye un contexto textual del estado actual del dashboard
    para enriquecer las respuestas del chatbot.
    """
    partes: list[str] = [
        f"=== CONTEXTO ELECTSIM — {datetime.now().strftime('%d/%m/%Y %H:%M')} ===",
    ]

    if sondeos is not None and not sondeos.empty:
        partes.append("\n[ENCUESTAS RECIENTES]")
        try:
            ultimas = sondeos.tail(3)
            partes.append(ultimas.to_string(index=False))
        except Exception:
            pass

    if escanos:
        partes.append("\n[ESTIMACIÓN DE ESCAÑOS]")
        total = sum(escanos.values())
        partes.append(f"Total: {total} | Mayoría: {total//2+1}")
        for p, e in sorted(escanos.items(), key=lambda x: -x[1]):
            partes.append(f"  {p}: {e} escaños")

    if noticias:
        partes.append(f"\n[ÚLTIMAS NOTICIAS — {len(noticias)} artículos]")
        for n in noticias[:5]:
            partes.append(f"  • [{n.get('medio','?')}] {n.get('titulo','')[:100]}")

    if indicadores_eco:
        partes.append("\n[INDICADORES ECONÓMICOS]")
        for k, v in list(indicadores_eco.items())[:6]:
            partes.append(f"  {k}: {v}")

    return "\n".join(partes)


# ─── Tool-use con herramientas legislativas ───────────────────────────────────

def chat_legislativo(
    mensaje: str,
    historia: list[dict] | None = None,
    contexto: str = "",
    modelo: str = "",
    herramientas: list[str] | None = None,
) -> str:
    """
    Chat con acceso automático a herramientas legislativas:
    BOE, EUR-Lex, AI Act, Congreso votaciones, mapa de actores.

    El modelo decide qué herramientas usar para responder la pregunta.
    Si Ollama no soporta tool-use, cae a chat() normal con contexto enriquecido.

    Args:
        mensaje: Pregunta del usuario
        historia: Historial de conversación
        contexto: Contexto adicional del dashboard
        modelo: Modelo Ollama (auto si vacío)
        herramientas: Lista de herramientas a exponer (todas si None)

    Returns:
        Respuesta final como string
    """
    try:
        from services.llm_tools_registry import chat_con_herramientas
        return chat_con_herramientas(
            mensaje=mensaje,
            historia=historia,
            contexto=contexto,
            modelo=modelo,
            herramientas=herramientas,
        )
    except ImportError:
        return chat(mensaje, historia=historia, contexto=contexto, modelo=modelo)


def briefing_diario() -> str:
    """
    Genera el briefing legislativo del día usando todas las herramientas.
    Diseñado para ejecutarse en el scheduler matutino.
    """
    try:
        from services.llm_tools_registry import briefing_legislativo_matutino
        briefing_raw = briefing_legislativo_matutino()
        # Enriquecer con comentario del brain
        comentario = chat(
            f"Analiza y comenta en 3 bullet points este briefing legislativo:\n\n{briefing_raw}",
            sistema=SYSTEM_BRAIN,
            modo="fast",
        )
        return f"{briefing_raw}\n\n---\n### 🤖 Análisis Politeia Brain\n{comentario}"
    except Exception as e:
        return f"Error generando briefing: {e}"
