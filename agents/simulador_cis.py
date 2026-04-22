from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import logging
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from agents.memory_log import get_simulation_responses, log_memory_turn
from agents.runner import AgentTurnResult, VoterAgent

logger = logging.getLogger(__name__)

TEMPERATURA_SIM_CIS = 0.25
MAX_TOKENS_SIM_CIS = 512
CALIBRACION_PRIOR = 0.40


@dataclass(slots=True)
class PreguntaCIS:
    codigo: str
    texto: str
    tipo: str
    opciones: list[str]
    variable_bd: str


CUESTIONARIO_CIS_BASICO: list[PreguntaCIS] = [
    PreguntaCIS("P1", "En una escala del 1 al 10, ¿dónde te sitúas ideológicamente?", "escala_1_10", [], "escala_ideologica"),
    PreguntaCIS(
        "P2",
        "¿Cómo valoras la situación económica de España?",
        "categorica",
        ["Muy buena", "Buena", "Regular", "Mala", "Muy mala", "NS/NC"],
        "situacion_economica_españa",
    ),
    PreguntaCIS(
        "P3",
        "¿Cómo valoras tu situación económica personal?",
        "categorica",
        ["Muy buena", "Buena", "Regular", "Mala", "Muy mala", "NS/NC"],
        "situacion_economica_personal",
    ),
    PreguntaCIS(
        "P4",
        "Si mañana hubiera elecciones generales, ¿a quién votarías?",
        "categorica",
        ["PSOE", "PP", "VOX", "SUMAR", "ERC", "Junts", "PNV", "EH Bildu", "Abstención", "NS/NC"],
        "intencion_voto",
    ),
    PreguntaCIS(
        "P5",
        "¿Cuál es el principal problema de España?",
        "categorica",
        ["Vivienda", "Paro", "Inflación", "Sanidad", "Inmigración", "Corrupción", "NS/NC"],
        "primer_problema_españa",
    ),
]


_SQL_MICRODATOS: dict[str, str] = {
    "escala_ideologica": "SELECT escala_ideologica AS v, COUNT(*)::float AS c FROM microdatos_encuesta WHERE encuesta_id = :eid AND escala_ideologica IS NOT NULL GROUP BY escala_ideologica",
    "situacion_economica_españa": "SELECT situacion_economica_españa AS v, COUNT(*)::float AS c FROM microdatos_encuesta WHERE encuesta_id = :eid AND situacion_economica_españa IS NOT NULL GROUP BY situacion_economica_españa",
    "situacion_economica_personal": "SELECT situacion_economica_personal AS v, COUNT(*)::float AS c FROM microdatos_encuesta WHERE encuesta_id = :eid AND situacion_economica_personal IS NOT NULL GROUP BY situacion_economica_personal",
    "intencion_voto": "SELECT intencion_voto AS v, COUNT(*)::float AS c FROM microdatos_encuesta WHERE encuesta_id = :eid AND intencion_voto IS NOT NULL GROUP BY intencion_voto",
    "principal_problema": "SELECT principal_problema AS v, COUNT(*)::float AS c FROM microdatos_encuesta WHERE encuesta_id = :eid AND principal_problema IS NOT NULL GROUP BY principal_problema",
}
_COLUMNAS_MICRODATOS_PERMITIDAS: set[str] = set(_SQL_MICRODATOS.keys())


def listar_perfiles(engine: Engine, n_perfiles: int | None = None) -> pd.DataFrame:
    sql = (
        "SELECT id, cluster_id, label, n_respondentes, peso_demografico_pct, edad_media, ideologia_media, "
        "distribucion_voto_json, descripcion_perfil_llm FROM perfiles_votante "
        "ORDER BY peso_demografico_pct DESC NULLS LAST"
    )
    params: dict[str, Any] = {}
    if n_perfiles:
        sql += " LIMIT :n"
        params["n"] = int(n_perfiles)
    with engine.connect() as conn:
        return pd.read_sql(text(sql), conn, params=params)


def _build_pregunta_prompt(pregunta: PreguntaCIS) -> str:
    if pregunta.tipo == "escala_1_10":
        return (
            f"{pregunta.texto}\n"
            "Responde con un único número entero entre 1 y 10.\n"
            "Después añade una breve explicación en una línea."
        )
    opciones = " | ".join(pregunta.opciones)
    return (
        f"{pregunta.texto}\n"
        f"Opciones válidas: {opciones}.\n"
        "Responde usando una opción exacta y una línea de explicación."
    )


