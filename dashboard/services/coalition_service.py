"""
Coalition Service — Análisis de coaliciones y asignación de escaños.

Integra:
  - poli-sci-kit: D'Hondt, Webster, LR-Hare, métricas de desproporcionalidad
  - abcvoting: voting rules (PAV, seq-PAV, Method of Equal Shares)
  - Cálculo Bayesiano de probabilidades de coalición
  - Visualización hemiciclo interactiva (Plotly)

Basado en:
  - poli-sci-kit-main/src/poli_sci_kit/appointment/methods.py
  - poli-sci-kit-main/src/poli_sci_kit/appointment/metrics.py
  - abcvoting-master/abcvoting/rules.py
  - MiCongreso-gh-pages (lógica D'Hondt JS → Python)
"""
from __future__ import annotations

import sys
import math
import itertools
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# ─── Optional imports ────────────────────────────────────────────────────────

# poli-sci-kit (bundled copy approach — read directly from gits amigos)
_PSK_PATH = _ROOT / "gits amigos" / "poli-sci-kit-main" / "src"
if str(_PSK_PATH) not in sys.path:
    sys.path.insert(0, str(_PSK_PATH))

try:
    from poli_sci_kit.appointment import methods as _psk_methods  # type: ignore
    from poli_sci_kit.appointment import metrics as _psk_metrics  # type: ignore
    _PSK_OK = True
except ImportError:
    _PSK_OK = False

# abcvoting
_ABC_PATH = _ROOT / "gits amigos" / "abcvoting-master"
if str(_ABC_PATH) not in sys.path:
    sys.path.insert(0, str(_ABC_PATH))

try:
    from abcvoting import rules as _abc_rules  # type: ignore
    from abcvoting.preferences import Profile as _abc_Profile  # type: ignore
    _ABCVOTING_OK = True
except ImportError:
    _ABCVOTING_OK = False

# ─── España: Constantes ───────────────────────────────────────────────────────

TOTAL_ESCANOS = 350
MAYORIA_ABSOLUTA = 176
CIRCUNSCRIPCIONES: dict[str, int] = {
    "Madrid": 37, "Barcelona": 32, "Valencia": 16, "Sevilla": 12,
    "Alicante": 12, "Málaga": 11, "Murcia": 10, "Cádiz": 9,
    "Vizcaya": 8, "A Coruña": 8, "Asturias": 8, "Zaragoza": 7,
    "Pontevedra": 7, "Toledo": 6, "Las Palmas": 6, "Córdoba": 6,
    "Valladolid": 5, "Santa Cruz": 6, "Granada": 7, "Tarragona": 6,
    "Girona": 6, "Lleida": 4, "Navarra": 5, "Guipúzcoa": 6,
    "Álava": 4, "Cantabria": 5, "La Rioja": 4, "Badajoz": 6,
    "Cáceres": 4, "Huelva": 5, "Jaén": 5, "Almería": 5,
    "Albacete": 4, "Burgos": 4, "Salamanca": 4, "Castellón": 5,
    "Palencia": 3, "León": 4, "Zamora": 3, "Segovia": 3,
    "Ávila": 3, "Soria": 2, "Guadalajara": 3, "Cuenca": 3,
    "Ciudad Real": 5, "Lugo": 4, "Ourense": 4, "Huesca": 3,
    "Teruel": 3, "Ceuta": 1, "Melilla": 1,
}


@dataclass
class ResultadoEscanos:
    """Resultado de la asignación de escaños."""
    partido: str
    votos_pct: float
    escanos: int
    escanos_pct: float
    indice_gallagher_contribucion: float = 0.0


@dataclass
class ResultadoCoalicion:
    """Análisis de una posible coalición."""
    nombre: str
    partidos: list[str]
    escanos_totales: int
    tiene_mayoria: bool
    probabilidad: float
    tipo: str  # "gobierno" | "bloqueo" | "minoria"
    descripcion: str


# ─── D'Hondt ─────────────────────────────────────────────────────────────────

