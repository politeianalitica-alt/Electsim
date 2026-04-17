"""
ICED — Índice de Crispación del Debate Público (Politeia)
==========================================================
Mide la intensidad del discurso confrontacional en el espacio político-mediático.

Componentes:
  C1. Frecuencia de léxico confrontacional en prensa (35 pts)
  C2. Actividad de mociones, vetos e interpelaciones (30 pts)
  C3. Volatilidad del sentimiento mediático (varianza temporal) (20 pts)
  C4. Concentración de agenda en temas de alta tensión (15 pts)

Rango: 0-100 (100 = máxima crispación).
Semáforo: VERDE ≤35, AMARILLO 36-65, ROJO >65.
"""

from __future__ import annotations

import json
import math

from analytics.indices.base import IndiceResult, PoliteiaIndex

# Léxico de alta confrontación
LEXICO_CRISPACION = [
    "golpe", "traicion", "dictadura", "fraude", "ilegal", "inconstitucional",
    "escandalo", "corrupcion", "mentira", "manipulacion", "censura", "represion",
    "extremista", "radical", "facha", "comunista", "separatista",
    "dimision", "mocion", "acusacion", "denuncia", "inhabilitacion",
    "bloqueo", "veto", "boicot", "ruptura", "crisis grave",
]

TEMAS_ALTA_TENSION = ["corrupcion", "terrorismo", "cataluna", "inmigracion", "defensa"]


class ICED(PoliteiaIndex):
    CODIGO = "ICED"
    NOMBRE = "Indice de Crispacion del Debate Publico"
    METODOLOGIA = (
        "Mide el calor del debate publico. C1: frecuencia lexico confrontacional en titulares (35%). "
        "C2: volumen de mociones, interpelaciones y vetos parlamentarios (30%). "
        "C3: varianza del sentimiento mediatico diario (20%). "
        "C4: concentracion de agenda en temas de alta tension (15%)."
    )

    def _c1_lexico_confrontacional(self) -> float:
        """% de noticias con léxico de alta confrontación. Score 0-100."""
        rows = self._q("""
            SELECT titular, COUNT(*) AS n
            FROM noticias_prensa
            WHERE fecha_publicacion >= CURRENT_DATE - 14
            GROUP BY titular
        """)
        if not rows:
            return 50.0
        total = len(rows)
        conf = sum(
            1 for r in rows
            if any(kw in str(r["titular"]).lower() for kw in LEXICO_CRISPACION)
        )
        return round(conf / total * 100, 2) if total else 50.0

    def _c2_actividad_parlamentaria_confrontacional(self) -> float:
        """Score 0-100 basado en mociones e interpelaciones recientes."""
        rows = self._q("""
            SELECT tipo_acto, COUNT(*) AS n
            FROM actividad_congreso
            WHERE tipo_acto IN ('mocion', 'interpelacion', 'pregunta-oral')
              AND fecha >= CURRENT_DATE - 90
            GROUP BY tipo_acto
        """)
        if not rows:
            return 40.0
        totales = {r["tipo_acto"]: int(r["n"]) for r in rows}
        mociones = totales.get("mocion", 0)
        interpelaciones = totales.get("interpelacion", 0)
        preguntas = totales.get("pregunta-oral", 0)
        # Ponderación: mociones son más confrontacionales
        score_raw = mociones * 3 + interpelaciones * 2 + preguntas * 0.5
        # Normalizar: 0 → 0, 500 → 100
        return round(min(100, score_raw / 5), 2)

    def _c3_volatilidad_sentimiento(self) -> float:
        """Varianza del sentimiento medio diario. Alta varianza = alta crispación."""
        rows = self._q("""
            SELECT sentimiento_medio
            FROM sentimiento_prensa_diario
            WHERE fecha >= CURRENT_DATE - 30
              AND tipo_entidad = 'partido'
        """)
        if not rows or len(rows) < 5:
            return 30.0
        vals = [float(r["sentimiento_medio"] or 0) for r in rows]
        media = sum(vals) / len(vals)
        varianza = sum((v - media) ** 2 for v in vals) / len(vals)
        # Normalizar: varianza 0 → 0, 0.5 → 100
        return round(min(100, varianza * 200), 2)

    def _c4_agenda_tension(self) -> float:
        """% de noticias de hoy sobre temas de alta tensión. Score 0-100."""
        rows = self._q("""
            SELECT tema, n_noticias
            FROM agenda_mediatica
            WHERE fecha = CURRENT_DATE
        """)
        if not rows:
            return 40.0
        total = sum(int(r["n_noticias"]) for r in rows)
        tension = sum(
            int(r["n_noticias"]) for r in rows
            if r["tema"] in TEMAS_ALTA_TENSION
        )
        return round(tension / total * 100, 2) if total else 40.0

    def compute(self) -> IndiceResult:
        c1 = self._c1_lexico_confrontacional()
        c2 = self._c2_actividad_parlamentaria_confrontacional()
        c3 = self._c3_volatilidad_sentimiento()
        c4 = self._c4_agenda_tension()

        valor = c1 * 0.35 + c2 * 0.30 + c3 * 0.20 + c4 * 0.15

        componentes = {
            "Lexico confrontacional en prensa": round(c1, 2),
            "Actividad parlamentaria confrontacional": round(c2, 2),
            "Volatilidad del sentimiento mediatico": round(c3, 2),
            "Agenda centrada en temas de tension": round(c4, 2),
        }

        if valor <= 35:
            semaforo = "VERDE"
            interp = "Debate publico tranquilo. Discurso politico constructivo con baja confrontacion."
        elif valor <= 65:
            semaforo = "AMARILLO"
            interp = "Crispacion moderada. Presencia de discurso confrontacional pero dentro de margenes normales."
        else:
            semaforo = "ROJO"
            interp = "Alta crispacion del debate. Riesgo de deterioro del discurso democratico y bloqueo de acuerdos."

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
