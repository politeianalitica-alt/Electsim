#!/usr/bin/env python3
"""
Seed script for ElectSim demo data.
Populates the PostgreSQL database with realistic Spanish political data.

Usage:
    DATABASE_URL=postgresql://user:pass@localhost/politeia python scripts/seed_demo_data.py
"""
from __future__ import annotations

import os
import sys
import json
from datetime import datetime, timezone, timedelta
from typing import Any

# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

def get_conn():
    try:
        import psycopg2
        dsn = os.getenv("DATABASE_URL", "postgresql://politeia:politeia@localhost/politeia")
        return psycopg2.connect(dsn)
    except Exception as e:
        print(f"ERROR: Cannot connect to DB: {e}")
        sys.exit(1)


def table_exists(conn, table_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_name=%s)",
            (table_name,)
        )
        return cur.fetchone()[0]


# ---------------------------------------------------------------------------
# Partidos
# ---------------------------------------------------------------------------

PARTIDOS = [
    ("PP", "Partido Popular", "#1F77FF", "derecha"),
    ("PSOE", "Partido Socialista Obrero Español", "#E03A3E", "centro-izquierda"),
    ("VOX", "VOX", "#5BC035", "extrema-derecha"),
    ("Sumar", "Sumar", "#D81E5B", "izquierda"),
    ("Junts", "Junts per Catalunya", "#00C2A8", "derecha-independentista"),
    ("ERC", "Esquerra Republicana de Catalunya", "#F4B400", "izquierda-independentista"),
    ("PNV", "Partido Nacionalista Vasco", "#1D8042", "centro-nacionalista"),
    ("Bildu", "EH Bildu", "#A4D65E", "izquierda-independentista"),
    ("Podemos", "Podemos", "#6E2A78", "izquierda"),
    ("BNG", "Bloque Nacionalista Galego", "#00A86B", "izquierda-nacionalista"),
]


def seed_partidos(conn):
    if not table_exists(conn, "partidos"):
        print("  Tabla 'partidos' no existe, saltando...")
        return 0
    with conn.cursor() as cur:
        count = 0
        for nombre_corto, nombre_largo, color_hex, espectro in PARTIDOS:
            cur.execute("""
                INSERT INTO partidos (nombre_corto, nombre_largo, color_hex, espectro_politico, activo)
                VALUES (%s, %s, %s, %s, TRUE)
                ON CONFLICT (nombre_corto) DO UPDATE SET
                    nombre_largo=EXCLUDED.nombre_largo,
                    color_hex=EXCLUDED.color_hex,
                    espectro_politico=EXCLUDED.espectro_politico
            """, (nombre_corto, nombre_largo, color_hex, espectro))
            count += 1
        conn.commit()
    print(f"  ✓ {count} partidos insertados")
    return count


# ---------------------------------------------------------------------------
# Personas públicas
# ---------------------------------------------------------------------------

PERSONAS = [
    ("Pedro Sánchez", "político", "PSOE", "Presidente del Gobierno", 96, 38, "Secretario General del PSOE y Presidente del Gobierno desde 2018."),
    ("Alberto Núñez Feijóo", "político", "PP", "Líder de la oposición", 91, 42, "Presidente del PP desde 2022, ex Presidente de la Xunta de Galicia."),
    ("Santiago Abascal", "político", "VOX", "Presidente de VOX", 78, 28, "Fundador y presidente de VOX desde 2013."),
    ("Yolanda Díaz", "político", "Sumar", "Vicepresidenta Segunda del Gobierno", 74, 36, "Ministra de Trabajo. Impulsora de la reforma laboral."),
    ("Isabel Díaz Ayuso", "político", "PP", "Presidenta CAM", 88, 45, "Presidenta de la Comunidad de Madrid desde 2021."),
    ("Carles Puigdemont", "político", "Junts", "Presidente de Junts", 71, 22, "Expresidente de la Generalitat. En el exilio desde 2017."),
    ("Oriol Junqueras", "político", "ERC", "Presidente de ERC", 62, 31, "Exvicepresidente de la Generalitat y exministro de Economía."),
    ("Andoni Ortuzar", "político", "PNV", "Presidente del PNV", 58, 44, "Presidente del EBB del PNV desde 2013."),
    ("Arnaldo Otegi", "político", "Bildu", "Coordinador General de EH Bildu", 67, 35, "Figura clave del independentismo vasco."),
    ("Teresa Ribera", "político", "PSOE", "Vicepresidenta Tercera del Gobierno", 69, 41, "Ministra para la Transición Ecológica."),
    ("María Jesús Montero", "político", "PSOE", "Ministra de Hacienda", 65, 39, "Portavoz del gobierno. Negociadora clave de los PGE."),
    ("Cuca Gamarra", "político", "PP", "Secretaria General del PP", 61, 40, "Portavoz del PP en el Congreso."),
    ("Salvador Illa", "político", "PSOE", "President de la Generalitat de Catalunya", 71, 43, "President desde 2024. Exministro de Sanidad."),
    ("Carlos Mazón", "político", "PP", "President de la Generalitat Valenciana", 64, 31, "Cuestionado por gestión de la DANA de 2024."),
    ("Ione Belarra", "político", "Podemos", "Secretaria General de Podemos", 56, 27, "Exministra de Derechos Sociales."),
    ("Pepe Álvarez", "sindicalista", "UGT", "Secretario General de UGT", 47, 42, "Sindicato mayoritario junto a CCOO."),
    ("Antonio Garamendi", "empresario", "CEOE", "Presidente de la CEOE", 52, 38, "Voz principal de los empresarios españoles desde 2018."),
    ("Ana Botín", "empresario", None, "Presidenta del Banco Santander", 68, 55, "Presidenta ejecutiva del Banco Santander desde 2014."),
    ("Miquel Roca", "jurista", None, "Expresidente del Consell de l'Advocatura", 41, 51, "Jurista de referencia en derecho constitucional."),
    ("Reyes Maroto", "político", "PSOE", "Diputada nacional por Madrid", 44, 37, "Exministra de Industria y candidata a la alcaldía de Madrid 2023."),
]


