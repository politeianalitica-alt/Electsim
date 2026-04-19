<<<<<<< HEAD
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

=======
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import logging
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from agents.memory_log import get_simulation_responses, log_memory_turn
>>>>>>> 6fda6ff (agentes 1)
from agents.runner import VoterAgent

logger = logging.getLogger(__name__)

<<<<<<< HEAD
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
=======

@dataclass(slots=True)
class PreguntaCIS:
    codigo: str
    texto: str
    opciones: list[str] = field(default_factory=list)


_SQL_MICRODATOS: dict[str, str] = {
    "escala_ideologica": (
        "SELECT escala_ideologica AS v, COUNT(*)::float AS c "
        "FROM microdatos_encuesta "
        "WHERE encuesta_id = :eid AND escala_ideologica IS NOT NULL "
        "GROUP BY escala_ideologica"
    ),
    "situacion_economica_españa": (
        "SELECT situacion_economica_españa AS v, COUNT(*)::float AS c "
        "FROM microdatos_encuesta "
        "WHERE encuesta_id = :eid AND situacion_economica_españa IS NOT NULL "
        "GROUP BY situacion_economica_españa"
    ),
    "situacion_economica_personal": (
        "SELECT situacion_economica_personal AS v, COUNT(*)::float AS c "
        "FROM microdatos_encuesta "
        "WHERE encuesta_id = :eid AND situacion_economica_personal IS NOT NULL "
        "GROUP BY situacion_economica_personal"
    ),
    "intencion_voto": (
        "SELECT intencion_voto AS v, COUNT(*)::float AS c "
        "FROM microdatos_encuesta "
        "WHERE encuesta_id = :eid AND intencion_voto IS NOT NULL "
        "GROUP BY intencion_voto"
    ),
    "principal_problema": (
        "SELECT principal_problema AS v, COUNT(*)::float AS c "
        "FROM microdatos_encuesta "
        "WHERE encuesta_id = :eid AND principal_problema IS NOT NULL "
        "GROUP BY principal_problema"
    ),
}
_COLUMNAS_MICRODATOS_PERMITIDAS: set[str] = set(_SQL_MICRODATOS.keys())


def cuestionario_basico() -> list[PreguntaCIS]:
    return [
        PreguntaCIS(
            codigo="intencion_voto",
            texto="Si mañana hubiera elecciones generales, ¿a qué partido votarías?",
            opciones=["PSOE", "PP", "VOX", "SUMAR", "ERC", "JUNTS", "PNV", "EH Bildu", "Abstención", "NS/NC"],
        ),
        PreguntaCIS(
            codigo="situacion_economica_españa",
            texto="¿Cómo calificarías la situación económica de España actualmente?",
            opciones=["Muy buena", "Buena", "Regular", "Mala", "Muy mala", "NS/NC"],
        ),
        PreguntaCIS(
            codigo="situacion_economica_personal",
            texto="¿Cómo calificarías tu situación económica personal?",
            opciones=["Muy buena", "Buena", "Regular", "Mala", "Muy mala", "NS/NC"],
        ),
        PreguntaCIS(
            codigo="principal_problema",
            texto="¿Cuál es, a tu juicio, el principal problema de España?",
            opciones=["Paro", "Inflación", "Vivienda", "Sanidad", "Inmigración", "Corrupción", "Otro", "NS/NC"],
        ),
    ]


def _normalizar_texto(x: Any) -> str:
    return str(x or "").strip().lower()


def _parsear_respuesta(respuesta: str, opciones: list[str] | None = None) -> str:
    raw = str(respuesta or "").strip()
    if not raw:
        return "NS/NC"

    if opciones:
        raw_l = raw.lower()
        # 1) coincidencia exacta
        for op in opciones:
            if raw_l == op.lower().strip():
                return op
        # 2) contiene opción
        for op in opciones:
            if op.lower().strip() and op.lower().strip() in raw_l:
                return op

    raw_u = raw.upper()
    if any(tok in raw_u for tok in ["NS/NC", "NO SABE", "NO CONTESTA", "N.S", "N.C"]):
        return "NS/NC"

    # fallback: primera línea breve
    first = raw.splitlines()[0].strip()
    if len(first) > 120:
        return "NS/NC"
    return first or "NS/NC"


def _load_cluster_ids(engine: Engine, n_perfiles: int | None = None) -> list[int]:
    lim_clause = "LIMIT :n" if n_perfiles else ""
    sql = text(
        f"""
        SELECT cluster_id
        FROM perfiles_votante
        WHERE cluster_id IS NOT NULL
        ORDER BY peso_demografico_pct DESC NULLS LAST, cluster_id
        {lim_clause}
        """
    )
    params = {"n": int(n_perfiles)} if n_perfiles else {}
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params=params)
    return [int(v) for v in df["cluster_id"].dropna().tolist()]
