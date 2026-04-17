"""
ISMA — Índice de Sentimiento Mediático y Agenda (Politeia)
===========================================================
Mide el tono y la estructura de la cobertura mediática sobre política española.

Componentes:
  C1. Sentimiento neto en prensa últimos 14 días (-100 a +100, norm 0-100)
  C2. Concentración de agenda: diversidad de temas (Índice Shannon) (0-100)
  C3. Presencia de narrativas de crisis vs. progreso (0-100)
  C4. Cobertura diferencial por partido (sesgo de agenda) (0-100)

Rango final: 0-100 (100 = agenda positiva, diversa y equilibrada).
Semáforo: VERDE ≥60, AMARILLO 35-59, ROJO <35.
"""

from __future__ import annotations

import math

from analytics.indices.base import IndiceResult, PoliteiaIndex


class ISMA(PoliteiaIndex):
    CODIGO = "ISMA"
    NOMBRE = "Indice de Sentimiento Mediatico y Agenda"
    METODOLOGIA = (
        "Basado en analisis de noticias_prensa (RSS 12 medios). "
        "C1: sentimiento neto ponderado por relevancia (35%). "
        "C2: entropia de Shannon sobre distribucion de temas (25%). "
        "C3: ratio noticias progreso vs crisis (20%). "
        "C4: equilibrio de cobertura entre partidos (20%)."
    )

    def _c1_sentimiento_neto(self) -> float:
        """Score 0-100 donde 100 = sentimiento muy positivo."""
        rows = self._q("""
            SELECT
                AVG(sentimiento_score) AS sent_medio,
                COUNT(*) AS n
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - 14
        """)
        if not rows or not rows[0]["n"] or rows[0]["n"] < 5:
            return 50.0
        sent = float(rows[0]["sent_medio"] or 0)
        # sent va de -1 a 1; mapeamos a 0-100
        return round((sent + 1) / 2 * 100, 2)

    def _c2_diversidad_agenda(self) -> float:
        """Índice de Shannon sobre temas. 100 = muy diverso."""
        rows = self._q("""
            SELECT tema, n_noticias
            FROM agenda_mediatica
            WHERE fecha = CURRENT_DATE
              AND n_noticias > 0
            ORDER BY n_noticias DESC
            LIMIT 30
        """)
        if not rows:
            return 50.0
        pesos = [float(r["n_noticias"]) for r in rows]
        total = sum(pesos)
        if total == 0:
            return 50.0
        props = [p / total for p in pesos]
        shannon = -sum(p * math.log(p + 1e-9) for p in props if p > 0)
        max_shannon = math.log(len(props))  # entropía máxima
        score = (shannon / max_shannon * 100) if max_shannon > 0 else 50.0
        return round(score, 2)

    def _c3_ratio_progreso_crisis(self) -> float:
        """Score 0-100 donde 100 = cobertura mayoritariamente positiva."""
        rows = self._q("""
            SELECT sentimiento_label, COUNT(*) AS n
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - 7
            GROUP BY sentimiento_label
        """)
        if not rows:
            return 50.0
        dist = {r["sentimiento_label"]: int(r["n"]) for r in rows}
        pos = dist.get("positivo", 0)
        neg = dist.get("negativo", 0)
        neu = dist.get("neutro", 0)
        total = pos + neg + neu
        if total == 0:
            return 50.0
        # Score considera que positivo es bueno, negativo malo, neutro neutral
        score = (pos * 100 + neu * 50) / total
        return round(score, 2)

    def _c4_equilibrio_cobertura(self) -> float:
        """Score 0-100 donde 100 = cobertura muy equilibrada entre partidos."""
        rows = self._q("""
            SELECT entidad, n_noticias
            FROM sentimiento_prensa_diario
            WHERE fecha >= CURRENT_DATE - 7
              AND tipo_entidad = 'partido'
              AND n_noticias > 0
            ORDER BY n_noticias DESC
            LIMIT 8
        """)
        if not rows or len(rows) < 2:
            return 50.0
        pesos = [float(r["n_noticias"]) for r in rows]
        total = sum(pesos)
        max_n = max(pesos)
        # Coeficiente de variación inverso: bajo CV → alta igualdad → 100
        media = total / len(pesos)
        var = sum((p - media) ** 2 for p in pesos) / len(pesos)
        cv = math.sqrt(var) / (media + 1e-9)
        score = max(0, 100 - cv * 50)
        return round(score, 2)

    def compute(self) -> IndiceResult:
        c1 = self._c1_sentimiento_neto()
        c2 = self._c2_diversidad_agenda()
        c3 = self._c3_ratio_progreso_crisis()
        c4 = self._c4_equilibrio_cobertura()

        valor = c1 * 0.35 + c2 * 0.25 + c3 * 0.20 + c4 * 0.20

        componentes = {
            "Sentimiento neto en prensa": round(c1, 2),
            "Diversidad de agenda (Shannon)": round(c2, 2),
            "Ratio progreso vs crisis": round(c3, 2),
            "Equilibrio de cobertura": round(c4, 2),
        }

        if valor >= 60:
            semaforo = "VERDE"
            interp = "Agenda mediatica positiva y equilibrada. Cobertura diversa con narrativa predominantemente constructiva."
        elif valor >= 35:
            semaforo = "AMARILLO"
            interp = "Agenda mediatica mixta. Presencia notable de marcos de crisis. Atencion al dominio de narrativas negativas."
        else:
            semaforo = "ROJO"
            interp = "Agenda mediatica dominada por crisis y confrontacion. Riesgo de amplificacion de polarizacion social."

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
