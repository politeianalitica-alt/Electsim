"""
IPPS — Índice de Polarización Política y Social (Politeia)
===========================================================
Mide el grado de polarización del sistema político español
considerando dimensiones ideológicas, electorales y mediáticas.

Componentes (suma = 100 puntos):
  C1. Distancia ideológica ponderada por votos (30 pts)
      ENP × distancia media entre pares de partidos ponderada por su peso electoral.
  C2. Fragmentación del sistema — NEP (20 pts)
      Número Efectivo de Partidos (Laakso-Taagepera). Normalizado respecto a 1993-2023.
  C3. Volatilidad electoral entre últimas dos elecciones (25 pts)
      Índice Pedersen: suma de cambios absolutos en % voto / 2.
  C4. Temperatura mediática (25 pts)
      Proporción de noticias con sentimiento negativo sobre política.

Rango final: 0-100 (100 = máxima polarización).
Semáforo: VERDE ≤35, AMARILLO 36-65, ROJO >65.
"""

from __future__ import annotations

import math

from analytics.indices.base import IndiceResult, PoliteiaIndex


class IPPS(PoliteiaIndex):
    CODIGO = "IPPS"
    NOMBRE = "Indice de Polarizacion Politica y Social"
    METODOLOGIA = (
        "Compuesto de 4 dimensiones: distancia ideologica ponderada (30%), "
        "fragmentacion NEP Laakso-Taagepera (20%), volatilidad Pedersen (25%), "
        "temperatura mediatica negativa (25%). "
        "Normalizado 0-100 con referencias historicas 1989-2023."
    )

    # Anclajes de normalización (España 1989-2023)
    NEP_MIN, NEP_MAX = 2.1, 6.2            # NEP mínimo (Bipartidismo 1989) y máximo (2015)
    PEDERSEN_MIN, PEDERSEN_MAX = 2.0, 28.0 # Volatilidad mínima y máxima histórica
    DIST_IDEOL_MIN, DIST_IDEOL_MAX = 1.5, 7.8

    def _c1_distancia_ideologica(self) -> float:
        """Distancia ideológica media ponderada entre partidos. Score 0-100."""
        rows = self._q("""
            SELECT p.eje_izda_dcha, SUM(re.porcentaje) AS peso
            FROM resultados_electorales re
            JOIN partidos p ON p.id = re.partido_id
            JOIN elecciones e ON e.id = re.eleccion_id
            WHERE e.tipo = 'generales'
              AND re.provincia_id IS NULL
              AND re.porcentaje > 2
              AND p.eje_izda_dcha IS NOT NULL
            GROUP BY p.eje_izda_dcha
            ORDER BY peso DESC
            LIMIT 20
        """)
        if not rows:
            return 50.0
        pares = [(float(r["eje_izda_dcha"]), float(r["peso"] or 0)) for r in rows]
        # Distancia media ponderada entre todos los pares
        total_peso = sum(p for _, p in pares)
        if total_peso == 0:
            return 50.0
        media_pond = sum(i * p for i, p in pares) / total_peso
        varianza = sum(p * (i - media_pond) ** 2 for i, p in pares) / total_peso
        dist_raw = math.sqrt(varianza)
        score = (dist_raw - self.DIST_IDEOL_MIN) / (self.DIST_IDEOL_MAX - self.DIST_IDEOL_MIN)
        return max(0.0, min(100.0, score * 100))

    def _c2_fragmentacion_nep(self) -> float:
        """NEP Laakso-Taagepera normalizado. Score 0-100."""
        rows = self._q("""
            SELECT re.porcentaje
            FROM resultados_electorales re
            JOIN elecciones e ON e.id = re.eleccion_id
            WHERE e.tipo = 'generales'
              AND re.provincia_id IS NULL
              AND re.porcentaje > 0.5
            ORDER BY e.fecha DESC
            LIMIT 20
        """)
        if not rows:
            return 50.0
        pcts = [float(r["porcentaje"]) for r in rows]
        total = sum(pcts)
        if total == 0:
            return 50.0
        proporciones = [p / total for p in pcts]
        nep = 1.0 / sum(p ** 2 for p in proporciones)
        score = (nep - self.NEP_MIN) / (self.NEP_MAX - self.NEP_MIN)
        return max(0.0, min(100.0, score * 100))

    def _c3_volatilidad_pedersen(self) -> float:
        """Volatilidad electoral entre últimas dos generales. Score 0-100."""
        rows = self._q("""
            SELECT e.fecha, re.porcentaje, p.siglas
            FROM resultados_electorales re
            JOIN elecciones e ON e.id = re.eleccion_id
            JOIN partidos p ON p.id = re.partido_id
            WHERE e.tipo = 'generales'
              AND re.provincia_id IS NULL
            ORDER BY e.fecha DESC
            LIMIT 60
        """)
        if not rows:
            return 50.0
        from collections import defaultdict
        by_fecha: dict = defaultdict(dict)
        for r in rows:
            by_fecha[str(r["fecha"])][r["siglas"]] = float(r["porcentaje"] or 0)
        fechas = sorted(by_fecha.keys(), reverse=True)
        if len(fechas) < 2:
            return 50.0
        ultima = by_fecha[fechas[0]]
        penultima = by_fecha[fechas[1]]
        todos_partidos = set(ultima.keys()) | set(penultima.keys())
        pedersen = sum(abs(ultima.get(p, 0) - penultima.get(p, 0)) for p in todos_partidos) / 2
        score = (pedersen - self.PEDERSEN_MIN) / (self.PEDERSEN_MAX - self.PEDERSEN_MIN)
        return max(0.0, min(100.0, score * 100))

    def _c4_temperatura_mediatica(self) -> float:
        """% noticias políticas negativas últimos 30 días. Score 0-100."""
        rows = self._q("""
            SELECT
                COUNT(*) FILTER (WHERE sentimiento_label = 'negativo') AS neg,
                COUNT(*) AS total
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - 30
              AND (categoria = 'politica' OR partidos_mencionados IS NOT NULL)
        """)
        if not rows or not rows[0]["total"]:
            return 50.0
        r = rows[0]
        pct_neg = float(r["neg"] or 0) / float(r["total"])
        return round(pct_neg * 100, 2)

    def compute(self) -> IndiceResult:
        c1 = self._c1_distancia_ideologica()
        c2 = self._c2_fragmentacion_nep()
        c3 = self._c3_volatilidad_pedersen()
        c4 = self._c4_temperatura_mediatica()

        valor = c1 * 0.30 + c2 * 0.20 + c3 * 0.25 + c4 * 0.25

        componentes = {
            "Distancia ideologica ponderada": round(c1, 2),
            "Fragmentacion NEP": round(c2, 2),
            "Volatilidad Pedersen": round(c3, 2),
            "Temperatura mediatica": round(c4, 2),
        }

        if valor <= 35:
            semaforo = "VERDE"
            interp = "Polarizacion baja. Sistema politico con alta cohesion, alternancia ordenada y debate constructivo."
        elif valor <= 65:
            semaforo = "AMARILLO"
            interp = "Polarizacion moderada. Fragmentacion significativa pero con margenes de acuerdo. Vigilar evolucion."
        else:
            semaforo = "ROJO"
            interp = "Polarizacion alta. Bloqueo institucional probable, discurso confrontacional dominante, riesgo para la gobernabilidad."

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
