"""
Geo Enricher — Enriquecimiento geopolítico con Ollama local.
Integra con llm_local.py (patrón existente del proyecto).
Usa Ollama como motor principal, con fallback a Claude API.

Funciones principales:
  - enriquecer_item(item) → añade resumen, categoría, NER, relevancia LLM
  - analizar_impacto(item) → genera análisis de impacto en España
  - generar_briefing_diario(items, alertas) → briefing ejecutivo matutino
  - generar_analisis_pais(iso3, nombre, eventos) → análisis profundo de país
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]

# ── Sistema prompt especializado en geopolítica ───────────────────────────────
SYSTEM_GEO = (
    "Eres Politeia Brain, analista senior de inteligencia geopolítica "
    "especializado en España y su entorno internacional. "
    "Analizas eventos desde la perspectiva de los intereses españoles: "
    "energía (gas argelino, GNL), seguridad (OTAN, Sahel, fronteras), "
    "economía (IBEX-35, Repsol, BBVA, Santander, Telefónica, Iberdrola), "
    "diáspora (1.2M españoles en el extranjero) y política exterior. "
    "Responde SIEMPRE en español. Sé conciso, denso en información y accionable. "
    "Cuando generes JSON, responde SOLO JSON válido sin texto adicional."
)


def _call_llm(prompt: str, modo: str = "fast", sistema: str = "") -> str:
    """
    Llama al modelo disponible via llm_local.py (patrón existente).
    modo: 'fast' (llama3.1/llama3.2), 'normal' (qwen), 'deep' (mistral/politeia-brain)
    """
    try:
        from dashboard.services import llm_local as llm
        sys_p = sistema or SYSTEM_GEO
        return llm.chat(prompt, sistema=sys_p, modo=modo)
    except Exception as exc:
        logger.warning("llm_local error: %s", exc)
        return ""


def _parse_json_response(texto: str) -> dict:
    """Extrae JSON del texto de respuesta LLM (maneja markdown code blocks)."""
    texto = texto.strip()
    # Intentar extraer de ```json ... ```
    m = re.search(r"```json\s*(\{.*?\})\s*```", texto, re.DOTALL)
    if m:
        texto = m.group(1)
    else:
        # Buscar el primer { ... } de la respuesta
        m = re.search(r"\{.*\}", texto, re.DOTALL)
        if m:
            texto = m.group()
    try:
        return json.loads(texto)
    except (json.JSONDecodeError, ValueError):
        return {}


def enriquecer_item(item: dict) -> dict:
    """
    Enriquece un item OSINT con Ollama:
    - resumen_ollama en español
    - categoria, subcategoria
    - paises_mencionados, actores_mencionados
    - relevancia_espana refinada
    - urgencia refinada
    """
    titulo = item.get("titulo", "")
    contenido = item.get("contenido", "")[:1500]
    idioma = item.get("idioma_original", "en")

    # Usar modo fast para clasificación masiva
    modelo_modo = "normal" if idioma in ("ar", "ru", "zh") else "fast"

    prompt = f"""Analiza esta noticia geopolítica y responde SOLO en JSON:

TÍTULO: {titulo}
CONTENIDO: {contenido}

