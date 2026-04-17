"""
Simulación de cuestionarios CIS con agentes sintéticos (``VoterAgent``).
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from dataclasses import asdict, dataclass
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import text

from agents.runner import VoterAgent

logger = logging.getLogger(__name__)

# Mapeo variable lógica CIS → columna real en microdatos_encuesta
_VARIABLE_EN_BD: dict[str, str] = {
    "recuerdo_voto_2023": "intencion_voto",
    "primer_problema_españa": "principal_problema",
}

_COLUMNAS_MICRODATOS_PERMITIDAS = frozenset(
    {
        "escala_ideologica",
        "situacion_economica_españa",
        "situacion_economica_personal",
        "intencion_voto",
        "principal_problema",
    }
)


@dataclass
class PreguntaCIS:
    codigo: str
    texto: str
    tipo: str
    opciones: list[str]
    variable_bd: str


@dataclass
class RespuestaAgente:
    perfil_cluster_id: int
    pregunta_codigo: str
    respuesta_raw: str
    respuesta_parseada: str
    razonamiento: str
    peso: float


CUESTIONARIO_CIS_BASICO: list[PreguntaCIS] = [
    PreguntaCIS(
        codigo="P1",
        texto=(
            "En política se habla normalmente de izquierda y derecha. "
            "En una escala donde el 1 es izquierda y el 10 derecha, "
            "¿dónde se situaría Ud.?"
        ),
        tipo="escala_1_10",
        opciones=[],
        variable_bd="escala_ideologica",
    ),
    PreguntaCIS(
        codigo="P2",
        texto="¿Cómo definiría Ud. la situación económica general de España en la actualidad?",
        tipo="likert_5",
        opciones=["Muy buena", "Buena", "Regular", "Mala", "Muy mala"],
        variable_bd="situacion_economica_españa",
    ),
    PreguntaCIS(
        codigo="P3",
        texto="¿Y la situación económica personal de Ud. y su familia?",
        tipo="likert_5",
        opciones=["Muy buena", "Buena", "Regular", "Mala", "Muy mala"],
        variable_bd="situacion_economica_personal",
    ),
    PreguntaCIS(
        codigo="P4",
        texto="Si mañana se celebraran elecciones generales, ¿a qué partido votaría Ud.?",
        tipo="intencion_voto",
        opciones=[
            "PSOE",
            "PP",
            "VOX",
            "SUMAR",
            "PNV",
            "ERC",
            "JUNTS",
            "EH-BILDU",
            "CS",
            "OTROS",
            "En blanco",
            "No votaría",
        ],
        variable_bd="recuerdo_voto_2023",
    ),
    PreguntaCIS(
        codigo="P5",
        texto="¿Cuál es, a su juicio, el principal problema que existe actualmente en España?",
        tipo="categorica",
        opciones=[
            "Paro",
            "Problemas económicos",
            "Corrupción",
            "Vivienda",
            "Inmigración",
            "Sanidad",
            "Educación",
            "Problemas territoriales",
            "Otros",
        ],
        variable_bd="primer_problema_españa",
    ),
]


def _col_microdato(variable_bd: str) -> str:
    return _VARIABLE_EN_BD.get(variable_bd, variable_bd)


def _build_pregunta_prompt(pregunta: PreguntaCIS) -> str:
    instruccion_cierre = (
        "Responde SOLO con la opción elegida en la primera línea. "
        "Luego explica brevemente tu razonamiento."
    )
    if pregunta.tipo == "escala_1_10":
        cuerpo = f"{pregunta.texto}\nResponde con un número entero del 1 al 10 en la primera línea."
    elif pregunta.tipo == "abierta":
        cuerpo = f"{pregunta.texto}\nMáximo 50 palabras en la primera línea."
    else:
        opts = "\n".join(f"- {o}" for o in pregunta.opciones)
        cuerpo = f"{pregunta.texto}\nOpciones (elige exactamente una para la primera línea):\n{opts}"
    return f"{cuerpo}\n\n{instruccion_cierre}"


def _normaliza(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _parsear_respuesta(texto: str, pregunta: PreguntaCIS) -> str:
    linea = (texto or "").strip().splitlines()[0] if (texto or "").strip() else ""
    linea_clean = linea.strip()

    if pregunta.tipo == "escala_1_10":
        m = re.search(r"\b(10|[1-9])\b", linea_clean)
        return m.group(1) if m else "NS/NC"

    if pregunta.tipo == "abierta":
        return linea_clean[:500] if linea_clean else "NS/NC"

    nl = _normaliza(linea_clean)
    best: str | None = None
    best_len = 0
    for op in pregunta.opciones:
        on = _normaliza(op)
        if on and on in nl:
            if len(on) > best_len:
                best = op
                best_len = len(on)
        if nl and nl in on and len(nl) >= 3:
            if len(nl) > best_len:
                best = op
                best_len = len(nl)
    if best:
        return best

    for op in pregunta.opciones:
        if _normaliza(op) == nl:
            return op

    if nl and len(nl) >= 3:
        for op in pregunta.opciones:
            on = _normaliza(op)
            if nl in on or on.startswith(nl):
                return op

    return "NS/NC"


def listar_perfiles(engine, n_perfiles: int | None) -> pd.DataFrame:
    sql = text(
        """
        SELECT id, cluster_id, label, n_respondentes, peso_demografico_pct,
               edad_media, ideologia_media, distribucion_voto_json, descripcion_perfil_llm
        FROM perfiles_votante ORDER BY cluster_id
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn)
    if n_perfiles is not None:
        df = df.head(int(n_perfiles))
    return df


