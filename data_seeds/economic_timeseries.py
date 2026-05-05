from __future__ import annotations

import math
from datetime import date


# 96 monthly points from 2018-01 to 2025-12 (8 full years)
def _months() -> list[str]:
    out: list[str] = []
    for year in range(2018, 2026):
        for m in range(1, 13):
            out.append(f"{year:04d}-{m:02d}-01")
    return out


_MONTHS = _months()


def _idx(d: str) -> int:
    return _MONTHS.index(d)


def _profile(base: float, scenario: dict[int, float], noise: float = 0.5) -> list[float]:
    """Build a profile with monthly anchor values and linear interpolation between anchors."""
    n = len(_MONTHS)
    anchors = sorted(scenario.items())
    values = [0.0] * n
    for i in range(n):
        # find surrounding anchors
        prev = anchors[0]
        nxt = anchors[-1]
        for j, (k, _v) in enumerate(anchors):
            if k <= i:
                prev = anchors[j]
            if k >= i:
                nxt = anchors[j]
                break
        if prev == nxt:
            v = prev[1]
        else:
            span = nxt[0] - prev[0]
            t = (i - prev[0]) / span if span else 0.0
            v = prev[1] + t * (nxt[1] - prev[1])
        wave = math.sin(i * 0.5) * noise
        values[i] = round(base + v + wave, 2)
    return values


def _series_from_values(values: list[float]) -> list[dict]:
    out = []
    for i, d in enumerate(_MONTHS):
        v = values[i]
        v_yoy = values[i - 12] if i >= 12 else v
        v_mom = values[i - 1] if i >= 1 else v
        change_yoy = round(((v - v_yoy) / v_yoy) * 100.0, 2) if v_yoy not in (0, 0.0) else 0.0
        change_mom = round(((v - v_mom) / v_mom) * 100.0, 2) if v_mom not in (0, 0.0) else 0.0
        out.append({"date": d, "value": float(v), "change_yoy": change_yoy, "change_mom": change_mom})
    return out


# IPC interanual (% YoY)
_ipc_values = _profile(
    base=1.5,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-06-01"): 0.0,
        _idx("2020-04-01"): -2.0,
        _idx("2020-12-01"): -1.0,
        _idx("2021-12-01"): 4.5,
        _idx("2022-07-01"): 9.3,
        _idx("2023-02-01"): 4.5,
        _idx("2023-12-01"): 1.6,
        _idx("2024-06-01"): 1.9,
        _idx("2025-06-01"): 2.0,
        _idx("2025-12-01"): 2.1,
    },
    noise=0.3,
)
ipc = _series_from_values(_ipc_values)

# IPC subyacente
_ipc_sub = _profile(
    base=1.2,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2020-12-01"): 0.0,
        _idx("2022-07-01"): 5.5,
        _idx("2023-02-01"): 6.2,
        _idx("2023-12-01"): 2.7,
        _idx("2024-12-01"): 2.4,
        _idx("2025-12-01"): 2.0,
    },
    noise=0.2,
)
ipc_subyacente = _series_from_values(_ipc_sub)

# Paro tasa
_paro = _profile(
    base=15.0,
    scenario={
        _idx("2018-01-01"): 1.5,
        _idx("2019-12-01"): -1.5,
        _idx("2020-06-01"): 1.0,
        _idx("2021-06-01"): 0.7,
        _idx("2022-12-01"): -2.2,
        _idx("2023-12-01"): -3.0,
        _idx("2024-12-01"): -3.6,
        _idx("2025-12-01"): -4.2,
    },
    noise=0.4,
)
paro_rate = _series_from_values(_paro)

# Paro juvenil
_paro_jov = _profile(
    base=33.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): -3.0,
        _idx("2020-09-01"): 9.0,
        _idx("2022-12-01"): -7.0,
        _idx("2024-12-01"): -10.0,
        _idx("2025-12-01"): -11.0,
    },
    noise=0.7,
)
paro_juvenil = _series_from_values(_paro_jov)