{{
    "resumen_es": "Resumen conciso en español (2-3 frases, denso en información)",
    "paises": ["ISO3 de países mencionados directa o indirectamente, máx 5"],
    "actores": ["actores clave: líderes, organizaciones, grupos mencionados"],
    "categoria": "UNA de: conflicto_armado | terrorismo | diplomacia | energia | migracion | ciberseguridad | economia_politica | derechos_humanos | defensa | crimen_organizado | otros",
    "subcategoria": "subcategoría específica en 1-3 palabras",
    "relevancia_espana": 0.0,
    "razon_relevancia": "por qué es relevante para España (1 frase)",
    "urgencia": 1,
    "temas": ["3-5 temas clave"]
}}"""

    resultado_str = _call_llm(prompt, modo=modelo_modo)
    resultado = _parse_json_response(resultado_str)

    if resultado:
        item["resumen_ollama"] = resultado.get("resumen_es", "")
        item["paises_mencionados"] = resultado.get("paises", [])
        item["actores_mencionados"] = resultado.get("actores", [])
        item["categoria"] = resultado.get("categoria", "otros")
        item["subcategoria"] = resultado.get("subcategoria", "")
        item["relevancia_espana"] = max(
            float(item.get("relevancia_espana", 0)),
            float(resultado.get("relevancia_espana", 0)),
        )
        item["urgencia"] = max(
            int(item.get("urgencia", 1)),
            int(resultado.get("urgencia", 1)),
        )
        item["temas"] = resultado.get("temas", [])
        item["procesado_llm"] = True

    return item


def analizar_impacto(item: dict) -> dict | None:
    """
    Genera análisis de impacto doméstico para España.
    Solo se ejecuta si relevancia_espana > 0.6.
    Para urgencia >= 4 usa modo 'deep' (más potente).
    """
    if float(item.get("relevancia_espana", 0)) < 0.6:
        return None

    urgencia = int(item.get("urgencia", 1))
    modo = "deep" if urgencia >= 4 else "normal"

    prompt = f"""Como analista estratégico senior, analiza el impacto en España de:

EVENTO: {item.get("titulo", "")}
RESUMEN: {item.get("resumen_ollama", item.get("contenido", ""))[:800]}
PAÍSES: {", ".join(item.get("paises_mencionados", []))}
CATEGORÍA: {item.get("categoria", "")}

Responde SOLO en JSON:
{{
    "tiene_impacto": true,
    "dimension": "energia | economia | seguridad | migracion | diplomacia | comercio | defensa | ciberseguridad",
    "severidad": 1,
    "horizonte": "inmediato | corto_plazo | medio_plazo | largo_plazo",
    "probabilidad": 0.5,
    "analisis": "Análisis estratégico en 2-3 párrafos: mecanismo de transmisión, magnitud, consecuencias para España",
    "recomendacion": "Qué debería monitorizar España — 1-2 frases accionables",
    "sectores_afectados": ["sectores económicos afectados"],
    "empresas_afectadas": ["empresas españolas potencialmente afectadas con razón breve"],
    "indicadores_seguimiento": ["KPIs o señales de alerta temprana"]
}}"""

    resultado_str = _call_llm(prompt, modo=modo)
    resultado = _parse_json_response(resultado_str)

    if resultado and resultado.get("tiene_impacto", False):
        return {
            "evento_origen_id": item.get("id"),
            "evento_origen_tipo": "osint",
            "titulo": f"[{resultado.get('dimension','?').upper()}] Impacto en España: {item.get('titulo','')[:180]}",
            "descripcion": resultado.get("analisis", ""),
            "dimension": resultado.get("dimension", "otros"),
            "severidad": int(resultado.get("severidad", 2)),
            "horizonte": resultado.get("horizonte", "medio_plazo"),
            "probabilidad": float(resultado.get("probabilidad", 0.5)),
            "analisis_ollama": resultado.get("analisis", ""),
            "recomendacion": resultado.get("recomendacion", ""),
            "sectores_afectados": resultado.get("sectores_afectados", []),
            "empresas_afectadas": resultado.get("empresas_afectadas", []),
            "confianza": 0.8 if urgencia >= 4 else 0.65,
        }
    return None


def generar_briefing_diario(items: list[dict], alertas: list[dict] = None) -> str:
    """
    Genera el briefing geopolítico diario con Ollama (modo deep).
    Items: top 15 noticias por relevancia.
    Alertas: alertas activas del sistema.
    """
    from datetime import date
    alertas = alertas or []

    items_texto = "\n".join([
        f"[{i.get('categoria','?').upper()} | urgencia:{i.get('urgencia',1)}] "
        f"{i.get('titulo','')} — {i.get('resumen_ollama', i.get('contenido',''))[:200]}"
        for i in items[:15]
    ])

    alertas_texto = "\n".join([
        f"🚨 [{a.get('nivel','?')}] {a.get('titulo','')} — {a.get('descripcion','')[:150]}"
        for a in alertas[:5]
    ]) if alertas else "Sin alertas críticas activas"

    prompt = f"""Eres el analista jefe de inteligencia geopolítica de un gabinete estratégico español.