def simular_encuesta(
    cuestionario: list[PreguntaCIS],
    engine,
    n_perfiles: int | None = None,
    usar_rag: bool = True,
    llm: Any | None = None,
) -> pd.DataFrame:
    df_p = listar_perfiles(engine, n_perfiles)
    if df_p.empty:
        logger.warning("No hay perfiles_votante en BD")
        return pd.DataFrame()

    filas: list[dict] = []
    n = len(df_p)
    for k, (_, row) in enumerate(df_p.iterrows(), start=1):
        cid = int(row["cluster_id"])
        peso = float(row["peso_demografico_pct"] or 0.0)
        agent = VoterAgent(engine, cid, llm=llm)
        for j, pre in enumerate(cuestionario, start=1):
            logger.info("Perfil %s/%s: pregunta %s (%s)", k, n, j, pre.codigo)
            msg = _build_pregunta_prompt(pre)
            out = agent.run_turn(
                msg,
                persist=False,
                rag_engine=engine if usar_rag else None,
            )
            parsed = _parsear_respuesta(out.final_reply, pre)
            ra = RespuestaAgente(
                perfil_cluster_id=cid,
                pregunta_codigo=pre.codigo,
                respuesta_raw=out.raw_assistant,
                respuesta_parseada=parsed,
                razonamiento=out.deliberation,
                peso=peso,
            )
            filas.append({**asdict(ra), "variable_bd": pre.variable_bd, "tipo": pre.tipo})

    return pd.DataFrame(filas)


def agregar_respuestas(df_respuestas: pd.DataFrame) -> pd.DataFrame:
    if df_respuestas.empty:
        return pd.DataFrame(
            columns=[
                "pregunta_codigo",
                "variable_bd",
                "resultado_agregado",
                "n_perfiles",
                "ns_nc_pct",
            ]
        )

    out_rows: list[dict] = []
    for (codigo, var_bd), sub in df_respuestas.groupby(["pregunta_codigo", "variable_bd"]):
        tipo = sub["tipo"].iloc[0]
        w = sub["peso"].astype(float).values
        wsum = w.sum() or 1.0
        wn = w / wsum * 100.0
        ns_mask = sub["respuesta_parseada"].astype(str).str.upper() == "NS/NC"
        ns_nc_pct = float(wn[ns_mask].sum()) if len(wn) else 0.0
        n_perfiles = int(len(sub))

        if tipo == "escala_1_10":
            vals = []
            weights = []
            for _, r in sub.iterrows():
                try:
                    v = float(r["respuesta_parseada"])
                    if 1 <= v <= 10:
                        vals.append(v)
                        weights.append(float(r["peso"]))
                except (ValueError, TypeError):
                    continue
            tw = sum(weights) or 1.0
            media = float(np.average(vals, weights=weights)) if vals else float("nan")
            res: Any = {"media_ponderada": round(media, 3), "n_validos": len(vals)}
        else:
            dist: dict[str, float] = {}
            for _, r in sub.iterrows():
                k = str(r["respuesta_parseada"])
                dist[k] = dist.get(k, 0.0) + float(r["peso"])
            total = sum(dist.values()) or 1.0
            dist_pct = {k: round(v / total * 100.0, 3) for k, v in sorted(dist.items())}
            res = dist_pct

        out_rows.append(
            {
                "pregunta_codigo": codigo,
                "variable_bd": var_bd,
                "resultado_agregado": res,
                "n_perfiles": n_perfiles,
                "ns_nc_pct": round(ns_nc_pct, 3),
            }
        )

    return pd.DataFrame(out_rows)


