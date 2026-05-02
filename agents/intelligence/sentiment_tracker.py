"""
Sentiment Tracker — actualiza el score de sentimiento mediatico de personas publicas.

Pipeline:
  1. Recupera top-N personas por score_influencia
  2. Descarga noticias recientes via GDELT (cliente existente en etl/sources/gdelt/)
  3. Analiza sentimiento con pysentimiento (o fallback lexico)
  4. Actualiza persona_publica.sentimiento_actual y graba sentiment_history
  5. Emite senal en signal_politeia si el cambio supera el umbral

Equivale al Tone Analysis de Palantir sobre documentos operacionales y al
Engagement Score de NationBuilder sobre perfiles de votantes.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Optional

import psycopg
from psycopg.rows import dict_row

from config.settings import get_settings

log = logging.getLogger(__name__)
_settings = get_settings()

DELTA_ALERTA = 0.25   # cambio de sentimiento que dispara senal
POSITIVAS = [
    "apoya", "acuerdo", "exito", "aprueba", "logro", "victoria",
    "avance", "defiende", "mejora", "positivo", "alabado", "respaldo",
]
NEGATIVAS = [
    "dimite", "escandalo", "corrupcion", "fracaso", "critica",
    "denuncia", "polemico", "rechaza", "crisis", "acusado", "imputado",
    "detenido", "investigado", "sancionado",
]


def _conn_str() -> str:
    raw = _settings.database_url_raw
    return re.sub(r"postgresql\+\w+://", "postgresql://", raw)


class SentimentTracker:
    """Actualiza el sentimiento mediatico de personas publicas."""

    def __init__(self) -> None:
        self._dsn = _conn_str()
        self._analyzer = None   # lazy load pysentimiento

    @property
    def analyzer(self):
        if self._analyzer is None:
            try:
                from pysentimiento import create_analyzer
                self._analyzer = create_analyzer(task="sentiment", lang="es")
                log.info("pysentimiento cargado")
            except Exception:
                log.debug("pysentimiento no disponible — usando fallback lexico")
                self._analyzer = False
        return self._analyzer

    # ------------------------------------------------------------------
    # API publica
    # ------------------------------------------------------------------

    def run_full_update(self, max_personas: int = 50) -> dict:
        """Actualiza sentimiento de las N personas mas influyentes."""
        personas = self._get_top_personas(max_personas)
        stats = {"procesadas": 0, "alertas": 0, "errores": 0}

        for p in personas:
            try:
                r = self._update_persona(p)
                stats["procesadas"] += 1
                if r.get("alerta"):
                    stats["alertas"] += 1
            except Exception as exc:
                log.warning("Error actualizando %s: %s", p.get("nombre_completo"), exc)
                stats["errores"] += 1

        log.info("Sentiment update: %s", stats)
        return stats

    # ------------------------------------------------------------------
    # Pipeline interno
    # ------------------------------------------------------------------

    def _update_persona(self, persona: dict) -> dict:
        nombre = persona["nombre_completo"]
        pid    = str(persona["id"])
        sent_anterior = float(persona.get("sentimiento_actual") or 0.0)

        articulos = self._fetch_news_gdelt(nombre, days_back=3)
        if not articulos:
            return {"articulos": 0}

        scores = []
        for art in articulos:
            texto = (art.get("texto") or art.get("title") or "")[:500]
            if not texto:
                continue
            s = self._analyze(texto)
            if s is not None:
                hours_ago = float(art.get("hours_ago") or 24)
                peso = max(0.1, 1.0 - hours_ago / 72.0)
                scores.append((s, peso))

        if not scores:
            return {"articulos": len(articulos), "scores": 0}

        total_peso = sum(p for _, p in scores)
        sent_nuevo = sum(s * p for s, p in scores) / total_peso
        delta = sent_nuevo - sent_anterior

        if abs(delta) < 0.05:
            tendencia = "estable"
        elif delta > 0:
            tendencia = "subiendo"
        else:
            tendencia = "bajando"

        with psycopg.connect(self._dsn) as conn:
            conn.execute(
                """
                UPDATE persona_publica
                SET sentimiento_actual    = %s,
                    tendencia_sentimiento  = %s,
                    ultima_mencion_media   = NOW(),
                    updated_at             = NOW()
                WHERE id = %s
                """,
                (sent_nuevo, tendencia, pid),
            )
            conn.execute(
                """
                INSERT INTO sentiment_history
                    (persona_id, score, n_articulos, tendencia)
                VALUES (%s::uuid, %s, %s, %s)
                """,
                (pid, sent_nuevo, len(scores), tendencia),
            )

            alerta = False
            if abs(delta) >= DELTA_ALERTA:
                direction = "sube" if delta > 0 else "cae"
                urgencia  = 4 if abs(delta) >= 0.4 else 3
                conn.execute(
                    """
                    INSERT INTO signal_politeia
                        (tipo, urgencia, titulo, resumen, personas, modulo_origen)
                    VALUES ('mediatico', %s, %s, %s, %s, 'sentiment_tracker')
                    """,
                    (
                        urgencia,
                        f"Cambio sentimiento: {nombre} {direction} {delta:+.2f}",
                        f"{len(scores)} articulos. Anterior {sent_anterior:.2f} -> {sent_nuevo:.2f}",
                        [pid],
                    ),
                )
                alerta = True

        log.debug("%s: %.2f -> %.2f (%s)", nombre, sent_anterior, sent_nuevo, tendencia)
        return {"articulos": len(articulos), "sent": sent_nuevo,
                "delta": delta, "alerta": alerta}

    # ------------------------------------------------------------------
    # Fuentes de noticias
    # ------------------------------------------------------------------

    def _fetch_news_gdelt(self, nombre: str, days_back: int = 3) -> list[dict]:
        """Usa el cliente GDELT existente en etl/sources/gdelt/."""
        try:
            from etl.sources.gdelt.gdeltclient import GDELTClient
            since = (datetime.now() - timedelta(days=days_back)).strftime("%Y%m%d%H%M%S")
            nombre_enc = nombre.replace(" ", "%20")
            import requests
            r = requests.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query":          f"{nombre_enc} sourcelang:Spanish",
                    "mode":           "ArtList",
                    "maxrecords":     25,
                    "startdatetime":  since,
                    "format":         "json",
                },
                timeout=12,
            )
            arts = r.json().get("articles", [])
            return [
                {
                    "titulo":    a.get("title", ""),
                    "texto":     a.get("title", "") + " " + a.get("seendescription", ""),
                    "url":       a.get("url", ""),
                    "hours_ago": 12,
                }
                for a in arts
            ]
        except Exception as exc:
            log.debug("GDELT skip (%s): %s", nombre, exc)
            return []

    # ------------------------------------------------------------------
    # Analisis de sentimiento
    # ------------------------------------------------------------------

    def _analyze(self, texto: str) -> Optional[float]:
        """Devuelve score [-1, 1]. Usa pysentimiento si disponible."""
        if self.analyzer and self.analyzer is not False:
            try:
                result = self.analyzer.predict(texto[:512])
                output = result.output
                proba  = result.probas
                if output == "POS":
                    return float(proba.get("POS", 0.5))
                if output == "NEG":
                    return -float(proba.get("NEG", 0.5))
                return 0.0
            except Exception:
                pass

        # Fallback lexico
        t = texto.lower()
        score = sum(0.15 for p in POSITIVAS if p in t)
        score -= sum(0.15 for n in NEGATIVAS if n in t)
        return max(-1.0, min(1.0, score))

    # ------------------------------------------------------------------
    # Helpers BD
    # ------------------------------------------------------------------

    def _get_top_personas(self, limit: int) -> list[dict]:
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            return conn.execute(
                """
                SELECT id, nombre_completo,
                       COALESCE(sentimiento_actual, 0.0) AS sentimiento_actual,
                       tendencia_sentimiento
                FROM persona_publica
                WHERE activo = TRUE
                  AND tipo IN ('politico', 'diplomatico')
                ORDER BY score_influencia DESC NULLS LAST
                LIMIT %s
                """,
                (limit,),
            ).fetchall()
