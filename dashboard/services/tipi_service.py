"""
TIPI Service — Clasificación temática de iniciativas parlamentarias y BOE.

Inspirado en Political Watch / TIPI Engine (politicalwatch/tipi-engine),
adapta la taxonomía TIPI al contexto de ElectSim España:
- Clasifica BOE, iniciativas parlamentarias y votaciones por área de política pública.
- Calcula scores de saliencia temática por partido.
- Detecta temas de alta relevancia en agenda legislativa.

Ref: https://github.com/politicalwatch/tipi-engine

Uso:
    from dashboard.services.tipi_service import classify_text, tag_initiative, get_topic_salience
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd


# ── Taxonomía TIPI España (adaptada) ─────────────────────────────────────────
# 24 áreas temáticas con keywords y sinónimos en español

TIPI_TOPICS: dict[str, dict] = {
    "ECONOMIA":         {"label": "Economía y Finanzas",          "color": "#3B82F6",
                         "keywords": ["economía", "economia", "presupuesto", "hacienda", "impuesto", "fiscal", "tributo",
                                       "iva", "irpf", "deuda", "déficit", "deuda pública", "reforma fiscal",
                                       "banca", "banco", "financiero", "inversión", "crecimiento económico"]},
    "TRABAJO":          {"label": "Trabajo y Empleo",             "color": "#10B981",
                         "keywords": ["trabajo", "empleo", "desempleo", "paro", "trabajador", "salario", "sueldo",
                                       "convenio", "negociación colectiva", "sindicato", "ere", "erte",
                                       "autónomo", "smg", "salario mínimo", "contrato laboral"]},
    "SANIDAD":          {"label": "Sanidad y Salud Pública",      "color": "#EF4444",
                         "keywords": ["sanidad", "salud", "hospital", "médico", "medicamento", "farmacia",
                                       "sistema nacional de salud", "sns", "enfermedad", "vacuna", "pandemia",
                                       "atención primaria", "urgencias", "psiquiatría", "mental"]},
    "EDUCACION":        {"label": "Educación",                    "color": "#8B5CF6",
                         "keywords": ["educación", "educacion", "universidad", "escuela", "instituto", "alumno",
                                       "estudiante", "profesor", "docente", "bachillerato", "fp", "lomloe",
                                       "becas", "selectividad", "investigación educativa"]},
    "VIVIENDA":         {"label": "Vivienda y Urbanismo",         "color": "#F59E0B",
                         "keywords": ["vivienda", "alquiler", "hipoteca", "desahucio", "urbanismo", "suelo",
                                       "inmobiliario", "arrendamiento", "vpo", "parque público de vivienda",
                                       "ley de vivienda", "rehabilitación urbana"]},
    "MEDIOAMBIENTE":    {"label": "Medio Ambiente y Clima",       "color": "#22C55E",
                         "keywords": ["medio ambiente", "clima", "cambio climático", "emisiones", "co2",
                                       "biodiversidad", "residuos", "reciclaje", "energía renovable",
                                       "transición ecológica", "agua", "sequía", "incendio forestal"]},
    "JUSTICIA":         {"label": "Justicia y Estado de Derecho", "color": "#6366F1",
                         "keywords": ["justicia", "judicial", "tribunal", "juzgado", "delito", "pena",
                                       "código penal", "ley orgánica", "constitución", "derechos fundamentales",
                                       "amparo", "garantías procesales", "fiscalía", "notariado"]},
    "SEGURIDAD":        {"label": "Seguridad y Defensa",          "color": "#64748B",
                         "keywords": ["defensa", "fuerzas armadas", "ejército", "nato", "otan", "seguridad nacional",
                                       "inteligencia", "cnI", "policía nacional", "guardia civil",
                                       "terrorismo", "crimen organizado", "ciberseguridad"]},
    "EXTERIOR":         {"label": "Política Exterior",            "color": "#EC4899",
                         "keywords": ["política exterior", "relaciones exteriores", "diplomacia", "embajada",
                                       "unión europea", "ue", "tratado", "acuerdo internacional", "nato",
                                       "cooperación al desarrollo", "derechos humanos internacionales"]},
    "IGUALDAD":         {"label": "Igualdad y Derechos Sociales", "color": "#E879F9",
                         "keywords": ["igualdad", "feminismo", "género", "violencia de género", "lgtbi",
                                       "discriminación", "diversidad", "inclusión", "personas con discapacidad",
                                       "derechos sociales", "servicios sociales", "dependencia"]},
    "INFRAESTRUCTURAS": {"label": "Infraestructuras y Transporte","color": "#06B6D4",
                         "keywords": ["infraestructura", "transporte", "tren", "renfe", "ave", "carretera",
                                       "autopista", "aeropuerto", "puerto", "ferrocarril", "metro",
                                       "movilidad", "tráfico", "logística"]},
    "ENERGIA":          {"label": "Energía",                      "color": "#FBBF24",
                         "keywords": ["energía", "electricidad", "gas", "petróleo", "nuclear", "renovable",
                                       "eólica", "solar", "red eléctrica", "red de gas", "factura eléctrica",
                                       "bono social", "hibridación", "almacenamiento energético"]},
    "AGRICULTURA":      {"label": "Agricultura y Alimentación",   "color": "#84CC16",
                         "keywords": ["agricultura", "ganadería", "pesca", "acuicultura", "alimentación",
                                       "pac", "política agraria", "campo", "agricultor", "ganadero",
                                       "regadío", "sequía agrícola", "sector primario"]},
    "CULTURA":          {"label": "Cultura y Deporte",            "color": "#F97316",
                         "keywords": ["cultura", "patrimonio", "museo", "deporte", "atletismo", "fútbol",
                                       "arte", "música", "cine", "teatro", "libro", "lengua",
                                       "lenguas cooficiales", "catalán", "euskera", "gallego"]},
    "CIENCIA":          {"label": "Ciencia y Tecnología",         "color": "#0EA5E9",
                         "keywords": ["ciencia", "tecnología", "tecnologia", "investigación", "i+d",
                                       "innovación", "inteligencia artificial", "digitalización",
                                       "telecomunicaciones", "5g", "banda ancha", "start-up", "startup"]},
    "INMIGRACION":      {"label": "Inmigración y Asilo",          "color": "#A78BFA",
                         "keywords": ["inmigración", "inmigracion", "extranjero", "refugiado", "asilo",
                                       "frontera", "ceuta", "melilla", "mena", "irregular", "integración",
                                       "reagrupación familiar", "permiso de residencia"]},
    "PENSIONES":        {"label": "Pensiones y Seguridad Social",  "color": "#FB923C",
                         "keywords": ["pensión", "pension", "jubilación", "jubilacion", "seguridad social",
                                       "cotización", "prestación", "invalidez", "orfandad", "viudedad",
                                       "reforma del sistema de pensiones", "fondo de reserva"]},
    "TERRITORIAL":      {"label": "Política Territorial y CCAA",  "color": "#2DD4BF",
                         "keywords": ["autonomía", "comunidad autónoma", "estatuto", "cataluña", "cataluna",
                                       "barcelona", "euskadi", "galicia", "andalucía", "madrid",
                                       "financiación autonómica", "descentralización", "independencia",
                                       "federalismo", "concierto económico"]},
    "TRANSPARENCIA":    {"label": "Transparencia y Gobernanza",   "color": "#818CF8",
                         "keywords": ["transparencia", "corrupción", "corrupcion", "financiación de partidos",
                                       "conflicto de interés", "lobby", "grupo de presión",
                                       "buen gobierno", "contratación pública", "licitación pública"]},
    "CONSUMIDOR":       {"label": "Consumo y Protección del Usuario", "color": "#34D399",
                         "keywords": ["consumidor", "consumidores", "usuario", "protección al consumidor",
                                       "precio", "inflación", "cesta de la compra", "derecho al consumo",
                                       "comercio", "pymes", "empresas"]},
    "VIAJES":           {"label": "Turismo",                      "color": "#FDE68A",
                         "keywords": ["turismo", "turista", "hostelería", "hotelero", "hotel", "restaurante",
                                       "sector turístico", "destino turístico"]},
    "INTERIOR":         {"label": "Política Interior",            "color": "#94A3B8",
                         "keywords": ["interior", "orden público", "manifestación", "asociación", "fundación",
                                       "cuerpos de seguridad del estado", "policía local", "bombero"]},
    "SOCIEDAD":         {"label": "Sociedad y Demografía",        "color": "#C084FC",
                         "keywords": ["familia", "natalidad", "baja por maternidad", "conciliación",
                                       "tercera edad", "envejecimiento", "población", "demografía",
                                       "despoblación", "renta básica", "pobreza", "exclusión social"]},
    "OTROS":            {"label": "Otras materias",               "color": "#475569",
                         "keywords": []},
}

# ── Índice invertido para lookup rápido ──────────────────────────────────────

_KEYWORD_INDEX: dict[str, list[str]] = {}
for _code, _info in TIPI_TOPICS.items():
    for _kw in _info["keywords"]:
        _k = _kw.lower()
        if _k not in _KEYWORD_INDEX:
            _KEYWORD_INDEX[_k] = []
        _KEYWORD_INDEX[_k].append(_code)


# ── Dataclass de resultado ────────────────────────────────────────────────────

@dataclass
class TipiResult:
    topics: list[str]            # códigos TIPI ordenados por relevancia
    topic_labels: list[str]      # etiquetas legibles
    primary_topic: str           # tema principal
    primary_label: str
    scores: dict[str, float]     # code -> score (0-100)
    matched_keywords: list[str]  # keywords encontradas


# ── Clasificador ──────────────────────────────────────────────────────────────

def classify_text(text: str, limit: int = 3) -> TipiResult:
    """
    Clasifica un texto en temas TIPI.
    Devuelve hasta `limit` temas ordenados por score.
    """
    if not text:
        return TipiResult(
            topics=["OTROS"], topic_labels=["Otras materias"],
            primary_topic="OTROS", primary_label="Otras materias",
            scores={"OTROS": 0.0}, matched_keywords=[],
        )

    t = text.lower()
    t = re.sub(r"[^\w\s]", " ", t)

    scores: dict[str, float] = {code: 0.0 for code in TIPI_TOPICS}
    matched: list[str] = []

    for kw, codes in _KEYWORD_INDEX.items():
        if kw in t:
            # Bonus si aparece varias veces
            count = t.count(kw)
            weight = 1.0 + 0.3 * min(count - 1, 3)
            # Bonus si está al principio
            if t.index(kw) < 100:
                weight += 0.5
            for code in codes:
                scores[code] = min(100, scores.get(code, 0) + weight * 10)
            matched.append(kw)

    # Ordenar por score descendente, quitar OTROS si hay otros con score>0
    sorted_topics = sorted(
        [(code, s) for code, s in scores.items() if s > 0],
        key=lambda x: x[1], reverse=True,
    )
    if not sorted_topics:
        sorted_topics = [("OTROS", 0.0)]

    top_topics = [c for c, _ in sorted_topics[:limit]]
    primary = top_topics[0]

    return TipiResult(
        topics=top_topics,
        topic_labels=[TIPI_TOPICS[t]["label"] for t in top_topics],
        primary_topic=primary,
        primary_label=TIPI_TOPICS[primary]["label"],
        scores={c: round(s, 1) for c, s in sorted_topics[:limit * 2]},
        matched_keywords=list(set(matched))[:10],
    )


def tag_initiative(titulo: str, resumen: str = "", tipo: str = "") -> list[str]:
    """
    Devuelve lista de códigos TIPI para una iniciativa parlamentaria o BOE.
    Combina título + resumen con peso mayor al título.
    """
    combined = f"{titulo} {titulo} {resumen}".strip()  # título x2 para mayor peso
    result = classify_text(combined, limit=3)
    return result.topics


def topics_json(titulo: str, resumen: str = "") -> str:
    """Devuelve string JSON con lista de temas TIPI (para columna temas_json en BD)."""
    import json
    return json.dumps(tag_initiative(titulo, resumen), ensure_ascii=False)


def topic_label(code: str) -> str:
    """Devuelve la etiqueta legible de un código TIPI."""
    return TIPI_TOPICS.get(code, {}).get("label", code)


def topic_color(code: str) -> str:
    """Devuelve el color del tema TIPI."""
    return TIPI_TOPICS.get(code, {}).get("color", "#475569")


# ── Análisis de saliencia por partido ────────────────────────────────────────

def get_topic_salience(df_activity: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula saliencia temática por partido a partir de actividad parlamentaria.

    df_activity debe tener columnas: partido_siglas, titulo (o tipo_acto).
    Devuelve DataFrame con columnas: partido_siglas, topic, n, pct.

    Inspirado en la metodología de issue salience del Manifesto Project.
    """
    if df_activity.empty:
        return pd.DataFrame(columns=["partido_siglas", "topic", "topic_label", "n", "pct"])

    rows = []
    for _, row in df_activity.iterrows():
        texto = str(row.get("titulo") or row.get("tipo_acto") or "")
        partido = str(row.get("partido_siglas") or "OTROS")
        topics = tag_initiative(texto)
        for t in topics[:2]:  # máximo 2 temas por iniciativa
            rows.append({"partido_siglas": partido, "topic": t})

    if not rows:
        return pd.DataFrame(columns=["partido_siglas", "topic", "topic_label", "n", "pct"])

    df = pd.DataFrame(rows)
    df_count = (
        df.groupby(["partido_siglas", "topic"])
        .size()
        .reset_index(name="n")
    )
    totals = df_count.groupby("partido_siglas")["n"].sum().rename("total")
    df_count = df_count.join(totals, on="partido_siglas")
    df_count["pct"] = (df_count["n"] / df_count["total"] * 100).round(1)
    df_count["topic_label"] = df_count["topic"].map(lambda c: topic_label(c))
    return df_count.sort_values(["partido_siglas", "pct"], ascending=[True, False])