def seed_personas(conn):
    if not table_exists(conn, "persona_publica"):
        print("  Tabla 'persona_publica' no existe, saltando...")
        return 0
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        count = 0
        for nombre, tipo, partido, cargo, influencia, sentimiento_raw, bio in PERSONAS:
            sentimiento = (sentimiento_raw - 50) / 50  # normalize to [-1, 1]
            tendencia = "bajando" if sentimiento < 0 else "subiendo"
            cur.execute("""
                INSERT INTO persona_publica
                    (nombre_completo, tipo, partido, cargo_actual, activo,
                     score_influencia, sentimiento_actual, tendencia_sentimiento, ultima_mencion_media)
                VALUES (%s, %s, %s, %s, TRUE, %s, %s, %s, %s)
                ON CONFLICT (nombre_completo) DO UPDATE SET
                    cargo_actual=EXCLUDED.cargo_actual,
                    score_influencia=EXCLUDED.score_influencia,
                    sentimiento_actual=EXCLUDED.sentimiento_actual,
                    tendencia_sentimiento=EXCLUDED.tendencia_sentimiento
            """, (nombre, tipo, partido, cargo, influencia / 100, sentimiento, tendencia, now))
            count += 1
        conn.commit()
    print(f"  ✓ {count} personas insertadas")
    return count


# ---------------------------------------------------------------------------
# Encuestas electorales
# ---------------------------------------------------------------------------

CASAS_ENCUESTADORAS = [
    ("GAD3", 1800),
    ("Metroscopia", 1500),
    ("Simple Lógica", 1200),
    ("CIS", 3000),
    ("Sigma Dos", 1600),
    ("40dB", 2000),
    ("Hamalgama Métrica", 1400),
]

POLL_DATA = [
    # (fecha, casa, PP, PSOE, VOX, Sumar, Junts, ERC, PNV, Bildu, Podemos)
    (0, "GAD3", 33.2, 27.4, 12.1, 11.8, 2.1, 2.3, 1.8, 1.7, 2.4),
    (3, "Metroscopia", 32.8, 27.9, 12.4, 11.5, 2.0, 2.1, 1.9, 1.8, 2.3),
    (7, "Simple Lógica", 33.5, 27.1, 11.9, 12.1, 2.2, 2.2, 1.7, 1.6, 2.5),
    (10, "Sigma Dos", 32.4, 28.3, 12.7, 11.3, 2.1, 2.0, 1.8, 1.9, 2.2),
    (14, "40dB", 31.8, 28.7, 12.9, 11.8, 2.0, 2.1, 1.9, 1.7, 2.4),
    (21, "GAD3", 31.2, 29.1, 13.1, 11.6, 2.1, 2.2, 1.8, 1.8, 2.3),
    (28, "CIS", 30.8, 29.4, 12.8, 12.3, 2.2, 2.1, 1.9, 1.7, 2.2),
    (35, "Metroscopia", 31.5, 28.8, 12.5, 12.0, 2.1, 2.3, 1.8, 1.8, 2.4),
    (42, "Simple Lógica", 32.1, 28.2, 12.2, 11.9, 2.2, 2.2, 1.9, 1.7, 2.5),
    (56, "Sigma Dos", 31.9, 28.5, 12.6, 12.1, 2.1, 2.1, 1.8, 1.9, 2.3),
    (70, "40dB", 31.4, 28.9, 12.8, 12.2, 2.0, 2.2, 1.9, 1.8, 2.2),
    (84, "GAD3", 30.9, 29.3, 13.0, 12.0, 2.1, 2.1, 1.8, 1.8, 2.3),
]