def dhondt(
    votos: dict[str, float],
    n_escanos: int = 350,
    umbral_pct: float = 3.0,
    metodo: str = "dhondt",
) -> dict[str, int]:
    """
    Asigna escaños mediante D'Hondt (Jefferson) u otros métodos.

    Parameters
    ----------
    votos : {partido: porcentaje_votos}
    n_escanos : total de escaños a distribuir
    umbral_pct : barrera mínima para entrar en el reparto
    metodo : "dhondt" | "webster" | "hare" | "droop"

    Returns
    -------
    {partido: n_escanos}
    """
    # Filtrar umbral
    total_votos = sum(votos.values())
    if total_votos == 0:
        return {}
    votos_validos = {p: v for p, v in votos.items() if (v / total_votos) * 100 >= umbral_pct}
    if not votos_validos:
        return {}

    shares = list(votos_validos.values())
    labels = list(votos_validos.keys())

    # poli-sci-kit si disponible
    if _PSK_OK:
        try:
            if metodo == "dhondt":
                allocs = _psk_methods.highest_averages(
                    averaging_style="Jefferson",
                    shares=[int(s * 1000) for s in shares],
                    total_alloc=n_escanos,
                )
            elif metodo == "webster":
                allocs = _psk_methods.highest_averages(
                    averaging_style="Webster",
                    shares=[int(s * 1000) for s in shares],
                    total_alloc=n_escanos,
                )
            elif metodo == "hare":
                allocs = _psk_methods.largest_remainder(
                    quota_style="Hare",
                    shares=[int(s * 1000) for s in shares],
                    total_alloc=n_escanos,
                )
            else:
                allocs = _psk_methods.largest_remainder(
                    quota_style="Droop",
                    shares=[int(s * 1000) for s in shares],
                    total_alloc=n_escanos,
                )
            return dict(zip(labels, allocs))
        except Exception:
            pass

    # Fallback: D'Hondt nativo
    return _dhondt_nativo(votos_validos, n_escanos)


def _dhondt_nativo(votos: dict[str, float], n_escanos: int) -> dict[str, int]:
    """Implementación D'Hondt pura en Python."""
    escanos = {p: 0 for p in votos}
    for _ in range(n_escanos):
        cocientes = {p: votos[p] / (escanos[p] + 1) for p in votos}
        ganador = max(cocientes, key=lambda k: cocientes[k])
        escanos[ganador] += 1
    return escanos


def calcular_escanos_nacional(
    sondeo: dict[str, float],
    umbral_pct: float = 3.0,
) -> list[ResultadoEscanos]:
    """
    Calcula escaños nacionales aplicando D'Hondt ponderado por circunscripción.
    Versión simplificada (circunscripción única para velocidad).
    """
    escanos = dhondt(sondeo, n_escanos=TOTAL_ESCANOS, umbral_pct=umbral_pct)
    total_votos = sum(sondeo.values())
    resultados = []

    for partido, esc in escanos.items():
        voto_pct = sondeo.get(partido, 0) / max(total_votos, 1) * 100
        esc_pct = esc / TOTAL_ESCANOS * 100
        resultados.append(ResultadoEscanos(
            partido=partido,
            votos_pct=round(voto_pct, 2),
            escanos=esc,
            escanos_pct=round(esc_pct, 2),
        ))

    # Índice Gallagher (LSq)
    if _PSK_OK:
        try:
            allocs = [r.escanos for r in resultados]
            shares_pct = [r.votos_pct for r in resultados]
            gallagher = _psk_metrics.dispr_index(
                shares=shares_pct,
                allocations=allocs,
                metric_type="Gallagher",
            )
            for r in resultados:
                r.indice_gallagher_contribucion = round(gallagher, 2)
        except Exception:
            pass

    return sorted(resultados, key=lambda r: r.escanos, reverse=True)


def calcular_desproporcionalidad(votos_pct: list[float], escanos: list[int]) -> dict:
    """
    Calcula métricas de desproporcionalidad electoral.
    Returns {gallagher, loosemore_hanby, rae}
    """
    total_esc = sum(escanos)
    esc_pct = [e / total_esc * 100 for e in escanos]
    diff = [abs(v - s) for v, s in zip(votos_pct, esc_pct)]

    rae = sum(diff) / len(diff)
    lb = sum(diff) / 2
    gallagher = math.sqrt(sum(d**2 for d in diff) / 2)

    return {
        "gallagher": round(gallagher, 2),
        "loosemore_hanby": round(lb, 2),
        "rae": round(rae, 2),
    }


