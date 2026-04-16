from __future__ import annotations

import pandas as pd


def top_party(df_nc: pd.DataFrame) -> str:
    if df_nc.empty or "estimacion_pct" not in df_nc.columns:
        return "N/D"
    row = df_nc.sort_values("estimacion_pct", ascending=False).head(1)
    return str(row.iloc[0].get("partido_siglas", "N/D"))


def macro_value(df_macro: pd.DataFrame, indicador: str) -> str:
    if df_macro.empty:
        return "N/D"
    r = df_macro[df_macro["indicador"] == indicador]
    if r.empty:
        return "N/D"
    try:
        return f"{float(r.iloc[0]['valor']):.2f}"
    except Exception:
        return str(r.iloc[0].get("valor", "N/D"))


def select_critical_news_diversified(
    df_news: pd.DataFrame,
    max_total: int = 24,
    max_per_source: int = 3,
) -> pd.DataFrame:
    if df_news.empty:
        return df_news
    df = df_news.copy()
    if "sentimiento_score" in df.columns:
        df["abs_score"] = pd.to_numeric(df["sentimiento_score"], errors="coerce").fillna(0.0).abs()
        sort_cols = ["abs_score"]
        if "fecha_publicacion" in df.columns:
            sort_cols.append("fecha_publicacion")
        df = df.sort_values(sort_cols, ascending=[False] * len(sort_cols))

    out = []
    counts: dict[str, int] = {}
    for _, row in df.iterrows():
        fuente = str(row.get("fuente") or "desconocida")
        if counts.get(fuente, 0) >= max_per_source:
            continue
        out.append(row)
        counts[fuente] = counts.get(fuente, 0) + 1
        if len(out) >= max_total:
            break

    if not out:
        return df.head(max_total)
    return pd.DataFrame(out)


def suggested_actions(audience: str) -> list[str]:
    if audience == "Dirección política":
        return [
            "Concentrar mensajes en economía del hogar y vivienda en CCAA competitivas.",
            "Priorizar agenda en territorios con mayor tensión institucional y menor cobertura favorable.",
            "Alinear portavocías con el tema dominante de agenda para evitar dispersión narrativa.",
        ]
    if audience == "Comunicación":
        return [
            "Abrir ciclo de respuesta en temas con sentimiento negativo sostenido (>48h).",
            "Activar contranarrativas con evidencia y fuentes oficiales en alertas de alta viralidad.",
            "Sincronizar contenidos con agenda institucional para maximizar ventana de cobertura.",
        ]
    return [
        "Revisar integridad de fuentes críticas (agenda, prensa, alertas) y completar faltantes diarios.",
        "Recalibrar pesos de nowcasting si cambian macro-señales o eventos de alto impacto.",
        "Ejecutar validación y registrar métricas comparables para trazabilidad semanal.",
    ]