Genera el BRIEFING GEOPOLÍTICO DIARIO para el {date.today().strftime('%d de %B de %Y')}.

TOP NOTICIAS INTERNACIONALES (ordenadas por relevancia para España):
{items_texto}

ALERTAS ACTIVAS:
{alertas_texto}

Genera un briefing ejecutivo EN ESPAÑOL con estas secciones (usa markdown):

## 🌍 Panorama Estratégico
[2-3 párrafos: situación global y tendencias que afectan a España]

## 🇪🇸 Prioridades para España Hoy
[3 puntos de acción inmediata o seguimiento urgente]

## ⚡ Vectores de Riesgo Activos
[energía, seguridad, migración, económico — con especificidad]

## 🔭 Señales Débiles a Vigilar
[eventos que pueden escalar en 30-90 días]

## 💡 Recomendaciones al Decisor
[acciones concretas que debería tomar España]

Tono: analítico, denso, orientado a la acción. Sin obviedades. Cita actores y geografía específica."""

    return _call_llm(prompt, modo="deep")


def generar_analisis_pais(iso3: str, nombre: str, eventos: list[dict]) -> str:
    """Análisis profundo de un país y su relevancia para España."""
    eventos_texto = "\n".join([
        f"- {e.get('fecha','?')}: [{e.get('tipo_evento','?')}] "
        f"Bajas:{e.get('fatalities',0)} — {str(e.get('notas',''))[:150]}"
        for e in eventos[:10]
    ]) if eventos else "Sin eventos ACLED recientes registrados"

    prompt = f"""Analiza en profundidad la situación actual en {nombre} ({iso3}) y su relevancia estratégica para España.

EVENTOS ACLED RECIENTES (30 días):
{eventos_texto}

Genera análisis estructurado EN ESPAÑOL:

## 1. Situación Actual en {nombre}
[Dinámica política, económica y de seguridad actual]

## 2. Relación Bilateral con España
[Intereses compartidos, acuerdos vigentes, tensiones activas]

## 3. Intereses Españoles en Juego
[Empresas (Repsol, BBVA, etc.), energía, diáspora, militares si aplica]

## 4. Escenarios a 90 Días
- **Escenario optimista**: [1 frase]
- **Escenario base**: [1 frase]
- **Escenario de riesgo**: [1 frase]

## 5. Implicaciones para España
[Política exterior, economía, seguridad — concreto]

## 6. Indicadores a Monitorizar
[Señales de alerta temprana específicas]