# ─── Hemiciclo ────────────────────────────────────────────────────────────────

def hemiciclo_plotly(
    escanos: dict[str, int],
    colores_partidos: dict[str, str],
    titulo: str = "Congreso de los Diputados",
) -> "go.Figure":
    """
    Genera un hemiciclo interactivo con Plotly.
    Inspirado en MiCongreso-gh-pages y poli-sci-kit parliament_plot.
    """
    import plotly.graph_objects as go

    partidos_ord = sorted(escanos.items(), key=lambda x: x[1], reverse=True)
    if not partidos_ord:
        return go.Figure()

    # Posicionar escaños en semicírculo
    total = sum(escanos.values())
    if total == 0:
        return go.Figure()

    # Calcular posiciones en arco (3 filas)
    n_filas = 5
    escanos_por_fila = total // n_filas
    puntos_x, puntos_y, puntos_color, puntos_label = [], [], [], []

    acumulado = 0
    for fila in range(n_filas):
        r = 0.5 + fila * 0.12
        n_en_fila = escanos_por_fila if fila < n_filas - 1 else total - acumulado * (n_filas - 1)
        n_en_fila = max(1, total - acumulado if fila == n_filas - 1 else escanos_por_fila)
        angulos = np.linspace(np.pi, 0, n_en_fila + 2)[1:-1]
        for ang in angulos:
            puntos_x.append(r * np.cos(ang))
            puntos_y.append(r * np.sin(ang))
        acumulado += escanos_por_fila

    # Reposicionar con colores por partido
    all_points = list(zip(puntos_x[:total], puntos_y[:total]))
    idx = 0
    for partido, n_esc in partidos_ord:
        color = colores_partidos.get(partido, "#666666")
        for i in range(n_esc):
            if idx < len(all_points):
                puntos_color.append(color)
                puntos_label.append(partido)
                idx += 1

    # Build figure
    fig = go.Figure()

    # Añadir escaños por partido (para hover correcto)
    for partido, n_esc in partidos_ord:
        idxs = [i for i, l in enumerate(puntos_label) if l == partido]
        if not idxs:
            continue
        xs = [all_points[i][0] for i in idxs if i < len(all_points)]
        ys = [all_points[i][1] for i in idxs if i < len(all_points)]
        color = colores_partidos.get(partido, "#666666")
        fig.add_trace(go.Scatter(
            x=xs, y=ys,
            mode="markers",
            marker=dict(size=8, color=color, line=dict(width=0.5, color="#0D1320")),
            name=f"{partido} ({n_esc})",
            hovertemplate=f"<b>{partido}</b><br>{n_esc} escaños<extra></extra>",
        ))

    # Línea de mayoría absoluta
    fig.add_shape(
        type="line",
        x0=0, y0=-0.05, x1=0, y1=0.7,
        line=dict(color="#EF4444", width=1.5, dash="dash"),
    )
    fig.add_annotation(
        x=0.05, y=0.72,
        text=f"Mayoría<br>{MAYORIA_ABSOLUTA}",
        font=dict(size=9, color="#EF4444"),
        showarrow=False,
    )

    fig.update_layout(
        title=dict(text=titulo, font=dict(size=14, color="#E2E8F0"), x=0.5),
        showlegend=True,
        legend=dict(
            orientation="h",
            x=0.5, xanchor="center",
            y=-0.15,
            font=dict(size=10, color="#E2E8F0"),
            bgcolor="rgba(0,0,0,0)",
        ),
        xaxis=dict(visible=False, range=[-0.85, 0.85]),
        yaxis=dict(visible=False, range=[-0.1, 0.85], scaleanchor="x"),
        paper_bgcolor="#080C14",
        plot_bgcolor="#080C14",
        margin=dict(t=40, b=60, l=10, r=10),
        height=380,
    )

    return fig


# ─── Coalition Analysis ───────────────────────────────────────────────────────

