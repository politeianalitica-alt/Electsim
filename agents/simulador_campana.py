"""
Evaluación de mensajes de campaña por perfiles sintéticos.
"""

from __future__ import annotations

import argparse
import logging
import re
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sqlalchemy import text

from agents.runner import VoterAgent

logger = logging.getLogger(__name__)

PROMPT_EVALUACION_CAMPANA = """
Se te presenta el siguiente mensaje de campaña del partido {partido}:

"{texto_campana}"

Tipo de mensaje: {tipo}
Tema principal: {tema}

Responde en este formato EXACTO:
RECEPTIVIDAD: [número del 0 al 10]
CAMBIO_INTENCION: [número de -5 a +5]
ARGUMENTOS_RESONANTES: [lista de máximo 3 argumentos que te convencen, separados por |]
OBJECIONES: [lista de máximo 3 objeciones, separadas por |]
RAZONAMIENTO: [explicación breve en 2-3 frases de tu reacción]
"""


@dataclass
class MensajeCampana:
    partido_emisor: str
    texto: str
    tipo: str
    tema: str


@dataclass
class ReaccionPerfil:
    perfil_cluster_id: int
    partido_emisor: str
    receptividad: float
    cambio_intencion_voto: float
    argumentos_resonantes: list[str]
    objeciones_principales: list[str]
    razonamiento_completo: str
    peso_demografico: float


_RECEPT = re.compile(r"RECEPTIVIDAD:\s*([\d.,]+)", re.I)
_CAMBIO = re.compile(r"CAMBIO_INTENCION:\s*([-+]?[\d.,]+)", re.I)
_ARGS = re.compile(r"ARGUMENTOS_RESONANTES:\s*(.+?)(?=OBJECIONES:|$)", re.I | re.DOTALL)
_OBJ = re.compile(r"OBJECIONES:\s*(.+?)(?=RAZONAMIENTO:|$)", re.I | re.DOTALL)
_RAZ = re.compile(r"RAZONAMIENTO:\s*(.+)\Z", re.I | re.DOTALL)


def _split_pipe(s: str) -> list[str]:
    return [x.strip() for x in s.split("|") if x.strip()][:3]


def _parsear_reaccion(
    texto_llm: str,
    perfil_cluster_id: int,
    mensaje: MensajeCampana,
    peso: float,
) -> ReaccionPerfil:
    t = texto_llm or ""
    try:
        r_rec = _RECEPT.search(t)
        recept = float(r_rec.group(1).replace(",", ".")) if r_rec else 5.0
        recept = max(0.0, min(10.0, recept))

        r_cam = _CAMBIO.search(t)
        cambio = float(r_cam.group(1).replace(",", ".")) if r_cam else 0.0
        cambio = max(-5.0, min(5.0, cambio))

        r_a = _ARGS.search(t)
        args = _split_pipe(r_a.group(1)) if r_a else []

        r_o = _OBJ.search(t)
        objs = _split_pipe(r_o.group(1)) if r_o else []

        r_z = _RAZ.search(t)
        raz = r_z.group(1).strip() if r_z else ""
    except Exception as exc:
        logger.warning("parsear_reaccion: formato inesperado (%s); usando defaults", exc)
        recept, cambio, args, objs, raz = 5.0, 0.0, [], [], ""

    return ReaccionPerfil(
        perfil_cluster_id=perfil_cluster_id,
        partido_emisor=mensaje.partido_emisor,
        receptividad=recept,
        cambio_intencion_voto=cambio,
        argumentos_resonantes=args,
        objeciones_principales=objs,
        razonamiento_completo=raz,
        peso_demografico=peso,
    )