Sé específico. Cita datos cuando los tengas. Evita generalidades."""

    return _call_llm(prompt, modo="deep")


def buscar_con_rag(query: str, items_contexto: list[dict], top_k: int = 5) -> str:
    """
    Búsqueda RAG semántica en el corpus OSINT.
    Primero intenta ChromaDB, si no disponible usa búsqueda por keywords.
    """
    # Intentar ChromaDB
    try:
        from dashboard.services.llm_local import buscar_contexto
        resultados = buscar_contexto(query, coleccion="osint_geo", n_resultados=top_k)
        if resultados:
            contexto = "\n\n---\n".join([
                f"FUENTE: {r.get('metadata', {}).get('fuente', '?')}\n"
                f"TÍTULO: {r.get('metadata', {}).get('titulo', '')}\n"
                f"{r.get('documento', '')}"
                for r in resultados
            ])
            prompt = (
                f"Basándote EXCLUSIVAMENTE en estas fuentes de inteligencia, "
                f"responde: {query}\n\nFUENTES:\n{contexto}\n\n"
                f"Si las fuentes no son suficientes, indícalo. Cita las fuentes."
            )
            return _call_llm(prompt, modo="deep")
    except Exception:
        pass

    # Fallback: búsqueda por keywords en items
    query_words = query.lower().split()
    scored = []
    for item in items_contexto:
        texto = (item.get("titulo", "") + " " + item.get("resumen_ollama", "") +
                 " " + " ".join(item.get("temas", []))).lower()
        score = sum(1 for w in query_words if w in texto)
        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda x: -x[0])
    top_items = [item for _, item in scored[:top_k]]

    if not top_items:
        return "No se encontraron fuentes relevantes para esa consulta en el corpus OSINT actual."

    contexto = "\n\n---\n".join([
        f"FUENTE: {i.get('fuente', '?')} ({i.get('fecha_publicacion', '?')[:10]})\n"
        f"TÍTULO: {i.get('titulo', '')}\n"
        f"{i.get('resumen_ollama', i.get('contenido', ''))[:500]}"
        for i in top_items
    ])

    prompt = (
        f"Basándote en estas fuentes de inteligencia, responde en profundidad: {query}\n\n"
        f"FUENTES OSINT:\n{contexto}\n\n"
        f"Cita las fuentes al razonar. Si hay incertidumbre, indícala explícitamente."
    )
    return _call_llm(prompt, modo="deep")


def enriquecer_batch(
    items: list[dict],
    batch_size: int = 5,
    modelo_modo: str = "fast",
) -> list[dict]:
    """
    Enriquece múltiples items OSINT con un solo prompt por lote.
    Ratio: 1 llamada LLM por cada `batch_size` items (vs N llamadas en enriquecer_item).

    El modelo debe responder con un JSON array de exactamente len(batch) objetos.
    Si la respuesta está parcialmente corrupta, los items sin parse mantienen
    sus valores originales (graceful degradation item a item).

    Args:
        items:       Lista de dicts con titulo, contenido, idioma_original.
        batch_size:  Cuántos items por llamada LLM (default 5 → ratio N/5).
        modelo_modo: 'fast' (Qwen2.5-14B) | 'normal' | 'deep'.

    Returns: Lista de dicts enriquecidos (mismo orden que entrada).
    """
    if not items:
        return items

    results = list(items)  # copia para no mutar el original

    for batch_start in range(0, len(items), batch_size):
        batch = items[batch_start: batch_start + batch_size]
        n = len(batch)

        # Construir prompt multi-item
        items_block = "\n\n".join([
            f"ITEM {i + 1}:\n"
            f"TÍTULO: {it.get('titulo', '')[:300]}\n"
            f"CONTENIDO: {(it.get('contenido') or it.get('descripcion', ''))[:800]}\n"
            f"IDIOMA: {it.get('idioma_original', it.get('idioma', 'en'))}"
            for i, it in enumerate(batch)
        ])

        prompt = f"""Analiza estos {n} items de noticias geopolíticas.
Responde EXCLUSIVAMENTE con un JSON array de exactamente {n} objetos, en el mismo orden.
Cada objeto debe tener:
  "resumen_es": "Resumen conciso en español (2-3 frases)",
  "paises": ["hasta 5 ISO3 de países mencionados"],
  "actores": ["actores clave: líderes, organizaciones, grupos"],
  "categoria": "conflicto_armado|terrorismo|diplomacia|energia|migracion|ciberseguridad|economia_politica|derechos_humanos|defensa|crimen_organizado|otros",
  "subcategoria": "subcategoría específica en 1-3 palabras",
  "relevancia_espana": 0.0,
  "urgencia": 1,
  "temas": ["3-5 temas clave"]

