"""
IBEP — Índice de Brecha Económica-Política (Politeia)
======================================================
Mide la correlación entre las condiciones macroeconómicas y el comportamiento
electoral/político. Detecta cuándo la política se desconecta de la economía.

Componentes:
  C1. Correlación paro-castigo electoral al gobierno (0-100)
  C2. Sensibilidad de la prima de riesgo a eventos políticos (0-100)
  C3. Índice de frustración económica del ciudadano medio (0-100)
  C4. Brecha redistribución prometida vs ejecutada (presupuesto) (0-100)

Rango: 0-100 (100 = desconexión total economía-política).
Semáforo: VERDE ≤30, AMARILLO 31-60, ROJO >60.
"""

from __future__ import annotations

import math

from analytics.indices.base import IndiceResult, PoliteiaIndex

PARTIDOS_GOBIERNO = ["PSOE", "SUMAR"]


class IBEP(PoliteiaIndex):
    CODIGO = "IBEP"
    NOMBRE = "Indice de Brecha Economica-Politica"
    METODOLOGIA = (
        "Detecta la desconexion entre condiciones economicas y comportamiento politico. "
        "C1: correlacion entre tasa paro trimestral y caida electoral del gobierno (30%). "
        "C2: volatilidad de la prima de riesgo en semanas de eventos politicos (25%). "
        "C3: indice de frustracion economica: paro alto + inflacion alta - crecimiento (25%). "
        "C4: ratio ejecucion presupuestaria en partidas sociales (20%)."
    )

    def _c1_correlacion_paro_castigo(self) -> float:
        """Score 0-100 donde 100 = alta correlación negativa (más paro → menos voto gobierno)."""
        # Obtener serie temporal de paro y nowcasting del gobierno
        macro_rows = self._q("""
            SELECT fecha, tasa_paro
            FROM indicadores_macroeconomicos
            WHERE tasa_paro IS NOT NULL
            ORDER BY fecha DESC
            LIMIT 24
        """)
        nc_rows = self._q("""
            SELECT e.fecha_estimacion, SUM(e.estimacion_pct) AS pct_gob
            FROM estimaciones_voto_agregadas e
            JOIN partidos p ON p.id = e.partido_id
            WHERE p.siglas = ANY(:partidos)
            GROUP BY e.fecha_estimacion
            ORDER BY e.fecha_estimacion DESC
            LIMIT 24
        """, {"partidos": PARTIDOS_GOBIERNO})

        if len(macro_rows) < 6 or len(nc_rows) < 6:
            return 50.0

        macro_map = {str(r["fecha"])[:7]: float(r["tasa_paro"]) for r in macro_rows}
        nc_map = {str(r["fecha_estimacion"])[:7]: float(r["pct_gob"]) for r in nc_rows}
        common = sorted(set(macro_map.keys()) & set(nc_map.keys()))

        if len(common) < 4:
            return 50.0

        x = [macro_map[d] for d in common]
        y = [nc_map[d] for d in common]
        n = len(x)
        mx, my = sum(x) / n, sum(y) / n
        cov = sum((x[i] - mx) * (y[i] - my) for i in range(n)) / n
        sx = math.sqrt(sum((v - mx) ** 2 for v in x) / n + 1e-9)
        sy = math.sqrt(sum((v - my) ** 2 for v in y) / n + 1e-9)
        corr = cov / (sx * sy)
        # Correlación negativa fuerte (-1) → brecha alta (100)
        score = (1 - corr) / 2 * 100
        return round(max(0, min(100, score)), 2)

    def _c2_volatilidad_prima_eventos(self) -> float:
        """Score 0-100 donde 100 = alta volatilidad de prima en eventos políticos."""
        rows = self._q("""
            SELECT prima_riesgo_bono10, fecha
            FROM indicadores_macroeconomicos
            WHERE prima_riesgo_bono10 IS NOT NULL
            ORDER BY fecha DESC
            LIMIT 36
        """)
        if not rows or len(rows) < 6:
            return 40.0
        vals = [float(r["prima_riesgo_bono10"]) for r in rows]
        media = sum(vals) / len(vals)
        varianza = sum((v - media) ** 2 for v in vals) / len(vals)
        vol = math.sqrt(varianza)
        # Normalizar: 0 → 0, 100bps de vol → 100
        return round(min(100, vol), 2)

    def _c3_frustracion_economica(self) -> float:
        """Score 0-100 donde 100 = ciudadano muy frustrado económicamente."""
        rows = self._q("""
            SELECT tasa_paro, ipc_general, crecimiento_pib, euribor_12m
            FROM indicadores_macroeconomicos
            WHERE tasa_paro IS NOT NULL
            ORDER BY fecha DESC
            LIMIT 1
        """)
        if not rows:
            return 50.0
        r = rows[0]
        paro = float(r["tasa_paro"] or 12)
        ipc = float(r["ipc_general"] or 2)
        pib = float(r["crecimiento_pib"] or 2)
        euribor = float(r["euribor_12m"] or 3)
        # Frustración = paro_score + inflación_score + hipoteca_score - crecimiento
        f_paro = max(0, (paro - 5) * 4)              # 5% → 0, 30% → 100
        f_ipc = max(0, (ipc - 2) * 12.5)             # 2% → 0, 10% → 100
        f_euribor = max(0, (euribor - 1) * 25)       # 1% → 0, 5% → 100
        f_pib = max(0, 50 - pib * 12.5)              # 4% → 0, -4% → 100
        frustracion = (f_paro * 0.35 + f_ipc * 0.30 + f_euribor * 0.20 + f_pib * 0.15)
        return round(min(100, frustracion), 2)

    def _c4_brecha_presupuestaria(self) -> float:
        """Score 0-100 donde 100 = alta brecha entre promesa y ejecución social."""
        rows = self._q("""
            SELECT
                AVG(CASE WHEN categoria = 'social' THEN porcentaje_ejecucion ELSE NULL END) AS ejec_social,
                AVG(CASE WHEN categoria = 'defensa' THEN porcentaje_ejecucion ELSE NULL END) AS ejec_def
            FROM presupuestos_generales_estado
            WHERE año = EXTRACT(YEAR FROM CURRENT_DATE)::int
        """)
        if not rows or rows[0]["ejec_social"] is None:
            return 50.0
        ejec = float(rows[0]["ejec_social"] or 80)
        # Baja ejecución social → alta brecha
        return round(max(0, min(100, (100 - ejec) * 2)), 2)

    def compute(self) -> IndiceResult:
        c1 = self._c1_correlacion_paro_castigo()
        c2 = self._c2_volatilidad_prima_eventos()
        c3 = self._c3_frustracion_economica()
        c4 = self._c4_brecha_presupuestaria()

        valor = c1 * 0.30 + c2 * 0.25 + c3 * 0.25 + c4 * 0.20

        componentes = {
            "Correlacion paro-castigo electoral": round(c1, 2),
            "Volatilidad prima en eventos politicos": round(c2, 2),
            "Indice de frustracion economica": round(c3, 2),
            "Brecha ejecucion presupuestaria social": round(c4, 2),
        }

        if valor <= 30:
            semaforo = "VERDE"
            interp = "Economia y politica alineadas. Los ciudadanos perciben que las condiciones economicas se reflejan en la accion de gobierno."
        elif valor <= 60:
            semaforo = "AMARILLO"
            interp = "Brecha moderada. Existe desconexion parcial entre percepcion economica y voto. Monitorizar indicadores de frustracion."
        else:
            semaforo = "ROJO"
            interp = "Alta desconexion economica-politica. Frustacion acumulada con potencial electoral disruptivo. Riesgo de voto castigo masivo."

        return IndiceResult(
            codigo=self.CODIGO,
            nombre=self.NOMBRE,
            valor=round(valor, 2),
            valor_raw=round(valor, 4),
            semaforo=semaforo,
            componentes=componentes,
            interpretacion=interp,
            metodologia=self.METODOLOGIA,
        )