def _tvd(p: dict[str, float], q: dict[str, float]) -> float:
    keys = set(p) | set(q)
    return 0.5 * sum(abs(p.get(k, 0) - q.get(k, 0)) for k in keys)


def comparar_con_microdatos_bd(
    df_agregado: pd.DataFrame,
    encuesta_id: int,
    engine,
) -> pd.DataFrame:
    if df_agregado.empty:
        return df_agregado.copy()

    out = df_agregado.copy()
    distancias: list[float] = []

    for _, row in out.iterrows():
        var = row["variable_bd"]
        col = _col_microdato(var)
        if col not in _COLUMNAS_MICRODATOS_PERMITIDAS:
            distancias.append(float("nan"))
            continue

        tipo = None
        for p in CUESTIONARIO_CIS_BASICO:
            if p.variable_bd == var:
                tipo = p.tipo
                break

        sql = text(
            f"SELECT {col} AS v, COUNT(*)::float AS c FROM microdatos_encuesta "
            f"WHERE encuesta_id = :eid AND {col} IS NOT NULL GROUP BY {col}"
        )
        try:
            with engine.connect() as conn:
                df_m = pd.read_sql(sql, conn, params={"eid": encuesta_id})
        except Exception as exc:
            logger.warning("comparar: no se pudo leer microdatos (%s): %s", col, exc)
            distancias.append(float("nan"))
            continue

        if df_m.empty:
            distancias.append(float("nan"))
            continue

        tot = df_m["c"].sum() or 1.0
        real: dict[str, float] = {}
        for _, r in df_m.iterrows():
            k = str(r["v"]).strip()
            real[k] = real.get(k, 0.0) + float(r["c"]) / tot * 100.0

        sim = row["resultado_agregado"]
        if tipo == "escala_1_10" and isinstance(sim, dict) and "media_ponderada" in sim:
            try:
                rm = (
                    sum(float(k) * v / 100.0 for k, v in real.items()) if real else float("nan")
                )
                sm = float(sim["media_ponderada"])
                dist = abs(rm - sm) if pd.notna(rm) and pd.notna(sm) else float("nan")
            except (TypeError, ValueError):
                dist = float("nan")
        elif isinstance(sim, dict):
            dist = _tvd(sim, real)
        else:
            dist = float("nan")

        distancias.append(round(float(dist), 4) if pd.notna(dist) else float("nan"))

    out["distancia_simulacion_real"] = distancias
    return out


def guardar_resultados_simulacion(
    df_respuestas: pd.DataFrame,
    df_agregado: pd.DataFrame,
    engine,
    nombre_simulacion: str | None = None,
) -> None:
    from agents.memory_log import insert_memory_entry

    sid = nombre_simulacion or "sim_cis"
    for _, r in df_respuestas.iterrows():
        payload = {
            "perfil_cluster_id": int(r["perfil_cluster_id"]),
            "pregunta_codigo": r["pregunta_codigo"],
            "respuesta_parseada": r["respuesta_parseada"],
            "peso": float(r["peso"]),
        }
        insert_memory_entry(
            engine,
            session_id=f"{sid}_survey",
            role="assistant",
            kind="survey_response",
            content=json.dumps(payload, ensure_ascii=False),
            cluster_id=int(r["perfil_cluster_id"]),
            metadata={"nombre_simulacion": nombre_simulacion},
        )

    insert_memory_entry(
        engine,
        session_id=f"{sid}_survey_agg",
        role="system",
        kind="survey_aggregate",
        content=df_agregado.to_json(orient="records", force_ascii=False),
        metadata={"nombre_simulacion": nombre_simulacion},
    )


def main() -> None:
    import os

    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    p = argparse.ArgumentParser(description="Simulador CIS con agentes")
    p.add_argument("--n-perfiles", type=int, default=None)
    p.add_argument("--no-rag", action="store_true")
    p.add_argument("--comparar-encuesta", type=int, default=None)
    p.add_argument("--nombre", type=str, default=None)
    args = p.parse_args()

    engine = create_engine(os.environ["DATABASE_URL"])
    df_r = simular_encuesta(
        CUESTIONARIO_CIS_BASICO,
        engine,
        n_perfiles=args.n_perfiles,
        usar_rag=not args.no_rag,
    )
    if df_r.empty:
        print("Sin respuestas (¿perfiles vacíos?).")
        return
    df_a = agregar_respuestas(df_r)
    if args.comparar_encuesta is not None:
        df_a = comparar_con_microdatos_bd(df_a, args.comparar_encuesta, engine)
    guardar_resultados_simulacion(df_r, df_a, engine, nombre_simulacion=args.nombre)
    print(df_a.to_string())


if __name__ == "__main__":
    main()