def get_top_topics_overview(df_boe: pd.DataFrame = None,
                            df_initiatives: pd.DataFrame = None) -> pd.DataFrame:
    """
    Consolida los temas más activos del día/semana combinando BOE e iniciativas.

    Cada fuente aporta una lista de títulos; se clasifican y se agrega por tema.
    Devuelve DataFrame: topic, topic_label, color, n_boe, n_initiatives, total.
    """
    topic_counts: dict[str, dict] = {
        code: {"n_boe": 0, "n_initiatives": 0}
        for code in TIPI_TOPICS
    }

    if df_boe is not None and not df_boe.empty:
        titulo_col = "titulo" if "titulo" in df_boe.columns else df_boe.columns[0]
        resumen_col = "resumen" if "resumen" in df_boe.columns else None
        for _, row in df_boe.iterrows():
            titulo = str(row.get(titulo_col, ""))
            resumen = str(row.get(resumen_col, "")) if resumen_col else ""
            topics = tag_initiative(titulo, resumen)
            for t in topics[:2]:
                topic_counts[t]["n_boe"] += 1

    if df_initiatives is not None and not df_initiatives.empty:
        titulo_col = "title" if "title" in df_initiatives.columns else "titulo"
        for _, row in df_initiatives.iterrows():
            titulo = str(row.get(titulo_col, ""))
            topics = tag_initiative(titulo)
            for t in topics[:1]:
                topic_counts[t]["n_initiatives"] += 1

    rows = []
    for code, counts in topic_counts.items():
        total = counts["n_boe"] + counts["n_initiatives"]
        if total > 0:
            rows.append({
                "topic":         code,
                "topic_label":   TIPI_TOPICS[code]["label"],
                "color":         TIPI_TOPICS[code]["color"],
                "n_boe":         counts["n_boe"],
                "n_initiatives": counts["n_initiatives"],
                "total":         total,
            })

    if not rows:
        return pd.DataFrame(columns=["topic", "topic_label", "color", "n_boe", "n_initiatives", "total"])

    return pd.DataFrame(rows).sort_values("total", ascending=False)
