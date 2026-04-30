from fastapi import APIRouter, Depends, Query

from app.auth.deps import UserOut, get_current_user
from app.db.session import query

router = APIRouter(prefix="/prensa", tags=["prensa"])


@router.get("/noticias")
def get_noticias(
    dias: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT fuente, titular, url, fecha_publicacion, categoria,
               partidos_mencionados, sentimiento_score, sentimiento_label,
               temas_json, relevancia_score
        FROM noticias_prensa
        WHERE fecha_publicacion >= CURRENT_DATE - :dias
        ORDER BY relevancia_score DESC NULLS LAST, fecha_publicacion DESC
        LIMIT :limit
    """, {"dias": dias, "limit": limit})
    return df.to_dict(orient="records")


@router.get("/sentimiento")
def get_sentimiento(
    dias: int = Query(default=14, ge=1, le=90),
    current_user: UserOut = Depends(get_current_user),
):
    """Sentimiento medio por partido en los últimos N días."""
    df = query("""
        SELECT entidad, AVG(sentimiento_medio) AS sent_medio,
               SUM(n_noticias) AS n_total,
               AVG(pct_positivo) AS pct_pos,
               AVG(pct_negativo) AS pct_neg
        FROM sentimiento_prensa_diario
        WHERE fecha >= CURRENT_DATE - :dias
          AND tipo_entidad = 'partido'
        GROUP BY entidad
        ORDER BY sent_medio DESC
    """, {"dias": dias})
    return df.to_dict(orient="records")


@router.get("/sentimiento/{partido}/serie")
def get_sentimiento_serie(
    partido: str,
    dias: int = Query(default=30, ge=7, le=180),
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT fecha, sentimiento_medio, pct_positivo, pct_negativo, pct_neutro, n_noticias
        FROM sentimiento_prensa_diario
        WHERE entidad = :partido AND fecha >= CURRENT_DATE - :dias
        ORDER BY fecha
    """, {"partido": partido, "dias": dias})
    return df.to_dict(orient="records")


@router.get("/agenda")
def get_agenda(current_user: UserOut = Depends(get_current_user)):
    """Agenda mediática de hoy."""
    df = query("""
        SELECT tema, n_noticias, sentimiento_medio, peso_agenda, tendencia
        FROM agenda_mediatica
        WHERE fecha = CURRENT_DATE
        ORDER BY n_noticias DESC
        LIMIT 25
    """)
    if df.empty:
        df = query("""
            SELECT COALESCE(NULLIF(categoria,''), 'general') AS tema,
                   COUNT(*) AS n_noticias,
                   AVG(sentimiento_score) AS sentimiento_medio,
                   COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0) AS peso_agenda,
                   'estable'::text AS tendencia
            FROM noticias_prensa
            WHERE fecha_publicacion = CURRENT_DATE
            GROUP BY 1 ORDER BY n_noticias DESC LIMIT 25
        """)
    return df.to_dict(orient="records")