def _parsear_respuesta(texto: str, pregunta: PreguntaCIS) -> str:
    raw = str(texto or "").strip()
    if not raw:
        return "NS/NC"
    first = raw.splitlines()[0].strip()

    if pregunta.tipo == "escala_1_10":
        m = next((tok for tok in first.replace("/", " ").split() if tok.isdigit()), None)
        if m is None:
            return "NS/NC"
        x = int(m)
        if 1 <= x <= 10:
            return str(x)
        return "NS/NC"

    if any(t in first.upper() for t in ["NS/NC", "NO SABE", "NO CONTESTA"]):
        return "NS/NC"

    f_low = first.lower()
    for op in pregunta.opciones:
        o_low = op.lower()
        if f_low == o_low or o_low in f_low or f_low in o_low:
            return op
    return "NS/NC"


def _calibrar_respuesta_escala(respuesta_parseada: str, media_real: float | None, alpha: float = CALIBRACION_PRIOR) -> str:
    """
    Ajuste bayesiano simple para respuestas escala 1-10:
    posterior = (1-alpha)*respuesta_llm + alpha*media_real.
    """
    try:
        x = int(str(respuesta_parseada).strip())
    except Exception:
        return respuesta_parseada
    if not 1 <= x <= 10:
        return respuesta_parseada
    if media_real is None:
        return respuesta_parseada
    try:
        m = float(media_real)
    except Exception:
        return respuesta_parseada
    m = min(10.0, max(1.0, m))
    post = (1.0 - float(alpha)) * float(x) + float(alpha) * m
    return str(int(round(min(10.0, max(1.0, post)))))


def simular_encuesta(
    cuestionario: list[PreguntaCIS],
    engine: Engine,
    n_perfiles: int | None = None,
    usar_rag: bool = True,
    llm: Any | None = None,
    checkpoint_engine: Any | None = None,
    nombre_simulacion: str | None = None,
) -> pd.DataFrame:
    perfiles = listar_perfiles(engine, n_perfiles=n_perfiles)
    if perfiles.empty:
        return pd.DataFrame()

    sim_name = nombre_simulacion or datetime.utcnow().strftime("sim_%Y%m%d_%H%M%S")
    cp_engine = checkpoint_engine or engine
    completed: set[tuple[int, str]] = set()
    if checkpoint_engine is not None and nombre_simulacion:
        try:
            completed = get_simulation_responses(cp_engine, nombre_simulacion)
        except Exception:
            completed = set()

    rows: list[dict[str, Any]] = []
    for _, pf in perfiles.iterrows():
        cid = int(pf["cluster_id"])
        agent = VoterAgent(engine, cid, llm=llm)
        peso = float(pf.get("peso_demografico_pct") or 0.0) / 100.0
        for q in cuestionario:
            if (cid, q.codigo) in completed:
                continue
            prompt = _build_pregunta_prompt(q)
            out = agent.run_turn(
                prompt,
                persist=False,
                rag_engine=engine if usar_rag else None,
                temperature=TEMPERATURA_SIM_CIS,
                max_tokens=MAX_TOKENS_SIM_CIS,
                tema=q.variable_bd,
            )
            parsed = _parsear_respuesta(out.final_reply, q)
            if q.tipo == "escala_1_10":
                parsed = _calibrar_respuesta_escala(parsed, pf.get("ideologia_media"))
            row = {
                "simulacion": sim_name,
                "perfil_id": int(pf.get("id") or 0),
                "perfil_cluster_id": cid,
                "pregunta_codigo": q.codigo,
                "pregunta_texto": q.texto,
                "variable_bd": q.variable_bd,
                "tipo": q.tipo,
                "respuesta_raw": out.final_reply,
                "respuesta_parseada": parsed,
                "peso": float(max(peso, 0.0001)),
                "session_id": out.session_id,
            }
            rows.append(row)

            try:
                log_memory_turn(
                    cp_engine,
                    session_id=f"{sim_name}_survey",
                    role="assistant",
                    content=out.raw_assistant,
                    kind="survey_response",
                    cluster_id=cid,
                    perfil_id=int(pf.get("id") or 0),
                    metadata={"pregunta_codigo": q.codigo, "respuesta_parseada": parsed},
                    modelo="stub" if llm is None else getattr(llm, "modelo", None),
                )
            except Exception:
                pass

    return pd.DataFrame(rows)


