"""
Modelo de voto económico para España (inspirado en Hibbs "Bread and Peace").

Convierte indicadores macro en:
  - puntuación de presión económica (0-100)
  - penalización/bonus al partido en el gobierno
  - narrativa automática en español

Sin dependencias ML externas — aritmética pura para máxima compatibilidad.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional
import pandas as pd


# ── Umbrales calibrados con ciclos electorales españoles 2008-2023 ────────────

_UMBRALES = {
    "ipc": {
        "bajo": 1.5,    # inflación cómoda
        "alto": 4.0,    # inflación problemática
        "critico": 7.0, # inflación de crisis (2022)
    },
    "paro": {
        "bajo": 12.0,   # pleno empleo relativo en España
        "alto": 18.0,   # paro elevado
        "critico": 25.0,# paro de crisis (2013)
    },
    "pib": {
        "recesion": -1.0,
        "estancamiento": 0.5,
        "crecimiento": 2.0,
    },
    "prima": {
        "normal": 100,  # pb
        "tension": 200,
        "crisis": 400,
    },
}

# Pesos en el índice compuesto de presión (suman 1.0)
_PESOS = {"paro": 0.40, "ipc": 0.30, "pib": 0.20, "prima": 0.10}


@dataclass
class EconomicScore:
    presion_total: float          # 0 (excelente) → 100 (crisis total)
    presion_paro: float
    presion_ipc: float
    presion_pib: float
    presion_prima: float
    incumbency_penalty_pp: float  # puntos porcentuales que pierde/gana el gobierno
    nivel: str                    # "Favorable" / "Neutro" / "Adverso" / "Crítico"
    narrativa: str
    componentes_raw: dict = field(default_factory=dict)


def _score_paro(paro: float) -> float:
    """0 = excelente, 100 = peor posible."""
    u = _UMBRALES["paro"]
    if paro <= u["bajo"]:
        return max(0.0, (paro / u["bajo"]) * 20)
    if paro <= u["alto"]:
        return 20 + (paro - u["bajo"]) / (u["alto"] - u["bajo"]) * 40
    if paro <= u["critico"]:
        return 60 + (paro - u["alto"]) / (u["critico"] - u["alto"]) * 30
    return 90 + min(10, (paro - u["critico"]) * 2)


def _score_ipc(ipc: float) -> float:
    u = _UMBRALES["ipc"]
    if ipc < 0:
        return 15  # deflación también es negativa
    if ipc <= u["bajo"]:
        return 0
    if ipc <= u["alto"]:
        return (ipc - u["bajo"]) / (u["alto"] - u["bajo"]) * 40
    if ipc <= u["critico"]:
        return 40 + (ipc - u["alto"]) / (u["critico"] - u["alto"]) * 45
    return 85 + min(15, (ipc - u["critico"]) * 2)


def _score_pib(pib: float) -> float:
    u = _UMBRALES["pib"]
    if pib >= u["crecimiento"]:
        return max(0.0, 10 - (pib - u["crecimiento"]) * 3)
    if pib >= u["estancamiento"]:
        return 10 + (u["crecimiento"] - pib) / (u["crecimiento"] - u["estancamiento"]) * 25
    if pib >= u["recesion"]:
        return 35 + (u["estancamiento"] - pib) / (u["estancamiento"] - u["recesion"]) * 35
    return min(100, 70 + abs(pib - u["recesion"]) * 10)


def _score_prima(prima: float) -> float:
    u = _UMBRALES["prima"]
    if prima <= u["normal"]:
        return 0
    if prima <= u["tension"]:
        return (prima - u["normal"]) / (u["tension"] - u["normal"]) * 30
    if prima <= u["crisis"]:
        return 30 + (prima - u["tension"]) / (u["crisis"] - u["tension"]) * 50
    return min(100, 80 + (prima - u["crisis"]) / 200 * 20)


def _incumbency_penalty(presion: float) -> float:
    """
    Penalización al partido en gobierno en pp de voto.
    Calibrado contra elecciones españolas 2008-2023:
      presión=20 → ±0 pp  (ciclo neutro)
      presión=50 → -3 pp
      presión=80 → -7 pp
    Economía muy buena da bonus hasta +2 pp.
    """
    if presion <= 20:
        return (presion - 20) * 0.10  # leve bonus
    if presion <= 50:
        return -(presion - 20) * 0.10
    if presion <= 80:
        return -3.0 - (presion - 50) * 0.13
    return -6.9 - (presion - 80) * 0.15


def _nivel(presion: float) -> str:
    if presion < 25:
        return "Favorable"
    if presion < 50:
        return "Neutro"
    if presion < 72:
        return "Adverso"
    return "Crítico"


def _narrativa(score: EconomicScore, ipc: float, paro: float, pib: float, prima: float) -> str:
    partes = []
    if score.presion_paro >= 60:
        partes.append(f"el desempleo ({paro:.1f}%) sigue siendo el principal factor de desgaste electoral")
    elif score.presion_paro <= 20:
        partes.append(f"el mercado laboral ({paro:.1f}%) actúa como activo electoral del gobierno")

    if score.presion_ipc >= 50:
        partes.append(f"la inflación ({ipc:.1f}%) erosiona el poder adquisitivo y la confianza ciudadana")
    elif score.presion_ipc <= 10:
        partes.append(f"la inflación contenida ({ipc:.1f}%) reduce la presión sobre las rentas")

    if score.presion_pib >= 50:
        partes.append(f"el crecimiento débil del PIB ({pib:+.1f}%) lastra la narrativa de gestión")
    elif score.presion_pib <= 15:
        partes.append(f"el crecimiento del PIB ({pib:+.1f}%) refuerza el relato económico positivo")

    if score.presion_prima >= 40:
        partes.append(f"la prima de riesgo ({prima:.0f} pb) señala tensión en mercados de deuda")

    penalty = score.incumbency_penalty_pp
    if abs(penalty) < 0.5:
        penalty_txt = "El contexto económico es neutro para el partido en el gobierno."
    elif penalty < 0:
        penalty_txt = f"Se estima una penalización de {abs(penalty):.1f} pp al partido en el gobierno."
    else:
        penalty_txt = f"Se estima un bonus de {penalty:.1f} pp al partido en el gobierno."

    base = f"Contexto económico **{score.nivel.lower()}**. " + "; ".join(partes) + "." if partes else f"Contexto económico **{score.nivel.lower()}**."
    return f"{base} {penalty_txt}"


def compute_economic_score(
    ipc: float,
    paro: float,
    pib: float,
    prima: float,
) -> EconomicScore:
    """
    Calcula la puntuación de presión económica a partir de cuatro indicadores.

    Parameters
    ----------
    ipc    : Inflación IPC (%). Ej: 3.5
    paro   : Tasa de paro EPA (%). Ej: 11.8
    pib    : Crecimiento PIB YoY (%). Ej: 2.3
    prima  : Prima de riesgo bono 10 años vs Alemania (pb). Ej: 95
    """
    p_paro = _score_paro(paro)
    p_ipc = _score_ipc(ipc)
    p_pib = _score_pib(pib)
    p_prima = _score_prima(prima)

    presion = (
        _PESOS["paro"] * p_paro
        + _PESOS["ipc"] * p_ipc
        + _PESOS["pib"] * p_pib
        + _PESOS["prima"] * p_prima
    )
    presion = max(0.0, min(100.0, presion))
    penalty = _incumbency_penalty(presion)
    nivel = _nivel(presion)

    score = EconomicScore(
        presion_total=round(presion, 1),
        presion_paro=round(p_paro, 1),
        presion_ipc=round(p_ipc, 1),
        presion_pib=round(p_pib, 1),
        presion_prima=round(p_prima, 1),
        incumbency_penalty_pp=round(penalty, 2),
        nivel=nivel,
        narrativa="",
        componentes_raw={"ipc": ipc, "paro": paro, "pib": pib, "prima": prima},
    )
    score.narrativa = _narrativa(score, ipc, paro, pib, prima)
    return score


def compute_economic_score_from_df(df_macro: pd.DataFrame) -> Optional[EconomicScore]:
    """
    Extrae los cuatro indicadores del DataFrame de `cargar_macro_ultimo()`
    y calcula el score. Devuelve None si faltan datos clave.
    """
    if df_macro.empty:
        return None

    def _get(indicador: str) -> Optional[float]:
        r = df_macro[df_macro["indicador"] == indicador]
        if r.empty:
            return None
        try:
            return float(r.iloc[0]["valor"])
        except Exception:
            return None

    ipc = _get("IPC General (%)")
    paro = _get("Tasa de Paro (%)")
    pib = _get("Crec. PIB (%)")
    prima = _get("Prima Riesgo (pb)")

    if ipc is None or paro is None:
        return None

    return compute_economic_score(
        ipc=ipc,
        paro=paro,
        pib=pib if pib is not None else 1.0,
        prima=prima if prima is not None else 100.0,
    )


def economic_score_to_df(score: EconomicScore) -> pd.DataFrame:
    """Convierte el score a DataFrame para visualización en barras."""
    return pd.DataFrame([
        {"componente": "Paro", "presion": score.presion_paro, "peso": _PESOS["paro"]},
        {"componente": "IPC", "presion": score.presion_ipc, "peso": _PESOS["ipc"]},
        {"componente": "PIB", "presion": score.presion_pib, "peso": _PESOS["pib"]},
        {"componente": "Prima riesgo", "presion": score.presion_prima, "peso": _PESOS["prima"]},
    ])
