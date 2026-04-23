"""Motor de analogías históricas para contexto electoral."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Optional

import numpy as np
import pandas as pd

FEATURES_CONFIG: dict[str, tuple[float, str]] = {
    "pib_crecimiento": (0.12, "Crecimiento PIB YoY"),
    "tasa_paro": (0.10, "Tasa de paro"),
    "inflacion": (0.08, "Inflación IPC"),
    "deficit_pib": (0.05, "Déficit % PIB"),
    "satisfaccion_eco": (0.10, "Satisfacción económica"),
    "incumbente_anios": (0.08, "Años incumbente"),
    "aprobacion_gobierno": (0.12, "Aprobación gobierno"),
    "fragmentacion_pre": (0.10, "Fragmentación preelectoral"),
    "polarizacion": (0.08, "Polarización"),
    "escandalo_mayor": (0.05, "Escándalo mayor"),
    "tension_territorial": (0.06, "Tensión territorial"),
    "crisis_internacional": (0.06, "Crisis internacional"),
}
FEATURE_NAMES = list(FEATURES_CONFIG.keys())
FEATURE_WEIGHTS = np.array([FEATURES_CONFIG[f][0] for f in FEATURE_NAMES], dtype=float)
TAU_SIMILITUD = 1.2


@dataclass
class ContextoElectoral:
    pib_crecimiento: float = 2.5
    tasa_paro: float = 11.0
    inflacion: float = 3.5
    deficit_pib: float = 3.5
    satisfaccion_eco: float = 4.0
    incumbente_anios: int = 5
    aprobacion_gobierno: float = 33.0
    fragmentacion_pre: float = 5.8
    polarizacion: float = 0.65
    escandalo_mayor: bool = False
    tension_territorial: float = 0.65
    crisis_internacional: bool = True


@dataclass
class ResultadoAnalogia:
    eleccion_id: int
    nombre_ref: str
    pais: str
    anio: int
    tipo: str
    distancia: float
    similitud_pct: float
    dimensiones: dict = field(default_factory=dict)
    ganador: Optional[str] = None
    pct_ganador: Optional[float] = None
    vuelco_gobierno: Optional[bool] = None
    participacion: Optional[float] = None
    volatilidad: Optional[float] = None
    notas: Optional[str] = None
    resultados_json: dict = field(default_factory=dict)


class MotorAnalogias:
    def __init__(self, df_historico: pd.DataFrame):
        self.df = df_historico.copy()
        self._norm_min: np.ndarray | None = None
        self._norm_range: np.ndarray | None = None

    def ajustar_normalizacion(self) -> "MotorAnalogias":
        matriz = self._extraer_matriz(self.df)
        if matriz.size == 0:
            self._norm_min = np.zeros(len(FEATURE_NAMES), dtype=float)
            self._norm_range = np.ones(len(FEATURE_NAMES), dtype=float)
            return self
        mmin = np.nanmin(matriz, axis=0)
        mmax = np.nanmax(matriz, axis=0)
        rng = mmax - mmin
        rng[rng == 0] = 1.0
        self._norm_min = mmin
        self._norm_range = rng
        return self

    def buscar(
        self,
        contexto: ContextoElectoral,
        top_n: int = 5,
        filtro_pais: Optional[str] = None,
        filtro_tipo: Optional[str] = None,
        min_anio: Optional[int] = None,
    ) -> list[ResultadoAnalogia]:
        if self._norm_min is None or self._norm_range is None:
            self.ajustar_normalizacion()

        df = self.df.copy()
        if filtro_pais:
            df = df[df["pais"] == filtro_pais]
        if filtro_tipo:
            df = df[df["tipo"] == filtro_tipo]
        if min_anio:
            df = df[df["anio"] >= min_anio]
        if df.empty:
            return []

        v_actual = self._normalizar(self._contexto_to_vector(contexto))
        m_hist = self._normalizar(self._extraer_matriz(df))

        diff = m_hist - v_actual
        distancias = np.sqrt(np.nansum((diff**2) * FEATURE_WEIGHTS, axis=1))
        similitudes = 100.0 * np.exp(-distancias / TAU_SIMILITUD)

        idx = np.argsort(distancias)[:top_n]
        out: list[ResultadoAnalogia] = []
        for i in idx:
            row = df.iloc[int(i)]
            pct_ganador = row.get("pct_ganador")
            pct_ganador = float(pct_ganador) if pd.notna(pct_ganador) else None
            vuelco = row.get("vuelco_gobierno")
            vuelco = bool(vuelco) if pd.notna(vuelco) else None
            participacion = row.get("participacion")
            participacion = float(participacion) if pd.notna(participacion) else None
            volatilidad = row.get("volatilidad_total")
            volatilidad = float(volatilidad) if pd.notna(volatilidad) else None
            resultados_json = row.get("resultados_json") or {}
            if not isinstance(resultados_json, dict):
                resultados_json = {}
            dims = {
                feat: round(float(np.sqrt(FEATURE_WEIGHTS[fi] * (diff[i, fi] ** 2))), 4)
                for fi, feat in enumerate(FEATURE_NAMES)
            }
            out.append(
                ResultadoAnalogia(
                    eleccion_id=int(row.get("id", -1)),
                    nombre_ref=str(row.get("nombre_ref", "")),
                    pais=str(row.get("pais", "")),
                    anio=int(row.get("anio", 0) or 0),
                    tipo=str(row.get("tipo", "")),
                    distancia=round(float(distancias[i]), 4),
                    similitud_pct=round(float(similitudes[i]), 1),
                    dimensiones=dims,
                    ganador=str(row.get("ganador")) if pd.notna(row.get("ganador")) else None,
                    pct_ganador=pct_ganador,
                    vuelco_gobierno=vuelco,
                    participacion=participacion,
                    volatilidad=volatilidad,
                    notas=str(row.get("notas")) if pd.notna(row.get("notas")) else None,
                    resultados_json=resultados_json,
                )
            )
        return out

    def proyeccion_resultado(self, analogias: list[ResultadoAnalogia], partido_propio: str) -> dict:
        if not analogias:
            return {}
        pesos = np.array([a.similitud_pct for a in analogias], dtype=float)
        pesos = pesos / max(pesos.sum(), 1.0)

        vuelco = np.array([1.0 if a.vuelco_gobierno else 0.0 for a in analogias], dtype=float)
        prob_vuelco = float(np.dot(pesos, vuelco))

        def _weighted(attr: str) -> float | None:
            vals = np.array([getattr(a, attr) if getattr(a, attr) is not None else np.nan for a in analogias], dtype=float)
            mask = ~np.isnan(vals)
            if not mask.any():
                return None
            return float(np.dot(pesos[mask], vals[mask]))

        participacion = _weighted("participacion")
        volatilidad = _weighted("volatilidad")

        pct_vals: list[float] = []
        pct_w: list[float] = []
        for i, a in enumerate(analogias):
            if partido_propio in a.resultados_json:
                pct_vals.append(float(a.resultados_json[partido_propio]))
                pct_w.append(float(pesos[i]))
        pct_partido = None
        if pct_vals:
            wsum = sum(pct_w)
            pct_partido = float(np.dot(np.array(pct_vals), np.array(pct_w)) / max(wsum, 1e-9))

        return {
            "vuelco_probable": bool(prob_vuelco > 0.5),
            "prob_vuelco": round(prob_vuelco, 3),
            "participacion_est": round(participacion, 1) if participacion is not None else None,
            "volatilidad_est": round(volatilidad, 2) if volatilidad is not None else None,
            "pct_partido_est": round(pct_partido, 1) if pct_partido is not None else None,
            "escenarios": [
                {
                    "nombre": a.nombre_ref,
                    "similitud": float(a.similitud_pct),
                    "ganador": a.ganador,
                    "vuelco": bool(a.vuelco_gobierno) if a.vuelco_gobierno is not None else None,
                    "participacion": a.participacion,
                }
                for a in analogias
            ],
        }

    def _extraer_matriz(self, df: pd.DataFrame) -> np.ndarray:
        if df.empty:
            return np.empty((0, len(FEATURE_NAMES)), dtype=float)
        m = np.zeros((len(df), len(FEATURE_NAMES)), dtype=float)
        for i, feat in enumerate(FEATURE_NAMES):
            if feat not in df.columns:
                continue
            col = df[feat]
            if col.dtype == bool or str(col.dtype) == "object":
                col = col.map(lambda x: 1.0 if bool(x) else 0.0)
            m[:, i] = pd.to_numeric(col, errors="coerce").fillna(0).values
        return m

    def _contexto_to_vector(self, ctx: ContextoElectoral) -> np.ndarray:
        d = asdict(ctx)
        v = [float(d.get(feat, 0) or 0) for feat in FEATURE_NAMES]
        return np.array(v, dtype=float)

    def _normalizar(self, x: np.ndarray) -> np.ndarray:
        assert self._norm_min is not None and self._norm_range is not None
        return (x - self._norm_min) / self._norm_range


def construir_df_seed() -> pd.DataFrame:
    seed = [
        {
            "id": 1,
            "pais": "España",
            "anio": 2011,
            "mes": 11,
            "tipo": "generales",
            "nombre_ref": "España 2011 — PP mayoría absoluta",
            "pib_crecimiento": -1.0,
            "tasa_paro": 22.8,
            "inflacion": 3.1,
            "deficit_pib": 9.4,
            "satisfaccion_eco": 2.2,
            "incumbente_anios": 8,
            "aprobacion_gobierno": 18.0,
            "fragmentacion_pre": 3.0,
            "polarizacion": 0.50,
            "escandalo_mayor": False,
            "tension_territorial": 0.25,
            "crisis_internacional": True,
            "ganador": "PP",
            "pct_ganador": 44.6,
            "participacion": 68.9,
            "vuelco_gobierno": True,
            "volatilidad_total": 14.0,
            "resultados_json": {"PP": 44.6, "PSOE": 28.8},
            "notas": "Crisis de deuda y fuerte castigo al incumbente.",
        },
        {
            "id": 2,
            "pais": "España",
            "anio": 2015,
            "mes": 12,
            "tipo": "generales",
            "nombre_ref": "España 2015 — fragmentación y bloqueo",
            "pib_crecimiento": 3.2,
            "tasa_paro": 21.0,
            "inflacion": -0.6,
            "deficit_pib": 5.0,
            "satisfaccion_eco": 3.8,
            "incumbente_anios": 4,
            "aprobacion_gobierno": 28.0,
            "fragmentacion_pre": 5.2,
            "polarizacion": 0.58,
            "escandalo_mayor": True,
            "tension_territorial": 0.55,
            "crisis_internacional": False,
            "ganador": "PP",
            "pct_ganador": 28.7,
            "participacion": 69.7,
            "vuelco_gobierno": False,
            "volatilidad_total": 22.5,
            "resultados_json": {"PP": 28.7, "PSOE": 22.0, "PODEMOS": 20.7, "CS": 13.9},
            "notas": "Fin del bipartidismo, alta fragmentación.",
        },
        {
            "id": 3,
            "pais": "España",
            "anio": 2019,
            "mes": 11,
            "tipo": "generales",
            "nombre_ref": "España 2019 noviembre — coalición",
            "pib_crecimiento": 2.0,
            "tasa_paro": 13.8,
            "inflacion": 0.5,
            "deficit_pib": 2.5,
            "satisfaccion_eco": 4.0,
            "incumbente_anios": 1,
            "aprobacion_gobierno": 34.0,
            "fragmentacion_pre": 5.6,
            "polarizacion": 0.65,
            "escandalo_mayor": False,
            "tension_territorial": 0.72,
            "crisis_internacional": False,
            "ganador": "PSOE",
            "pct_ganador": 28.0,
            "participacion": 69.9,
            "vuelco_gobierno": False,
            "volatilidad_total": 5.0,
            "resultados_json": {"PSOE": 28.0, "PP": 20.8, "VOX": 15.1},
            "notas": "Segunda elección en 7 meses, pacto de coalición.",
        },
        {
            "id": 4,
            "pais": "España",
            "anio": 2023,
            "mes": 7,
            "tipo": "generales",
            "nombre_ref": "España 2023 — reelección Sánchez",
            "pib_crecimiento": 2.5,
            "tasa_paro": 11.6,
            "inflacion": 3.5,
            "deficit_pib": 3.5,
            "satisfaccion_eco": 4.0,
            "incumbente_anios": 5,
            "aprobacion_gobierno": 33.0,
            "fragmentacion_pre": 5.8,
            "polarizacion": 0.70,
            "escandalo_mayor": False,
            "tension_territorial": 0.65,
            "crisis_internacional": True,
            "ganador": "PSOE",
            "pct_ganador": 31.7,
            "participacion": 70.4,
            "vuelco_gobierno": False,
            "volatilidad_total": 7.2,
            "resultados_json": {"PSOE": 31.7, "PP": 33.1, "SUMAR": 12.3, "VOX": 12.4},
            "notas": "Contexto de polarización alta y pactos parlamentarios.",
        },
        {
            "id": 5,
            "pais": "Italia",
            "anio": 2022,
            "mes": 9,
            "tipo": "generales",
            "nombre_ref": "Italia 2022 — coalición derechas",
            "pib_crecimiento": 3.9,
            "tasa_paro": 8.3,
            "inflacion": 9.1,
            "deficit_pib": 5.6,
            "satisfaccion_eco": 3.5,
            "incumbente_anios": 1,
            "aprobacion_gobierno": 30.0,
            "fragmentacion_pre": 6.2,
            "polarizacion": 0.72,
            "escandalo_mayor": False,
            "tension_territorial": 0.15,
            "crisis_internacional": True,
            "ganador": "FdI",
            "pct_ganador": 26.0,
            "participacion": 63.9,
            "vuelco_gobierno": True,
            "volatilidad_total": 18.5,
            "resultados_json": {"FdI": 26.0, "PD": 19.1},
            "notas": "Inflación energética y cambio de ciclo político.",
        },
    ]
    return pd.DataFrame(seed)
