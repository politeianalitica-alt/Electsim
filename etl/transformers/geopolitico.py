"""
Transformer Geopolitico — Normaliza, deduplica y calcula indices
a partir de eventos ACLED, UCDP y tonos GDELT.

Conflict Intensity Index (CII):
    CII = sqrt( sum(n_eventos * peso_tipo) * (sum_fatalities + 1) )
"""
from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mapas de tipos de evento a CAMEO canonico
# ---------------------------------------------------------------------------

ACLED_A_CAMEO: dict[str, str] = {
    "Battles":                    "FIGHT",
    "Explosions/Remote violence": "FIGHT",
    "Violence against civilians": "VIOLENCE_CIVILES",
    "Riots":                      "RIOT",
    "Protests":                   "PROTEST",
    "Strategic developments":     "STRATEGIC",
}

UCDP_A_CAMEO: dict[int, str] = {
    # type_of_violence: 1=state-based, 2=non-state, 3=one-sided
    1: "FIGHT",
    2: "FIGHT",
    3: "VIOLENCE_CIVILES",
}

PESO_TIPO_EVENTO: dict[str, float] = {
    "FIGHT":            1.0,
    "VIOLENCE_CIVILES": 0.9,
    "RIOT":             0.4,
    "PROTEST":          0.2,
    "STRATEGIC":        0.5,
    "UNKNOWN":          0.3,
}


