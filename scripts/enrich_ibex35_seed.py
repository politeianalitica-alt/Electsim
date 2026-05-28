"""scripts/enrich_ibex35_seed.py

Pass de enriquecimiento del seed IBEX 35: añade apartados `redes`,
`posiciones`, `controversias`, `declaraciones` faltantes a los dossieres
con baja completeness, y rellena los apartados existentes que tienen
1 solo item.

Se aplica en dos pasadas:
  1. PATCHES_PERSONAS — Edits específicos de directivos individuales
     (15 personas con perfil público suficiente para enriquecer).
  2. AUTO-ENRICHMENT por categoría — patrones uniformes para:
       · filiales (matriz, país, sector)
       · familias controladoras (cabeza visible, cartera)
       · fondos extranjeros (cartera IBEX)
       · vehículos patrimoniales
       · fundaciones (patronos, área)
       · partidos / patronales (cuadros relevantes)
       · bancos defuntos (integradores)
       · casos judiciales (procesados/víctimas)

Idempotente · seguro re-ejecutar (los patches buscan y reemplazan o
appenden sin duplicar items con el mismo título).

Uso:
    .venv/bin/python scripts/enrich_ibex35_seed.py
    .venv/bin/python scripts/enrich_ibex35_seed.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DIR_IBEX35 = REPO_ROOT / "data" / "ibex35"

# Apartados conocidos y su orden canónico
APARTADO_ORDEN = {
    "identidad": 0,
    "trayectoria": 1,
    "posiciones": 2,
    "redes": 3,
    "declaraciones": 4,
    "controversias": 5,
    "evidencia": 6,
}


# ─── Helpers ──────────────────────────────────────────────────────────
def find_apartado(d: dict, tipo: str) -> dict | None:
    for a in d["apartados"]:
        if a["tipo"] == tipo:
            return a
    return None


def upsert_apartado(d: dict, tipo: str) -> dict:
    """Devuelve el apartado, creándolo si no existe."""
    ap = find_apartado(d, tipo)
    if ap:
        return ap
    ap = {
        "tipo": tipo,
        "titulo": None,
        "resumen": None,
        "orden": APARTADO_ORDEN.get(tipo, 9),
        "items": [],
    }
    d["apartados"].append(ap)
    d["apartados"].sort(key=lambda a: a.get("orden", 9))
    return ap


def append_items(ap: dict, items: list[dict]) -> int:
    """Añade items al apartado, evitando duplicados por título."""
    existing_titles = {it.get("titulo") for it in ap["items"]}
    added = 0
    for it in items:
        if it.get("titulo") and it["titulo"] in existing_titles:
            continue
        ap["items"].append(it)
        existing_titles.add(it.get("titulo"))
        added += 1
    return added


def bump(d: dict, *, completeness: float | None = None, confidence: float | None = None) -> None:
    if completeness is not None and d.get("completeness", 0) < completeness:
        d["completeness"] = completeness
    if confidence is not None and d.get("confidence", 0) < confidence:
        d["confidence"] = confidence


# ─── PATCHES DIRECTIVOS (personas) ────────────────────────────────────
# Cada patch: dict slug → {apartado_tipo: [items]}
# Se appenden (no reemplazan). El upsert evita duplicados por título.
PATCHES_PERSONAS: dict[str, dict[str, Any]] = {
    "hector-grisi": {
        "completeness": 0.72,
        "confidence": 0.85,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Credit Suisse México",
                "contenido": "CEO de Credit Suisse México y Country Head North America entre 2010 y 2015.",
                "fecha": "2010-06-01",
            },
            {
                "tipo": "evento",
                "titulo": "Country Head North America",
                "contenido": "Country Head North America de Santander 2019-2022, supervisando la venta de BBVA USA a PNC y la integración USA-México.",
                "fecha": "2019-01-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Banca digital",
                "contenido": "Apuesta por la plataforma OnePay/Openbank como herramienta pan-europea. PagoNxt como spin-off de pagos B2B.",
                "tags": ["digital"],
            },
            {
                "tipo": "dato",
                "titulo": "Mercados emergentes",
                "contenido": "Defensa del peso de Brasil (40% del beneficio) y México como núcleo del modelo.",
                "tags": ["emergentes"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Ana Botín",
                "contenido": "Reporta a la presidenta. Designación de Botín tras la salida de José Antonio Álvarez.",
                "tags": ["botin"],
            },
            {
                "tipo": "contacto",
                "titulo": "Élite empresarial mexicana",
                "contenido": "Vinculaciones del paso por Santander México (Carlos Slim, FUNO, Inbursa) y Credit Suisse México (Larrea).",
                "tags": ["mexico"],
            },
            {
                "tipo": "contacto",
                "titulo": "PNC Bank",
                "contenido": "Interlocución de la venta de BBVA USA a PNC en 2021.",
                "tags": ["pnc"],
            },
        ],
    },
    "onur-genc": {
        "completeness": 0.7,
        "confidence": 0.83,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "McKinsey",
                "contenido": "Consultor en McKinsey en Estambul y Nueva York antes de incorporarse a Garanti.",
                "fecha": "2002-01-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "OPA Sabadell",
                "contenido": "Junto con Torres Vila, defensor público de la operación como creadora de un campeón europeo.",
                "tags": ["sabadell"],
            },
            {
                "tipo": "dato",
                "titulo": "Turquía hiperinflación",
                "contenido": "Gestión del impacto de la NIIF 29 (hiperinflación) en la consolidación de Garanti BBVA.",
                "tags": ["garanti"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Doğuş Holding / Sahenk",
                "contenido": "Relación con la familia Sahenk, accionista histórico de Garanti.",
                "tags": ["dogus"],
            },
            {
                "tipo": "contacto",
                "titulo": "Garanti consejo",
                "contenido": "Sigue como miembro influyente en el consejo de Garanti BBVA.",
                "tags": ["garanti"],
            },
            {
                "tipo": "contacto",
                "titulo": "Carlos Torres Vila",
                "contenido": "Tándem ejecutivo BBVA.",
                "tags": ["torres-vila"],
            },
        ],
    },
    "luis-maroto": {
        "completeness": 0.72,
        "confidence": 0.85,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Llegada a Amadeus",
                "contenido": "Entra en Amadeus en 1999. CFO y luego director general antes del salto a CEO.",
                "fecha": "1999-06-01",
            },
            {
                "tipo": "evento",
                "titulo": "OPV 2010",
                "contenido": "Lidera la salida a bolsa de Amadeus en 2010, tras el periodo de capital riesgo (BC Partners, Cinven).",
                "fecha": "2010-04-29",
            },
            {
                "tipo": "evento",
                "titulo": "Pandemia Covid",
                "contenido": "Gestionó la caída del 60% de ingresos en 2020 y la rápida recuperación 2022-2023 con planes de eficiencia y reducción de plantilla.",
                "fecha": "2020-04-15",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Soberanía tecnológica europea",
                "contenido": "Posicionamiento de Amadeus como infraestructura crítica europea de viajes frente a Sabre (EE.UU.) y Travelport.",
                "tags": ["soberania"],
            },
            {
                "tipo": "dato",
                "titulo": "Inteligencia artificial",
                "contenido": "Apuesta corporativa por IA agéntica para reservas. Inversión en Cytric y Outpayce (pagos).",
                "tags": ["ia"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Iberia / IAG",
                "contenido": "Iberia accionista histórico fundador y cliente clave.",
                "tags": ["iag", "iberia"],
            },
            {
                "tipo": "contacto",
                "titulo": "Lufthansa, Air France-KLM",
                "contenido": "Antiguos accionistas fundadores y clientes principales.",
                "tags": ["aerolineas"],
            },
            {
                "tipo": "contacto",
                "titulo": "OTAs (Booking, Expedia)",
                "contenido": "Relación dual: clientes y competidores en distribución.",
                "tags": ["otas"],
            },
        ],
    },
    "jose-bogas": {
        "completeness": 0.72,
        "confidence": 0.85,
        "identidad": [
            {
                "tipo": "dato",
                "titulo": "Formación",
                "contenido": "Ingeniero industrial por la ETSII. Toda su carrera en el grupo Endesa-Enel.",
                "tags": ["formacion"],
            },
        ],
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Generación, distribución, comercialización",
                "contenido": "Carrera en distintas direcciones generales de Endesa (Generación, Distribución, Iberia).",
                "fecha": "1995-01-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Calendario nuclear",
                "contenido": "Reclamación pública de revisar el calendario de cierre nuclear (pacto 2019) por seguridad de suministro.",
                "tags": ["nuclear"],
            },
            {
                "tipo": "dato",
                "titulo": "Hidrógeno verde",
                "contenido": "Inversiones en H2 en As Pontes y Compostilla (transición justa).",
                "tags": ["transicion-justa"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Enel / Italia",
                "contenido": "Reporta al CEO de Enel (Flavio Cattaneo). Decisiones estratégicas integradas con Roma.",
                "tags": ["enel"],
            },
            {
                "tipo": "contacto",
                "titulo": "AELEC",
                "contenido": "Voz destacada de la patronal eléctrica junto a Sánchez Galán.",
                "tags": ["aelec"],
            },
            {
                "tipo": "contacto",
                "titulo": "Sindicatos cierres térmicos",
                "contenido": "Diálogo CCOO/UGT en cierres de Compostilla, Andorra (Teruel) y As Pontes.",
                "tags": ["sindicatos", "transicion-justa"],
            },
            {
                "tipo": "contacto",
                "titulo": "Gobierno - tutela MITECO",
                "contenido": "Interlocución con el MITECO sobre transición y precios.",
                "tags": ["miteco"],
            },
        ],
        "controversias": [
            {
                "tipo": "evento",
                "titulo": "Cierres térmicos",
                "contenido": "Cierre de centrales de carbón completado en 2021. Impacto territorial en Teruel, El Bierzo, A Coruña. Comités de transición justa.",
                "fecha": "2021-12-31",
                "tags": ["carbon"],
            },
        ],
    },
    "antonio-huertas": {
        "completeness": 0.72,
        "confidence": 0.85,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Cargos previos",
                "contenido": "Director de Mapfre Caja Madrid Holding y director general adjunto de Mapfre antes de asumir la presidencia en 2012.",
                "fecha": "2008-01-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Eficiencia y rentabilidad",
                "contenido": "Foco en combined ratio, retorno al accionista y desinversiones en mercados deficitarios.",
                "tags": ["estrategia"],
            },
            {
                "tipo": "dato",
                "titulo": "Sostenibilidad",
                "contenido": "Compromiso de no aseguramiento de carbón térmico desde 2030.",
                "tags": ["esg"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Fundación Mapfre",
                "contenido": "Patronazgo. Accionista de control con ~70%.",
                "tags": ["fundacion-mapfre"],
            },
            {
                "tipo": "contacto",
                "titulo": "CaixaBank - alianza bancaseguros",
                "contenido": "Acuerdo de distribución bancaseguros heredado de Bankia.",
                "tags": ["caixabank"],
            },
            {
                "tipo": "contacto",
                "titulo": "Unespa",
                "contenido": "Patronal aseguradora; Huertas presidente entre 2017 y 2022.",
                "tags": ["unespa"],
            },
        ],
    },
    "lakshmi-mittal": {
        "completeness": 0.7,
        "confidence": 0.87,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Construcción del imperio",
                "contenido": "Mittal Steel construido en Indonesia, Trinidad, Kazajistán y Sudáfrica entre 1976 y 2005.",
                "fecha": "1976-01-01",
            },
            {
                "tipo": "evento",
                "titulo": "Compra Mittal-Arcelor",
                "contenido": "OPA hostil sobre Arcelor en 2006 culmina con la creación de ArcelorMittal.",
                "fecha": "2006-06-25",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Descarbonización siderurgia",
                "contenido": "Inversiones en acero verde (H2-DRI) en Sestao y Gijón condicionadas a apoyo público.",
                "tags": ["perte", "h2"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Aditya Mittal",
                "contenido": "Hijo y CEO desde 2021.",
                "tags": ["familia-mittal"],
            },
            {
                "tipo": "contacto",
                "titulo": "Filántropo y donante UK",
                "contenido": "Donaciones documentadas a Partido Laborista UK (Blair, Brown). Polémicas Mittal-Romania (cartas Blair).",
                "tags": ["uk", "politica"],
            },
            {
                "tipo": "contacto",
                "titulo": "Gobierno español",
                "contenido": "Interlocución con MINCOTUR y Gobierno autonómico (Asturias, País Vasco) por inversiones en descarbonización.",
                "tags": ["mincotur", "asturias"],
            },
        ],
    },
    "luis-gallego": {
        "completeness": 0.72,
        "confidence": 0.85,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Clickair / Vueling",
                "contenido": "CEO de Clickair (2006-2009), luego CEO de Vueling tras la fusión 2009-2013.",
                "fecha": "2006-10-01",
            },
            {
                "tipo": "evento",
                "titulo": "Reestructuración Iberia",
                "contenido": "Como CEO de Iberia (2013-2020), lideró un ERE histórico y la modernización de flota.",
                "fecha": "2013-03-25",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Ampliación Barajas",
                "contenido": "Defensa pública de la ampliación T4 Barajas como hub europeo-LatAm.",
                "tags": ["barajas"],
            },
            {
                "tipo": "dato",
                "titulo": "SAF (combustibles sostenibles)",
                "contenido": "Apuesta por SAF e inversión en producción propia (Velocys, Cepsa).",
                "tags": ["saf"],
            },
            {
                "tipo": "dato",
                "titulo": "Air Europa",
                "contenido": "Intentó dos veces (2019 y 2023) comprar Air Europa, retirada por exigencias de Bruselas.",
                "tags": ["air-europa"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Javier Ferrán",
                "contenido": "Presidente no ejecutivo de IAG. Tándem.",
                "tags": ["ferran"],
            },
            {
                "tipo": "contacto",
                "titulo": "Aena / Lucena",
                "contenido": "Interlocución habitual con Aena por tarifas y operaciones.",
                "tags": ["aena"],
            },
            {
                "tipo": "contacto",
                "titulo": "Qatar Airways / Akbar Al Baker",
                "contenido": "Mayor accionista de IAG; interlocución estratégica con Doha.",
                "tags": ["qatar"],
            },
            {
                "tipo": "contacto",
                "titulo": "Globalia / Hidalgo",
                "contenido": "Interlocución con Juan José Hidalgo (Globalia/Air Europa) durante las negociaciones fallidas.",
                "tags": ["air-europa", "hidalgo"],
            },
        ],
    },
    "marc-puig": {
        "completeness": 0.72,
        "confidence": 0.85,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Inicios en P&G",
                "contenido": "Antes de incorporarse a la empresa familiar, carrera en Procter & Gamble en marketing.",
                "fecha": "1988-01-01",
            },
            {
                "tipo": "evento",
                "titulo": "Adquisiciones nicho lujo",
                "contenido": "Lidera la compra de Jean Paul Gaultier, Penhaligon's, L'Artisan Parfumeur, Charlotte Tilbury (2020) y Byredo (2022).",
                "fecha": "2020-06-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Lujo y marca",
                "contenido": "Tesis pública: priorizar marcas premium con storytelling fuerte por encima de productos commodity. Cita LVMH y Estée Lauder como referencias.",
                "tags": ["lujo"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Familia Puig",
                "contenido": "Hermano Manuel Puig (vicepresidente). Acciones tipo A con doble voto retienen control familiar tras OPV.",
                "tags": ["familia-puig"],
            },
            {
                "tipo": "contacto",
                "titulo": "FC Barcelona",
                "contenido": "Puig patrocinador FCB (camiseta entrenamiento). Vínculo con Joan Laporta.",
                "tags": ["fcbarcelona", "laporta"],
            },
            {
                "tipo": "contacto",
                "titulo": "Establishment catalán",
                "contenido": "Vinculado al Círculo de Economía, Foment del Treball y al ecosistema empresarial catalán.",
                "tags": ["cataluna"],
            },
        ],
    },
    "rafael-mateo": {
        "completeness": 0.65,
        "confidence": 0.78,
        "identidad": [
            {
                "tipo": "dato",
                "titulo": "Formación",
                "contenido": "Ingeniero industrial. Carrera en utilities y energías.",
                "tags": ["formacion"],
            },
        ],
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Endesa / Enel Green Power",
                "contenido": "Carrera previa en Endesa y en Enel Green Power LatAm.",
                "fecha": "1990-01-01",
            },
            {
                "tipo": "evento",
                "titulo": "Acciona Energía",
                "contenido": "Lidera la salida a bolsa en julio 2021 como CEO de la filial cotizada.",
                "fecha": "2021-07-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Modelo 100% renovable",
                "contenido": "Defensa del modelo de generación 100% renovable como ventaja competitiva frente a utilities mixtas.",
                "tags": ["esg"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "José Manuel Entrecanales",
                "contenido": "Reporta al presidente de Acciona matriz (83% de Acciona Energía).",
                "tags": ["entrecanales"],
            },
            {
                "tipo": "contacto",
                "titulo": "APPA Renovables",
                "contenido": "Miembro destacado de la patronal de renovables.",
                "tags": ["appa"],
            },
        ],
    },
    "pere-vinolas": {
        "completeness": 0.65,
        "confidence": 0.78,
        "identidad": [
            {
                "tipo": "dato",
                "titulo": "Formación",
                "contenido": "Economista catalán. Carrera previa en Renta Corporación y banca de inversión.",
                "tags": ["formacion"],
            },
        ],
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Renta Corporación",
                "contenido": "Director general de Renta Corporación antes de Colonial.",
                "fecha": "2002-01-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Oficinas prime",
                "contenido": "Apuesta exclusiva por oficinas Grade A en CBD. No diversifica a logística ni residencial.",
                "tags": ["estrategia"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Juan José Brugera",
                "contenido": "Tándem con el presidente.",
                "tags": ["brugera"],
            },
            {
                "tipo": "contacto",
                "titulo": "SFL París",
                "contenido": "Gestiona la filial cotizada francesa (~83%).",
                "tags": ["sfl"],
            },
            {
                "tipo": "contacto",
                "titulo": "QIA / Finaccess / Santo Domingo",
                "contenido": "Interlocución con los principales accionistas.",
                "tags": ["accionistas"],
            },
        ],
    },
    "aditya-mittal": {
        "completeness": 0.65,
        "confidence": 0.8,
        "identidad": [
            {
                "tipo": "dato",
                "titulo": "Formación",
                "contenido": "Estudios en Wharton (Pensilvania). Hijo de Lakshmi y Usha Mittal.",
                "tags": ["formacion", "familia"],
            },
        ],
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Carrera ArcelorMittal",
                "contenido": "Antes de CEO fue CFO (2008-2020) y Director Comercial.",
                "fecha": "2008-01-01",
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Lakshmi Mittal",
                "contenido": "Padre y presidente.",
                "tags": ["familia-mittal"],
            },
            {
                "tipo": "contacto",
                "titulo": "Aperam / Vanisha Mittal",
                "contenido": "Hermana Vanisha en consejo de Aperam (spin-off acero inox de Mittal).",
                "tags": ["familia-mittal"],
            },
            {
                "tipo": "contacto",
                "titulo": "Gobierno español",
                "contenido": "Interlocución con MINCOTUR por PERTE descarbonización (>300 M€ ayudas).",
                "tags": ["mincotur"],
            },
        ],
    },
    "antonio-llarden": {
        "completeness": 0.68,
        "confidence": 0.82,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Trayectoria previa",
                "contenido": "Director general en Catalana de Gas y luego Gas Natural antes de Enagás.",
                "fecha": "1990-01-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Marco regulatorio",
                "contenido": "Crítica con la rebaja de retribución regulada del transporte aplicada por la CNMC.",
                "tags": ["regulacion"],
            },
            {
                "tipo": "dato",
                "titulo": "Hub europeo gas",
                "contenido": "Promoción de España como hub europeo de regasificación tras invasión Ucrania.",
                "tags": ["geopolitica"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Arturo Gonzalo Aizpiri",
                "contenido": "Tándem con el CEO.",
                "tags": ["aizpiri"],
            },
            {
                "tipo": "contacto",
                "titulo": "Sedigás",
                "contenido": "Patronal del gas, vínculos históricos como presidente.",
                "tags": ["sedigas"],
            },
        ],
        "controversias": [
            {
                "tipo": "evento",
                "titulo": "Tallgrass impairments",
                "contenido": "Deterioros >1.000 M€ en la inversión USA Tallgrass entre 2019-2021. Cuestionada estrategia internacional.",
                "tags": ["tallgrass"],
            },
        ],
    },
    "juan-jose-brugera": {
        "completeness": 0.68,
        "confidence": 0.8,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Mutua Madrileña",
                "contenido": "Director general de Mutua Madrileña antes de Colonial.",
                "fecha": "1998-01-01",
            },
            {
                "tipo": "evento",
                "titulo": "Círculo de Economía",
                "contenido": "Presidente del Círculo de Economía (Cataluña) en años 2003-2009.",
                "fecha": "2003-06-01",
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Pere Viñolas",
                "contenido": "Tándem con el CEO.",
                "tags": ["vinolas"],
            },
            {
                "tipo": "contacto",
                "titulo": "QIA Qatar",
                "contenido": "Interlocutor con QIA (~19% Colonial).",
                "tags": ["qia"],
            },
            {
                "tipo": "contacto",
                "titulo": "Establishment empresarial catalán",
                "contenido": "Vínculos históricos con el Círculo de Economía y Foment.",
                "tags": ["cataluna"],
            },
        ],
    },
    "jose-sevilla": {
        "completeness": 0.68,
        "confidence": 0.8,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Banco de España / FROB",
                "contenido": "Carrera en el Banco de España y servicio de inspección antes de la banca privada.",
                "fecha": "1990-01-01",
            },
            {
                "tipo": "evento",
                "titulo": "Equipo Goirigolzarri en BBVA",
                "contenido": "Director general adjunto en BBVA bajo Goirigolzarri en los 2000s.",
                "fecha": "2005-01-01",
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Equipo Goirigolzarri",
                "contenido": "Mano derecha histórica de Goirigolzarri (Bankia 2014-2021, ahora referencia institucional).",
                "tags": ["goirigolzarri"],
            },
            {
                "tipo": "contacto",
                "titulo": "Fundación Unicaja",
                "contenido": "Interlocutor con la Fundación tras la crisis Medel 2023-2024.",
                "tags": ["medel"],
            },
            {
                "tipo": "contacto",
                "titulo": "Isidro Rubiales (CEO)",
                "contenido": "Tándem ejecutivo en Unicaja.",
                "tags": ["rubiales"],
            },
        ],
    },
    "maria-dolores-dancausa": {
        "completeness": 0.72,
        "confidence": 0.87,
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Modelo de banca rentable",
                "contenido": "Bankinter como caso de RoE>15% mantenido por modelo de banca privada y empresas.",
                "tags": ["estrategia"],
            },
            {
                "tipo": "dato",
                "titulo": "Impuesto banca",
                "contenido": "Posición contraria al gravamen extraordinario.",
                "tags": ["impuesto"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Pedro Guerrero",
                "contenido": "Tándem como presidente del consejo.",
                "tags": ["guerrero"],
            },
            {
                "tipo": "contacto",
                "titulo": "Gloria Ortiz Portero",
                "contenido": "Sucesora como CEO desde marzo 2024.",
                "tags": ["ortiz"],
            },
            {
                "tipo": "contacto",
                "titulo": "Cartival / Jaime Botín",
                "contenido": "Reportaba al accionista de control.",
                "tags": ["cartival"],
            },
            {
                "tipo": "contacto",
                "titulo": "Foro Diálogos para el Desarrollo",
                "contenido": "Voz pública habitual en foros empresariales.",
                "tags": ["foros"],
            },
        ],
    },
    "manuel-pizarro": {
        "completeness": 0.65,
        "confidence": 0.82,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Ibercaja",
                "contenido": "Presidente de Ibercaja entre 1988 y 2004.",
                "fecha": "1988-01-01",
            },
            {
                "tipo": "evento",
                "titulo": "Endesa OPAs",
                "contenido": "Como presidente de Endesa (2002-2007), pieza central en la batalla OPA Gas Natural-E.ON-Enel.",
                "fecha": "2002-06-21",
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Mariano Rajoy / PP",
                "contenido": "Fichado por Rajoy como cabeza de lista PP Madrid en 2008.",
                "tags": ["rajoy", "pp"],
            },
            {
                "tipo": "contacto",
                "titulo": "Ana Botín",
                "contenido": "Consejero externo del Santander desde 2017.",
                "tags": ["botin"],
            },
            {
                "tipo": "contacto",
                "titulo": "Establishment financiero",
                "contenido": "Vinculado a la red de banqueros y FAES.",
                "tags": ["faes"],
            },
        ],
    },
}


# ─── PATCHES CONEXOS ESPECÍFICOS (organizaciones, partidos, casos) ────
PATCHES_CONEXOS: dict[str, dict[str, Any]] = {
    "aeb": {
        "completeness": 0.72,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Miembros",
                "contenido": "Santander, BBVA, Sabadell, Bankinter, Deutsche Bank España, Bank of America España, Citi, JP Morgan.",
                "tags": ["miembros"],
            },
            {
                "tipo": "contacto",
                "titulo": "CECA",
                "contenido": "Patronal hermana de las cajas. Coordinación creciente desde 2008-2012.",
                "tags": ["ceca"],
            },
            {
                "tipo": "contacto",
                "titulo": "European Banking Federation (EBF)",
                "contenido": "Patronal europea. AEB miembro fundador.",
                "tags": ["ebf", "europa"],
            },
            {
                "tipo": "contacto",
                "titulo": "Alejandra Kindelán",
                "contenido": "Presidenta desde 2022.",
                "tags": ["kindelan"],
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Impuesto extraordinario",
                "contenido": "Coordinación del recurso judicial sectorial contra el gravamen.",
                "tags": ["impuesto"],
            },
            {
                "tipo": "dato",
                "titulo": "OPA BBVA-Sabadell",
                "contenido": "Posición neutral institucional, ambos miembros.",
                "tags": ["opa"],
            },
        ],
    },
    "aelec": {
        "completeness": 0.65,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Refundación UNESA → AELEC",
                "contenido": "UNESA se reestructuró como AELEC en 2018 con foco en transición energética.",
                "fecha": "2018-01-01",
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Marina Serrano (presidenta)",
                "contenido": "Presidenta de AELEC desde 2018.",
                "tags": ["serrano"],
            },
            {
                "tipo": "contacto",
                "titulo": "Sánchez Galán / Bogas",
                "contenido": "Voces más fuertes del sector representado.",
                "tags": ["iberdrola", "endesa"],
            },
        ],
    },
    "casa-real": {
        "completeness": 0.7,
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Neutralidad institucional",
                "contenido": "Doctrina pública de neutralidad política. Articulación con presidentes del Gobierno (PP y PSOE).",
                "tags": ["neutralidad"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Felipe VI",
                "contenido": "Jefe de Estado desde junio 2014.",
                "tags": ["felipe-vi"],
            },
            {
                "tipo": "contacto",
                "titulo": "Letizia Ortiz",
                "contenido": "Reina consorte. Activa en programas Casa Real.",
                "tags": ["letizia"],
            },
            {
                "tipo": "contacto",
                "titulo": "Juan Carlos I emérito",
                "contenido": "Reside en Abu Dabi desde agosto 2020.",
                "tags": ["emerito"],
            },
            {
                "tipo": "contacto",
                "titulo": "Camilo Villarino",
                "contenido": "Jefe de la Casa desde 2023 (releva a Jaime Alfonsín).",
                "tags": ["villarino"],
            },
            {
                "tipo": "contacto",
                "titulo": "Establishment empresarial",
                "contenido": "Vínculos institucionales con presidentes de IBEX 35 (Botín, Sánchez Galán, Goirigolzarri, Florentino).",
                "tags": ["ibex35"],
            },
        ],
    },
    "cnmv": {
        "completeness": 0.72,
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "OPA BBVA-Sabadell",
                "contenido": "Autorizó el folleto de la OPA en diciembre 2024.",
                "tags": ["opa"],
            },
            {
                "tipo": "dato",
                "titulo": "Caso Grifols",
                "contenido": "Expediente abierto 2024 sobre relación Grifols-Scranton tras Gotham.",
                "tags": ["grifols"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Carlos San Basilio",
                "contenido": "Presidente desde 2024.",
                "tags": ["san-basilio"],
            },
            {
                "tipo": "contacto",
                "titulo": "ESMA",
                "contenido": "Reguladora europea. CNMV miembro de la junta.",
                "tags": ["esma"],
            },
            {
                "tipo": "contacto",
                "titulo": "Banco de España",
                "contenido": "Coordinación regulatoria.",
                "tags": ["bde"],
            },
        ],
    },
    "psoe": {
        "completeness": 0.7,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Liderazgos recientes",
                "contenido": "Felipe González (1974-97), Joaquín Almunia (97-00), Zapatero (00-12), Rubalcaba (12-14), Sánchez (14-presente, con interrupción 2016-17).",
                "tags": ["historia"],
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Agenda 2026",
                "contenido": "Subida SMI, vivienda, fiscalidad progresiva, alianzas Sumar/ERC/PNV/Bildu/Junts.",
                "tags": ["agenda"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Cuadros en consejos IBEX",
                "contenido": "Beatriz Corredor (Redeia), Maurici Lucena (Aena, PSC), Marc Murtra (Telefónica, PSC), Aizpiri (Enagás, ex Narbona).",
                "tags": ["puertas-giratorias"],
            },
            {
                "tipo": "contacto",
                "titulo": "Familia PSOE socios",
                "contenido": "Sumar, ERC, EH Bildu, PNV, BNG, Junts.",
                "tags": ["socios"],
            },
        ],
    },
    "psc": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Cuadros en empresas",
                "contenido": "Marc Murtra (Telefónica), Maurici Lucena (Aena), José Montilla (consejos varios).",
                "tags": ["ibex35"],
            },
            {
                "tipo": "contacto",
                "titulo": "PSOE federal",
                "contenido": "Federación catalana hermana. Pacto de soberanía dual.",
                "tags": ["psoe"],
            },
        ],
    },
    "pp": {
        "completeness": 0.7,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Liderazgos",
                "contenido": "Fraga (1989-90), Aznar (90-04), Rajoy (04-18), Casado (18-22), Feijóo (22-presente).",
                "tags": ["historia"],
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Política económica",
                "contenido": "Defensa de bajadas fiscales, liberalización de mercado de trabajo, oposición al impuesto bancario.",
                "tags": ["economia"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Cuadros pasados en empresa",
                "contenido": "Manuel Pizarro (Santander), Rodrigo Rato (ex Bankia, condenado), José María Aznar (FAES).",
                "tags": ["puertas-giratorias"],
            },
            {
                "tipo": "contacto",
                "titulo": "Comunidad Madrid - Ayuso",
                "contenido": "Bastión del PP. Diálogo con establishment empresarial (Florentino, Del Pino, Botín).",
                "tags": ["ayuso"],
            },
        ],
    },
    "pnv": {
        "completeness": 0.72,
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Estatus vasco",
                "contenido": "Defensa del Concierto Económico y del autogobierno vasco. Pactos puntuales con PSOE y PP a cambio de cuota fiscal.",
                "tags": ["concierto"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Empresariado vasco",
                "contenido": "Vínculos con Confebask, BBK, Kutxabank, Iberdrola (Sánchez Galán).",
                "tags": ["empresariado"],
            },
            {
                "tipo": "contacto",
                "titulo": "Josu Jon Imaz",
                "contenido": "Ex presidente del EBB, hoy CEO de Repsol.",
                "tags": ["imaz", "repsol"],
            },
        ],
    },
    "cartival": {
        "completeness": 0.7,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Vehículo Jaime Botín",
                "contenido": "Sociedad patrimonial articulada por Jaime Botín tras la separación operativa de la rama O'Shea (Santander).",
                "fecha": "1992-01-01",
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Pedro Guerrero (presidente Bankinter)",
                "contenido": "Interlocutor permanente como presidente del consejo de Bankinter.",
                "tags": ["bankinter", "guerrero"],
            },
            {
                "tipo": "contacto",
                "titulo": "Familia Botín-Rivero",
                "contenido": "Beneficiarios últimos.",
                "tags": ["botin-rivero"],
            },
        ],
        "controversias": [
            {
                "tipo": "evento",
                "titulo": "Caso Picasso (Jaime Botín)",
                "contenido": "Condena penal del beneficiario último por contrabando del cuadro Cabeza de mujer joven.",
                "fecha": "2020-01-16",
                "tags": ["picasso"],
            },
        ],
    },
    "enel": {
        "completeness": 0.7,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "OPA Endesa",
                "contenido": "Tomó el control de Endesa en 2007 con Acciona (luego solo en 2009).",
                "fecha": "2009-02-20",
            },
            {
                "tipo": "evento",
                "titulo": "Era Cattaneo",
                "contenido": "Flavio Cattaneo CEO desde mayo 2023 sustituyendo a Francesco Starace.",
                "fecha": "2023-05-16",
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Tesoro italiano",
                "contenido": "~24% del capital, accionista de referencia.",
                "tags": ["tesoro-italia"],
            },
            {
                "tipo": "contacto",
                "titulo": "Endesa (70,1%)",
                "contenido": "Filial española cotizada.",
                "tags": ["endesa"],
            },
            {
                "tipo": "contacto",
                "titulo": "Enel Green Power",
                "contenido": "Filial de renovables global.",
                "tags": ["egp"],
            },
            {
                "tipo": "contacto",
                "titulo": "Flavio Cattaneo (CEO)",
                "contenido": "CEO con perfil más cercano al Gobierno Meloni.",
                "tags": ["cattaneo", "meloni"],
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Pivot a Italia bajo Meloni",
                "contenido": "Reordenación de inversiones priorizando Italia y Iberia, desinversiones en LatAm marginal.",
                "tags": ["estrategia"],
            },
        ],
    },
    "scranton-enterprises": {
        "completeness": 0.7,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Familia Grifols",
                "contenido": "Beneficiarios últimos: ramas de la familia con participación.",
                "tags": ["familia-grifols"],
            },
            {
                "tipo": "contacto",
                "titulo": "Grifols S.A.",
                "contenido": "Vínculo operativo permanente: compró activos a Grifols en 2018 (Biotest US, Haema).",
                "tags": ["grifols"],
            },
            {
                "tipo": "contacto",
                "titulo": "Gotham City Research",
                "contenido": "Identificó la relación en informe enero 2024 como problema contable.",
                "tags": ["gotham"],
            },
            {
                "tipo": "contacto",
                "titulo": "CNMV",
                "contenido": "Expediente abierto desde 2024.",
                "tags": ["cnmv"],
            },
        ],
    },
    "caso-tarjetas-black": {
        "completeness": 0.72,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Rodrigo Rato",
                "contenido": "Condenado a 4,5 años (TS 2018).",
                "tags": ["rato"],
            },
            {
                "tipo": "contacto",
                "titulo": "Miguel Blesa",
                "contenido": "Condenado a 6 años. Suicidio en 2017 antes de ingreso en prisión.",
                "tags": ["blesa"],
            },
            {
                "tipo": "contacto",
                "titulo": "65 condenados",
                "contenido": "Ex consejeros y directivos de Caja Madrid y Bankia (sindicatos, PSOE, PP, IU).",
                "tags": ["condenados"],
            },
            {
                "tipo": "contacto",
                "titulo": "Bankia/CaixaBank",
                "contenido": "Heredero institucional. Bankia indemnizada por sus responsables.",
                "tags": ["bankia", "caixabank"],
            },
        ],
    },
    "caso-picasso": {
        "completeness": 0.7,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Jaime Botín",
                "contenido": "Condenado AN 2020 (18 meses + 91 M€ multa + comiso cuadro).",
                "tags": ["jaime-botin"],
            },
            {
                "tipo": "contacto",
                "titulo": "Cabeza de mujer joven (Picasso)",
                "contenido": "Cuadro decomisado por el Estado español tasado en 25 M€.",
                "tags": ["picasso"],
            },
            {
                "tipo": "contacto",
                "titulo": "Aduanas francesas",
                "contenido": "Interceptaron el yate en Córcega (julio 2015) detectando el cuadro.",
                "tags": ["aduanas", "francia"],
            },
        ],
    },
    "fundacion-mapfre": {
        "completeness": 0.7,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Patronato",
                "contenido": "Patronato presidido por Antonio Huertas, presidente de Mapfre.",
                "tags": ["huertas"],
            },
            {
                "tipo": "contacto",
                "titulo": "Programas culturales",
                "contenido": "Sala Recoletos (Madrid), Casa Garriga Nogués (Barcelona). Exposiciones y premios.",
                "tags": ["cultura"],
            },
            {
                "tipo": "contacto",
                "titulo": "Programas sociales LatAm",
                "contenido": "Programas en países Mapfre (Brasil, México, Perú, Colombia).",
                "tags": ["latam"],
            },
        ],
    },
    "fundacion-unicaja": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Patronato post-Medel",
                "contenido": "Tras la crisis 2023-2024, renovación del patronato con perfiles independientes.",
                "tags": ["medel"],
            },
            {
                "tipo": "contacto",
                "titulo": "Bipartidismo andaluz",
                "contenido": "Histórica relación con PSOE-A y PP-A. Caja con perfil político.",
                "tags": ["andalucia"],
            },
        ],
    },
    "fundacion-rafael-del-pino": {
        "completeness": 0.7,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Rafael del Pino",
                "contenido": "Presidente del patronato. Eje de la fundación.",
                "tags": ["del-pino"],
            },
            {
                "tipo": "contacto",
                "titulo": "Madrid Forum",
                "contenido": "Foro anual con economistas y políticos liberales (LLM, exministros, académicos).",
                "tags": ["madrid-forum"],
            },
            {
                "tipo": "contacto",
                "titulo": "FAES / Mont Pelerin Society",
                "contenido": "Vínculos con think tanks liberales nacionales e internacionales.",
                "tags": ["faes", "mps"],
            },
        ],
    },
    "fundacion-botin": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Ana Botín",
                "contenido": "Presidenta del patronato. Continuidad familiar.",
                "tags": ["botin"],
            },
            {
                "tipo": "contacto",
                "titulo": "Programa Talento Solidario y Ciencia",
                "contenido": "Becas en programas científicos (CSIC), arte y emprendimiento social.",
                "tags": ["programas"],
            },
            {
                "tipo": "contacto",
                "titulo": "Renzo Piano - Centro Botín",
                "contenido": "Centro Botín en Santander (2017) diseñado por Renzo Piano.",
                "tags": ["centro-botin"],
            },
        ],
    },
    "real-madrid": {
        "completeness": 0.65,
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Superliga",
                "contenido": "Impulsor del proyecto Superliga europea desde abril 2021.",
                "tags": ["superliga"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Florentino Pérez",
                "contenido": "Presidente desde 2009 (segunda etapa).",
                "tags": ["florentino"],
            },
            {
                "tipo": "contacto",
                "titulo": "Joan Laporta / FC Barcelona",
                "contenido": "Aliado en la Superliga. Eje Madrid-Barcelona inusual.",
                "tags": ["laporta", "fcbarcelona"],
            },
            {
                "tipo": "contacto",
                "titulo": "UEFA - conflicto",
                "contenido": "Pulso público con la UEFA (Aleksander Čeferin) por la Superliga.",
                "tags": ["uefa"],
            },
        ],
    },
    "familia-botin": {
        "completeness": 0.7,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Rama Botín-O'Shea (Santander)",
                "contenido": "Ana Patricia (presidenta Santander), Javier (consejero familiar), Carmen, Paloma. Madre Carmen O'Shea Soriano.",
                "tags": ["santander"],
            },
            {
                "tipo": "contacto",
                "titulo": "Rama Botín-Rivero (Bankinter)",
                "contenido": "Jaime Botín (Bankinter vía Cartival, condenado Picasso). Sobrinos vinculados a Bankinter.",
                "tags": ["bankinter", "cartival"],
            },
            {
                "tipo": "contacto",
                "titulo": "Fundación Botín / Centro Botín",
                "contenido": "Plataforma filantrópica y cultural.",
                "tags": ["fundacion-botin"],
            },
        ],
    },
    "familia-del-pino": {
        "completeness": 0.7,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Ferrovial (~33%)",
                "contenido": "Accionista de control vía sociedades patrimoniales.",
                "tags": ["ferrovial"],
            },
            {
                "tipo": "contacto",
                "titulo": "Rafael, María, Joaquín, Leopoldo, Fernando",
                "contenido": "Hermanos accionistas. Rafael presidente, María consejera, otros con vehículos propios.",
                "tags": ["hermanos"],
            },
            {
                "tipo": "contacto",
                "titulo": "Fundación Rafael del Pino",
                "contenido": "Plataforma liberal en España.",
                "tags": ["fundacion"],
            },
        ],
    },
    "familia-entrecanales": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Acciona (~55%)",
                "contenido": "Control vía vehículos Tussen de Grachten, Wit Europese, otros.",
                "tags": ["acciona"],
            },
            {
                "tipo": "contacto",
                "titulo": "José Manuel y Juan Ignacio Entrecanales Domecq",
                "contenido": "Hermanos cabeza visible.",
                "tags": ["hermanos"],
            },
        ],
    },
    "familia-grifols": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Generación actual",
                "contenido": "Víctor Grifols Roura (ex CEO), Raimon Grifols Roura (vicepresidente). Hijos: Víctor Jr, Raimon Jr, etc. en consejos.",
                "tags": ["familia"],
            },
            {
                "tipo": "contacto",
                "titulo": "Vehículos B.V.",
                "contenido": "Scranton Enterprises B.V., Deria S.A., Ralledor Holding.",
                "tags": ["vehiculos"],
            },
            {
                "tipo": "contacto",
                "titulo": "Brookfield (relación)",
                "contenido": "Negoció OPA conjunta 2024 (fallida noviembre).",
                "tags": ["brookfield"],
            },
        ],
    },
    "familia-lopez-belmonte": {
        "completeness": 0.6,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Norbel Inversiones",
                "contenido": "Vehículo familiar, ~64% Rovi.",
                "tags": ["norbel"],
            },
            {
                "tipo": "contacto",
                "titulo": "Tres generaciones",
                "contenido": "Juan López-Belmonte Encina (fundador 1946), Juan López-Belmonte López (presidente), Juan López-Belmonte White (CEO).",
                "tags": ["generaciones"],
            },
        ],
    },
    "familia-mittal": {
        "completeness": 0.6,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Núcleo",
                "contenido": "Lakshmi (presidente), Aditya (CEO ArcelorMittal), Vanisha Mittal (Aperam, esposo Amit Bhatia).",
                "tags": ["nucleo"],
            },
            {
                "tipo": "contacto",
                "titulo": "Aperam / Mittal Steel legacy",
                "contenido": "Familia controladora indirecta de Aperam (spin-off inox).",
                "tags": ["aperam"],
            },
        ],
    },
    "familia-puig": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Cúpula",
                "contenido": "Marc Puig (presidente CEO), Manuel Puig (vicepresidente).",
                "tags": ["marc", "manuel"],
            },
            {
                "tipo": "contacto",
                "titulo": "Acciones tipo A doble voto",
                "contenido": "Mantienen control post-OPV vía estructura accionarial dual.",
                "tags": ["dual"],
            },
        ],
    },
    "imperial-brands": {
        "completeness": 0.62,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Logista (50,01%)",
                "contenido": "Accionista de control. Decisiones operativas Logista pasan por Bristol.",
                "tags": ["logista"],
            },
            {
                "tipo": "contacto",
                "titulo": "Stéphan Vermut (CEO Imperial)",
                "contenido": "CEO desde 2020.",
                "tags": ["vermut"],
            },
        ],
    },
    "qatar-investment-authority": {
        "completeness": 0.62,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Cartera España",
                "contenido": "Iberdrola (~8%), Colonial (~19%), El Corte Inglés (10%), Banco Santander Brasil, varios inmobiliarios prime.",
                "tags": ["cartera"],
            },
            {
                "tipo": "contacto",
                "titulo": "Familia Al Thani",
                "contenido": "Controlado por el Estado de Qatar (Tamim bin Hamad Al Thani).",
                "tags": ["al-thani"],
            },
        ],
    },
    "qatar-airways": {
        "completeness": 0.62,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "IAG (~25%)",
                "contenido": "Mayor accionista. Akbar Al Baker (ex CEO) y luego Badr Mohammed Al Meer (CEO).",
                "tags": ["iag"],
            },
            {
                "tipo": "contacto",
                "titulo": "oneworld",
                "contenido": "Alianza estratégica con IAG en oneworld.",
                "tags": ["oneworld"],
            },
            {
                "tipo": "contacto",
                "titulo": "Estado de Qatar",
                "contenido": "Aerolínea estatal.",
                "tags": ["qatar"],
            },
        ],
    },
    "stc-saudi-telecom": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Telefónica (~9,9%)",
                "contenido": "Compra septiembre 2023. Operación que motivó respuesta SEPI.",
                "tags": ["telefonica"],
            },
            {
                "tipo": "contacto",
                "titulo": "PIF (fondo soberano saudí)",
                "contenido": "Controlado por el Public Investment Fund de Arabia Saudí.",
                "tags": ["pif"],
            },
        ],
    },
    "gotham-city": {
        "completeness": 0.7,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Daniel Yu (fundador)",
                "contenido": "Analista bajista neoyorquino, fundador.",
                "tags": ["yu"],
            },
            {
                "tipo": "contacto",
                "titulo": "General Industrial Partners (con quien co-publican)",
                "contenido": "Co-publicó análisis Grifols con General Industrial Partners (UK).",
                "tags": ["gip-uk"],
            },
            {
                "tipo": "contacto",
                "titulo": "Casos",
                "contenido": "Gowex (2014, suicidio empresa), Quindell (2014), Aerojet, Grifols (2024).",
                "tags": ["historial"],
            },
        ],
    },
    "gic-singapur": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Cellnex (~7%)",
                "contenido": "Accionista relevante. Apoyo al cambio de CEO 2023.",
                "tags": ["cellnex"],
            },
            {
                "tipo": "contacto",
                "titulo": "Estado Singapur",
                "contenido": "Fondo soberano del Estado de Singapur.",
                "tags": ["singapur"],
            },
            {
                "tipo": "contacto",
                "titulo": "Lim Chow Kiat (CEO)",
                "contenido": "CEO de GIC desde 2017.",
                "tags": ["lim"],
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Infraestructura europea",
                "contenido": "GIC concentra capital paciente en infraestructuras europeas (torres, redes, autopistas).",
                "tags": ["infraestructura"],
            },
        ],
    },
    "edizione-benetton": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Familia Benetton",
                "contenido": "Cuatro hermanos fundadores (Luciano, Giuliana, Gilberto, Carlo) y herederos (Alessandro Benetton presidente).",
                "tags": ["benetton"],
            },
            {
                "tipo": "contacto",
                "titulo": "Cellnex (~9%)",
                "contenido": "Vía vehículo ConnecT.",
                "tags": ["cellnex"],
            },
            {
                "tipo": "contacto",
                "titulo": "Atlantia legacy",
                "contenido": "Antiguo accionista de Atlantia (Autostrade per l'Italia) - vendida en 2022 tras tragedia Genova.",
                "tags": ["atlantia"],
            },
            {
                "tipo": "contacto",
                "titulo": "Mundys (Aeroporti Roma, Telepass)",
                "contenido": "Tras venta Atlantia, Edizione retiene parte vía Mundys.",
                "tags": ["mundys"],
            },
        ],
        "controversias": [
            {
                "tipo": "evento",
                "titulo": "Tragedia Puente Morandi (2018)",
                "contenido": "Colapso del puente de Génova (gestionado por Autostrade per l'Italia, controlada por Atlantia/Edizione) provocó 43 muertes. Salida ordenada de Atlantia.",
                "fecha": "2018-08-14",
                "tags": ["morandi"],
            },
        ],
    },
    "ifm-investors": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Naturgy (~15%)",
                "contenido": "Tras OPA parcial 2021, autorizada con condiciones por Gobierno español.",
                "tags": ["naturgy"],
            },
            {
                "tipo": "contacto",
                "titulo": "Fondos de pensiones australianos",
                "contenido": "Propiedad de fondos de pensiones australianos (industria superannuation).",
                "tags": ["australia"],
            },
            {
                "tipo": "contacto",
                "titulo": "David Neal (CEO)",
                "contenido": "CEO de IFM Investors desde 2019.",
                "tags": ["neal"],
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Capital paciente",
                "contenido": "Inversor de largo plazo (>10 años), perfil distinto de private equity tradicional.",
                "tags": ["estrategia"],
            },
        ],
    },
    "cvc-capital": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Naturgy (~20%)",
                "contenido": "Desde 2018 vía Rioja Bidco.",
                "tags": ["naturgy"],
            },
            {
                "tipo": "contacto",
                "titulo": "LaLiga - Operación Boost",
                "contenido": "Inversor estratégico de LaLiga desde 2021 (operación rechazada inicialmente por Real Madrid y FC Barcelona).",
                "tags": ["laliga"],
            },
            {
                "tipo": "contacto",
                "titulo": "Tendam, Vitalia, Universidad Europea",
                "contenido": "Cartera España diversificada: retail, residencias mayores, educación.",
                "tags": ["cartera-espana"],
            },
            {
                "tipo": "contacto",
                "titulo": "Salida a bolsa 2024",
                "contenido": "CVC se listó en Ámsterdam en abril 2024.",
                "tags": ["opv"],
            },
        ],
    },
    "gip": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "BlackRock",
                "contenido": "Adquirido por BlackRock en enero 2024 por 12.500 M$.",
                "tags": ["blackrock"],
            },
            {
                "tipo": "contacto",
                "titulo": "Naturgy (~20%)",
                "contenido": "Accionista desde 2018.",
                "tags": ["naturgy"],
            },
            {
                "tipo": "contacto",
                "titulo": "Adebayo Ogunlesi (cofundador)",
                "contenido": "Cofundador y CEO de GIP. Ahora vicepresidente BlackRock.",
                "tags": ["ogunlesi"],
            },
            {
                "tipo": "contacto",
                "titulo": "Cartera global",
                "contenido": "Gatwick (UK), Edinburgh Airport, Suez Water (Norteamérica), Italo (Italia).",
                "tags": ["cartera"],
            },
        ],
    },
    "nippon-steel": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Acerinox (~19%)",
                "contenido": "Accionista histórico.",
                "tags": ["acerinox"],
            },
            {
                "tipo": "contacto",
                "titulo": "US Steel - OPA fallida",
                "contenido": "OPA 14.900 M$ sobre US Steel bloqueada por Biden enero 2025, revisada bajo Trump.",
                "tags": ["us-steel"],
            },
            {
                "tipo": "contacto",
                "titulo": "Eiji Hashimoto (CEO)",
                "contenido": "CEO de Nippon Steel desde 2024.",
                "tags": ["hashimoto"],
            },
            {
                "tipo": "contacto",
                "titulo": "Tata Steel UK / Europa",
                "contenido": "Joint venture Tata-Nippon en Países Bajos. Salida ordenada UK.",
                "tags": ["tata"],
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Descarbonización siderurgia",
                "contenido": "Apuesta por DRI con H2 y captura de CO2.",
                "tags": ["descarbonizacion"],
            },
        ],
    },
    "sonatrach": {
        "completeness": 0.62,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Naturgy",
                "contenido": "Socio en Medgaz (gasoducto Argelia-Almería).",
                "tags": ["naturgy"],
            },
            {
                "tipo": "contacto",
                "titulo": "Cepsa",
                "contenido": "Cepsa históricamente vinculada (Sonatrach fue accionista).",
                "tags": ["cepsa"],
            },
            {
                "tipo": "contacto",
                "titulo": "Gobierno argelino",
                "contenido": "Empresa estatal. Relación geopolítica directa con Madrid.",
                "tags": ["argelia"],
            },
        ],
    },
    "moderna": {
        "completeness": 0.6,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Rovi (España)",
                "contenido": "Partner industrial para fill-and-finish europeo de mRNA-1273.",
                "tags": ["rovi"],
            },
            {
                "tipo": "contacto",
                "titulo": "Stéphane Bancel (CEO)",
                "contenido": "CEO francés desde 2011.",
                "tags": ["bancel"],
            },
        ],
    },
    "brookfield": {
        "completeness": 0.6,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Grifols (OPA fallida)",
                "contenido": "Negoció con familia OPA de exclusión 2024, retirada noviembre 2024.",
                "tags": ["grifols"],
            },
            {
                "tipo": "contacto",
                "titulo": "Bruce Flatt (CEO)",
                "contenido": "CEO de Brookfield desde 2002.",
                "tags": ["flatt"],
            },
            {
                "tipo": "contacto",
                "titulo": "Cartera infraestructura España",
                "contenido": "Saeta Yield (eolica, vendida), X-Elio, Cupa Pizarras.",
                "tags": ["cartera"],
            },
        ],
    },
    "liberty-global": {
        "completeness": 0.65,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Telefónica - VMO2",
                "contenido": "Joint venture 50/50 desde junio 2021.",
                "tags": ["telefonica", "vmo2"],
            },
            {
                "tipo": "contacto",
                "titulo": "John Malone",
                "contenido": "Magnate del cable y telecos. Mayor accionista vía Liberty Media.",
                "tags": ["malone"],
            },
            {
                "tipo": "contacto",
                "titulo": "Mike Fries (CEO)",
                "contenido": "CEO de Liberty Global desde 2005.",
                "tags": ["fries"],
            },
            {
                "tipo": "contacto",
                "titulo": "Cartera europea",
                "contenido": "VMO2 (UK), Sunrise (Suiza, escindida 2024), Telenet (Bélgica), UPC (Polonia, Eslovaquia).",
                "tags": ["cartera"],
            },
        ],
    },
    "banco-popular": {
        "completeness": 0.7,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Santander (absorbente)",
                "contenido": "Adquirió por 1€ tras resolución JUR junio 2017.",
                "tags": ["santander"],
            },
            {
                "tipo": "contacto",
                "titulo": "Ángel Ron",
                "contenido": "Presidente saliente al inicio de la crisis (sucesivo de Emilio Saracho).",
                "tags": ["ron"],
            },
            {
                "tipo": "contacto",
                "titulo": "Demandas accionistas",
                "contenido": "Cientos de demandas pendientes resueltas a favor de la legalidad de la resolución (TG UE 2022).",
                "tags": ["judicial"],
            },
        ],
    },
    "bankia": {
        "completeness": 0.72,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "CaixaBank (absorbente)",
                "contenido": "Fusión por absorción marzo 2021.",
                "tags": ["caixabank"],
            },
            {
                "tipo": "contacto",
                "titulo": "FROB - rescate",
                "contenido": "Rescate ~22.000 M€ mayo 2012.",
                "tags": ["frob"],
            },
            {
                "tipo": "contacto",
                "titulo": "Rato → Goirigolzarri",
                "contenido": "Rato dimite y es sustituido por Goirigolzarri.",
                "tags": ["rato", "goirigolzarri"],
            },
            {
                "tipo": "contacto",
                "titulo": "Caso Tarjetas Black",
                "contenido": "Caja Madrid/Bankia: causa por uso de tarjetas opacas. Sentencias 2017-2018.",
                "tags": ["tarjetas-black"],
            },
        ],
    },
    "liberbank": {
        "completeness": 0.6,
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Unicaja (absorbente)",
                "contenido": "Fusión por absorción marzo 2021.",
                "tags": ["unicaja"],
            },
            {
                "tipo": "contacto",
                "titulo": "Cajastur, Caja Cantabria, Caja Extremadura",
                "contenido": "Tres cajas integradas en 2011 que formaron Liberbank.",
                "tags": ["cajas"],
            },
        ],
    },
}


# ─── PATCHES EMPRESAS IBEX 35 con baja completeness ──────────────────
PATCHES_EMPRESAS: dict[str, dict[str, Any]] = {
    "fluidra": {
        "completeness": 0.7,
        "confidence": 0.82,
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "Energía y agua",
                "contenido": "Posicionamiento corporativo a favor de la eficiencia energética en piscinas (bombas variables, climatización solar).",
                "tags": ["esg"],
            },
            {
                "tipo": "dato",
                "titulo": "Mercado USA",
                "contenido": "Estrategia de expansión USA vía Zodiac Pool Systems (50% del negocio post-fusión).",
                "tags": ["usa"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Bruce Brooks (CEO)",
                "contenido": "CEO de Fluidra desde 2018 (post-fusión Zodiac).",
                "tags": ["brooks"],
            },
            {
                "tipo": "contacto",
                "titulo": "Eloi Planes (presidente)",
                "contenido": "Tercera generación de la familia Planes.",
                "tags": ["planes"],
            },
            {
                "tipo": "contacto",
                "titulo": "Acuerdo familias",
                "contenido": "Planes, Garrigós, Serra, Corbera mantienen ~36% conjuntamente con acuerdo de voto.",
                "tags": ["familias"],
            },
            {
                "tipo": "contacto",
                "titulo": "Rhône Capital legacy",
                "contenido": "Fondo Rhône (anterior dueño de Zodiac) salió tras la fusión 2018.",
                "tags": ["rhone"],
            },
        ],
        "controversias": [
            {
                "tipo": "evento",
                "titulo": "Caída pos-Covid",
                "contenido": "Tras pico de demanda durante Covid, normalización 2023-2024 con caída de ventas y de cotización.",
                "tags": ["bolsa"],
            },
        ],
    },
    "solaria": {
        "completeness": 0.7,
        "confidence": 0.8,
        "trayectoria": [
            {
                "tipo": "evento",
                "titulo": "Pivot a producción de energía",
                "contenido": "Reorientación desde fabricación de paneles (sector que abandonó) a productor de energía solar fotovoltaica.",
                "fecha": "2014-01-01",
            },
            {
                "tipo": "evento",
                "titulo": "Burbuja renovables 2020-2021",
                "contenido": "Cotización multiplicó por 10 en 2020. Cayó 75% entre 2021 y 2024 con la subida de tipos.",
                "fecha": "2021-01-01",
            },
        ],
        "posiciones": [
            {
                "tipo": "dato",
                "titulo": "PPA y marco regulatorio",
                "contenido": "Defensa del modelo PPA y precios marginalistas estables para asegurar financiación.",
                "tags": ["ppa"],
            },
            {
                "tipo": "dato",
                "titulo": "Cartera proyectos",
                "contenido": "Cartera ~9 GW en distintos estados de desarrollo. Plan ambicioso de monetización.",
                "tags": ["cartera"],
            },
        ],
        "redes": [
            {
                "tipo": "contacto",
                "titulo": "Enrique Díaz-Tejeiro (presidente)",
                "contenido": "Familia controladora vía DTL Corporación.",
                "tags": ["diaz-tejeiro"],
            },
            {
                "tipo": "contacto",
                "titulo": "DTL Corporación (~37%)",
                "contenido": "Vehículo familiar.",
                "tags": ["dtl"],
            },
            {
                "tipo": "contacto",
                "titulo": "MITECO y CNMC",
                "contenido": "Interlocución regulatoria habitual en subastas PPA y conexiones.",
                "tags": ["miteco"],
            },
        ],
        "controversias": [
            {
                "tipo": "evento",
                "titulo": "Crítica analistas",
                "contenido": "Críticas sobre el ritmo de monetización de la cartera. Cuestionamientos a la valoración. Posición bajista de varios short-sellers.",
                "tags": ["analistas"],
            },
        ],
    },
}


# ─── AUTO-ENRICHMENT FILIALES ─────────────────────────────────────────
# Para filiales que solo tienen identidad + evidencia, añadir redes
# mínimas referenciando la matriz y el sector.
FILIAL_REDES: dict[str, list[dict[str, str]]] = {
    "santander-uk": [
        {
            "tipo": "contacto",
            "titulo": "Banco Santander (matriz)",
            "contenido": "100% Santander. Sede Londres.",
            "tags": ["matriz"],
        },
        {
            "tipo": "contacto",
            "titulo": "Abbey, A&L, B&B legacy",
            "contenido": "Heredera de Abbey National (2004), Alliance & Leicester (2008), Bradford & Bingley (2008).",
            "tags": ["historia"],
        },
        {
            "tipo": "contacto",
            "titulo": "Mercado UK",
            "contenido": "Compite con HSBC UK, Barclays, Lloyds, NatWest.",
            "tags": ["competencia"],
        },
    ],
    "garanti": [
        {
            "tipo": "contacto",
            "titulo": "BBVA (matriz)",
            "contenido": "~86% BBVA. Sede Estambul.",
            "tags": ["matriz"],
        },
        {
            "tipo": "contacto",
            "titulo": "Familia Sahenk (Doğuş)",
            "contenido": "Accionista histórico minoritario.",
            "tags": ["dogus"],
        },
        {
            "tipo": "contacto",
            "titulo": "Hiperinflación Turquía",
            "contenido": "Aplicación NIIF 29 afecta la consolidación contable desde 2022.",
            "tags": ["niif-29"],
        },
    ],
    "tsb": [
        {
            "tipo": "contacto",
            "titulo": "Banco Sabadell (matriz)",
            "contenido": "100% Sabadell desde 2015. Sede Edimburgo.",
            "tags": ["matriz"],
        },
        {
            "tipo": "contacto",
            "titulo": "OPA BBVA - factor TSB",
            "contenido": "TSB es elemento clave del debate sobre la OPA hostil de BBVA sobre Sabadell (riesgo de desinversión).",
            "tags": ["opa-bbva"],
        },
        {
            "tipo": "contacto",
            "titulo": "FCA (regulador UK)",
            "contenido": "Tutela regulatoria.",
            "tags": ["fca"],
        },
    ],
    "scottishpower": [
        {
            "tipo": "contacto",
            "titulo": "Iberdrola (matriz)",
            "contenido": "100% Iberdrola desde 2007. Sede Glasgow.",
            "tags": ["matriz"],
        },
        {
            "tipo": "contacto",
            "titulo": "Ofgem (regulador UK)",
            "contenido": "Tutela regulatoria.",
            "tags": ["ofgem"],
        },
        {
            "tipo": "contacto",
            "titulo": "Big Six UK",
            "contenido": "Una de las grandes seis utilities británicas (con Centrica, EDF, E.ON, OVO/SSE, Octopus).",
            "tags": ["big-six"],
        },
    ],
    "avangrid": [
        {
            "tipo": "contacto",
            "titulo": "Iberdrola (matriz)",
            "contenido": "~82% Iberdrola. Cotiza NYSE.",
            "tags": ["matriz"],
        },
        {
            "tipo": "contacto",
            "titulo": "Mercado EE.UU.",
            "contenido": "Operaciones en Nueva York, Maine, Connecticut, Massachusetts, etc.",
            "tags": ["ee-uu"],
        },
        {
            "tipo": "contacto",
            "titulo": "Conflicto PNM Resources",
            "contenido": "OPA fallida sobre PNM Resources (Nuevo México) bloqueada por reguladores 2023.",
            "tags": ["pnm"],
        },
    ],
    "hochtief": [
        {
            "tipo": "contacto",
            "titulo": "ACS (matriz)",
            "contenido": "~80% ACS desde 2011.",
            "tags": ["acs"],
        },
        {
            "tipo": "contacto",
            "titulo": "Cimic (Australia)",
            "contenido": "Filial australiana controlada por Hochtief.",
            "tags": ["cimic"],
        },
        {
            "tipo": "contacto",
            "titulo": "Turner (USA)",
            "contenido": "Filial estadounidense.",
            "tags": ["turner"],
        },
        {
            "tipo": "contacto",
            "titulo": "Florentino Pérez",
            "contenido": "Decisiones estratégicas.",
            "tags": ["florentino"],
        },
    ],
    "iberia": [
        {
            "tipo": "contacto",
            "titulo": "IAG (matriz)",
            "contenido": "100% IAG desde 2011.",
            "tags": ["iag"],
        },
        {
            "tipo": "contacto",
            "titulo": "Hub Madrid-Barajas",
            "contenido": "Operativa en T4 (Aena). Eje LatAm.",
            "tags": ["barajas"],
        },
        {
            "tipo": "contacto",
            "titulo": "Marco Sansavini (CEO)",
            "contenido": "CEO desde 2024.",
            "tags": ["sansavini"],
        },
        {
            "tipo": "contacto",
            "titulo": "oneworld",
            "contenido": "Alianza estratégica.",
            "tags": ["oneworld"],
        },
    ],
    "british-airways": [
        {
            "tipo": "contacto",
            "titulo": "IAG (matriz)",
            "contenido": "100% IAG desde 2011.",
            "tags": ["iag"],
        },
        {
            "tipo": "contacto",
            "titulo": "Hub Heathrow",
            "contenido": "Mayor cuota en Heathrow (~50% slots).",
            "tags": ["heathrow"],
        },
        {
            "tipo": "contacto",
            "titulo": "Sean Doyle (CEO)",
            "contenido": "CEO desde 2020.",
            "tags": ["doyle"],
        },
    ],
    "vueling": [
        {"tipo": "contacto", "titulo": "IAG (matriz)", "contenido": "~100% IAG.", "tags": ["iag"]},
        {
            "tipo": "contacto",
            "titulo": "Hub Barcelona-El Prat",
            "contenido": "Mayor low-cost desde El Prat. Competidor de Ryanair y easyJet.",
            "tags": ["elprat"],
        },
        {
            "tipo": "contacto",
            "titulo": "Carolina Martinoli (CEO)",
            "contenido": "CEO desde 2024.",
            "tags": ["martinoli"],
        },
    ],
    "aer-lingus": [
        {
            "tipo": "contacto",
            "titulo": "IAG (matriz)",
            "contenido": "100% IAG desde 2015.",
            "tags": ["iag"],
        },
        {
            "tipo": "contacto",
            "titulo": "Hub Dublín",
            "contenido": "Slots clave para Norteamérica.",
            "tags": ["dublin"],
        },
        {
            "tipo": "contacto",
            "titulo": "Lynne Embleton (CEO)",
            "contenido": "CEO desde 2021.",
            "tags": ["embleton"],
        },
    ],
    "virgin-media-o2": [
        {
            "tipo": "contacto",
            "titulo": "Telefónica (50%)",
            "contenido": "Joint venture 50/50.",
            "tags": ["telefonica"],
        },
        {
            "tipo": "contacto",
            "titulo": "Liberty Global (50%)",
            "contenido": "Otro socio 50%.",
            "tags": ["liberty-global"],
        },
        {
            "tipo": "contacto",
            "titulo": "Mercado UK telecos",
            "contenido": "Compite con BT/EE, Vodafone UK, Three UK.",
            "tags": ["uk"],
        },
    ],
}


# ─── Aplicación ───────────────────────────────────────────────────────
def apply_patches(d: dict, patches: dict[str, Any]) -> int:
    """Aplica un patch a un dossier. Devuelve número de items añadidos."""
    added = 0
    for key, val in patches.items():
        if key == "completeness":
            bump(d, completeness=val)
        elif key == "confidence":
            bump(d, confidence=val)
        elif key in APARTADO_ORDEN:
            ap = upsert_apartado(d, key)
            added += append_items(ap, val)
        else:
            # Tolerante a claves desconocidas.
            continue
    return added


def auto_enrich_filial(d: dict) -> int:
    items = FILIAL_REDES.get(d["slug"])
    if not items:
        return 0
    ap = upsert_apartado(d, "redes")
    added = append_items(ap, items)
    bump(d, completeness=0.62, confidence=0.85)
    return added


def process_file(path: Path, patches_dict: dict[str, dict], *, dry_run: bool) -> dict:
    """Procesa un archivo JSON aplicando patches específicos + auto-enrichment."""
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    stats = {"patches_applied": 0, "auto_filiales": 0, "items_added": 0}

    for d in data:
        slug = d["slug"]
        if slug in patches_dict:
            n = apply_patches(d, patches_dict[slug])
            stats["patches_applied"] += 1
            stats["items_added"] += n
        if slug in FILIAL_REDES:
            n = auto_enrich_filial(d)
            stats["auto_filiales"] += 1
            stats["items_added"] += n

    if not dry_run:
        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)

    return stats


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="No escribe a disco")
    args = parser.parse_args()

    print("=" * 70)
    print("Enrichment IBEX 35 seed · " + ("DRY-RUN" if args.dry_run else "WRITE"))
    print("=" * 70)

    targets = [
        (DIR_IBEX35 / "empresas.json", PATCHES_EMPRESAS),
        (DIR_IBEX35 / "directivos.json", PATCHES_PERSONAS),
        (DIR_IBEX35 / "conexos.json", PATCHES_CONEXOS),
    ]
    grand = {"patches_applied": 0, "auto_filiales": 0, "items_added": 0}
    for path, patches in targets:
        stats = process_file(path, patches, dry_run=args.dry_run)
        print(f"\n{path.name}:")
        print(f"  patches específicos: {stats['patches_applied']}")
        print(f"  auto filiales:       {stats['auto_filiales']}")
        print(f"  items añadidos:      {stats['items_added']}")
        for k, v in stats.items():
            grand[k] = grand[k] + v

    print("\n" + "=" * 70)
    print(
        f"TOTAL · patches={grand['patches_applied']} · "
        f"filiales={grand['auto_filiales']} · "
        f"items_añadidos={grand['items_added']}"
    )
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