>>>>>>> 6fda6ff (agentes 1)


def simular_encuesta(
    cuestionario: list[PreguntaCIS],
<<<<<<< HEAD
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
=======
    engine: Engine,
    n_perfiles: int | None = None,
    usar_rag: bool = True,
    llm: Any | None = None,
    checkpoint_engine: Any | None = None,
    nombre_simulacion: str | None = None,
) -> pd.DataFrame:
    """Ejecuta cuestionario por clusters y devuelve respuestas a nivel turno."""
    if not cuestionario:
        return pd.DataFrame(
            columns=[
                "simulacion",
                "perfil_cluster_id",
                "pregunta_codigo",
                "pregunta_texto",
                "respuesta_raw",
                "respuesta_parseada",
                "modelo",
                "created_at",
            ]
        )

    sim_name = nombre_simulacion or datetime.utcnow().strftime("sim_%Y%m%d_%H%M%S")
    session_id = f"{sim_name}_survey"
    cp_engine = checkpoint_engine or engine

    completed: set[tuple[int, str]] = set()
    if checkpoint_engine is not None and nombre_simulacion:
        try:
            completed = get_simulation_responses(cp_engine, nombre_simulacion)
            logger.info("Checkpoint cargado: %s respuestas previas", len(completed))
        except Exception as exc:
            logger.warning("No se pudo cargar checkpoint: %s", exc)

    cluster_ids = _load_cluster_ids(engine, n_perfiles=n_perfiles)
    rows: list[dict[str, Any]] = []

    for cid in cluster_ids:
        agent = VoterAgent(
            cluster_id=cid,
            engine=engine,
            llm=llm,
            session_id=f"{session_id}_{cid}",
            persist=False,
            usar_rag=usar_rag,
        )
        for pregunta in cuestionario:
            key = (cid, pregunta.codigo)
            if key in completed:
                logger.info("[checkpoint] skip cluster=%s pregunta=%s", cid, pregunta.codigo)
                continue

            result = agent.run_turn(
                pregunta.texto,
                use_rag=usar_rag,
                use_history=True,
            )
            respuesta_raw = str(result.get("raw") or "")
            respuesta_parseada = _parsear_respuesta(result.get("respuesta", ""), pregunta.opciones)

            row = {
                "simulacion": sim_name,
                "perfil_cluster_id": cid,
                "pregunta_codigo": pregunta.codigo,
                "pregunta_texto": pregunta.texto,
                "respuesta_raw": respuesta_raw,
                "respuesta_parseada": respuesta_parseada,
                "modelo": result.get("modelo"),
                "created_at": datetime.utcnow(),
            }
            rows.append(row)

            # Persistencia inmediata por respuesta (checkpoint real-time)
            log_memory_turn(
                cp_engine,
                session_id=session_id,
                cluster_id=cid,
                role="assistant",
                kind="survey_response",
                content=respuesta_raw,
                metadata={
                    "simulacion": sim_name,
                    "pregunta_codigo": pregunta.codigo,
                    "pregunta_texto": pregunta.texto,
                    "respuesta_parseada": respuesta_parseada,
                },
                modelo=result.get("modelo"),
            )
            completed.add(key)

    return pd.DataFrame(rows)


def agregar_respuestas(df_respuestas: pd.DataFrame) -> pd.DataFrame:
    """Agrega respuestas por pregunta/opción con porcentaje y NS/NC tracking."""
>>>>>>> 6fda6ff (agentes 1)
    if df_respuestas.empty:
        return pd.DataFrame(
            columns=[
                "pregunta_codigo",
<<<<<<< HEAD
                "variable_bd",
                "resultado_agregado",
                "n_perfiles",
=======
                "respuesta_parseada",
                "n",
                "pct",
                "n_total",
                "ns_nc_n",
>>>>>>> 6fda6ff (agentes 1)
                "ns_nc_pct",
            ]
        )

<<<<<<< HEAD
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
=======
    filas: list[dict[str, Any]] = []
    for codigo, sub in df_respuestas.groupby("pregunta_codigo"):
        total = len(sub)
        vc = sub["respuesta_parseada"].fillna("NS/NC").astype(str).value_counts(dropna=False)
        ns_nc_n = int(vc.get("NS/NC", 0))
        ns_nc_pct = round(ns_nc_n / total * 100.0, 2) if total else 0.0

        if ns_nc_pct > 25.0:
            logger.warning(
                "Alta tasa NS/NC (%.1f%%) en pregunta %s — revisar formato de prompt",
                ns_nc_pct,
                codigo,
            )

        for respuesta, n in vc.items():
            filas.append(
                {
                    "pregunta_codigo": codigo,
                    "respuesta_parseada": str(respuesta),
                    "n": int(n),
                    "pct": round(int(n) / total * 100.0, 2) if total else 0.0,
                    "n_total": int(total),
                    "ns_nc_n": ns_nc_n,
                    "ns_nc_pct": ns_nc_pct,
                }
            )

    return pd.DataFrame(filas).sort_values(["pregunta_codigo", "n"], ascending=[True, False])


