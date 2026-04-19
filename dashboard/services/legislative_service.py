"""
Servicio legislativo — lógica de dominio para iniciativas, votaciones y comisiones.
"""
from __future__ import annotations

import pandas as pd


# ── Constantes ────────────────────────────────────────────────────────────────

TIPO_INICIATIVA_LABELS: dict[str, str] = {
    "PPL":   "Proposición de Ley",
    "PL":    "Proyecto de Ley",
    "PNL":   "Proposición No de Ley",
    "MOCI":  "Moción",
    "INTER": "Interpelación",
    "PREG":  "Pregunta oral",
    "PRESC": "Pregunta escrita",
    "ENMI":  "Enmienda",
    "RDL":   "Real Decreto-ley",
}

TIPO_RANGO_SCORE: dict[str, int] = {
    "Ley Orgánica":          100,
    "Ley":                    85,
    "Real Decreto-ley":       90,
    "Real Decreto Legislativo": 80,
    "Real Decreto":           70,
    "Orden Ministerial":      50,
    "Resolución":             40,
    "Anuncio":                20,
    "Disposición":            30,
}


# ── Funciones de análisis de votaciones ──────────────────────────────────────

def resultado_label(votos_favor: int, votos_contra: int) -> str:
    if votos_favor > votos_contra:
        return "APROBADA"
    if votos_favor < votos_contra:
        return "RECHAZADA"
    return "EMPATE"


def coalition_matrix(df_votes: pd.DataFrame) -> pd.DataFrame:
    """
    A partir de un DataFrame con columnas [partido, voto] por sesión,
    calcula la matriz de acuerdo entre partidos (% de veces que votan igual).

    df_votes debe tener columnas: session_id, partido, voto_value.
    """
    if df_votes.empty or not {"session_id", "partido", "voto_value"}.issubset(df_votes.columns):
        return pd.DataFrame()

    partidos = df_votes["partido"].dropna().unique().tolist()
    matrix: dict[str, dict[str, float]] = {p: {} for p in partidos}

    for session_id, group in df_votes.groupby("session_id"):
        votos = group.set_index("partido")["voto_value"].to_dict()
        for p1 in partidos:
            for p2 in partidos:
                if p1 == p2:
                    continue
                v1 = votos.get(p1)
                v2 = votos.get(p2)
                if v1 is None or v2 is None:
                    continue
                key = (p1, p2)
                agree = 1 if v1 == v2 else 0
                if p2 not in matrix[p1]:
                    matrix[p1][p2] = []  # type: ignore
                matrix[p1][p2].append(agree)  # type: ignore

    result = {
        p1: {p2: (sum(v) / len(v) * 100 if v else 0) for p2, v in row.items()}
        for p1, row in matrix.items()
    }
    return pd.DataFrame(result).fillna(0)


def discipline_index(df_votes: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula índice de disciplina de voto por partido:
    % de diputados que votan igual a la mayoría del grupo.

    df_votes debe tener columnas: partido, diputado_id, voto_value, session_id.
    """
    if df_votes.empty:
        return pd.DataFrame(columns=["partido", "discipline_pct"])

    records = []
    for (partido, session_id), group in df_votes.groupby(["partido", "session_id"]):
        if group.empty:
            continue
        majority_vote = group["voto_value"].mode()
        if majority_vote.empty:
            continue
        mv = majority_vote.iloc[0]
        discipline = (group["voto_value"] == mv).mean() * 100
        records.append({"partido": partido, "discipline": discipline})

    if not records:
        return pd.DataFrame(columns=["partido", "discipline_pct"])

    return (
        pd.DataFrame(records)
        .groupby("partido", as_index=False)
        .agg(discipline_pct=("discipline", "mean"))
        .sort_values("discipline_pct", ascending=False)
    )


def activity_kpis(df_activity: pd.DataFrame) -> dict:
    """KPIs básicos de actividad legislativa a partir de actividad_congreso."""
    if df_activity.empty:
        return {"total": 0, "partidos": 0, "tipos": 0, "mas_activo": "N/D"}
    return {
        "total": int(len(df_activity)),
        "partidos": int(df_activity["partido_siglas"].nunique()) if "partido_siglas" in df_activity.columns else 0,
        "tipos": int(df_activity["tipo_acto"].nunique()) if "tipo_acto" in df_activity.columns else 0,
        "mas_activo": (
            df_activity["partido_siglas"].value_counts().index[0]
            if "partido_siglas" in df_activity.columns and not df_activity["partido_siglas"].isna().all()
            else "N/D"
        ),
    }