def seed_encuestas(conn):
    if not table_exists(conn, "encuesta"):
        print("  Tabla 'encuesta' no existe — usando tabla estimaciones_voto_agregadas...")
        return seed_estimaciones(conn)

    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        count = 0
        for dias_atras, casa, pp, psoe, vox, sumar, junts, erc, pnv, bildu, podemos in POLL_DATA:
            fecha = now - timedelta(days=dias_atras)
            muestra = next((m for c, m in CASAS_ENCUESTADORAS if c == casa), 1500)
            results = {"PP": pp, "PSOE": psoe, "VOX": vox, "Sumar": sumar,
                       "Junts": junts, "ERC": erc, "PNV": pnv, "Bildu": bildu, "Podemos": podemos}
            cur.execute("""
                INSERT INTO encuesta (casa_encuestadora, fecha_publicacion, muestra, tipo, resultados_json, ambito)
                VALUES (%s, %s, %s, 'intencion_voto', %s, 'nacional')
                ON CONFLICT DO NOTHING
            """, (casa, fecha, muestra, json.dumps(results)))
            count += 1
        conn.commit()
    print(f"  ✓ {count} encuestas insertadas")
    return count


def seed_estimaciones(conn):
    """Seed estimaciones_voto_agregadas table directly."""
    if not table_exists(conn, "estimaciones_voto_agregadas"):
        print("  Tabla 'estimaciones_voto_agregadas' no existe, saltando...")
        return 0

    now = datetime.now(timezone.utc)
    CURRENT_ESTIMATES = [
        ("PP", "#1F77FF", 33.2, 31.8, 34.6, 7),
        ("PSOE", "#E03A3E", 27.4, 26.1, 28.7, 7),
        ("VOX", "#5BC035", 12.1, 11.0, 13.2, 7),
        ("Sumar", "#D81E5B", 11.8, 10.7, 12.9, 7),
        ("Junts", "#00C2A8", 2.1, 1.6, 2.6, 5),
        ("ERC", "#F4B400", 2.3, 1.8, 2.8, 5),
        ("PNV", "#1D8042", 1.8, 1.3, 2.3, 4),
        ("Bildu", "#A4D65E", 1.7, 1.2, 2.2, 4),
    ]

    with conn.cursor() as cur:
        # Get partido ids
        cur.execute("SELECT id, nombre_corto FROM partidos")
        partido_ids = {row[1]: row[0] for row in cur.fetchall()}

        if not partido_ids:
            print("  No hay partidos en BD, saltando estimaciones...")
            return 0

        count = 0
        for nombre, color, estimacion, ic_inf, ic_sup, n_encuestas in CURRENT_ESTIMATES:
            partido_id = partido_ids.get(nombre)
            if not partido_id:
                continue
            cur.execute("""
                INSERT INTO estimaciones_voto_agregadas
                    (partido_id, fecha_estimacion, estimacion_pct, ic_95_inf, ic_95_sup, n_encuestas, modelo)
                VALUES (%s, %s, %s, %s, %s, %s, 'agregado_ponderado')
                ON CONFLICT (partido_id, fecha_estimacion) DO UPDATE SET
                    estimacion_pct=EXCLUDED.estimacion_pct,
                    ic_95_inf=EXCLUDED.ic_95_inf,
                    ic_95_sup=EXCLUDED.ic_95_sup
            """, (partido_id, now, estimacion, ic_inf, ic_sup, n_encuestas))
            count += 1
        conn.commit()
    print(f"  ✓ {count} estimaciones de voto insertadas")
    return count


# ---------------------------------------------------------------------------
# Legislación (BOE)
# ---------------------------------------------------------------------------

