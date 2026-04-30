"""
Servicio legislativo — lógica de dominio para iniciativas, votaciones y comisiones.
"""
from __future__ import annotations

import pandas as pd


_LAW_PATTERN = r"ley|decreto|norma|proposici[oó]n|\b(?:PPL|PL|RDL)\b"


def _col(df: pd.DataFrame, name: str, default: str = "") -> pd.Series:
    if name in df.columns:
        return df[name]
    return pd.Series([default] * len(df), index=df.index)


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
        "partidos": int(df_activity["partido_siglas"].nunique()) if "partido_siglas"in df_activity.columns else 0,
        "tipos": int(df_activity["tipo_acto"].nunique()) if "tipo_acto"in df_activity.columns else 0,
        "mas_activo": (
            df_activity["partido_siglas"].value_counts().index[0]
            if "partido_siglas"in df_activity.columns and not df_activity["partido_siglas"].isna().all()
            else "N/D"
        ),
    }


def build_legislative_laws_view(
    df_activity: pd.DataFrame | None = None,
    df_votes: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Normaliza actividad/votaciones en una vista única de normas recientes.

    Tolera esquemas legacy (`actividad_congreso`, `votaciones_parlamentarias`) y
    el esquema rico (`parliamentary_vote`) sin asumir que todas las columnas
    existen a la vez.
    """

    frames: list[pd.DataFrame] = []

    if df_activity is not None and not df_activity.empty:
        act = df_activity.copy()
        act["tipo"] = _col(act, "tipo_acto").astype(str)
        act["titulo_norma"] = _col(act, "titulo").astype(str)
        act["fecha_norma"] = pd.to_datetime(_col(act, "fecha"), errors="coerce")
        act["partido_siglas"] = _col(act, "partido_siglas")
        act["estado"] = _col(act, "resultado", "Registro").fillna("Registro")
        mask_act = (
            act["tipo"].str.contains(_LAW_PATTERN, case=False, na=False)
            | act["titulo_norma"].str.contains(_LAW_PATTERN, case=False, na=False)
        )
        act_view = act.loc[mask_act, ["tipo", "titulo_norma", "fecha_norma", "partido_siglas", "estado"]].copy()
        act_view["_source_priority"] = 0
        frames.append(act_view)

    if df_votes is not None and not df_votes.empty:
        vot = df_votes.copy()
        tipo_col = "tipo_votacion"if "tipo_votacion"in vot.columns else "vote_type"
        titulo_col = "titulo"if "titulo"in vot.columns else "title"
        fecha_col = "fecha"if "fecha"in vot.columns else "session_date"
        estado_col = "resultado"if "resultado"in vot.columns else "result"

        vot["tipo"] = _col(vot, tipo_col).astype(str)
        vot["titulo_norma"] = _col(vot, titulo_col).astype(str)
        vot["fecha_norma"] = pd.to_datetime(_col(vot, fecha_col), errors="coerce")
        vot["partido_siglas"] = _col(vot, "partido_siglas")
        vot["estado"] = _col(vot, estado_col, "Registro").fillna("Registro")
        mask_vot = (
            vot["tipo"].str.contains(_LAW_PATTERN, case=False, na=False)
            | vot["titulo_norma"].str.contains(_LAW_PATTERN, case=False, na=False)
        )
        vot_view = vot.loc[mask_vot, ["tipo", "titulo_norma", "fecha_norma", "partido_siglas", "estado"]].copy()
        vot_view["_source_priority"] = 1
        frames.append(vot_view)

    if not frames:
        return pd.DataFrame(columns=["tipo", "titulo_norma", "fecha_norma", "partido_siglas", "estado"])

    leyes = pd.concat(frames, ignore_index=True, sort=False)
    leyes["titulo_norma"] = (
        leyes["titulo_norma"]
        .astype(str)
        .str.strip()
        .replace({"nan": "", "None": "", "<NA>": ""})
    )
    leyes["tipo"] = (
        leyes["tipo"]
        .astype(str)
        .str.strip()
        .replace({"nan": "", "None": "", "<NA>": ""})
    )
    leyes["estado"] = (
        leyes["estado"]
        .astype(str)
        .str.strip()
        .replace({"": "Registro", "nan": "Registro", "None": "Registro", "<NA>": "Registro"})
    )
    leyes["partido_siglas"] = (
        leyes["partido_siglas"]
        .fillna("")
        .astype(str)
        .str.strip()
        .replace({"": "N/A", "nan": "N/A", "None": "N/A", "<NA>": "N/A"})
    )
    leyes = leyes[leyes["titulo_norma"] != ""].copy()
    leyes["fecha_norma_label"] = leyes["fecha_norma"].dt.strftime("%Y-%m-%d").fillna("")
    leyes = leyes.sort_values(
        by=["titulo_norma", "_source_priority", "fecha_norma"],
        ascending=[True, True, True],
        na_position="last",
    )
    # Consolidar por título, priorizando actividad legislativa sobre votación.
    leyes = leyes.drop_duplicates(subset=["titulo_norma"], keep="first")
    return leyes.sort_values(
        by=["fecha_norma", "titulo_norma"],
        ascending=[False, True],
        na_position="last",
    ).drop(columns=["_source_priority"], errors="ignore").reset_index(drop=True)
