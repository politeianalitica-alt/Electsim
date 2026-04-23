"""Matriz de transferencia de voto (LP con fallback heurístico)."""

from __future__ import annotations

import numpy as np
import pandas as pd


def estimar_matriz_lp(
    df_resultados: pd.DataFrame,
    partidos: list[str],
    col_t1_suffix: str = "_t1",
    col_t2_suffix: str = "_t2",
) -> pd.DataFrame:
    try:
        from scipy.optimize import linprog
    except Exception:
        return _estimar_heuristico(partidos)

    n = len(partidos)
    if df_resultados.empty or n == 0:
        return _estimar_heuristico(partidos)

    r1_cols = [f"{p}{col_t1_suffix}" for p in partidos]
    r2_cols = [f"{p}{col_t2_suffix}" for p in partidos]
    if not all(c in df_resultados.columns for c in r1_cols + r2_cols):
        return _estimar_heuristico(partidos)

    r1 = df_resultados[r1_cols].fillna(0).to_numpy(dtype=float)
    r2 = df_resultados[r2_cols].fillna(0).to_numpy(dtype=float)
    u = r1.shape[0]

    n2 = n * n
    n_slack = u * n
    n_vars = n2 + n_slack

    c = np.zeros(n_vars)
    c[n2:] = 1.0

    a_eq = np.zeros((n, n_vars))
    b_eq = np.ones(n)
    for j in range(n):
        a_eq[j, j * n : (j + 1) * n] = 1.0

    a_ub = []
    b_ub = []
    for uu in range(u):
        for k in range(n):
            row_pos = np.zeros(n_vars)
            for j in range(n):
                row_pos[j * n + k] = r1[uu, j]
            row_pos[n2 + uu * n + k] = -1.0
            a_ub.append(row_pos)
            b_ub.append(r2[uu, k])

            row_neg = -row_pos.copy()
            row_neg[n2 + uu * n + k] = -1.0
            a_ub.append(row_neg)
            b_ub.append(-r2[uu, k])

    bounds = [(0, 1)] * n2 + [(0, None)] * n_slack
    res = linprog(
        c,
        A_ub=np.array(a_ub),
        b_ub=np.array(b_ub),
        A_eq=a_eq,
        b_eq=b_eq,
        bounds=bounds,
        method="highs",
    )
    if not res.success:
        return _estimar_heuristico(partidos)

    pmat = res.x[:n2].reshape(n, n)
    rows: list[dict] = []
    for j, p_orig in enumerate(partidos):
        for k, p_dest in enumerate(partidos):
            rows.append(
                {
                    "partido_origen": p_orig,
                    "partido_destino": p_dest,
                    "prob_transicion": round(float(pmat[j, k]), 4),
                    "ic_lower": None,
                    "ic_upper": None,
                    "metodo": "LP",
                    "n_observaciones": int(u),
                }
            )
    return pd.DataFrame(rows)


def _estimar_heuristico(partidos: list[str]) -> pd.DataFrame:
    ideologia = {
        "SUMAR": 2.0,
        "PODEMOS": 2.0,
        "PSOE": 3.5,
        "ERC": 3.0,
        "JUNTS": 5.0,
        "PNV": 5.5,
        "PP": 7.5,
        "VOX": 9.0,
        "CS": 6.0,
    }
    rows: list[dict] = []
    for p_orig in partidos:
        pos_o = ideologia.get(p_orig, 5.0)
        others = [p for p in partidos if p != p_orig]
        dists = {p: abs(pos_o - ideologia.get(p, 5.0)) for p in others}
        inv = {p: 1.0 / (1.0 + dists[p]) for p in others}
        inv_sum = sum(inv.values()) or 1.0

        rows.append(
            {
                "partido_origen": p_orig,
                "partido_destino": p_orig,
                "prob_transicion": 0.70,
                "ic_lower": None,
                "ic_upper": None,
                "metodo": "heuristico",
                "n_observaciones": 0,
            }
        )
        for p_dest in others:
            rows.append(
                {
                    "partido_origen": p_orig,
                    "partido_destino": p_dest,
                    "prob_transicion": round(0.30 * inv[p_dest] / inv_sum, 4),
                    "ic_lower": None,
                    "ic_upper": None,
                    "metodo": "heuristico",
                    "n_observaciones": 0,
                }
            )
    return pd.DataFrame(rows)


def calcular_transferencia_heuristica(partidos: list[str] | None = None) -> pd.DataFrame:
    """Exposición pública del fallback heurístico."""
    partidos_base = partidos or ["PSOE", "PP", "SUMAR", "VOX", "ERC", "JUNTS", "PNV"]
    return _estimar_heuristico(partidos_base)


def pivot_matriz_transferencia(df_transferencia: pd.DataFrame) -> pd.DataFrame:
    """Convierte tabla larga en matriz partido_origen x partido_destino."""
    if df_transferencia.empty:
        return pd.DataFrame()
    value_col = "prob_transferencia" if "prob_transferencia" in df_transferencia.columns else "prob_transicion"
    if value_col not in df_transferencia.columns:
        return pd.DataFrame()
    return (
        df_transferencia.pivot_table(
            index="partido_origen",
            columns="partido_destino",
            values=value_col,
            aggfunc="mean",
        )
        .fillna(0.0)
        .sort_index(axis=0)
        .sort_index(axis=1)
    )


def calcular_captacion_potencial(
    df_transferencia: pd.DataFrame,
    df_voto_blando: pd.DataFrame,
    partido_destino: str,
    partidos_origen: list[str],
) -> pd.DataFrame:
    """
    Cruza matriz de transferencia con voto blando para estimar votos captables.
    """
    if df_transferencia.empty or df_voto_blando.empty:
        return pd.DataFrame()

    value_col = "prob_transferencia" if "prob_transferencia" in df_transferencia.columns else "prob_transicion"
    if value_col not in df_transferencia.columns:
        return pd.DataFrame()

    df_hacia = df_transferencia[
        df_transferencia["partido_destino"].astype(str).str.upper() == str(partido_destino).upper()
    ].copy()
    if df_hacia.empty:
        return pd.DataFrame()

    rows: list[dict] = []
    for _, t_row in df_hacia.iterrows():
        origen = str(t_row.get("partido_origen", ""))
        if origen.upper() == str(partido_destino).upper() or origen not in partidos_origen:
            continue

        try:
            prob = float(t_row.get(value_col) or 0.0)
        except Exception:
            prob = 0.0

        for _, vb_row in df_voto_blando.iterrows():
            try:
                pct_blando = float(vb_row.get("pct_voto_blando", 0.0))
            except Exception:
                pct_blando = 0.0
            # Soporta escalas 0..1 y 0..100
            if pct_blando > 1.0:
                pct_blando = pct_blando / 100.0
            pct_blando = min(max(pct_blando, 0.0), 1.0)

            n_elec = int(vb_row.get("n_electores_est", 0) or 0)
            circ = (
                vb_row.get("circunscripcion")
                or vb_row.get("provincia")
                or vb_row.get("segmento")
                or "nacional"
            )
            votos_captables = int(n_elec * pct_blando * prob)
            rows.append(
                {
                    "partido_origen": origen,
                    "circunscripcion": circ,
                    "prob_transferencia": round(prob, 4),
                    "pct_voto_blando": round(pct_blando * 100, 1),
                    "votos_captables_est": votos_captables,
                    "prioridad": round(prob * pct_blando, 4),
                }
            )

    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).sort_values("prioridad", ascending=False).reset_index(drop=True)
