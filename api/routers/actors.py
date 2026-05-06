# api/routers/actors.py
from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Query

from api.schemas.actors import ActorItem, ActorsResponse

router = APIRouter(prefix="/api/actors", tags=["actors"])

PARTY_COLORS: dict[str, str] = {
    "PSOE": "#E03A3E", "PP": "#1F77FF", "VOX": "#5BC035",
    "Sumar": "#D81E5B", "Junts": "#00C2A8", "ERC": "#F4B400",
    "PNV": "#1D8042", "Bildu": "#A4D65E", "Podemos": "#6E2A78",
}


def _demo_actors() -> ActorsResponse:
    items = [
        ActorItem(id="1", name="Pedro Sánchez", party="PSOE", party_color="#E03A3E", role="Presidente del Gobierno", bio="Secretario General del PSOE.", exposure=96, approval=38, sentiment="down"),
        ActorItem(id="2", name="Alberto Núñez Feijóo", party="PP", party_color="#1F77FF", role="Líder de la oposición", bio="Presidente del PP desde 2022.", exposure=91, approval=42, sentiment="up"),
        ActorItem(id="3", name="Santiago Abascal", party="VOX", party_color="#5BC035", role="Presidente", bio="Líder y fundador de VOX.", exposure=78, approval=28, sentiment="stable"),
        ActorItem(id="4", name="Yolanda Díaz", party="Sumar", party_color="#D81E5B", role="Vicepresidenta segunda", bio="Ministra de Trabajo.", exposure=74, approval=36, sentiment="down"),
        ActorItem(id="5", name="Isabel Díaz Ayuso", party="PP", party_color="#1F77FF", role="Presidenta CAM", bio="Presidenta de la Comunidad de Madrid.", exposure=88, approval=45, sentiment="up"),
        ActorItem(id="6", name="Carles Puigdemont", party="Junts", party_color="#00C2A8", role="Presidente", bio="Expresidente de la Generalitat.", exposure=71, approval=22, sentiment="stable"),
    ]
    return ActorsResponse(actors=items, total=len(items), mode="fallback")


def _sentiment(tendencia: Optional[str]) -> str:
    if tendencia in ("subiendo", "up"):
        return "up"
    if tendencia in ("bajando", "down"):
        return "down"
    return "stable"


@router.get("", response_model=ActorsResponse)
def list_actors(
    partido: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
) -> ActorsResponse:
    try:
        import psycopg2

        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        conditions = ["activo = TRUE"]
        params: list = []
        if partido:
            conditions.append("partido ILIKE %s")
            params.append(f"%{partido}%")
        if search:
            conditions.append("nombre_completo ILIKE %s")
            params.append(f"%{search}%")
        where = " AND ".join(conditions)

        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT id::text, nombre_completo, tipo, partido, cargo_actual,
                           COALESCE(score_influencia, 0) AS score_influencia,
                           COALESCE(sentimiento_actual, 0) AS sentimiento_actual,
                           tendencia_sentimiento
                    FROM persona_publica
                    WHERE {where}
                    ORDER BY score_influencia DESC NULLS LAST
                    LIMIT %s
                    """,
                    params + [limit],
                )
                rows = cur.fetchall()

        if not rows:
            return _demo_actors()

        actors = [
            ActorItem(
                id=str(r[0]),
                name=r[1] or "",
                party=r[3] or "Independiente",
                party_color=PARTY_COLORS.get(r[3] or "", "#94A3B8"),
                role=r[4] or "",
                exposure=int(min(max(float(r[5]) * 100, 0), 100)),
                approval=int(min(max((float(r[6]) + 1) * 50, 0), 100)),
                sentiment=_sentiment(r[7]),
            )
            for r in rows
        ]
        return ActorsResponse(actors=actors, total=len(actors), mode="real")
    except Exception:
        return _demo_actors()
