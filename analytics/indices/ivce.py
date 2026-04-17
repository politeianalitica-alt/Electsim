"""
IVCE — Índice de Vulnerabilidad del Contrato Electoral (Politeia)
=================================================================
Mide cuán expuesto está el sistema político a rupturas del contrato
entre partidos y sus electores. Detecta condiciones pre-crisis electoral.

Componentes:
  C1. Distancia entre partidos en temas prioritarios del electorado (30 pts)
  C2. Tensión territorial: divergencia autonómica del voto (25 pts)
  C3. Número de alertas sistémicas activas (25 pts)
  C4. Concentración de voto en pocas siglas (riesgo de voto útil) (20 pts)

Rango: 0-100 (100 = máxima vulnerabilidad del contrato).
Semáforo: VERDE ≤35, AMARILLO 36-65, ROJO >65.
"""

from __future__ import annotations

import math

from analytics.indices.base import IndiceResult, PoliteiaIndex


class IVCE(PoliteiaIndex):
    CODIGO = "IVCE"
    NOMBRE = "Indice de Vulnerabilidad del Contrato Electoral"
    METODOLOGIA = (
        "Detecta condiciones de pre-ruptura del contrato electoral. "
        "C1: dispersion ideologica entre partidos con representacion (30%). "
        "C2: divergencia territorial del voto entre CCAA (25%). "
        "C3: densidad de alertas sistemicas no resueltas (25%). "
        "C4: concentracion del voto (HHI electoral) (20%)."
    )

    def _c1_distancia_posicional(self) -> float:
        """Dispersión de posiciones entre partidos relevantes. Score 0-100."""
        rows = self._q("""
            SELECT p.eje_izda_dcha, p.eje_libertario_autoritario,
                   SUM(e.estimacion_pct) AS peso
            FROM estimaciones_voto_agregadas e
            JOIN partidos p ON p.id = e.partido_id
            WHERE e.fecha_estimacion >= CURRENT_DATE - 90
              AND e.estimacion_pct >= 3
              AND p.eje_izda_dcha IS NOT NULL
            GROUP BY p.eje_izda_dcha, p.eje_libertario_autoritario
        """)
        if not rows or len(rows) < 3:
            return 50.0
        pos = [(float(r["eje_izda_dcha"]), float(r["eje_libertario_autoritario"] or 5)) for r in rows]
        # Distancia euclidiana media entre todos los pares
        pares_dist = []
        for i in range(len(pos)):
            for j in range(i + 1, len(pos)):
                d = math.sqrt((pos[i][0] - pos[j][0]) ** 2 + (pos[i][1] - pos[j][1]) ** 2)
                pares_dist.append(d)
        dist_media = sum(pares_dist) / len(pares_dist) if pares_dist else 0
        # Max distancia posible = diagonal del cuadrado 9x9 ≈ 12.73
        score = min(100, dist_media / 12.73 * 100)
        return round(score, 2)

    def _c2_divergencia_territorial(self) -> float:
        """Varianza del partido ganador entre CCAA. Score 0-100."""
        rows = self._q("""
            SELECT ca.nombre AS ccaa, p.siglas, MAX(re.porcentaje) AS pct_ganador
            FROM resultados_electorales re
            JOIN partidos p ON p.id = re.partido_id
            JOIN comunidades_autonomas ca ON ca.id = re.ccaa_id
            JOIN elecciones e ON e.id = re.eleccion_id
            WHERE e.tipo = 'generales'
              AND re.ccaa_id IS NOT NULL
              AND e.fecha = (SELECT MAX(fecha) FROM elecciones WHERE tipo = 'generales')
            GROUP BY ca.nombre, p.siglas
            ORDER BY pct_ganador DESC
        """)
        if not rows:
            return 40.0
        # Número de partidos distintos que ganan en alguna CCAA
        ganadores_por_ccaa: dict[str, str] = {}
        for r in rows:
            ccaa = r["ccaa"]
            if ccaa not in ganadores_por_ccaa:
                ganadores_por_ccaa[ccaa] = r["siglas"]
        n_distintos = len(set(ganadores_por_ccaa.values()))
        # 1 partido gana en todo → 0; 10 partidos distintos → 100
        return round(min(100, (n_distintos - 1) * 12.5), 2)

    def _c3_densidad_alertas(self) -> float:
        """Score 0-100 basado en alertas sistémicas activas."""
        rows = self._q("""
            SELECT severidad, COUNT(*) AS n
            FROM alertas_sistema
            WHERE leida = false
              AND created_at >= CURRENT_DATE - 30
            GROUP BY severidad
        """)
        if not rows:
            return 20.0
        totales = {r["severidad"]: int(r["n"]) for r in rows}
        score = totales.get("CRITICAL", 0) * 20 + totales.get("WARNING", 0) * 8 + totales.get("INFO", 0) * 2
        return round(min(100, score), 2)

    def _c4_concentracion_hhi(self) -> float:
        """HHI electoral (inverso). Score 0-100 donde 100 = muy concentrado (bipartidismo extremo)."""
        rows = self._q("""
            SELECT re.porcentaje
            FROM resultados_electorales re
            JOIN elecciones e ON e.id = re.eleccion_id
            WHERE e.tipo = 'generales'
              AND re.provincia_id IS NULL
              AND re.porcentaje > 0.5
            ORDER BY e.fecha DESC
            LIMIT 15
        """)
        if not rows:
            return 50.0
        pcts = [float(r["porcentaje"]) for r in rows]
        total = sum(pcts)
        props = [p / total for p in pcts]
        hhi = sum(p ** 2 for p in props)
        # HHI 1.0 → bipartidismo perfecto → alta vulnerabilidad voto útil
        # HHI 0.1 → alta fragmentación → también vulnerable
        # Óptimo alrededor de 0.20-0.30 (3-4 partidos equilibrados)
        dist_optimo = abs(hhi - 0.25)
        score = min(100, dist_optimo * 250)
        return round(score, 2)

    def compute(self) -> IndiceResult:
        c1 = self._c1_distancia_posicional()
        c2 = self._c2_divergencia_territorial()
        c3 = self._c3_densidad_alertas()
        c4 = self._c4_concentracion_hhi()

        valor = c1 * 0.30 + c2 * 0.25 + c3 * 0.25 + c4 * 0.20

        componentes = {
            "Distancia ideologica entre partidos relevantes": round(c1, 2),
            "Divergencia territorial del voto": round(c2, 2),
            "Densidad de alertas sistemicas": round(c3, 2),
            "Concentracion electoral HHI": round(c4, 2),
        }

        if valor <= 35:
            semaforo = "VERDE"
            interp = "Contrato electoral robusto. Sistema estable con baja vulnerabilidad a rupturas del pacto representativo."
        elif valor <= 65:
            semaforo = "AMARILLO"
            interp = "Vulnerabilidad moderada. Existen factores de tension que podrian erosionar el contrato electoral a medio plazo."
        else:
            semaforo = "ROJO"
            interp = "Alta vulnerabilidad del contrato electoral. Condiciones para voto de castigo masivo, emergencia de terceras fuerzas o abstencion significativa."

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
