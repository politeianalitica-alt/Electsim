"""
Alertas sistémicas actuales (2025-2026) para el sistema Politeia.
Reemplaza alertas antiguas con eventos relevantes actuales e internacionales.

Ejecutar: python -m etl.sources.alertas_actuales
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sqlalchemy import text

from dashboard.db import get_engine

ALERTAS_2026 = [
    {
        "tipo": "geopolitica",
        "severidad": "CRITICAL",
        "titulo": "Aranceles EE.UU.: impacto directo en exportaciones españolas",
        "descripcion": (
            "La administración Trump ha impuesto aranceles del 10-25% a productos europeos. "
            "España exporta 22.000M€ anuales a EE.UU. (automóvil, aceite, vino, maquinaria). "
            "El Banco de España estima un impacto de -0,3pp en el PIB de 2025. "
            "Impacto electoral: el gobierno carga con el coste si hay desaceleración visible."
        ),
    },
    {
        "tipo": "vivienda",
        "severidad": "CRITICAL",
        "titulo": "Precio de la vivienda: récord histórico en Madrid y Barcelona",
        "descripcion": (
            "El precio medio de compraventa supera los 4.200€/m² en Madrid capital y 4.500€ en Barcelona. "
            "El esfuerzo de acceso para menores de 35 años alcanza el 52% de la renta bruta anual. "
            "La vivienda es el problema principal para el 91% de los menores de 35 según el CIS de marzo 2026. "
            "Impacto electoral: máxima presión sobre PSOE y SUMAR para legislar."
        ),
    },
    {
        "tipo": "energia",
        "severidad": "WARNING",
        "titulo": "Volatilidad energética: Brent por encima de 80$/barril",
        "descripcion": (
            "Las tensiones en el estrecho de Ormuz y las sanciones a Rusia mantienen el crudo elevado. "
            "España importa el 72% de su energía primaria. La factura eléctrica residencial ha subido "
            "un 18% interanual. Impacto electoral: alta sensibilidad del voto de clase media "
            "a la factura de luz y al precio de la gasolina."
        ),
    },
    {
        "tipo": "migracion",
        "severidad": "WARNING",
        "titulo": "Presión migratoria: Canarias registra máximos históricos de llegadas",
        "descripcion": (
            "En el primer trimestre de 2026 han llegado 28.400 personas a Canarias por vía irregular, "
            "un 34% más que en el mismo período de 2025. El debate sobre el reparto de menores no "
            "acompañados (MENAS) enfrenta al gobierno central con varias CCAA del PP. "
            "Impacto electoral: máximo movilizador para VOX y parte del electorado del PP."
        ),
    },
    {
        "tipo": "institucional",
        "severidad": "WARNING",
        "titulo": "CGPJ con mandato caducado: tensión entre poderes del Estado",
        "descripcion": (
            "El Consejo General del Poder Judicial lleva más de 5 años con el mandato vencido "
            "sin renovación por falta de acuerdo PP-PSOE. La Comisión Europea ha advertido a España "
            "en su informe anual sobre el Estado de Derecho. El TC es objeto de debate permanente "
            "por su composición. Impacto electoral: el PP usa el bloqueo como argumento de "
            "falta de separación de poderes."
        ),
    },
    {
        "tipo": "defensa",
        "severidad": "WARNING",
        "titulo": "España debe alcanzar el 2% del PIB en defensa según la OTAN",
        "descripcion": (
            "La OTAN exige a todos los miembros alcanzar el 2% del PIB en gasto de defensa. "
            "España está en el 1,3% y el gobierno ha anunciado un plan de inversión de 10.000M€. "
            "SUMAR y parte de la izquierda se oponen frontalmente. "
            "Impacto electoral: tensión interna en la coalición de gobierno."
        ),
    },
    {
        "tipo": "fiscal",
        "severidad": "WARNING",
        "titulo": "Riesgo de procedimiento de déficit excesivo de la UE",
        "descripcion": (
            "La Comisión Europea ha abierto un análisis sobre las finanzas públicas españolas "
            "tras cerrar 2025 con un déficit del 3,4% del PIB. El objetivo comprometido era el 3,0%. "
            "Si no se corrige, España podría recibir recomendaciones de ajuste fiscal vinculantes. "
            "Impacto electoral: PP usa el argumento de mala gestión presupuestaria."
        ),
    },
    {
        "tipo": "economica",
        "severidad": "INFO",
        "titulo": "Euribor en niveles altos: presión sobre 4 millones de hipotecas variables",
        "descripcion": (
            "El Euribor a 12 meses se sitúa en torno al 2,8% en abril de 2026, tras las bajadas "
            "del BCE desde el pico del 4,1% en 2024. Aún supone una cuota 320€ más cara mensual "
            "respecto a 2021 para una hipoteca media de 150.000€. "
            "Impacto electoral: alta sensibilidad del voto del perfil 'Centro Pragmático'."
        ),
    },
    {
        "tipo": "social",
        "severidad": "WARNING",
        "titulo": "Sanidad pública: lista de espera media supera los 90 días",
        "descripcion": (
            "La lista de espera media para consulta de especialista en el SNS es de 93 días, "
            "con comunidades como Madrid y Baleares superando los 130 días. "
            "Los sindicatos médicos mantienen movilizaciones en varias CCAA. "
            "La sanidad sube al tercer problema principal según el CIS de marzo 2026."
        ),
    },
    {
        "tipo": "politica",
        "severidad": "CRITICAL",
        "titulo": "Inestabilidad parlamentaria: el gobierno depende de apoyos externos frágiles",
        "descripcion": (
            "El gobierno de coalición PSOE-SUMAR necesita el apoyo de Junts, ERC, PNV y EH Bildu "
            "para aprobar legislación. Cada votación es una negociación compleja. "
            "El riesgo de crisis de gobierno es elevado si algún socio retira el apoyo a los "
            "Presupuestos Generales del Estado 2026, aún sin aprobar. "
            "Impacto electoral: percepción de debilidad e inestabilidad del ejecutivo."
        ),
    },
    {
        "tipo": "geopolitica",
        "severidad": "INFO",
        "titulo": "Guerra en Ucrania: impacto en seguridad alimentaria y precios agrícolas",
        "descripcion": (
            "El conflicto en Ucrania mantiene tensionados los mercados de cereales y fertilizantes. "
            "España importa el 40% de su trigo de Ucrania y Rusia (combinado). "
            "Los agricultores españoles han protagonizado protestas por la competencia desleal "
            "de productos ucranianos que entran al mercado europeo sin aranceles."
        ),
    },
    {
        "tipo": "economica",
        "severidad": "INFO",
        "titulo": "Turismo: récord de llegadas pero señales de saturación en destinos clave",
        "descripcion": (
            "España recibió 94 millones de turistas internacionales en 2025, nuevo máximo histórico. "
            "Sin embargo, protestas ciudadanas en Canarias, Baleares y Barcelona contra la "
            "masificación turística presionan a los gobiernos autonómicos a regular. "
            "El turismo representa el 12,8% del PIB: una regulación excesiva podría afectar el crecimiento."
        ),
    },
]


def seed_alertas() -> None:
    engine = get_engine()
    with engine.begin() as conn:
        # Limpiar alertas antiguas (más de 90 días)
        conn.execute(text(
            "DELETE FROM alertas_sistema WHERE created_at < CURRENT_DATE - INTERVAL '90 days'"
        ))
        # Borrar alertas de seeds antiguos que sean sobre 2024
        conn.execute(text(
            "DELETE FROM alertas_sistema WHERE titulo ILIKE '%2024%' OR descripcion ILIKE '%2024%'"
        ))

        inserted = 0
        for alerta in ALERTAS_2026:
            # Evitar duplicados por título
            exists = conn.execute(
                text("SELECT 1 FROM alertas_sistema WHERE titulo = :titulo"),
                {"titulo": alerta["titulo"]},
            ).fetchone()
            if exists:
                continue
            conn.execute(
                text("""
                    INSERT INTO alertas_sistema (tipo, severidad, titulo, descripcion, leida, created_at)
                    VALUES (:tipo, :severidad, :titulo, :descripcion, false, NOW())
                """),
                {
                    "tipo": alerta["tipo"],
                    "severidad": alerta["severidad"],
                    "titulo": alerta["titulo"],
                    "descripcion": alerta["descripcion"],
                },
            )
            inserted += 1

    print(f"✓ {inserted} alertas actualizadas (2025-2026) insertadas en la BD.")


if __name__ == "__main__":
    seed_alertas()
