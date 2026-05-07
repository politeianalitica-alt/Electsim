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
        ActorItem(id="1", name="Pedro Sánchez", party="PSOE", party_color="#E03A3E", role="Presidente del Gobierno", bio="Secretario General del PSOE y Presidente del Gobierno desde 2018. Diputado por Ferraz.", exposure=96, approval=38, sentiment="down"),
        ActorItem(id="2", name="Alberto Núñez Feijóo", party="PP", party_color="#1F77FF", role="Líder de la oposición", bio="Presidente del PP desde 2022. Ex Presidente de la Xunta de Galicia durante 12 años.", exposure=91, approval=42, sentiment="up"),
        ActorItem(id="3", name="Santiago Abascal", party="VOX", party_color="#5BC035", role="Presidente de VOX", bio="Fundador y presidente de VOX desde 2013. Ex militante del PP.", exposure=78, approval=28, sentiment="stable"),
        ActorItem(id="4", name="Yolanda Díaz", party="Sumar", party_color="#D81E5B", role="Vicepresidenta Segunda", bio="Ministra de Trabajo. Impulsora de la reforma laboral y el SMI. Candidata presidencial por Sumar.", exposure=74, approval=36, sentiment="down"),
        ActorItem(id="5", name="Isabel Díaz Ayuso", party="PP", party_color="#1F77FF", role="Presidenta CAM", bio="Presidenta de la Comunidad de Madrid desde 2021. Figura dominante del PP territorial.", exposure=88, approval=45, sentiment="up"),
        ActorItem(id="6", name="Carles Puigdemont", party="Junts", party_color="#00C2A8", role="Presidente de Junts", bio="Expresidente de la Generalitat. En el exilio. Rol decisivo en la investidura de Sánchez.", exposure=71, approval=22, sentiment="stable"),
        ActorItem(id="7", name="Oriol Junqueras", party="ERC", party_color="#F4B400", role="Presidente de ERC", bio="Exvicepresidente de la Generalitat y exministro de Economía de Cataluña.", exposure=62, approval=31, sentiment="down"),
        ActorItem(id="8", name="Andoni Ortuzar", party="PNV", party_color="#1D8042", role="Presidente del PNV", bio="Presidente del EBB del PNV desde 2013. Referente del nacionalismo vasco moderado.", exposure=58, approval=44, sentiment="stable"),
        ActorItem(id="9", name="Arnaldo Otegi", party="Bildu", party_color="#A4D65E", role="Coordinador General", bio="Coordinador general de EH Bildu. Figura clave del independentismo vasco.", exposure=67, approval=35, sentiment="stable"),
        ActorItem(id="10", name="Teresa Ribera", party="PSOE", party_color="#E03A3E", role="Vicepresidenta Tercera", bio="Ministra para la Transición Ecológica. Candidata al Comisariado de la UE.", exposure=69, approval=41, sentiment="up"),
        ActorItem(id="11", name="María Jesús Montero", party="PSOE", party_color="#E03A3E", role="Ministra de Hacienda", bio="Ministra de Hacienda y portavoz del gobierno. Negociadora clave de los PGE.", exposure=65, approval=39, sentiment="stable"),
        ActorItem(id="12", name="José María Aznar", party="PP", party_color="#1F77FF", role="Ex Presidente del Gobierno", bio="Expresidente del Gobierno (1996-2004). Fundador de la FAES. Influyente en el PP.", exposure=54, approval=33, sentiment="down"),
        ActorItem(id="13", name="Cuca Gamarra", party="PP", party_color="#1F77FF", role="Secretaria General PP", bio="Secretaria General del PP y portavoz en el Congreso. Figura de relieve del partido.", exposure=61, approval=40, sentiment="up"),
        ActorItem(id="14", name="Ione Belarra", party="Podemos", party_color="#6E2A78", role="Secretaria General", bio="Secretaria General de Podemos. Exministra de Derechos Sociales.", exposure=56, approval=27, sentiment="down"),
        ActorItem(id="15", name="Ada Colau", party="Comuns", party_color="#FF6B6B", role="Exalcaldesa Barcelona", bio="Exalcaldesa de Barcelona. Cofundadora de Podemos. Figura del movimiento municipalista.", exposure=62, approval=33, sentiment="down"),
        ActorItem(id="16", name="Salvador Illa", party="PSOE", party_color="#E03A3E", role="President de la Generalitat", bio="President de la Generalitat de Catalunya desde 2024. Exministro de Sanidad.", exposure=71, approval=43, sentiment="up"),
        ActorItem(id="17", name="Carlos Mazón", party="PP", party_color="#1F77FF", role="President de la Generalitat Valenciana", bio="President de la Generalitat Valenciana desde 2023. Cuestionado por gestión de la DANA.", exposure=64, approval=31, sentiment="down"),
        ActorItem(id="18", name="Juan Espadas", party="PSOE", party_color="#E03A3E", role="Exlíder PSOE-A", bio="Exsecretario general del PSOE de Andalucía. Diputado nacional.", exposure=38, approval=29, sentiment="stable"),
        ActorItem(id="19", name="Pepe Álvarez", party="UGT", party_color="#E03A3E", role="Secretario General UGT", bio="Secretario General de UGT. Sindicato mayoritario junto a CCOO.", exposure=47, approval=42, sentiment="stable"),
        ActorItem(id="20", name="Antonio Garamendi", party="CEOE", party_color="#1F77FF", role="Presidente CEOE", bio="Presidente de la CEOE desde 2018. Voz principal de los empresarios españoles.", exposure=52, approval=38, sentiment="up"),
    ]
    return ActorsResponse(actors=items, total=len(items), mode="demo")


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
