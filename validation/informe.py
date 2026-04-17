"""
Generación de informe HTML de validación completo.

Consolida resultados de backtesting, calibración y calidad de datos
en un informe legible. Se puede exportar a HTML (o PDF con weasyprint).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from validation.backtesting import BacktestResults
from validation.calibracion_agentes import ResultadoCalibracion
from validation.calidad_datos import ReporteCalidad

log = logging.getLogger(__name__)

_CSS = """
body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 2rem; color: #222; }
h1 { color: #C60B1E; border-bottom: 3px solid #C60B1E; padding-bottom: 0.5rem; }
h2 { color: #AA151B; margin-top: 2rem; }
h3 { color: #555; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th { background: #AA151B; color: white; padding: 8px 12px; text-align: left; }
td { padding: 7px 12px; border-bottom: 1px solid #ddd; }
tr:hover { background: #f9f9f9; }
.badge-verde { background:#27ae60; color:white; padding:3px 8px; border-radius:4px; }
.badge-amarillo { background:#f39c12; color:white; padding:3px 8px; border-radius:4px; }
.badge-rojo { background:#e74c3c; color:white; padding:3px 8px; border-radius:4px; }
.badge-ok { background:#27ae60; color:white; padding:2px 6px; border-radius:3px; }
.badge-fail { background:#e74c3c; color:white; padding:2px 6px; border-radius:3px; }
.kpi-grid { display:flex; gap:1.5rem; flex-wrap:wrap; margin:1rem 0; }
.kpi { background:#f5f5f5; border-left:4px solid #AA151B; padding:1rem 1.5rem; border-radius:4px; min-width:160px; }
.kpi .valor { font-size:2rem; font-weight:bold; color:#AA151B; }
.kpi .etiqueta { font-size:0.85rem; color:#666; }
.nota { background:#fff3cd; border-left:4px solid #ffc107; padding:0.5rem 1rem; margin:0.5rem 0; border-radius:3px; }
"""


def _badge(texto: str, tipo: str) -> str:
    return f'<span class="badge-{tipo}">{texto}</span>'


def _kpi(valor: str, etiqueta: str) -> str:
    return f'<div class="kpi"><div class="valor">{valor}</div><div class="etiqueta">{etiqueta}</div></div>'


def _seccion_backtesting(bt: BacktestResults) -> str:
    m = bt.metricas_globales
    html = "<h2>📊 Backtesting Electoral</h2>"
    html += f"<p>Metodología: <strong>leave-one-election-out</strong> sobre {bt.n_elecciones} elecciones ({bt.metricas_globales.n_obs} observaciones partido-elección).</p>"
    html += '<div class="kpi-grid">'
    html += _kpi(f"{m.brier_score:.4f}", "Brier Score (↓ mejor)")
    html += _kpi(f"{m.rmse * 100:.2f} pp", "RMSE Voto")
    html += _kpi(f"{m.mae * 100:.2f} pp", "MAE Voto")
    html += _kpi(f"{bt.mae_escanos:.1f}", "MAE Escaños")
    html += _kpi(f"{m.cobertura_95ci * 100:.1f}%", "Cobertura IC 95%")
    html += _kpi(f"{m.crps:.4f}", "CRPS")
    html += "</div>"

    if m.notas:
        for nota in m.notas:
            html += f'<div class="nota">⚠️ {nota}</div>'

    # Tabla por elección
    if bt.por_eleccion:
        html += "<h3>Resultados por Elección</h3>"
        html += "<table><tr><th>Fecha</th><th>Tipo</th><th>Partidos</th><th>RMSE Voto (pp)</th></tr>"
        for r in bt.por_eleccion:
            import numpy as np
            reales = list(r.votos_reales_pct.values())
            preds = [r.votos_pred_pct.get(p, 0) for p in r.votos_reales_pct]
            err = float(np.sqrt(np.mean([(a - b) ** 2 for a, b in zip(reales, preds)])))
            html += f"<tr><td>{r.fecha}</td><td>{r.tipo}</td><td>{len(r.partidos)}</td><td>{err:.2f}</td></tr>"
        html += "</table>"

    return html


def _seccion_calibracion(cal: ResultadoCalibracion) -> str:
    estado = _badge("CALIBRADO ✓", "verde") if cal.agentes_calibrados else _badge("DESCALIBRADO ✗", "rojo")
    html = f"<h2>🤖 Calibración de Agentes LLM {estado}</h2>"
    html += f"<p>Comparación de distribuciones sintéticas ({cal.n_sintetico} simulaciones) vs microdatos CIS ({cal.n_real} respondentes reales).</p>"

    html += '<div class="kpi-grid">'
    html += _kpi(f"{cal.ks_stat_ideologia:.4f}", "KS Ideología")
    html += _kpi(f"p={cal.ks_pvalue_ideologia:.3f}", "p-valor KS")
    html += _kpi(f"{cal.media_ideologia_real:.2f} / {cal.media_ideologia_sintetica:.2f}", "Media Ideo. Real/Sint.")
    html += _kpi(f"{cal.mad_intencion_voto:.2f} pp", "MAD Intención Voto")
    html += "</div>"

    if cal.detalles.get("interpretacion"):
        tipo = "verde" if cal.agentes_calibrados else "rojo"
        html += f'<div class="nota">{cal.detalles["interpretacion"]}</div>'

    # Tabla de intención de voto
    intencion_real = cal.detalles.get("intencion_real_pct", {})
    intencion_sint = cal.detalles.get("intencion_sint_pct", {})
    if intencion_real or intencion_sint:
        todos = sorted(set(intencion_real) | set(intencion_sint))
        html += "<h3>Intención de Voto: Real vs Sintética</h3>"
        html += "<table><tr><th>Partido</th><th>CIS Real (%)</th><th>Agentes (%)</th><th>Diferencia (pp)</th></tr>"
        for p in todos:
            r = intencion_real.get(p, 0)
            s = intencion_sint.get(p, 0)
            diff = abs(r - s)
            color = "#e74c3c" if diff > 5 else "#27ae60"
            html += f"<tr><td>{p}</td><td>{r:.1f}</td><td>{s:.1f}</td><td style='color:{color}'>{diff:+.1f}</td></tr>"
        html += "</table>"

    return html


def _seccion_calidad(qc: ReporteCalidad) -> str:
    badge_sem = _badge(qc.semaforo.upper(), qc.semaforo)
    html = f"<h2>🗄️ Calidad de Datos {badge_sem}</h2>"
    html += f"<p>{qc.resumen}</p>"
    html += '<div class="kpi-grid">'
    html += _kpi(f"{qc.pct_completitud_global}%", "Checks OK")
    html += _kpi(str(qc.n_ok), "Checks pasados")
    html += _kpi(str(qc.n_fail), "Checks fallidos")
    html += "</div>"

    html += "<h3>Detalle de Checks</h3>"
    html += "<table><tr><th>Tabla</th><th>Check</th><th>Estado</th><th>Valor</th><th>Umbral</th></tr>"
    for c in qc.checks:
        est = _badge("OK", "ok") if c.ok else _badge("FAIL", "fail")
        html += f"<tr><td>{c.tabla}</td><td>{c.nombre}</td><td>{est}</td><td>{c.valor_observado}</td><td>{c.umbral or '—'}</td></tr>"
    html += "</table>"
    return html


def generar_html(
    backtesting: BacktestResults | None = None,
    calibracion: ResultadoCalibracion | None = None,
    calidad: ReporteCalidad | None = None,
) -> str:
    """Genera el HTML completo del informe de validación."""
    ahora = datetime.now().strftime("%d/%m/%Y %H:%M")
    secciones = ""

    if backtesting:
        secciones += _seccion_backtesting(backtesting)
    if calibracion:
        secciones += _seccion_calibracion(calibracion)
    if calidad:
        secciones += _seccion_calidad(calidad)

    if not secciones:
        secciones = "<p><em>No se encontraron resultados de validación.</em></p>"

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>ElectSim España — Informe de Validación</title>
  <style>{_CSS}</style>
</head>
<body>
  <h1>🇪🇸 ElectSim España — Informe de Validación</h1>
  <p style="color:#666;">Generado el {ahora}</p>
  {secciones}
  <hr style="margin-top:3rem; border-color:#ddd;">
  <p style="color:#999; font-size:0.8rem;">ElectSim España — Digital Twin Ideológico, Social, Económico y Político</p>
</body>
</html>"""


def guardar_informe(
    output_path: str | Path,
    backtesting: BacktestResults | None = None,
    calibracion: ResultadoCalibracion | None = None,
    calidad: ReporteCalidad | None = None,
) -> Path:
    """Genera y guarda el informe HTML en disco."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    html = generar_html(backtesting, calibracion, calidad)
    path.write_text(html, encoding="utf-8")
    log.info("Informe guardado en %s", path)
    return path