def agregar_respuestas(df_respuestas: pd.DataFrame) -> pd.DataFrame:
    if df_respuestas.empty:
        return pd.DataFrame()

    out_rows: list[dict[str, Any]] = []
    for (codigo, variable_bd, tipo), sub in df_respuestas.groupby(["pregunta_codigo", "variable_bd", "tipo"]):
        total = float(sub["peso"].sum() or 0.0)
        ns_nc_mask = sub["respuesta_parseada"].astype(str).str.upper().eq("NS/NC")
        ns_nc_pct = float((sub.loc[ns_nc_mask, "peso"].sum() / total * 100.0) if total > 0 else 0.0)
        if ns_nc_pct > 25.0:
            logger.warning(
                "Alta tasa NS/NC (%.1f%%) en pregunta %s — revisar formato de prompt",
                ns_nc_pct,
                codigo,
            )

        if tipo == "escala_1_10":
            vals = pd.to_numeric(sub.loc[~ns_nc_mask, "respuesta_parseada"], errors="coerce")
            w = sub.loc[~ns_nc_mask, "peso"].astype(float)
            den = float(w.sum() or 0.0)
            media = float((vals * w).sum() / den) if den > 0 else float("nan")
            resultado = {"media_ponderada": round(media, 3) if pd.notna(media) else None}
        else:
            agg = sub.groupby("respuesta_parseada", dropna=False)["peso"].sum().sort_values(ascending=False)
            den = float(agg.sum() or 0.0)
            resultado = {str(k): round(float(v) / den * 100.0, 2) for k, v in agg.items()} if den > 0 else {}

        out_rows.append(
            {
                "pregunta_codigo": codigo,
                "variable_bd": variable_bd,
                "tipo": tipo,
                "n_respuestas": int(len(sub)),
                "ns_nc_pct": round(ns_nc_pct, 2),
                "resultado_agregado": resultado,
            }
        )

    return pd.DataFrame(out_rows)


def comparar_con_microdatos_bd(
    df_agregado: pd.DataFrame,
    engine: Engine,
    encuesta_id: int,
    columnas: list[str] | None = None,
) -> pd.DataFrame:
    cols = columnas or sorted(_COLUMNAS_MICRODATOS_PERMITIDAS)
    distancias: list[dict[str, Any]] = []

    for col in cols:
        sql_str = _SQL_MICRODATOS.get(col)
        if not sql_str:
            distancias.append({"columna": col, "dist_l1": float("nan")})
            continue

        with engine.connect() as conn:
            df_real = pd.read_sql(text(sql_str), conn, params={"eid": int(encuesta_id)})

        sim_sub = df_agregado[df_agregado["pregunta_codigo"] == col]
        sim_map: dict[str, float] = {}
        if not sim_sub.empty:
            agg = sim_sub.iloc[0].get("resultado_agregado", {})
            if isinstance(agg, dict):
                sim_map = {str(k): float(v) / 100.0 for k, v in agg.items()}

        real_map: dict[str, float] = {}
        if not df_real.empty:
            den = float(df_real["c"].sum() or 0.0)
            if den > 0:
                real_map = {str(r["v"]): float(r["c"]) / den for _, r in df_real.iterrows()}

        keys = set(sim_map.keys()) | set(real_map.keys())
        if not keys:
            l1 = float("nan")
        else:
            l1 = sum(abs(sim_map.get(k, 0.0) - real_map.get(k, 0.0)) for k in keys)

        distancias.append({"columna": col, "dist_l1": l1, "dist_tv": l1 / 2.0 if pd.notna(l1) else float("nan")})

    return pd.DataFrame(distancias)


def resumen_parseo(df_respuestas: pd.DataFrame) -> pd.DataFrame:
    filas = []
    for codigo, sub in df_respuestas.groupby("pregunta_codigo"):
        total = len(sub)
        ns_nc = (sub["respuesta_parseada"].astype(str).str.upper() == "NS/NC").sum()
        lon_media = sub["respuesta_raw"].astype(str).str.len().mean()
        filas.append(
            {
                "pregunta_codigo": codigo,
                "total_respuestas": total,
                "ns_nc_n": int(ns_nc),
                "ns_nc_pct": round(ns_nc / total * 100, 2) if total else 0.0,
                "longitud_media_raw": round(float(lon_media), 0) if pd.notna(lon_media) else 0.0,
            }
        )
    return pd.DataFrame(filas).sort_values("ns_nc_pct", ascending=False)