class TransformerGeopolitico:
    """Transformaciones sobre datos de fuentes geopoliticas."""

    # ------------------------------------------------------------------
    # Normalizacion de tipo de evento
    # ------------------------------------------------------------------

    @staticmethod
    def normalizar_tipo_evento(tipo_raw: str | int, fuente: str) -> str:
        """
        Mapea un tipo de evento crudo al esquema CAMEO canonico.
        fuente: "ACLED" | "UCDP" | "GDELT"
        """
        fuente_upper = fuente.upper()
        if fuente_upper == "ACLED":
            return ACLED_A_CAMEO.get(str(tipo_raw), "UNKNOWN")
        if fuente_upper == "UCDP":
            try:
                return UCDP_A_CAMEO.get(int(tipo_raw), "UNKNOWN")
            except (TypeError, ValueError):
                return "UNKNOWN"
        return "UNKNOWN"

    # ------------------------------------------------------------------
    # Deduplicacion de eventos
    # ------------------------------------------------------------------

    @staticmethod
    def deduplicar_eventos(eventos: list[dict], radio_km: float = 10.0) -> list[dict]:
        """
        Deduplica eventos de multiples fuentes.
        Estrategia: redondear lat/lon a 1 decimal (~11 km) + mismo tipo CAMEO + misma fecha.
        Prioridad de fuente: ACLED > UCDP > otros.
        """
        try:
            import polars as pl
            return TransformerGeopolitico._deduplicar_polars(eventos)
        except ImportError:
            return TransformerGeopolitico._deduplicar_pandas(eventos)

    @staticmethod
    def _deduplicar_polars(eventos: list[dict]) -> list[dict]:
        import polars as pl

        if not eventos:
            return []

        df = pl.DataFrame(eventos)
        columnas = df.columns

        # Redondear coordenadas para agrupar eventos cercanos (~11 km a 1 decimal)
        if "latitud" in columnas and "longitud" in columnas:
            df = df.with_columns([
                pl.col("latitud").round(1).alias("lat_r"),
                pl.col("longitud").round(1).alias("lon_r"),
            ])
        else:
            df = df.with_columns([
                pl.lit(0.0).alias("lat_r"),
                pl.lit(0.0).alias("lon_r"),
            ])

        clave = ["fecha", "tipo_cameo", "lat_r", "lon_r"]
        clave_presente = [c for c in clave if c in df.columns]

        if clave_presente:
            # Prioridad: ACLED > UCDP
            if "fuente" in df.columns:
                orden = {"ACLED": 0, "UCDP": 1}
                df = df.with_columns(
                    pl.col("fuente").map_elements(
                        lambda f: orden.get(str(f), 99), return_dtype=pl.Int64
                    ).alias("_prioridad")
                ).sort("_prioridad").unique(subset=clave_presente, keep="first")
            else:
                df = df.unique(subset=clave_presente, keep="first")

        # Limpiar columnas auxiliares
        cols_limpiar = [c for c in ["lat_r", "lon_r", "_prioridad"] if c in df.columns]
        if cols_limpiar:
            df = df.drop(cols_limpiar)

        return df.to_dicts()

    @staticmethod
    def _deduplicar_pandas(eventos: list[dict]) -> list[dict]:
        """Fallback sin Polars."""
        if not eventos:
            return []
        vistos: set[tuple] = set()
        resultado: list[dict] = []
        for ev in sorted(eventos, key=lambda e: 0 if e.get("fuente") == "ACLED" else 1):
            lat = round(float(ev.get("latitud", 0.0)), 1)
            lon = round(float(ev.get("longitud", 0.0)), 1)
            clave = (
                str(ev.get("fecha", ""))[:10],
                str(ev.get("tipo_cameo", "")),
                lat,
                lon,
            )
            if clave not in vistos:
                vistos.add(clave)
                resultado.append(ev)
        return resultado

    # ------------------------------------------------------------------
    # Calculo CII por pais
    # ------------------------------------------------------------------

    @staticmethod
    def calcular_cii_por_pais(
        eventos: list[dict],
        ventana_dias: int = 30,
    ) -> dict[str, float]:
        """
        Calcula el Conflict Intensity Index por pais.

        Formula: CII = sqrt( sum(n_eventos * peso_cameo) * (sum_fatalities + 1) )

        Retorna {iso3: cii_score}.
        """
        from datetime import datetime, timedelta, timezone

        corte = datetime.now(timezone.utc) - timedelta(days=ventana_dias)
        acumulado: dict[str, dict[str, float]] = {}

        for ev in eventos:
            # Filtro temporal
            fecha_str = str(ev.get("fecha", ""))[:10]
            try:
                fecha = datetime.strptime(fecha_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if fecha < corte:
                    continue
            except ValueError:
                pass  # Sin fecha — incluir igual

            pais = str(ev.get("pais", "")).upper()[:3]
            if not pais:
                continue

            tipo_cameo = str(ev.get("tipo_cameo", "UNKNOWN"))
            peso = PESO_TIPO_EVENTO.get(tipo_cameo, 0.3)
            fat = max(0, int(ev.get("fatalities") or 0))

            if pais not in acumulado:
                acumulado[pais] = {"suma_pesos": 0.0, "fatalities": 0.0}
            acumulado[pais]["suma_pesos"] += peso
            acumulado[pais]["fatalities"] += fat

        return {
            pais: round(math.sqrt(datos["suma_pesos"] * (datos["fatalities"] + 1)), 3)
            for pais, datos in acumulado.items()
        }

    # ------------------------------------------------------------------
    # Tono GDELT real
    # ------------------------------------------------------------------

    @staticmethod
    def calcular_tono_gdelt_real(articulos_gkg: list[dict]) -> dict[str, float]:
        """
        Calcula el tono medio real de articulos GKG agrupados por pais.
        Los articulos deben tener campo 'tono' (float) de la columna GKG real.
        Retorna {iso3: tono_medio} para paises con datos.
        """
        # Para GKG no hay iso3 directo — agrupar por tono global y paises mencionados
        tonos: list[float] = []
        for art in articulos_gkg:
            t = art.get("tono")
            if t is not None:
                try:
                    tonos.append(float(t))
                except (TypeError, ValueError):
                    pass

        if not tonos:
            return {}

        # Retornar tono global (se podria refinar con NER si hubiera geoparsing)
        tono_global = sum(tonos) / len(tonos)
        return {"_global": round(tono_global, 4)}

    @staticmethod
    def calcular_tono_medio_por_query(articulos: list[dict]) -> dict[str, float]:
        """Calcula tono medio por query de origen."""
        agrupado: dict[str, list[float]] = {}
        for art in articulos:
            query = str(art.get("query_origen", "desconocida"))
            t = art.get("tono")
            if t is not None:
                try:
                    agrupado.setdefault(query, []).append(float(t))
                except (TypeError, ValueError):
                    pass
        return {
            q: round(sum(v) / len(v), 4)
            for q, v in agrupado.items()
            if v
        }

    # ------------------------------------------------------------------
    # Preparacion del input para el scorer
    # ------------------------------------------------------------------

    @staticmethod
    def preparar_input_scorer(
        cii_por_pais: dict[str, float],
        tono_gdelt: float,
        jamming_por_pais: dict[str, float],
        presencia_ocha: dict[str, int],
    ) -> list[dict]:
        """
        Combina todas las fuentes en un DataFrame-like para el RiskScorer.
        Retorna lista de dicts {pais, cii, tono_gdelt, jamming_score, ocha_orgs}.
        """
        paises = set(cii_por_pais.keys()) | set(jamming_por_pais.keys()) | set(presencia_ocha.keys())
        resultado = []
        for pais in paises:
            resultado.append({
                "pais":         pais,
                "cii":          round(cii_por_pais.get(pais, 0.0), 3),
                "tono_gdelt":   round(tono_gdelt, 4),
                "jamming_score": round(jamming_por_pais.get(pais, 0.0), 3),
                "ocha_orgs":    presencia_ocha.get(pais, 0),
            })
        return resultado