def listar_perfiles_campana(engine, n_perfiles: int | None) -> pd.DataFrame:
    sql = text(
        """
        SELECT cluster_id, peso_demografico_pct
        FROM perfiles_votante ORDER BY cluster_id
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn)
    if n_perfiles is not None:
        df = df.head(int(n_perfiles))
    return df


def evaluar_mensaje(
    mensaje: MensajeCampana,
    engine,
    n_perfiles: int | None = None,
    usar_rag: bool = True,
    llm: object | None = None,
) -> list[ReaccionPerfil]:
    df_p = listar_perfiles_campana(engine, n_perfiles)
    if df_p.empty:
        return []

    user_msg = PROMPT_EVALUACION_CAMPANA.format(
        partido=mensaje.partido_emisor,
        texto_campana=mensaje.texto,
        tipo=mensaje.tipo,
        tema=mensaje.tema,
    )
    out: list[ReaccionPerfil] = []
    for _, row in df_p.iterrows():
        cid = int(row["cluster_id"])
        peso = float(row["peso_demografico_pct"] or 0.0)
        agent = VoterAgent(engine, cid, llm=llm)
        res = agent.run_turn(
            user_msg,
            persist=False,
            rag_engine=engine if usar_rag else None,
        )
        out.append(
            _parsear_reaccion(
                res.raw_assistant,
                cid,
                mensaje,
                peso,
            )
        )
    return out


def analizar_receptividad(reacciones: list[ReaccionPerfil]) -> dict:
    if not reacciones:
        return {
            "receptividad_media_ponderada": 0.0,
            "cambio_intencion_ponderado": 0.0,
            "segmentos_mas_receptivos": [],
            "segmentos_menos_receptivos": [],
            "argumentos_frecuentes": [],
            "objeciones_frecuentes": [],
            "distribucion_receptividad": {"baja": 0.0, "media": 100.0, "alta": 0.0},
        }

    w = np.array([r.peso_demografico for r in reacciones], dtype=float)
    sw = w.sum() or 1.0
    wn = w / sw

    rec = np.array([r.receptividad for r in reacciones])
    cam = np.array([r.cambio_intencion_voto for r in reacciones])
    rec_med = float(np.dot(rec, wn))
    cam_med = float(np.dot(cam, wn))

    by_rec = sorted(reacciones, key=lambda x: -x.receptividad)
    mas = [{"cluster_id": r.perfil_cluster_id, "receptividad": r.receptividad} for r in by_rec[:3]]
    menos = [{"cluster_id": r.perfil_cluster_id, "receptividad": r.receptividad} for r in by_rec[-3:]]

    arg_counts: dict[str, float] = {}
    for r in reacciones:
        for a in r.argumentos_resonantes:
            arg_counts[a] = arg_counts.get(a, 0.0) + r.peso_demografico
    arg_top = sorted(arg_counts.items(), key=lambda x: -x[1])[:5]

    obj_counts: dict[str, float] = {}
    for r in reacciones:
        for o in r.objeciones_principales:
            obj_counts[o] = obj_counts.get(o, 0.0) + r.peso_demografico
    obj_top = sorted(obj_counts.items(), key=lambda x: -x[1])[:5]

    baja = sum(wn[i] for i, r in enumerate(reacciones) if r.receptividad <= 3) * 100
    media = sum(wn[i] for i, r in enumerate(reacciones) if 4 <= r.receptividad <= 6) * 100
    alta = sum(wn[i] for i, r in enumerate(reacciones) if r.receptividad >= 7) * 100

    return {
        "receptividad_media_ponderada": round(rec_med, 3),
        "cambio_intencion_ponderado": round(cam_med, 3),
        "segmentos_mas_receptivos": mas,
        "segmentos_menos_receptivos": menos,
        "argumentos_frecuentes": arg_top,
        "objeciones_frecuentes": obj_top,
        "distribucion_receptividad": {
            "baja": round(baja, 3),
            "media": round(media, 3),
            "alta": round(alta, 3),
        },
    }


def comparar_mensajes(
    mensajes: list[MensajeCampana],
    engine,
    n_perfiles: int | None = None,
    llm: object | None = None,
) -> pd.DataFrame:
    filas: list[dict] = []
    for idx, m in enumerate(mensajes):
        react = evaluar_mensaje(m, engine, n_perfiles=n_perfiles, llm=llm)
        if not react:
            continue
        an = analizar_receptividad(react)
        pos = sum(1 for r in react if r.cambio_intencion_voto > 0)
        best = max(react, key=lambda x: x.receptividad)
        filas.append(
            {
                "mensaje_idx": idx,
                "partido_emisor": m.partido_emisor,
                "tipo": m.tipo,
                "tema": m.tema,
                "receptividad_media": an["receptividad_media_ponderada"],
                "cambio_intencion_medio": an["cambio_intencion_ponderado"],
                "n_perfiles_impactados_positivamente": pos,
                "mejor_segmento": best.perfil_cluster_id,
            }
        )
    return pd.DataFrame(filas)


def main() -> None:
    import os

    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    p = argparse.ArgumentParser()
    p.add_argument("--partido", required=True)
    p.add_argument("--texto", required=True)
    p.add_argument("--tipo", default="propuesta_concreta")
    p.add_argument("--tema", default="economia")
    p.add_argument("--n-perfiles", type=int, default=None)
    p.add_argument("--no-rag", action="store_true")
    args = p.parse_args()

    engine = create_engine(os.environ["DATABASE_URL"])
    msg = MensajeCampana(args.partido, args.texto, args.tipo, args.tema)
    react = evaluar_mensaje(msg, engine, n_perfiles=args.n_perfiles, usar_rag=not args.no_rag)
    an = analizar_receptividad(react)
    print("--- Por perfil ---")
    for r in react:
        print(r)
    print("--- Resumen ---")
    print(an)


if __name__ == "__main__":
    main()