LEGISLACION = [
    ("Ley de Vivienda", "ley", "BOE", "Ministerio de Vivienda", "en_tramite",
     "Regula el mercado del alquiler y establece límites a los precios en zonas tensionadas.",
     ["vivienda", "alquiler", "urbanismo"], 8.5, 9.2, 8.8,
     ["PSOE", "Sumar"], ["PP", "VOX"], 127, 143),
    ("Real Decreto-Ley de Medidas Urgentes Energía", "rdn", "BOE", "Ministerio de Energía", "publicado",
     "Medidas urgentes para reducir la dependencia energética y promover renovables.",
     ["energía", "renovables", "climatica"], 7.2, 7.8, 7.1,
     ["PSOE", "Sumar", "PNV"], ["PP", "VOX"], 174, 123),
    ("Proyecto de Ley de Amnistía", "proyecto_ley", "Congreso", "Ministerio de Presidencia", "en_tramite",
     "Amnistía para actos relacionados con el proceso independentista catalán de 2017-2023.",
     ["amnistía", "cataluña", "constitucional"], 9.1, 6.8, 9.5,
     ["PSOE", "Sumar", "ERC", "Bildu", "PNV"], ["PP", "VOX"], 177, 171),
    ("Reforma del IRPF — Propuesta Sumar", "proposicion_ley", "Congreso", "Sumar", "iniciativa",
     "Reforma del Impuesto sobre la Renta para aumentar progresividad en rentas altas.",
     ["fiscal", "tributario", "IRPF"], 7.8, 8.5, 6.9,
     ["Sumar", "Podemos", "ERC", "Bildu"], ["PP", "VOX", "Junts"], 108, 192),
    ("Ley de Bienestar Animal (modificación)", "ley", "BOE", "Ministerio de Derechos Sociales", "publicado",
     "Modificación de la ley de bienestar animal tras controversias de implementación.",
     ["bienestar_animal", "mascotas"], 4.2, 4.8, 3.9,
     ["Sumar", "PSOE"], ["PP", "VOX"], 166, 134),
    ("Plan de Recuperación — Fondos Next Generation", "plan", "BOE", "Ministerio de Hacienda", "en_ejecucion",
     "Ejecución de los fondos europeos Next Generation para modernización económica.",
     ["europa", "fondos", "recuperacion", "economia"], 8.1, 9.3, 7.8,
     ["PSOE", "Sumar", "PNV"], ["VOX"], 200, 33),
]


def seed_legislacion(conn):
    if not table_exists(conn, "legislation"):
        print("  Tabla 'legislation' no existe, saltando...")
        return 0

    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        count = 0
        for titulo, tipo, fuente, dept, estado, resumen, temas, imp_eco, imp_emp, urgencia, favor, contra, votos_f, votos_c in LEGISLACION:
            fecha_pub = now - timedelta(days=count * 15)
            cur.execute("""
                INSERT INTO legislation
                    (titulo_corto, tipo, fuente, departamento, estado, resumen_ejecutivo,
                     temas, score_impacto_economico, score_impacto_empresas, score_urgencia_cliente,
                     grupos_favor, grupos_contra, votos_favor, votos_contra,
                     fecha_publicacion)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
            """, (
                titulo, tipo, fuente, dept, estado, resumen,
                json.dumps(temas), imp_eco, imp_emp, urgencia,
                json.dumps(favor), json.dumps(contra), votos_f, votos_c,
                fecha_pub
            ))
            count += 1
        conn.commit()
    print(f"  ✓ {count} legislaciones insertadas")
    return count


# ---------------------------------------------------------------------------
# Señales de inteligencia
# ---------------------------------------------------------------------------

SIGNALS = [
    ("crisis_legislativa", 9, "Bloqueo Junts en comisión de Justicia",
     "Junts vota en contra en 3 votaciones consecutivas. Riesgo de obstrucción legislativa.",
     ["Carles Puigdemont"], ["Junts", "PSOE"], "legislative", False),
    ("narrativa_media", 7, "Pico narrativa 'crisis de gobierno' en medios",
     "Cobertura +340% en 48h. Portadas convergentes en medios de derechas.",
     [], ["PP", "VOX"], "media", False),
    ("electoral_shift", 8, "PP consolida ventaja electoral: +5.8pp sobre PSOE",
     "Tres sondeos consecutivos refuerzan el liderazgo del PP. Escenario mayoría PP+VOX viable.",
     ["Alberto Núñez Feijóo"], ["PP", "PSOE"], "electoral", False),
    ("geopolitical_risk", 8, "Tensión diplomática España-Marruecos activa",
     "Exteriores convoca al embajador marroquí. Impacto en flujos migratorios y relaciones comerciales.",
     ["Teresa Ribera"], ["PSOE"], "geopolitics", False),
    ("risk_score", 7, "Índice de riesgo político supera umbral de alerta: 67/100",
     "Superado el umbral de alerta (65). Factores: legislativo, mediático, fragmentación.",
     [], [], "risk", False),
]


