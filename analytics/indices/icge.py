"""
ICGE — Índice de Cohesión Gobierno-Electores (Politeia)
========================================================
Mide cuán alineado está el gobierno con las preferencias y expectativas del electorado.

Componentes:
  C1. Variación de intención de voto al partido gobernante vs resultado electoral (35 pts)
  C2. Sentiment mediático diferencial del gobierno vs oposición (25 pts)
  C3. Posición macro percibida vs prometida (salarios, paro) (25 pts)
  C4. Concentración de alertas de tipo gubernamental (15 pts)

Rango: 0-100 (100 = máxima cohesión gobierno-electorado).
Semáforo: VERDE ≥60, AMARILLO 35-59, ROJO <35.
"""

from __future__ import annotations

from analytics.indices.base import IndiceResult, PoliteiaIndex


# Partidos actualmente en gobierno (XV Legislatura)
PARTIDOS_GOBIERNO = ["PSOE", "SUMAR"]


class ICGE(PoliteiaIndex):
    CODIGO = "ICGE"
    NOMBRE = "Indice de Cohesion Gobierno-Electores"
    METODOLOGIA = (
        "Mide la brecha entre gobierno y electorado. "
        "C1: desgaste electoral del gobierno (35%) — diferencia nowcasting vs resultado electoral. "
        "C2: sentimiento mediatico diferencial gobierno vs oposicion (25%). "
        "C3: alineacion macro prometida vs realidad (25%). "
        "C4: ausencia de alertas criticas gubernamentales (15%)."
    )

    def _c1_desgaste_electoral(self) -> float:
        """Score 0-100 donde 100 = sin desgaste."""
        # Resultado electoral de referencia (última general)
        base_rows = self._q("""
            SELECT SUM(re.porcentaje) AS pct_gobierno
            FROM resultados_electorales re
            JOIN partidos p ON p.id = re.partido_id
            JOIN elecciones e ON e.id = re.eleccion_id
            WHERE e.tipo = 'generales'
              AND re.provincia_id IS NULL
              AND p.siglas = ANY(:partidos)
              AND e.fecha = (SELECT MAX(fecha) FROM elecciones WHERE tipo = 'generales')
        """, {"partidos": PARTIDOS_GOBIERNO})

        # Estimación actual nowcasting
        nc_rows = self._q("""
            SELECT SUM(e.estimacion_pct) AS pct_ahora
            FROM estimaciones_voto_agregadas e
            JOIN partidos p ON p.id = e.partido_id
            WHERE p.siglas = ANY(:partidos)
              AND e.fecha_estimacion = (
                  SELECT MAX(fecha_estimacion) FROM estimaciones_voto_agregadas
              )
        """, {"partidos": PARTIDOS_GOBIERNO})

        if not base_rows or not nc_rows:
            return 50.0

        pct_base = float(base_rows[0]["pct_gobierno"] or 40)
        pct_nc = float(nc_rows[0]["pct_ahora"] or 35)
        desgaste = pct_base - pct_nc  # positivo = pierde votos
        # -5pp o más ganados → 100; -15pp perdidos → 0
        score = 100 - max(0, desgaste) * 6.67
        return round(max(0, min(100, score)), 2)

    def _c2_sentimiento_diferencial(self) -> float:
        """Score 0-100. 100 = gobierno con mejor sentimiento que oposición."""
        rows = self._q("""
            SELECT entidad, AVG(sentimiento_medio) AS sent
            FROM sentimiento_prensa_diario
            WHERE fecha >= CURRENT_DATE - 14
              AND tipo_entidad = 'partido'
            GROUP BY entidad
        """)
        if not rows:
            return 50.0
        sents = {r["entidad"]: float(r["sent"] or 0) for r in rows}
        sent_gob = sum(sents.get(p, 0) for p in PARTIDOS_GOBIERNO) / max(1, len(PARTIDOS_GOBIERNO))
        sent_opo = sum(v for k, v in sents.items() if k not in PARTIDOS_GOBIERNO) / max(1, sum(1 for k in sents if k not in PARTIDOS_GOBIERNO))
        # Diferencial: gob-opo en rango -1..1 → 0..100
        diff = sent_gob - sent_opo
        return round((diff + 1) / 2 * 100, 2)

    def _c3_alineacion_macro(self) -> float:
        """Score 0-100. 100 = macro cumple expectativas típicas de promesas."""
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
        # Umbrales "prometidos" típicos: paro <10%, PIB >2%, IPC <3%
        score_paro = max(0, min(100, (10 - paro) * 10 + 50))
        score_pib = max(0, min(100, (pib - 0) * 25 + 50))
        score_ipc = max(0, min(100, (3 - ipc) * 25 + 50))
        return round(score_paro * 0.5 + score_pib * 0.3 + score_ipc * 0.2, 2)

    def _c4_ausencia_alertas(self) -> float:
        """Score 0-100. 100 = sin alertas críticas sobre el gobierno."""
        rows = self._q("""
            SELECT COUNT(*) AS n
            FROM alertas_sistema
            WHERE severidad IN ('CRITICAL', 'WARNING')
              AND leida = false
              AND created_at >= CURRENT_DATE - 14
        """)
        if not rows:
            return 80.0
        n = int(rows[0]["n"] or 0)
        return round(max(0, 100 - n * 10), 2)

    def compute(self) -> IndiceResult:
        c1 = self._c1_desgaste_electoral()
        c2 = self._c2_sentimiento_diferencial()
        c3 = self._c3_alineacion_macro()
        c4 = self._c4_ausencia_alertas()

        valor = c1 * 0.35 + c2 * 0.25 + c3 * 0.25 + c4 * 0.15

        componentes = {
            "Mantenimiento electoral del gobierno": round(c1, 2),
            "Sentimiento mediatico diferencial": round(c2, 2),
            "Alineacion con promesas macroeconomicas": round(c3, 2),
            "Ausencia de alertas criticas": round(c4, 2),
        }

        if valor >= 60:
            semaforo = "VERDE"
            interp = "Alta cohesion gobierno-electorado. El partido gobernante mantiene su base electoral y narrativa macroeconomica."
        elif valor >= 35:
            semaforo = "AMARILLO"
            interp = "Cohesion moderada. Desgaste electoral visible pero gestionable. Watchlist: evolucion de encuestas y macro."
        else:
            semaforo = "ROJO"
            interp = "Brecha critica gobierno-electorado. Perdida de respaldo electoral significativa. Riesgo de inestabilidad."

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