_COALICIONES_CONOCIDAS = [
    {"nombre": "Bloque Derecha",         "partidos": ["PP", "VOX"],                   "tipo": "derecha"},
    {"nombre": "Gran Coalición",          "partidos": ["PP", "PSOE"],                  "tipo": "gran"},
    {"nombre": "Bloque Izquierda",        "partidos": ["PSOE", "SUMAR"],               "tipo": "izquierda"},
    {"nombre": "PSOE+SUMAR+Periféricos",  "partidos": ["PSOE", "SUMAR", "ERC", "JUNTS", "PNV", "EH Bildu"], "tipo": "izquierda_periferica"},
    {"nombre": "PP+CS (histórica)",       "partidos": ["PP", "CS"],                    "tipo": "centro_derecha"},
    {"nombre": "PP+VOX+Periféricos",      "partidos": ["PP", "VOX", "CC", "UPN"],      "tipo": "derecha_periferica"},
    {"nombre": "PSOE+PNV+ERC",            "partidos": ["PSOE", "PNV", "ERC"],          "tipo": "progresista"},
]


def analizar_coaliciones(
    escanos: dict[str, int],
    umbral_mayoria: int = MAYORIA_ABSOLUTA,
) -> list[ResultadoCoalicion]:
    """
    Analiza posibles coaliciones dado un resultado de escaños.
    Returns lista ordenada por probabilidad descendente.
    """
    resultados = []

    # Coaliciones conocidas
    for coal_def in _COALICIONES_CONOCIDAS:
        partidos = [p for p in coal_def["partidos"] if p in escanos]
        if len(partidos) < 2:
            continue
        total_esc = sum(escanos.get(p, 0) for p in partidos)
        tiene_mayoria = total_esc >= umbral_mayoria
        prob = _estimar_probabilidad_coalicion(coal_def["partidos"], escanos, total_esc)
        resultados.append(ResultadoCoalicion(
            nombre=coal_def["nombre"],
            partidos=partidos,
            escanos_totales=total_esc,
            tiene_mayoria=tiene_mayoria,
            probabilidad=prob,
            tipo=coal_def["tipo"],
            descripcion=_describir_coalicion(total_esc, tiene_mayoria, partidos),
        ))

    # Generar combinaciones matemáticas no contempladas
    partidos_list = sorted(escanos.items(), key=lambda x: x[1], reverse=True)
    for r in range(2, min(5, len(partidos_list) + 1)):
        for combo in itertools.combinations(partidos_list, r):
            nombres = [p for p, _ in combo]
            total_esc = sum(e for _, e in combo)
            if total_esc >= umbral_mayoria:
                ya_existe = any(
                    set(nombres) == set(rc.partidos) for rc in resultados
                )
                if not ya_existe:
                    prob = _estimar_probabilidad_coalicion(nombres, escanos, total_esc)
                    resultados.append(ResultadoCoalicion(
                        nombre=" + ".join(nombres),
                        partidos=nombres,
                        escanos_totales=total_esc,
                        tiene_mayoria=True,
                        probabilidad=prob,
                        tipo="combinacion",
                        descripcion=_describir_coalicion(total_esc, True, nombres),
                    ))

    return sorted(resultados, key=lambda r: (r.tiene_mayoria, r.probabilidad), reverse=True)


def _estimar_probabilidad_coalicion(
    partidos: list[str],
    escanos: dict[str, int],
    total_escanos: int,
) -> float:
    """
    Estima la probabilidad de coalición basada en:
    - Margen sobre mayoría absoluta
    - Número de partidos (más = menos probable)
    - Ideología (compatibilidad heurística)
    """
    margen = (total_escanos - MAYORIA_ABSOLUTA) / MAYORIA_ABSOLUTA
    penalizacion_partidos = 1.0 / (1 + 0.3 * (len(partidos) - 2))
    ideologia_compat = _compatibilidad_ideologica(partidos)
    base = min(1.0, max(0.0, 0.5 + margen * 0.5)) * penalizacion_partidos * ideologia_compat
    return round(base, 3)


