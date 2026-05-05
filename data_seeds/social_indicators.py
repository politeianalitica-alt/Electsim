from __future__ import annotations

import math


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
    n = len(_MONTHS)
    anchors = sorted(scenario.items())
    values = [0.0] * n
    for i in range(n):
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
        wave = math.sin(i * 0.45) * noise
        values[i] = round(base + v + wave, 2)
    return values


def _series_simple(values: list[float]) -> list[dict]:
    return [{"date": _MONTHS[i], "value": float(values[i])} for i in range(len(_MONTHS))]


# Approval government (-100 to +100)
_appr_gov = _profile(
    base=-15.0,
    scenario={
        _idx("2018-01-01"): -25.0,
        _idx("2018-06-01"): 5.0,
        _idx("2020-04-01"): 10.0,
        _idx("2020-12-01"): -8.0,
        _idx("2022-06-01"): -15.0,
        _idx("2023-06-01"): -10.0,
        _idx("2024-04-01"): -25.0,
        _idx("2024-11-01"): -32.0,
        _idx("2025-06-01"): -20.0,
        _idx("2025-12-01"): -18.0,
    },
    noise=2.5,
)
approval_government = _series_simple(_appr_gov)

# Approval opposition
_appr_opo = _profile(
    base=-12.0,
    scenario={
        _idx("2018-01-01"): -10.0,
        _idx("2020-04-01"): -8.0,
        _idx("2022-06-01"): 5.0,
        _idx("2023-06-01"): 0.0,
        _idx("2024-06-01"): -5.0,
        _idx("2025-12-01"): -2.0,
    },
    noise=2.0,
)
approval_opposition = _series_simple(_appr_opo)

# Satisfaction democracy
_sat_dem = _profile(
    base=42.0,
    scenario={
        _idx("2018-01-01"): 0.0,
        _idx("2020-04-01"): 5.0,
        _idx("2021-12-01"): -7.0,
        _idx("2023-12-01"): -10.0,
        _idx("2024-12-01"): -14.0,
        _idx("2025-12-01"): -12.0,
    },
    noise=1.0,
)
satisfaction_democracy = _series_simple(_sat_dem)

# Top concerns (% que lo menciona)
def _build_top_concerns() -> list[dict]:
    paro = _profile(35.0, {
        _idx("2018-01-01"): 0.0,
        _idx("2020-08-01"): 15.0,
        _idx("2022-12-01"): -10.0,
        _idx("2024-12-01"): -22.0,
        _idx("2025-12-01"): -25.0,
    }, noise=1.5)
    sanidad = _profile(20.0, {
        _idx("2018-01-01"): -5.0,
        _idx("2020-04-01"): 30.0,
        _idx("2021-12-01"): 15.0,
        _idx("2023-06-01"): 5.0,
        _idx("2024-12-01"): 8.0,
        _idx("2025-12-01"): 10.0,
    }, noise=1.0)
    vivienda = _profile(10.0, {
        _idx("2018-01-01"): 0.0,
        _idx("2020-04-01"): 0.0,
        _idx("2022-06-01"): 8.0,
        _idx("2023-12-01"): 18.0,
        _idx("2024-12-01"): 28.0,
        _idx("2025-12-01"): 32.0,
    }, noise=1.0)
    inmigracion = _profile(8.0, {
        _idx("2018-01-01"): 0.0,
        _idx("2019-12-01"): 5.0,
        _idx("2022-06-01"): 4.0,
        _idx("2024-08-01"): 14.0,
        _idx("2025-06-01"): 16.0,
        _idx("2025-12-01"): 14.0,
    }, noise=0.8)
    political_class = _profile(28.0, {
        _idx("2018-01-01"): 0.0,
        _idx("2019-06-01"): -5.0,
        _idx("2022-06-01"): 5.0,
        _idx("2024-04-01"): 12.0,
        _idx("2025-12-01"): 15.0,
    }, noise=1.5)
    economy = _profile(22.0, {
        _idx("2018-01-01"): 0.0,
        _idx("2020-08-01"): 10.0,
        _idx("2022-08-01"): 18.0,
        _idx("2023-12-01"): 8.0,
        _idx("2024-12-01"): 0.0,
        _idx("2025-12-01"): -2.0,
    }, noise=1.2)
    out = []
    for i, d in enumerate(_MONTHS):
        out.append({
            "date": d,
            "top_concerns_pct": {
                "paro": float(paro[i]),
                "sanidad": float(sanidad[i]),
                "vivienda": float(vivienda[i]),
                "inmigracion": float(inmigracion[i]),
                "political_class": float(political_class[i]),
                "economy": float(economy[i]),
            },
        })
    return out


