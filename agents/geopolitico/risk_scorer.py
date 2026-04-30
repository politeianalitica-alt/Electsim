"""
RiskScorer — Calculo avanzado de riesgo geopolitico.
Integra CII (conflicto), WGI (gobernanza WB), IMF WEO (economia),
GDELT (tono mediatico) y GPSJam (interferencia GPS).

PESOS: cii 35%, wgi 20%, imf 15%, gdelt 20%, jamming 10%
Multiplicador de relevancia para Espana: score_total = score_raw * (0.5 + relevancia * 0.55)

Cache local JSON con TTL de 7 dias para WGI e IMF.
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

CACHE_DIR = Path("data/cache/geopolitico")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

CACHE_WGI = CACHE_DIR / "wgi_cache.json"
CACHE_IMF = CACHE_DIR / "imf_cache.json"
CACHE_TTL_DIAS = 7

# ---------------------------------------------------------------------------
# Relevancia de paises para Espana
# ---------------------------------------------------------------------------
RELEVANCIA_ES: dict[str, float] = {
    "DZA": 1.0, "MAR": 1.0, "UKR": 1.0,
    "LBY": 0.90, "RUS": 0.90,
    "VEN": 0.80, "PSE": 0.80, "ISR": 0.78, "MEX": 0.78,
    "MLI": 0.82, "NER": 0.75, "TUR": 0.75,
    "IRN": 0.70, "SYR": 0.72, "LBN": 0.72, "BFA": 0.72,
    "NGA": 0.70, "COL": 0.70, "TUN": 0.68, "BRA": 0.68,
    "IRQ": 0.65, "AGO": 0.65, "SAU": 0.65, "ARG": 0.65,
    "CUB": 0.62, "TCD": 0.62, "MRT": 0.62,
    "MDA": 0.60, "GEO": 0.58, "PER": 0.58,
    "EGY": 0.65, "ECU": 0.55, "BLR": 0.55,
}

# ---------------------------------------------------------------------------
# WGI — World Bank Governance Indicators
# ---------------------------------------------------------------------------
WGI_INDICADORES = [
    "PV.EST",   # Political Stability and Absence of Violence (mas importante)
    "RL.EST",   # Rule of Law
    "CC.EST",   # Control of Corruption
    "GE.EST",   # Government Effectiveness
    "RQ.EST",   # Regulatory Quality
    "VA.EST",   # Voice and Accountability
]

WGI_PESOS = {
    "PV.EST": 0.35,
    "RL.EST": 0.20,
    "CC.EST": 0.15,
    "GE.EST": 0.15,
    "RQ.EST": 0.08,
    "VA.EST": 0.07,
}

# ---------------------------------------------------------------------------
# IMF WEO — Indicadores economicos
# ---------------------------------------------------------------------------
IMF_INDICADORES = {
    "NGDP_RPCH":   "crecimiento_pib",     # Variacion real del PIB (%)
    "PCPIPCH":     "inflacion",            # Inflacion IPC (%)
    "GGXWDG_NGDP": "deuda_pib",            # Deuda publica/PIB (%)
    "BCA_NGDPD":   "cuenta_corriente_pib", # Cuenta corriente/PIB (%)
    "LUR":         "desempleo",            # Tasa de desempleo (%)
}

# Tabla ISO2 -> ISO3 para IMF
ISO2_TO_ISO3: dict[str, str] = {
    "DZ": "DZA", "MA": "MAR", "UA": "UKR", "LY": "LBY", "RU": "RUS",
    "VE": "VEN", "PS": "PSE", "IL": "ISR", "MX": "MEX", "ML": "MLI",
    "NE": "NER", "TR": "TUR", "IR": "IRN", "SY": "SYR", "LB": "LBN",
    "BF": "BFA", "NG": "NGA", "CO": "COL", "TN": "TUN", "BR": "BRA",
    "IQ": "IRQ", "AO": "AGO", "SA": "SAU", "AR": "ARG", "CU": "CUB",
    "TD": "TCD", "MR": "MRT", "MD": "MDA", "GE": "GEO", "PE": "PER",
    "EG": "EGY", "EC": "ECU", "BY": "BLR", "YE": "YEM", "SO": "SOM",
    "SS": "SSD", "CD": "COD", "AF": "AFG", "MM": "MMR",
}


# ===========================================================================
# Funciones de carga de datos estructurales (con cache)
# ===========================================================================

def _cache_valida(ruta: Path) -> bool:
    if not ruta.exists():
        return False
    try:
        mtime = datetime.fromtimestamp(ruta.stat().st_mtime, tz=timezone.utc)
        return (datetime.now(timezone.utc) - mtime) < timedelta(days=CACHE_TTL_DIAS)
    except Exception:
        return False


async def obtener_wgi() -> dict[str, dict[str, float]]:
    """
    Descarga o lee desde cache los datos WGI del Banco Mundial.
    Retorna {iso3: {indicador: valor_normalizado_0_100}}.
    El rango WGI es [-2.5, +2.5]. Se normaliza a [0, 100] e invierte
    (gobernanza alta = riesgo bajo).
    """
    if _cache_valida(CACHE_WGI):
        try:
            return json.loads(CACHE_WGI.read_text(encoding="utf-8"))
        except Exception:
            pass

    resultado: dict[str, dict[str, float]] = {}
    try:
        import wbgapi  # type: ignore
        df = wbgapi.data.DataFrame(
            WGI_INDICADORES,
            list(RELEVANCIA_ES.keys()),
            mrv=1,
        )
        for iso3 in df.index:
            resultado[iso3] = {}
            for ind in WGI_INDICADORES:
                try:
                    val = float(df.loc[iso3, ind])
                    # Normalizar [-2.5, +2.5] -> [0, 100], invertido
                    normalizado = 100.0 - ((val + 2.5) / 5.0) * 100.0
                    resultado[iso3][ind] = round(max(0.0, min(100.0, normalizado)), 2)
                except (KeyError, TypeError, ValueError):
                    resultado[iso3][ind] = 50.0  # Neutro si no hay dato
    except ImportError:
        logger.warning("wbgapi no instalado — WGI no disponible")
    except Exception as exc:
        logger.error("WGI descarga error: %s", exc)

    try:
        CACHE_WGI.write_text(
            json.dumps(resultado, ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception:
        pass

    return resultado


async def obtener_imf_weo() -> dict[str, dict[str, float]]:
    """
    Descarga o lee desde cache datos IMF WEO.
    Retorna {iso3: {nombre_indicador: valor}}.
    """
    if _cache_valida(CACHE_IMF):
        try:
            return json.loads(CACHE_IMF.read_text(encoding="utf-8"))
        except Exception:
            pass

    resultado: dict[str, dict[str, float]] = {}
    try:
        import imf_reader  # type: ignore
        df_weo = imf_reader.fetch("WEO")
        codigos_interes = list(IMF_INDICADORES.keys())

        for _, fila in df_weo.iterrows():
            iso2 = str(fila.get("ISO", "")).strip()
            indicador = str(fila.get("WEO Subject Code", "")).strip()
            if indicador not in codigos_interes:
                continue
            iso3 = ISO2_TO_ISO3.get(iso2)
            if not iso3 or iso3 not in RELEVANCIA_ES:
                continue

            try:
                # Intentar ultima columna numerica
                val_str = str(list(fila)[-1]).replace(",", "")
                val = float(val_str)
            except (TypeError, ValueError):
                continue

            nombre = IMF_INDICADORES[indicador]
            resultado.setdefault(iso3, {})[nombre] = round(val, 4)

    except ImportError:
        logger.warning("imf_reader no instalado — IMF WEO no disponible")
    except Exception as exc:
        logger.error("IMF WEO descarga error: %s", exc)

    try:
        CACHE_IMF.write_text(
            json.dumps(resultado, ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception:
        pass

    return resultado


# ===========================================================================
# RiskScorer
# ===========================================================================

class RiskScorer:
    """
    Calcula scores de riesgo geopolitico avanzados integrando
    CII (conflicto), WGI, IMF WEO, GDELT y GPSJam.
    """

    PESOS: dict[str, float] = {
        "cii":     0.35,
        "wgi":     0.20,
        "imf":     0.15,
        "gdelt":   0.20,
        "jamming": 0.10,
    }

    def __init__(self) -> None:
        self._wgi: dict[str, dict[str, float]] = {}
        self._imf: dict[str, dict[str, float]] = {}
        self._cargado = False

    async def cargar_datos_estructurales(self) -> None:
        """Carga WGI e IMF en paralelo (con cache de 7 dias)."""
        wgi, imf = await asyncio.gather(
            obtener_wgi(),
            obtener_imf_weo(),
            return_exceptions=True,
        )
        if not isinstance(wgi, Exception):
            self._wgi = wgi
        if not isinstance(imf, Exception):
            self._imf = imf
        self._cargado = True
        logger.info(
            "RiskScorer datos cargados: WGI %d paises, IMF %d paises",
            len(self._wgi), len(self._imf),
        )

    def calcular_score_pais(
        self,
        pais: str,
        cii: float = 0.0,
        tono_gdelt: float = 0.0,
        jamming_score: float = 0.0,
        ocha_orgs: int = 0,
    ) -> dict[str, Any]:
        """
        Calcula el score completo de riesgo para un pais.
        Retorna dict con todos los sub-scores, inputs y datos WGI/IMF.
        """
        # CII -> 0-100 (max practico ~500)
        score_cii = min(100.0, (cii / 500.0) * 100.0)

        # WGI: promedio ponderado de indicadores disponibles
        score_wgi = self._calcular_score_wgi(pais)

        # IMF: riesgo economico
        score_imf = self._calcular_score_imf(pais)

        # GDELT tono: [-30, +30] -> [0, 100] invertido
        score_gdelt = min(100.0, max(0.0, ((-tono_gdelt + 30.0) / 60.0) * 100.0))

        # Jamming: ya en [0, 100]
        score_jamming_norm = min(100.0, max(0.0, jamming_score))

        score_raw = (
            score_cii          * self.PESOS["cii"] +
            score_wgi          * self.PESOS["wgi"] +
            score_imf          * self.PESOS["imf"] +
            score_gdelt        * self.PESOS["gdelt"] +
            score_jamming_norm * self.PESOS["jamming"]
        )

        # Multiplicador de interes para Espana
        relevancia = RELEVANCIA_ES.get(pais, 0.08)
        score_total = score_raw * (0.5 + relevancia * 0.55)
        score_total = min(100.0, max(0.0, score_total))

        return {
            "pais":          pais,
            "score_total":   round(score_total, 2),
            "score_cii":     round(score_cii, 2),
            "score_wgi":     round(score_wgi, 2),
            "score_imf":     round(score_imf, 2),
            "score_gdelt":   round(score_gdelt, 2),
            "score_jamming": round(score_jamming_norm, 2),
            "nivel":         self._clasificar_nivel(score_total),
            "relevancia_es": relevancia,
            "cii_raw":       round(cii, 3),
            "tono_gdelt":    round(tono_gdelt, 4),
            "wgi_data":      self._wgi.get(pais, {}),
            "imf_data":      self._imf.get(pais, {}),
        }

    def calcular_scores_todos_paises(
        self,
        input_rows: list[dict],
    ) -> list[dict]:
        """
        Calcula scores para una lista de rows preparados por TransformerGeopolitico.preparar_input_scorer().
        """
        scores = []
        for row in input_rows:
            pais = str(row.get("pais", ""))
            if not pais:
                continue
            score_dict = self.calcular_score_pais(
                pais=pais,
                cii=float(row.get("cii", 0.0)),
                tono_gdelt=float(row.get("tono_gdelt", 0.0)),
                jamming_score=float(row.get("jamming_score", 0.0)),
                ocha_orgs=int(row.get("ocha_orgs", 0)),
            )
            scores.append(score_dict)

        return sorted(scores, key=lambda s: s["score_total"], reverse=True)

    # ------------------------------------------------------------------
    # Sub-scorers internos
    # ------------------------------------------------------------------

    def _calcular_score_wgi(self, pais: str) -> float:
        """Calcula score de riesgo de gobernanza WGI (mayor valor = mas riesgo)."""
        datos_pais = self._wgi.get(pais, {})
        if not datos_pais:
            return 50.0  # Neutro si no hay datos

        suma_ponderada = 0.0
        suma_pesos = 0.0
        for ind, peso in WGI_PESOS.items():
            if ind in datos_pais:
                suma_ponderada += datos_pais[ind] * peso
                suma_pesos += peso

        if suma_pesos < 0.01:
            return 50.0
        return round(suma_ponderada / suma_pesos, 2)

    def _calcular_score_imf(self, pais: str) -> float:
        """
        Convierte indicadores IMF WEO a un score de riesgo economico 0-100.
        Mayor valor = mayor riesgo economico.
        """
        datos = self._imf.get(pais, {})
        if not datos:
            return 40.0  # Ligeramente bajo el neutro si no hay datos

        scores_parciales = []

        # PIB: crecimiento negativo = riesgo
        if "crecimiento_pib" in datos:
            pib = float(datos["crecimiento_pib"])
            score_pib = max(0.0, min(100.0, 50.0 - pib * 5.0))
            scores_parciales.append(score_pib)

        # Inflacion: alta inflacion = riesgo
        if "inflacion" in datos:
            inf = abs(float(datos["inflacion"]))
            score_inf = min(100.0, inf * 3.0)
            scores_parciales.append(score_inf)

        # Deuda/PIB: alta deuda = riesgo
        if "deuda_pib" in datos:
            deuda = float(datos["deuda_pib"])
            score_deuda = min(100.0, deuda / 2.0)
            scores_parciales.append(score_deuda)

        # Desempleo
        if "desempleo" in datos:
            lur = float(datos["desempleo"])
            score_lur = min(100.0, lur * 3.5)
            scores_parciales.append(score_lur)

        if not scores_parciales:
            return 40.0

        return round(sum(scores_parciales) / len(scores_parciales), 2)

    @staticmethod
    def _clasificar_nivel(score: float) -> str:
        if score >= 80:
            return "CRITICO"
        if score >= 65:
            return "MUY_ALTO"
        if score >= 50:
            return "ALTO"
        if score >= 30:
            return "MODERADO"
        return "BAJO"
