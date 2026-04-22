"""Declaraciones + contradicciones (ejecución directa)."""

from __future__ import annotations

import argparse
import logging
import os
from datetime import datetime, timezone

from dashboard.db import (
    cargar_declaraciones,
    cargar_noticias_recientes,
    insertar_contradiccion,
    insertar_declaracion,
)
from dashboard.nlp.enricher import detectar_categoria
from dashboard.services.opposition import detectar_contradicciones_df

logger = logging.getLogger(__name__)

def tarea_fetch_desde_noticias(ventana_dias: int = 3) -> list[dict]:
    df = cargar_noticias_recientes(dias=ventana_dias, limit=1500)
    out: list[dict] = []
    if df.empty:
        return out

    for _, row in df.iterrows():
        personas = str(row.get("personas_mencionadas") or "").strip()
        texto = str(row.get("titular") or "").strip()
        if not personas or not texto:
            continue
        persona = personas.split(",")[0].strip()
        partido = str(row.get("partidos_mencionados") or "").split(",")[0].strip() or "SIN_CLASIFICAR"
        out.append(
            {
                "persona": persona,
                "partido": partido,
                "fecha": row.get("fecha_publicacion") or datetime.now(timezone.utc),
                "medio": str(row.get("fuente") or row.get("medio") or "prensa"),
                "contexto": "prensa",
                "texto": texto[:5000],
                "tema": str(row.get("categoria") or "") or detectar_categoria(texto),
                "subtema": None,
                "posicion_x": None,
                "posicion_y": None,
                "url": str(row.get("url") or ""),
                "cliente_id": None,
            }
        )
    logger.info("Declaraciones desde noticias: %d", len(out))
    return out


def tarea_insertar_declaraciones(regs: list[dict]) -> int:
    if os.getenv("ELECTSIM_DRY_RUN") == "1":
        return 0
    n = 0
    for r in regs:
        if insertar_declaracion(r):
            n += 1
    return n


def tarea_detectar_contradicciones() -> int:
    if os.getenv("ELECTSIM_DRY_RUN") == "1":
        return 0

    df = cargar_declaraciones(ventana_dias=730, limite=5000)
    if df.empty:
        return 0
    contras = detectar_contradicciones_df(df, confianza_min=0.6)
    for c in contras:
        insertar_contradiccion(c)
    return len(contras)


def declaraciones_flow() -> None:
    regs = tarea_fetch_desde_noticias()
    n_ins = tarea_insertar_declaraciones(regs)
    n_contra = tarea_detectar_contradicciones()
    print(f"[declaraciones_flow] insertadas={n_ins} contradicciones={n_contra}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
    parser = argparse.ArgumentParser(description="Flow de declaraciones + contradicciones")
    args = parser.parse_args()
    _ = args
    declaraciones_flow()