def seed_signals(conn):
    if not table_exists(conn, "signal_politeia"):
        print("  Tabla 'signal_politeia' no existe, saltando...")
        return 0

    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        count = 0
        for tipo, urgencia, titulo, resumen, personas, orgs, modulo, leida in SIGNALS:
            cur.execute("""
                INSERT INTO signal_politeia
                    (tipo, urgencia, titulo, resumen, personas, orgs, modulo_origen, leida, activa, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,TRUE,%s)
                ON CONFLICT DO NOTHING
            """, (tipo, urgencia, titulo, resumen,
                  json.dumps(personas), json.dumps(orgs), modulo, leida, now))
            count += 1
        conn.commit()
    print(f"  ✓ {count} señales insertadas")
    return count


# ---------------------------------------------------------------------------
# Eventos geopolíticos
# ---------------------------------------------------------------------------

GEO_EVENTS = [
    ("Marruecos", "crisis_diplomatica", "Incidente en Melilla — España convoca embajador marroquí",
     85, "ES", "Exteriores convoca al embajador marroquí por incidente en la valla de Melilla. Riesgo de crisis bilateral."),
    ("Ucrania", "conflicto_armado", "Ofensiva rusa en Járkov — riesgo de escalada OTAN",
     78, "EU", "Ofensiva rusa en la región de Járkov. España envía material de defensa. Posible activación Art. 5 OTAN."),
    ("Gaza", "crisis_humanitaria", "Catástrofe humanitaria Gaza — posición española en ONU",
     72, "INTL", "España presenta resolución en el Consejo de Seguridad. Tensiones con Israel. Riesgo de crisis diplomática bilateral."),
    ("China", "tension_comercial", "Aranceles europeos vehículos eléctricos chinos — impacto SEAT/VW",
     65, "EU", "La UE impone aranceles del 38% a VE chinos. España con SEAT/VW afectada. Riesgo de represalias sobre agroalimentario."),
    ("Venezuela", "emigracion", "Nueva ola migratoria Venezuela-España prevista",
     58, "ES", "Estimaciones INM anticipan +40.000 venezolanos adicionales en 2026. Presión sobre sistema de asilo."),
]


def seed_geo_events(conn):
    for table in ["eventos_geopoliticos", "geo_event"]:
        if table_exists(conn, table):
            now = datetime.now(timezone.utc)
            with conn.cursor() as cur:
                count = 0
                for i, (pais, tipo, titulo, impacto, ambito, descripcion) in enumerate(GEO_EVENTS):
                    fecha = now - timedelta(days=i*2)
                    cur.execute(f"""
                        INSERT INTO {table} (pais_principal, tipo_evento, titulo, impacto_espana, ambito, descripcion, fecha_evento)
                        VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING
                    """, (pais, tipo, titulo, impacto, ambito, descripcion, fecha))
                    count += 1
                conn.commit()
            print(f"  ✓ {count} eventos geopolíticos insertados en {table}")
            return count
    print("  Tabla de eventos geopolíticos no existe, saltando...")
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("🌱 ElectSim — Seed de datos demo")
    print("=" * 50)

    conn = get_conn()
    print("✓ Conectado a la base de datos\n")

    sections = [
        ("Partidos políticos", seed_partidos),
        ("Estimaciones de voto", seed_estimaciones),
        ("Encuestas (si tabla existe)", seed_encuestas),
        ("Personas públicas", seed_personas),
        ("Legislación", seed_legislacion),
        ("Señales de inteligencia", seed_signals),
        ("Eventos geopolíticos", seed_geo_events),
    ]

    total = 0
    for name, fn in sections:
        print(f"📌 {name}...")
        try:
            total += fn(conn) or 0
        except Exception as e:
            print(f"  ⚠ Error en {name}: {e}")

    conn.close()
    print(f"\n✅ Seed completado — {total} registros insertados/actualizados")
    print("\nPróximos pasos:")
    print("  1. Ejecuta: OTEL_SDK_DISABLED=true uvicorn api.main:app --reload")
    print("  2. Abre: http://localhost:3000")
    print("  3. Los datos reales aparecerán en todos los módulos")


if __name__ == "__main__":
    main()
