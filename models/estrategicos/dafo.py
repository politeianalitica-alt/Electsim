"""
DAFO cuantificado por partido a partir de datos en BD.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


@dataclass
class FactorDAFO:
    nombre: str
    descripcion: str
    puntuacion: float
    evidencia: str
    peso: float = 1.0


@dataclass
class DAFOPartido:
    partido_siglas: str
    fortalezas: list[FactorDAFO] = field(default_factory=list)
    debilidades: list[FactorDAFO] = field(default_factory=list)
    oportunidades: list[FactorDAFO] = field(default_factory=list)
    amenazas: list[FactorDAFO] = field(default_factory=list)

    @property
    def score_interno(self) -> float:
        nf, nd = len(self.fortalezas), len(self.debilidades)
        if nf + nd == 0:
            return 0.0
        f = sum(x.puntuacion * x.peso for x in self.fortalezas)
        d = sum(x.puntuacion * x.peso for x in self.debilidades)
        return (f - d) / (nf + nd)

    @property
    def score_externo(self) -> float:
        no, na = len(self.oportunidades), len(self.amenazas)
        if no + na == 0:
            return 0.0
        o = sum(x.puntuacion * x.peso for x in self.oportunidades)
        a = sum(x.puntuacion * x.peso for x in self.amenazas)
        return (o - a) / (no + na)

    @property
    def cuadrante_estrategico(self) -> str:
        i, e = self.score_interno, self.score_externo
        if i > 0 and e > 0:
            return "OFENSIVO"
        if i > 0 and e <= 0:
            return "DEFENSIVO"
        if i <= 0 and e > 0:
            return "REORIENTACIÓN"
        return "SUPERVIVENCIA"


def calcular_dafo_partido(partido_siglas: str, engine) -> DAFOPartido:
    dafo = DAFOPartido(partido_siglas=partido_siglas)
    with engine.connect() as conn:
        r = conn.execute(
            text(
                """
                WITH elecciones_recientes AS (
                    SELECT e.id, e.fecha FROM elecciones e
                    WHERE e.tipo = 'generales' ORDER BY e.fecha DESC LIMIT 3
                ),
                votos_partido AS (
                    SELECT re.eleccion_id,
                           SUM(re.votos)::float / NULLIF(
                               SUM(SUM(re.votos)) OVER (PARTITION BY re.eleccion_id), 0
                           ) * 100 AS pct
                    FROM resultados_electorales re
                    JOIN elecciones_recientes er ON re.eleccion_id = er.id
                    JOIN partidos p ON re.partido_id = p.id
                    WHERE p.siglas = :siglas
                    GROUP BY re.eleccion_id
                )
                SELECT STDDEV(pct) AS vol, AVG(pct) AS media FROM votos_partido
                """
            ),
            {"siglas": partido_siglas},
        ).fetchone()
        volatilidad = float(r[0] or 5.0)
        media_voto = float(r[1] or 0.0)
        dafo.fortalezas.append(
            FactorDAFO(
                nombre="Base electoral",
                descripcion=f"Media nacional ~{media_voto:.1f}% (últimas 3 generales)",
                puntuacion=min(10.0, media_voto / 8.0),
                evidencia=f"σ votos % = {volatilidad:.2f}",
                peso=1.0,
            )
        )
        dafo.debilidades.append(
            FactorDAFO(
                nombre="Volatilidad reciente",
                descripcion="Dispersión del % entre últimas elecciones",
                puntuacion=min(10.0, volatilidad * 2.0),
                evidencia=f"STDDEV pct = {volatilidad:.2f}",
                peso=0.8,
            )
        )

        r2 = conn.execute(
            text(
                """
                SELECT COUNT(DISTINCT ca.id) AS n
                FROM resultados_electorales re
                JOIN elecciones e ON re.eleccion_id = e.id
                JOIN provincias pv ON re.provincia_id = pv.id
                JOIN comunidades_autonomas ca ON pv.ccaa_id = ca.id
                JOIN partidos p ON re.partido_id = p.id
                WHERE p.siglas = :siglas AND e.tipo = 'generales'
                  AND e.fecha = (SELECT MAX(fecha) FROM elecciones WHERE tipo = 'generales')
                  AND re.porcentaje > 10
                """
            ),
            {"siglas": partido_siglas},
        ).scalar()
        n_ccaa = int(r2 or 0)
        dafo.fortalezas.append(
            FactorDAFO(
                nombre="Implantación territorial",
                descripcion=f"CCAA con >10% en última general: {n_ccaa}",
                puntuacion=min(10.0, n_ccaa / 17.0 * 10.0),
                evidencia="resultados_electorales × provincia",
                peso=1.0,
            )
        )
        dafo.debilidades.append(
            FactorDAFO(
                nombre="Concentración geográfica",
                descripcion="Riesgo de techo si la marca es regional",
                puntuacion=max(0.0, 10.0 - n_ccaa / 2.0),
                evidencia=f"Solo {n_ccaa} CCAA >10%",
                peso=0.5,
            )
        )

        r3 = conn.execute(
            text(
                """
                SELECT im.crecimiento_pib, im.ipc_general
                FROM indicadores_macroeconomicos im
                WHERE im.frecuencia = 'trimestral'
                ORDER BY im.fecha DESC LIMIT 1
                """
            )
        ).fetchone()
        crec = float(r3[0] or 1.5) if r3 else 1.5
        ipc = abs(float(r3[1] or 2.0)) if r3 else 2.0
        dafo.oportunidades.append(
            FactorDAFO(
                nombre="Ciclo económico",
                descripcion=f"Crecimiento PIB reciente {crec:.1f}%",
                puntuacion=min(10.0, 5.0 + crec),
                evidencia="indicadores_macroeconomicos",
                peso=1.0,
            )
        )
        dafo.oportunidades.append(
            FactorDAFO(
                nombre="Espacio narrativo",
                descripcion="Temas económicos dominan agenda cuando IPC moderado",
                puntuacion=min(10.0, 8.0 - ipc),
                evidencia=f"IPC ~{ipc:.1f}%",
                peso=0.7,
            )
        )
        dafo.amenazas.append(
            FactorDAFO(
                nombre="Inflación persistente",
                descripcion="Presión sobre rentas y consumo",
                puntuacion=min(10.0, ipc * 2.0),
                evidencia=f"IPC {ipc:.1f}%",
                peso=1.0,
            )
        )
        dafo.amenazas.append(
            FactorDAFO(
                nombre="Desaceleración",
                descripcion="Menor crecimiento limita promesas fiscales",
                puntuacion=min(10.0, max(0.0, 3.0 - crec) * 2.0),
                evidencia=f"crecimiento {crec:.1f}%",
                peso=0.8,
            )
        )

    return dafo


def guardar_dafo(dafo: DAFOPartido, engine, fecha: date | None = None) -> None:
    if fecha is None:
        fecha = date.today()
    to_json = lambda xs: json.dumps([x.__dict__ for x in xs], ensure_ascii=False)
    with engine.begin() as conn:
        pid = conn.execute(
            text("SELECT id FROM partidos WHERE siglas = :s"),
            {"s": dafo.partido_siglas},
        ).scalar()
        if pid is None:
            logger.warning("Partido %s no existe en BD", dafo.partido_siglas)
            return
        conn.execute(
            text("DELETE FROM dafo_partidos WHERE partido_id = :p AND fecha_calculo = :f"),
            {"p": int(pid), "f": fecha},
        )
        conn.execute(
            text(
                """
                INSERT INTO dafo_partidos (
                    partido_id, fecha_calculo, score_interno, score_externo, cuadrante,
                    fortalezas_json, debilidades_json, oportunidades_json, amenazas_json
                ) VALUES (
                    :pid, :fecha, :si, :se, :cu,
                    :fj, :dj, :oj, :aj
                )
                """
            ),
            {
                "pid": int(pid),
                "fecha": fecha,
                "si": dafo.score_interno,
                "se": dafo.score_externo,
                "cu": dafo.cuadrante_estrategico,
                "fj": to_json(dafo.fortalezas),
                "dj": to_json(dafo.debilidades),
                "oj": to_json(dafo.oportunidades),
                "aj": to_json(dafo.amenazas),
            },
        )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    for sig in ["PSOE", "PP", "VOX", "SUMAR"]:
        d = calcular_dafo_partido(sig, engine)
        guardar_dafo(d, engine)
        print(sig, d.cuadrante_estrategico, d.score_interno, d.score_externo)