# Salario medio (€/mes)
_salario = _profile(
    base=1900.0,
    scenario={
        _idx("2018-01-01"): -50.0,
        _idx("2019-12-01"): -10.0,
        _idx("2020-12-01"): 0.0,
        _idx("2022-06-01"): 80.0,
        _idx("2023-12-01"): 200.0,
        _idx("2024-12-01"): 280.0,
        _idx("2025-12-01"): 350.0,
    },
    noise=15.0,
)
salario_medio = _series_from_values(_salario)

# Indice consumo minorista (base=100 en 2018-01)
_consumo = _profile(
    base=100.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): 4.0,
        _idx("2020-04-01"): -22.0,
        _idx("2020-12-01"): -3.0,
        _idx("2022-12-01"): 4.0,
        _idx("2023-12-01"): 6.0,
        _idx("2024-12-01"): 9.0,
        _idx("2025-12-01"): 12.0,
    },
    noise=1.0,
)
indice_consumo_minorista = _series_from_values(_consumo)

# Indice produccion industrial (base=100)
_ipi = _profile(
    base=100.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): 2.5,
        _idx("2020-04-01"): -28.0,
        _idx("2020-12-01"): -3.5,
        _idx("2022-06-01"): 1.0,
        _idx("2023-06-01"): 3.5,
        _idx("2024-12-01"): 5.5,
        _idx("2025-12-01"): 7.0,
    },
    noise=1.5,
)
indice_produccion_industrial = _series_from_values(_ipi)

# GDP YoY (%)
_gdp_yoy = _profile(
    base=2.5,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): -0.5,
        _idx("2020-06-01"): -22.0,
        _idx("2020-12-01"): -10.0,
        _idx("2021-06-01"): 3.0,
        _idx("2022-06-01"): 2.0,
        _idx("2023-06-01"): 0.0,
        _idx("2024-12-01"): 0.7,
        _idx("2025-12-01"): 0.5,
    },
    noise=0.3,
)
gdp_growth_yoy = _series_from_values(_gdp_yoy)

# GDP QoQ (%)
_gdp_qoq = _profile(
    base=0.5,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2020-04-01"): -17.0,
        _idx("2020-12-01"): -5.0,
        _idx("2021-06-01"): 1.5,
        _idx("2022-06-01"): 0.5,
        _idx("2023-12-01"): 0.0,
        _idx("2024-12-01"): 0.2,
        _idx("2025-12-01"): 0.1,
    },
    noise=0.2,
)
gdp_growth_qoq = _series_from_values(_gdp_qoq)

# Deuda publica % PIB
_deuda = _profile(
    base=98.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): -2.0,
        _idx("2020-12-01"): 24.0,
        _idx("2021-12-01"): 21.0,
        _idx("2022-12-01"): 14.0,
        _idx("2023-12-01"): 10.0,
        _idx("2024-12-01"): 6.0,
        _idx("2025-12-01"): 3.0,
    },
    noise=0.3,
)
deuda_publica_pib = _series_from_values(_deuda)

# Deficit publico % PIB
_def = _profile(
    base=-3.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): 0.5,
        _idx("2020-12-01"): -8.0,
        _idx("2021-12-01"): -4.0,
        _idx("2023-12-01"): -1.5,
        _idx("2024-12-01"): -0.7,
        _idx("2025-12-01"): -0.3,
    },
    noise=0.2,
)
deficit_publico = _series_from_values(_def)

# Balanza comercial (millones EUR mensual)
_balanza = _profile(
    base=-2500.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2020-04-01"): 1500.0,
        _idx("2022-06-01"): -2000.0,
        _idx("2023-06-01"): 200.0,
        _idx("2024-12-01"): 1500.0,
        _idx("2025-12-01"): 1800.0,
    },
    noise=200.0,
)
balanza_comercial = _series_from_values(_balanza)

# Prima riesgo (puntos básicos)
_prima = _profile(
    base=85.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2020-04-01"): 60.0,
        _idx("2020-12-01"): 30.0,
        _idx("2022-06-01"): 25.0,
        _idx("2023-12-01"): -5.0,
        _idx("2024-12-01"): -15.0,
        _idx("2025-12-01"): -25.0,
    },
    noise=5.0,
)
prima_riesgo = _series_from_values(_prima)

