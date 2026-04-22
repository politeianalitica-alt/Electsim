"""CLI de ingesta simplificada.

Uso rápido:
    python -m pipelines.ingesta_simple --modo rapido
    python -m pipelines.ingesta_simple --modo completo
    python -m pipelines.ingesta_simple --modo completo --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)



def _run_base_scrapers() -> dict[str, Any]:
    from etl.run_all_scrapers import main as run_all_scrapers

    return run_all_scrapers()



def _run_media() -> dict[str, Any]:
    from dashboard.db import insertar_contenidos_mediaticos
    from dashboard.ingestion.media_fetcher import fetch_rss
    from dashboard.ingestion.social_media import fetch_x_reciente, fetch_youtube
    from dashboard.nlp.enricher import enriquecer

    regs = list(fetch_rss())
    regs += list(fetch_x_reciente(query="politica Espana lang:es -is:retweet", max_results=80))
    regs += list(fetch_youtube(query="politica Espana", max_results=20))
    enriched = [enriquecer(r) for r in regs]
    inserted = 0 if os.getenv("ELECTSIM_DRY_RUN") == "1" else insertar_contenidos_mediaticos(enriched)
    return {"ok": True, "obtenidos": len(regs), "insertados": inserted}



def _run_declaraciones() -> dict[str, Any]:
    from datetime import datetime, timezone

    from dashboard.db import (
        cargar_declaraciones,
        cargar_noticias_recientes,
        insertar_contradiccion,
        insertar_declaracion,
    )
    from dashboard.nlp.enricher import detectar_categoria
    from dashboard.services.opposition import detectar_contradicciones_df

    df = cargar_noticias_recientes(dias=3, limit=1500)
    regs: list[dict[str, Any]] = []
    if not df.empty:
        for _, row in df.iterrows():
            personas = str(row.get("personas_mencionadas") or "").strip()
            texto = str(row.get("titular") or "").strip()
            if not personas or not texto:
                continue
            persona = personas.split(",")[0].strip()
            partido = str(row.get("partidos_mencionados") or "").split(",")[0].strip() or "SIN_CLASIFICAR"
            regs.append(
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

    inserted = 0
    contradicciones = 0
    if os.getenv("ELECTSIM_DRY_RUN") != "1":
        for r in regs:
            if insertar_declaracion(r):
                inserted += 1
        df_decl = cargar_declaraciones(ventana_dias=730, limite=5000)
        if not df_decl.empty:
            contras = detectar_contradicciones_df(df_decl, confianza_min=0.6)
            for c in contras:
                insertar_contradiccion(c)
            contradicciones = len(contras)

    return {"ok": True, "declaraciones": inserted, "contradicciones": contradicciones, "analizadas": len(regs)}



def main() -> int:
    parser = argparse.ArgumentParser(description="Ingesta simplificada de ElectSim")
    parser.add_argument(
        "--modo",
        choices=["rapido", "completo"],
        default="rapido",
        help="rapido: solo scrapers base | completo: scrapers + media + declaraciones",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="No escribe en media/declaraciones (scrapers base mantienen su comportamiento)",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")

    if args.dry_run:
        os.environ["ELECTSIM_DRY_RUN"] = "1"

    if not os.environ.get("DATABASE_URL"):
        logger.critical("DATABASE_URL no definida")
        return 1

    resultados: list[dict[str, Any]] = []

    try:
        base = _run_base_scrapers()
        resultados.append({"step": "base_scrapers", "result": base})
    except Exception as exc:
        logger.exception("Fallo en base_scrapers")
        resultados.append({"step": "base_scrapers", "error": str(exc)})

    if args.modo == "completo":
        try:
            resultados.append({"step": "media_monitoring", "result": _run_media()})
        except Exception as exc:
            logger.exception("Fallo en media_monitoring")
            resultados.append({"step": "media_monitoring", "error": str(exc)})

        try:
            resultados.append({"step": "declaraciones", "result": _run_declaraciones()})
        except Exception as exc:
            logger.exception("Fallo en declaraciones")
            resultados.append({"step": "declaraciones", "error": str(exc)})

    print(json.dumps(resultados, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