def _norm_dist(df: pd.DataFrame, key_col: str, val_col: str) -> dict[str, float]:
    if df.empty:
        return {}
    s = df[[key_col, val_col]].copy()
    s[key_col] = s[key_col].astype(str)
    s[val_col] = pd.to_numeric(s[val_col], errors="coerce").fillna(0.0)
    tot = float(s[val_col].sum())
    if tot <= 0:
        return {}
    return {str(k): float(v) / tot for k, v in s.groupby(key_col)[val_col].sum().items()}
>>>>>>> 6fda6ff (agentes 1)


def comparar_con_microdatos_bd(
    df_agregado: pd.DataFrame,
<<<<<<< HEAD
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
=======
    engine: Engine,
    encuesta_id: int,
    columnas: list[str] | None = None,
) -> pd.DataFrame:
    """Compara distribuciones simuladas vs microdatos reales (distancia L1/TV)."""
    cols = columnas or sorted(_COLUMNAS_MICRODATOS_PERMITIDAS)
    distancias: list[dict[str, Any]] = []

    for col in cols:
        sql_str = _SQL_MICRODATOS.get(col)
        if not sql_str:
            distancias.append({"columna": col, "dist_l1": float("nan"), "dist_tv": float("nan")})
            continue

        # Distribución simulada para esa pregunta (si existe)
        sim_sub = df_agregado[df_agregado["pregunta_codigo"] == col] if "pregunta_codigo" in df_agregado.columns else pd.DataFrame()
        sim_dist = _norm_dist(sim_sub, "respuesta_parseada", "n") if not sim_sub.empty else {}

        with engine.connect() as conn:
            df_real = pd.read_sql(text(sql_str), conn, params={"eid": int(encuesta_id)})
        real_dist = _norm_dist(df_real, "v", "c")

        if not sim_dist or not real_dist:
            distancias.append(
                {
                    "columna": col,
                    "dist_l1": float("nan"),
                    "dist_tv": float("nan"),
                    "n_categorias_sim": len(sim_dist),
                    "n_categorias_real": len(real_dist),
                }
            )
            continue

        keys = set(sim_dist.keys()) | set(real_dist.keys())
        l1 = sum(abs(sim_dist.get(k, 0.0) - real_dist.get(k, 0.0)) for k in keys)
        distancias.append(
            {
                "columna": col,
                "dist_l1": float(l1),
                "dist_tv": float(l1 / 2.0),
                "n_categorias_sim": len(sim_dist),
                "n_categorias_real": len(real_dist),
            }
        )

    return pd.DataFrame(distancias)


def resumen_parseo(df_respuestas: pd.DataFrame) -> pd.DataFrame:
    """
    Devuelve DataFrame con tasa de NS/NC y longitud media de respuesta
    por pregunta, para diagnóstico de calidad del parseo.
    """
    if df_respuestas.empty:
        return pd.DataFrame(
            columns=[
                "pregunta_codigo",
                "total_respuestas",
                "ns_nc_n",
                "ns_nc_pct",
                "longitud_media_raw",
            ]
        )

    filas: list[dict[str, Any]] = []
    for codigo, sub in df_respuestas.groupby("pregunta_codigo"):
        total = len(sub)
        ns_nc = (sub["respuesta_parseada"].astype(str).str.upper() == "NS/NC").sum()
        lon_media = sub["respuesta_raw"].astype(str).str.len().mean()
        filas.append(
            {
                "pregunta_codigo": codigo,
                "total_respuestas": int(total),
                "ns_nc_n": int(ns_nc),
                "ns_nc_pct": round(ns_nc / total * 100.0, 2) if total else 0.0,
                "longitud_media_raw": round(float(lon_media), 0) if pd.notna(lon_media) else 0.0,
            }
        )
    return pd.DataFrame(filas).sort_values("ns_nc_pct", ascending=False)


if __name__ == "__main__":  # pragma: no cover
    import argparse
    import os
    from sqlalchemy import create_engine

    parser = argparse.ArgumentParser(description="Simulador CIS sintético")
    parser.add_argument("--n-perfiles", type=int, default=10)
    parser.add_argument("--no-rag", action="store_true")
    parser.add_argument("--nombre", type=str, default=None)
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL no definida")
    eng = create_engine(db_url, pool_pre_ping=True)

    df = simular_encuesta(
        cuestionario=cuestionario_basico(),
        engine=eng,
        n_perfiles=args.n_perfiles,
        usar_rag=not args.no_rag,
        checkpoint_engine=eng,
        nombre_simulacion=args.nombre,
    )
    print(agregar_respuestas(df).head(20).to_string(index=False))
>>>>>>> 6fda6ff (agentes 1)