# IBEX35 close
_ibex = _profile(
    base=10000.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2018-12-01"): -800.0,
        _idx("2020-04-01"): -3500.0,
        _idx("2020-12-01"): -2200.0,
        _idx("2022-06-01"): -1300.0,
        _idx("2023-06-01"): 200.0,
        _idx("2024-06-01"): 1100.0,
        _idx("2024-12-01"): 1300.0,
        _idx("2025-06-01"): 2000.0,
        _idx("2025-12-01"): 2400.0,
    },
    noise=120.0,
)
ibex35_close = _series_from_values(_ibex)

# Mortgage rate avg (%)
_mortgage = _profile(
    base=2.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): -0.3,
        _idx("2021-06-01"): -0.5,
        _idx("2022-12-01"): 1.5,
        _idx("2023-09-01"): 2.1,
        _idx("2024-06-01"): 1.5,
        _idx("2025-12-01"): 0.7,
    },
    noise=0.05,
)
mortgage_rate_avg = _series_from_values(_mortgage)

# Energy prices index (base=100 = 2018)
_energy = _profile(
    base=100.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2020-04-01"): -25.0,
        _idx("2021-12-01"): 80.0,
        _idx("2022-08-01"): 130.0,
        _idx("2023-06-01"): 30.0,
        _idx("2024-12-01"): 10.0,
        _idx("2025-12-01"): 5.0,
    },
    noise=4.0,
)
energy_prices_index = _series_from_values(_energy)

# Vivienda precio €/m2 venta
_viv = _profile(
    base=1600.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): 100.0,
        _idx("2020-12-01"): 110.0,
        _idx("2022-12-01"): 250.0,
        _idx("2024-12-01"): 480.0,
        _idx("2025-12-01"): 580.0,
    },
    noise=12.0,
)
vivienda_precio_m2 = _series_from_values(_viv)

# Alquiler precio €/m2/mes
_alq = _profile(
    base=10.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): 1.0,
        _idx("2020-12-01"): 0.7,
        _idx("2022-12-01"): 2.5,
        _idx("2024-12-01"): 4.0,
        _idx("2025-12-01"): 4.7,
    },
    noise=0.15,
)
alquiler_precio_m2 = _series_from_values(_alq)

# Llegadas turistas (millones/mes)
_tur = _profile(
    base=6.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-08-01"): 4.0,
        _idx("2020-04-01"): -5.5,
        _idx("2020-08-01"): -3.5,
        _idx("2021-08-01"): -1.5,
        _idx("2022-08-01"): 4.0,
        _idx("2023-08-01"): 5.5,
        _idx("2024-08-01"): 7.0,
        _idx("2025-08-01"): 7.5,
    },
    noise=0.4,
)
llegadas_turistas = _series_from_values(_tur)

# Gasto turistico (millones EUR/mes)
_gas = _profile(
    base=6500.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2019-08-01"): 4500.0,
        _idx("2020-04-01"): -6000.0,
        _idx("2021-08-01"): -1500.0,
        _idx("2022-08-01"): 5000.0,
        _idx("2023-08-01"): 8000.0,
        _idx("2024-08-01"): 11000.0,
        _idx("2025-08-01"): 12500.0,
    },
    noise=300.0,
)
gasto_turistico_mm = _series_from_values(_gas)


ECONOMIC_SERIES: dict[str, list[dict]] = {
    "ipc": ipc,
    "ipc_subyacente": ipc_subyacente,
    "paro_rate": paro_rate,
    "paro_juvenil": paro_juvenil,
    "salario_medio": salario_medio,
    "indice_consumo_minorista": indice_consumo_minorista,
    "indice_produccion_industrial": indice_produccion_industrial,
    "gdp_growth_yoy": gdp_growth_yoy,
    "gdp_growth_qoq": gdp_growth_qoq,
    "deuda_publica_pib": deuda_publica_pib,
    "deficit_publico": deficit_publico,
    "balanza_comercial": balanza_comercial,
    "prima_riesgo": prima_riesgo,
    "ibex35_close": ibex35_close,
    "mortgage_rate_avg": mortgage_rate_avg,
    "energy_prices_index": energy_prices_index,
    "vivienda_precio_m2": vivienda_precio_m2,
    "alquiler_precio_m2": alquiler_precio_m2,
    "llegadas_turistas": llegadas_turistas,
    "gasto_turistico_mm": gasto_turistico_mm,
}
