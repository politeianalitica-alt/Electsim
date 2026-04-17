"""
IESP — Índice de Estabilidad del Sistema Político (Politeia)
=============================================================
Mide la robustez y estabilidad del marco político-institucional español.

Componentes (suma = 100 puntos):
  C1. Salud fiscal y financiera (30 pts)
      Normalización inversa de: prima riesgo, déficit público, deuda/PIB.
  C2. Cohesión parlamentaria de gobierno (25 pts)
      Escaños del bloque gobernante / 350. Penaliza coaliciones amplias.
  C3. Temperatura de investidura (25 pts)
      Días desde última elección hasta investidura, intentos fallidos.
  C4. Señal macroeconómica (20 pts)
      Combinación de paro, crecimiento PIB, IPC. Normalizada.

Rango final: 0-100 (100 = máxima estabilidad).
Semáforo: VERDE ≥65, AMARILLO 35-64, ROJO <35.
"""

from __future__ import annotations

from analytics.indices.base import IndiceResult, PoliteiaIndex


class IESP(PoliteiaIndex):
    CODIGO = "IESP"
    NOMBRE = "Indice de Estabilidad del Sistema Politico"
    METODOLOGIA = (
        "Compuesto de 4 dimensiones: salud fiscal (30%), cohesion parlamentaria (25%), "
        "fluidez de investidura (25%), señal macroeconomica (20%). "
        "100 = maxima estabilidad. Penaliza prima de riesgo alta, paro alto, minoria simple."
    )

    def _c1_salud_fiscal(self) -> float:
        """Score 0-100. 100 = finanzas publicas saneadas."""
        rows = self._q("""
            SELECT prima_riesgo_bono10, deficit_publico_pib, deuda_publica_pib, euribor_12m
            FROM indicadores_macroeconomicos
            WHERE prima_riesgo_bono10 IS NOT NULL OR deficit_publico_pib IS NOT NULL
            ORDER BY fecha DESC
            LIMIT 1
        """)
        if not rows:
            return 50.0
        r = rows[0]
        prima = float(r["prima_riesgo_bono10"] or 100)
        deficit = abs(float(r["deficit_publico_pib"] or 3))
        deuda = float(r["deuda_publica_pib"] or 100)
        euribor = float(r["euribor_12m"] or 3)
        # Normalización inversa (valores malos dan score bajo)
        score_prima = max(0, 100 - (prima - 50) / 3)       # >350pb → 0, 50pb → 100
        score_deficit = max(0, 100 - deficit * 15)          # >6.7% → 0, 0% → 100
        score_deuda = max(0, 100 - (deuda - 60) * 1.25)    # >140% → 0, 60% → 100
        score_euribor = max(0, 100 - euribor * 20)          # >5% → 0, 0% → 100
        return round((score_prima * 0.35 + score_deficit * 0.30 + score_deuda * 0.25 + score_euribor * 0.10), 2)

    def _c2_cohesion_parlamentaria(self) -> float:
        """Score 0-100. 100 = mayoría absoluta sólida."""
        rows = self._q("""
            SELECT escanos_totales, n_partidos
            FROM analisis_coaliciones
            WHERE es_minima = true
            ORDER BY escanos_totales DESC
            LIMIT 1
        """)
        if not rows:
            # Intenta estimar desde estimaciones de voto
            rows2 = self._q("""
                SELECT COUNT(DISTINCT partido_id) AS n_partidos
                FROM estimaciones_voto_agregadas
                WHERE estimacion_pct >= 3
                  AND fecha_estimacion >= CURRENT_DATE - 90
            """)
            n_partidos = float(rows2[0]["n_partidos"] or 4) if rows2 else 4
            return max(20, 100 - n_partidos * 12)

        r = rows[0]
        escanos = float(r["escanos_totales"] or 175)
        n_partidos = int(r["n_partidos"] or 2)
        # Más escaños y menos socios → más estabilidad
        score_escanos = min(100, (escanos - 150) / 50 * 100)  # 200+ escaños → 100
        penalizacion_socios = max(0, (n_partidos - 1) * 10)
        return max(0, round(score_escanos - penalizacion_socios, 2))

    def _c3_fluidez_investidura(self) -> float:
        """Score 0-100. 100 = investidura rápida, sin intentos fallidos."""
        rows = self._q("""
            SELECT fecha_inicio
            FROM legislaturas
            ORDER BY fecha_inicio DESC
            LIMIT 1
        """)
        elec_rows = self._q("""
            SELECT fecha FROM elecciones
            WHERE tipo = 'generales'
            ORDER BY fecha DESC
            LIMIT 1
        """)
        if not rows or not elec_rows:
            return 60.0  # valor neutro por defecto
        import datetime
        leg_inicio = rows[0]["fecha_inicio"]
        elec_fecha = elec_rows[0]["fecha"]
        if leg_inicio and elec_fecha:
            dias = (leg_inicio - elec_fecha).days
            # <60 días → 100, >300 días → 0
            score = max(0, min(100, 100 - (dias - 60) / 2.4))
            return round(score, 2)
        return 60.0

    def _c4_señal_macro(self) -> float:
        """Score 0-100. 100 = macro excelente (paro bajo, crecimiento alto, inflación contenida)."""
        rows = self._q("""
            SELECT tasa_paro, crecimiento_pib, ipc_general
            FROM indicadores_macroeconomicos
            WHERE tasa_paro IS NOT NULL
            ORDER BY fecha DESC
            LIMIT 1
        """)
        if not rows:
            return 50.0
        r = rows[0]
        paro = float(r["tasa_paro"] or 12)
        pib = float(r["crecimiento_pib"] or 2)
        ipc = float(r["ipc_general"] or 2)
        # Paro: 5% → 100, 20% → 0
        score_paro = max(0, min(100, 100 - (paro - 5) * 6.67))
        # PIB: 3%+ → 100, -2% → 0
        score_pib = max(0, min(100, (pib + 2) / 5 * 100))
        # IPC: <2% → 100, >6% → 0
        score_ipc = max(0, min(100, 100 - max(0, ipc - 2) * 25))
        return round(score_paro * 0.45 + score_pib * 0.35 + score_ipc * 0.20, 2)

    def compute(self) -> IndiceResult:
        c1 = self._c1_salud_fiscal()
        c2 = self._c2_cohesion_parlamentaria()
        c3 = self._c3_fluidez_investidura()
        c4 = self._c4_señal_macro()

        valor = c1 * 0.30 + c2 * 0.25 + c3 * 0.25 + c4 * 0.20

        componentes = {
            "Salud fiscal y financiera": round(c1, 2),
            "Cohesion parlamentaria": round(c2, 2),
            "Fluidez de investidura": round(c3, 2),
            "Señal macroeconomica": round(c4, 2),
        }

        if valor >= 65:
            semaforo = "VERDE"
            interp = "Sistema politico estable. Gobierno con respaldo solido, macro saneada y baja presion de investidura."
        elif valor >= 35:
            semaforo = "AMARILLO"
            interp = "Estabilidad moderada. Gobierno minoritario o macro con tensiones. Vigilar renovacion de acuerdos."
        else:
            semaforo = "ROJO"
            interp = "Inestabilidad sistemica. Riesgo de elecciones anticipadas, tension financiera o bloqueo parlamentario."

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
