"""Vectores de transferencia de voto por tema de campaña.

Expresa el origen de cada punto porcentual ganado/perdido por un partido
como un vector probabilístico [origen → destino → probabilidad].

En lugar de: PP: +3pp (suma algebraica sin origen conocido)
Ahora dice:  PP gana 3pp; 45% vienen de abstencionistas, 35% de Ciudadanos,
              20% de PSOE desencantados.

Esto permite al consultor saber QUÉ fuente de votos activar, no solo cuánto.

Inspiración:
- Patrón de estimar_matriz_lp de dashboard/models/transferencia.py
  (misma idea de flujo origen→destino, sin optimización LP)
- Plotly Sankey (_sankey.py): nodos = partidos, enlaces = flujos con peso
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypeAlias

PartidoStr: TypeAlias = str
ProbFloat: TypeAlias = float

# Orígenes válidos: partidos + "abstencion" + "nuevos_votantes"
_ORÍGENES_VÁLIDOS = {"PP", "PSOE", "VOX", "SUMAR", "Junts", "ERC", "PNV",
                     "EH Bildu", "CS", "abstencion", "nuevos_votantes", "Otros"}


@dataclass
class Flujo:
    origen: PartidoStr
    destino: PartidoStr
    prob: ProbFloat       # fracción de los pp ganados que vienen de este origen
    pp_abs: float = 0.0   # pp absolutos (calculado en runtime)

    def __post_init__(self) -> None:
        if not 0.0 <= self.prob <= 1.0:
            raise ValueError(f"prob debe estar en [0,1], recibido: {self.prob}")


# ── Vectores de transferencia por tema ────────────────────────────────────────
# Clave de primer nivel: tema (igual que en TEMAS_IMPACTO)
# Clave de segundo nivel: partido_destino (que gana votos)
# Valor: list[Flujo] — los flujos que explican ese ganancia
#
# NOTA: Los flujos de pérdida son automáticamente el espejo de las ganancias.
# Solo se definen los flujos positivos (quién gana y de quién).

TRANSFER_VECTORS: dict[str, dict[PartidoStr, list[Flujo]]] = {
    "Bajada de impuestos a clase media": {
        "PP": [
            Flujo("CS", "PP", 0.35),
            Flujo("abstencion", "PP", 0.40),
            Flujo("PSOE", "PP", 0.25),
        ],
        "VOX": [
            Flujo("abstencion", "VOX", 0.60),
            Flujo("PP", "VOX", 0.40),
        ],
    },
    "Regulación del alquiler y vivienda pública": {
        "SUMAR": [
            Flujo("abstencion", "SUMAR", 0.55),
            Flujo("PSOE", "SUMAR", 0.30),
            Flujo("nuevos_votantes", "SUMAR", 0.15),
        ],
        "PSOE": [
            Flujo("abstencion", "PSOE", 0.65),
            Flujo("nuevos_votantes", "PSOE", 0.35),
        ],
    },
    "Política migratoria restrictiva": {
        "VOX": [
            Flujo("abstencion", "VOX", 0.45),
            Flujo("PP", "VOX", 0.35),
            Flujo("nuevos_votantes", "VOX", 0.20),
        ],
        "PP": [
            Flujo("CS", "PP", 0.50),
            Flujo("abstencion", "PP", 0.30),
            Flujo("PSOE", "PP", 0.20),
        ],
    },
    "Subida del salario mínimo": {
        "SUMAR": [
            Flujo("abstencion", "SUMAR", 0.50),
            Flujo("PSOE", "SUMAR", 0.35),
            Flujo("nuevos_votantes", "SUMAR", 0.15),
        ],
        "PSOE": [
            Flujo("abstencion", "PSOE", 0.60),
            Flujo("SUMAR", "PSOE", 0.25),
            Flujo("nuevos_votantes", "PSOE", 0.15),
        ],
    },
    "Refuerzo de la unidad territorial": {
        "PP": [
            Flujo("CS", "PP", 0.45),
            Flujo("abstencion", "PP", 0.35),
            Flujo("VOX", "PP", 0.20),
        ],
        "VOX": [
            Flujo("abstencion", "VOX", 0.55),
            Flujo("PP", "VOX", 0.30),
            Flujo("nuevos_votantes", "VOX", 0.15),
        ],
    },
    "Transición energética y agenda verde": {
        "SUMAR": [
            Flujo("abstencion", "SUMAR", 0.50),
            Flujo("nuevos_votantes", "SUMAR", 0.30),
            Flujo("PSOE", "SUMAR", 0.20),
        ],
        "PSOE": [
            Flujo("abstencion", "PSOE", 0.55),
            Flujo("nuevos_votantes", "PSOE", 0.30),
            Flujo("SUMAR", "PSOE", 0.15),
        ],
    },
    "Reducción del gasto público": {
        "PP": [
            Flujo("CS", "PP", 0.40),
            Flujo("abstencion", "PP", 0.35),
            Flujo("PSOE", "PP", 0.25),
        ],
        "VOX": [
            Flujo("abstencion", "VOX", 0.60),
            Flujo("PP", "VOX", 0.40),
        ],
    },
    "Más inversión en sanidad pública": {
        "PSOE": [
            Flujo("abstencion", "PSOE", 0.55),
            Flujo("SUMAR", "PSOE", 0.25),
            Flujo("nuevos_votantes", "PSOE", 0.20),
        ],
        "SUMAR": [
            Flujo("abstencion", "SUMAR", 0.60),
            Flujo("nuevos_votantes", "SUMAR", 0.40),
        ],
    },
}


def calcular_flujos(
    tema: str,
    impactos_partido: dict[PartidoStr, float],
) -> list[Flujo]:
    """Calcula los flujos de transferencia con pp absolutos.

    Args:
        tema: nombre del tema (clave de TEMAS_IMPACTO / TRANSFER_VECTORS)
        impactos_partido: {'PP': +3.2, 'PSOE': -1.8, ...}

    Returns:
        Lista de Flujo con pp_abs calculados. Solo flujos de ganadores (pp > 0).
    """
    vectores = TRANSFER_VECTORS.get(tema, {})
    resultado: list[Flujo] = []

    for partido_dest, pp_delta in impactos_partido.items():
        if pp_delta <= 0:
            continue
        flujos_partido = vectores.get(partido_dest, [
            Flujo("abstencion", partido_dest, 0.60),
            Flujo("Otros", partido_dest, 0.40),
        ])
        for f in flujos_partido:
            resultado.append(Flujo(
                origen=f.origen,
                destino=f.destino,
                prob=f.prob,
                pp_abs=round(f.prob * pp_delta, 2),
            ))

    return resultado


def flujos_para_sankey(flujos: list[Flujo]) -> dict:
    """Convierte flujos a formato Plotly Sankey.

    Returns:
        {'labels': [...], 'source': [...], 'target': [...], 'value': [...]}
    """
    nodos: list[str] = []
    links_src: list[int] = []
    links_tgt: list[int] = []
    links_val: list[float] = []

    def _idx(nombre: str) -> int:
        if nombre not in nodos:
            nodos.append(nombre)
        return nodos.index(nombre)

    for f in flujos:
        if f.pp_abs <= 0.05:
            continue
        links_src.append(_idx(f.origen))
        links_tgt.append(_idx(f.destino))
        links_val.append(f.pp_abs)

    return {
        "labels": nodos,
        "source": links_src,
        "target": links_tgt,
        "value": links_val,
    }