_ESPECTRO_IDEOLOGICO = {
    "PP": 7, "VOX": 9, "CS": 5, "UPN": 7, "CC": 5, "PRC": 5,
    "PSOE": 4, "SUMAR": 3, "PODEMOS": 2, "IU": 2,
    "ERC": 4, "JUNTS": 5, "PNV": 5, "EH Bildu": 3, "BNG": 3, "CUP": 1,
}


def _compatibilidad_ideologica(partidos: list[str]) -> float:
    scores = [_ESPECTRO_IDEOLOGICO.get(p, 5) for p in partidos]
    if not scores:
        return 0.5
    rango = max(scores) - min(scores)
    return max(0.1, 1.0 - rango / 10.0)


def _describir_coalicion(total_esc: int, tiene_mayoria: bool, partidos: list[str]) -> str:
    margen = total_esc - MAYORIA_ABSOLUTA
    if tiene_mayoria:
        return f"Mayoría con {margen:+d} escaños sobre el umbral ({', '.join(partidos[:3])}...)"
    else:
        return f"Sin mayoría — faltan {abs(margen)} escaños ({', '.join(partidos[:3])})"


# ─── Análisis de probabilidad bayesiana ──────────────────────────────────────

def probabilidad_bayesiana_mayoria(
    sondeo_medio: dict[str, float],
    incertidumbre_std: float = 2.5,
    n_simulaciones: int = 10_000,
    umbral_pct: float = 3.0,
) -> dict[str, float]:
    """
    Estima probabilidades de mayoría absoluta mediante simulación Monte Carlo.
    Inspirado en us-potus-model (Bayesian hierarchical approach).

    Returns
    -------
    {coalition_name: probabilidad_0_a_1}
    """
    np.random.seed(42)
    conteos: dict[str, int] = {c["nombre"]: 0 for c in _COALICIONES_CONOCIDAS}
    conteos["PP solo"] = 0
    conteos["PSOE solo"] = 0

    for _ in range(n_simulaciones):
        # Muestra del sondeo con ruido gaussiano
        sondeo_muestra = {
            p: max(0.1, v + np.random.normal(0, incertidumbre_std))
            for p, v in sondeo_medio.items()
        }
        escanos = dhondt(sondeo_muestra, umbral_pct=umbral_pct)

        # Evaluar coaliciones
        for coal_def in _COALICIONES_CONOCIDAS:
            total_esc = sum(escanos.get(p, 0) for p in coal_def["partidos"])
            if total_esc >= MAYORIA_ABSOLUTA:
                conteos[coal_def["nombre"]] = conteos.get(coal_def["nombre"], 0) + 1

        if escanos.get("PP", 0) >= MAYORIA_ABSOLUTA:
            conteos["PP solo"] += 1
        if escanos.get("PSOE", 0) >= MAYORIA_ABSOLUTA:
            conteos["PSOE solo"] += 1

    return {k: round(v / n_simulaciones, 3) for k, v in conteos.items() if v > 0}


def disponible() -> dict[str, bool]:
    return {"poli_sci_kit": _PSK_OK, "abcvoting": _ABCVOTING_OK}


# ─── Composición del hemiciclo ────────────────────────────────────────────────

def get_composicion_hemiciclo() -> dict[str, int]:
    """
    Retorna la distribución actual de escaños del Congreso desde la BD.
    Si la BD no tiene datos devuelve dict vacío — el caller decide qué mostrar.

    Returns
    -------
    {partido: escanos} ordenado por escaños descendente, o {} si sin datos.
    """
    import os
    try:
        from sqlalchemy import text
        import dashboard.db as _db
        engine = _db.get_engine()
        if engine is None:
            return {}
        legislatura = os.environ.get("LEGISLATURA_ACTUAL", "15")
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    "SELECT partido, escanos FROM composicion_congreso "
                    "WHERE legislatura = :leg ORDER BY escanos DESC"
                ),
                {"leg": legislatura},
            ).fetchall()
            if result:
                return {row[0]: row[1] for row in result}
    except Exception:
        pass
    return {}


def get_total_escanos() -> int:
    """Constante constitucional — número total de diputados del Congreso."""
    return TOTAL_ESCANOS


def get_mayoria_absoluta() -> int:
    """Constante constitucional — umbral de mayoría absoluta."""
    return MAYORIA_ABSOLUTA