top_concerns_pct = _build_top_concerns()


# Trust institutions (0-10)
def _build_trust() -> list[dict]:
    gobierno = _profile(4.5, {
        _idx("2018-01-01"): -1.0,
        _idx("2020-06-01"): 0.5,
        _idx("2024-04-01"): -1.5,
        _idx("2025-12-01"): -1.0,
    }, noise=0.1)
    congreso = _profile(4.0, {
        _idx("2018-01-01"): 0.0,
        _idx("2020-06-01"): 0.3,
        _idx("2024-12-01"): -1.2,
        _idx("2025-12-01"): -1.0,
    }, noise=0.1)
    justicia = _profile(4.2, {
        _idx("2018-01-01"): 0.0,
        _idx("2022-12-01"): -0.7,
        _idx("2024-06-01"): -0.5,
        _idx("2025-12-01"): -0.3,
    }, noise=0.1)
    policia = _profile(6.5, {
        _idx("2018-01-01"): 0.0,
        _idx("2020-04-01"): 0.5,
        _idx("2024-12-01"): 0.2,
        _idx("2025-12-01"): 0.3,
    }, noise=0.1)
    medios = _profile(4.0, {
        _idx("2018-01-01"): 0.0,
        _idx("2020-04-01"): 0.4,
        _idx("2022-06-01"): -0.4,
        _idx("2024-12-01"): -1.2,
        _idx("2025-12-01"): -1.5,
    }, noise=0.1)
    out = []
    for i, d in enumerate(_MONTHS):
        out.append({
            "date": d,
            "trust_institutions": {
                "gobierno": round(gobierno[i], 2),
                "congreso": round(congreso[i], 2),
                "justicia": round(justicia[i], 2),
                "policia": round(policia[i], 2),
                "medios": round(medios[i], 2),
            },
        })
    return out


trust_institutions = _build_trust()


# Polarization index (0-100)
_pol = _profile(58.0, {
    _idx("2018-01-01"): 0.0,
    _idx("2019-12-01"): 8.0,
    _idx("2022-06-01"): 14.0,
    _idx("2023-12-01"): 22.0,
    _idx("2024-06-01"): 28.0,
    _idx("2025-12-01"): 30.0,
}, noise=1.0)
polarization_index = _series_simple(_pol)

# Political engagement youth
_eng = _profile(35.0, {
    _idx("2018-01-01"): 0.0,
    _idx("2020-06-01"): 8.0,
    _idx("2022-12-01"): 5.0,
    _idx("2024-12-01"): 12.0,
    _idx("2025-12-01"): 14.0,
}, noise=1.5)
political_engagement_youth = _series_simple(_eng)

# Voter intention volatility (0-100)
_vol = _profile(30.0, {
    _idx("2018-01-01"): 0.0,
    _idx("2019-12-01"): 8.0,
    _idx("2022-12-01"): 12.0,
    _idx("2024-06-01"): 18.0,
    _idx("2025-12-01"): 22.0,
}, noise=1.5)
voter_intention_volatility = _series_simple(_vol)


SOCIAL_INDICATORS: dict[str, list[dict]] = {
    "approval_government": approval_government,
    "approval_opposition": approval_opposition,
    "satisfaction_democracy": satisfaction_democracy,
    "top_concerns_pct": top_concerns_pct,
    "trust_institutions": trust_institutions,
    "polarization_index": polarization_index,
    "political_engagement_youth": political_engagement_youth,
    "voter_intention_volatility": voter_intention_volatility,
}