No incluyas texto fuera del JSON array. Empieza con [ y termina con ].

ITEMS A ANALIZAR:
{items_block}"""

        try:
            resp_str = _call_llm(prompt, modo=modelo_modo)
            parsed_batch = _parse_json_array(resp_str, expected_len=n)
        except Exception as exc:
            logger.warning("enriquecer_batch LLM error (batch %d): %s", batch_start, exc)
            parsed_batch = [{}] * n

        for i, resultado in enumerate(parsed_batch):
            orig_idx = batch_start + i
            if not resultado:
                continue
            item = results[orig_idx]
            item["resumen_ollama"] = resultado.get("resumen_es", "")
            item["paises_mencionados"] = resultado.get("paises", [])
            item["actores_mencionados"] = resultado.get("actores", [])
            item["categoria"] = resultado.get("categoria", "otros")
            item["subcategoria"] = resultado.get("subcategoria", "")
            item["relevancia_espana"] = max(
                float(item.get("relevancia_espana", 0)),
                float(resultado.get("relevancia_espana", 0)),
            )
            item["urgencia"] = max(
                int(item.get("urgencia", 1)),
                int(resultado.get("urgencia", 1)),
            )
            item["temas"] = resultado.get("temas", [])
            item["procesado_llm"] = True
            results[orig_idx] = item

    return results


def _parse_json_array(texto: str, expected_len: int) -> list[dict]:
    """
    Extrae un JSON array del texto de respuesta LLM.
    Intenta varios patrones de extracción; retorna lista de dicts vacíos
    con longitud `expected_len` si el parse falla totalmente.
    """
    texto = texto.strip()

    # Intentar extraer de ```json [...] ```
    m = re.search(r"```json\s*(\[.*?\])\s*```", texto, re.DOTALL)
    if m:
        texto = m.group(1)
    else:
        # Buscar primer [ ... ]
        m = re.search(r"\[.*\]", texto, re.DOTALL)
        if m:
            texto = m.group()

    try:
        parsed = json.loads(texto)
        if isinstance(parsed, list):
            # Pad o recortar a expected_len
            while len(parsed) < expected_len:
                parsed.append({})
            return parsed[:expected_len]
    except (json.JSONDecodeError, ValueError):
        pass

    # Fallback: intentar parsear objetos individuales con regex
    objects = re.findall(r"\{[^{}]*\}", texto, re.DOTALL)
    results: list[dict] = []
    for obj_str in objects:
        try:
            results.append(json.loads(obj_str))
        except (json.JSONDecodeError, ValueError):
            results.append({})

    while len(results) < expected_len:
        results.append({})
    return results[:expected_len]


def indexar_osint_en_chromadb(items: list[dict]) -> int:
    """
    Indexa items OSINT en ChromaDB para búsqueda semántica posterior.
    Retorna número de documentos indexados.
    """
    try:
        from dashboard.services.llm_local import indexar_datos
        docs = [
            f"[{i.get('fuente','?')}] {i.get('titulo','')} — "
            f"{i.get('resumen_ollama', i.get('contenido',''))[:500]}"
            for i in items
        ]
        metas = [
            {
                "fuente": i.get("fuente", ""),
                "titulo": i.get("titulo", "")[:200],
                "fecha_publicacion": str(i.get("fecha_publicacion", ""))[:20],
                "relevancia_espana": str(i.get("relevancia_espana", 0)),
                "urgencia": str(i.get("urgencia", 1)),
                "categoria": i.get("categoria", ""),
                "url": i.get("url", ""),
            }
            for i in items
        ]
        ids = [i.get("id") or f"osint_{j}" for j, i in enumerate(items)]
        ok = indexar_datos("osint_geo", docs, metadatos=metas, ids=ids)
        return len(items) if ok else 0
    except Exception as exc:
        logger.warning("ChromaDB indexing error: %s", exc)
        return 0
