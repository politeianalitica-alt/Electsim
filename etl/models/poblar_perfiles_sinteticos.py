"""
poblar_perfiles_sinteticos.py

Fallback sintetico calibrado para poblar perfiles cuando no hay microdatos reales.
"""

from __future__ import annotations

import json
import os
from typing import Any

import psycopg2

from etl.logger import get_logger

logger = get_logger(__name__)


PERFILES_SINTETICOS: list[dict[str, Any]] = [
    {
        "cluster_id": 1001,
        "nombre_perfil": "Socialista de Siempre",
        "color": "#E31C1C",
        "tipo_perfil": "predefinido",
        "fuente_datos": "sintetico_calibrado",
        "peso_demografico_pct": 16.8,
        "n_respondentes": 1420,
        "ideologia_media": 3.2,
        "edad_media": 54.3,
        "cohorte_generacional": "Boomer",
        "habitat_dominante": "3",
        "clase_social_modal": "4",
        "estudios_modal": "3",
        "situacion_laboral_modal": "3",
        "eje_redistribucion": 2.8,
        "eje_inmigracion": 4.1,
        "eje_territorial": 4.8,
        "eje_valores": 3.4,
        "satisfaccion_demo_media": 2.4,
        "confianza_partidos_media": 3.2,
        "interes_politica_media": 2.8,
        "eco_personal_media": 2.9,
        "eco_espana_media": 2.5,
        "pct_pesimistas_eco": 41.2,
        "renta_media_anual": 21400.0,
        "pct_alquiler": 18.3,
        "pct_paro": 9.1,
        "voto": [
            {"partido": "PSOE", "pct_intencion": 71.4, "pct_recuerdo": 74.1},
            {"partido": "SUMAR", "pct_intencion": 9.8, "pct_recuerdo": 8.2},
            {"partido": "PP", "pct_intencion": 5.1, "pct_recuerdo": 4.3},
            {"partido": "Abstención", "pct_intencion": 8.2, "pct_recuerdo": 7.9},
            {"partido": "NS/NC", "pct_intencion": 5.5, "pct_recuerdo": 5.5},
        ],
        "problemas": [
            {"problema": "Economía", "pct": 28.4, "ranking": 1},
            {"problema": "Sanidad pública", "pct": 22.1, "ranking": 2},
            {"problema": "Pensiones", "pct": 18.7, "ranking": 3},
            {"problema": "Paro / Empleo", "pct": 12.3, "ranking": 4},
            {"problema": "Vivienda y alquiler", "pct": 9.8, "ranking": 5},
            {"problema": "Corrupción", "pct": 8.7, "ranking": 6},
        ],
        "ccaa": [
            {"ccaa": "Andalucía", "pct": 19.2},
            {"ccaa": "Madrid", "pct": 13.8},
            {"ccaa": "C. Valenciana", "pct": 10.4},
            {"ccaa": "Cataluña", "pct": 10.1},
            {"ccaa": "C y León", "pct": 7.3},
            {"ccaa": "Galicia", "pct": 6.8},
            {"ccaa": "C-La Mancha", "pct": 5.9},
            {"ccaa": "Extremadura", "pct": 4.2},
            {"ccaa": "Otros", "pct": 22.3},
        ],
        "ejes": [
            {"eje": "ideologia", "media": 3.2, "mediana": 3.0, "sd": 1.4, "pct_izq": 68.2, "pct_centro": 20.1, "pct_der": 11.7},
            {"eje": "redistribucion", "media": 2.8, "mediana": 3.0, "sd": 1.6, "pct_izq": 71.4, "pct_centro": 18.3, "pct_der": 10.3},
            {"eje": "inmigracion", "media": 4.1, "mediana": 4.0, "sd": 2.1, "pct_izq": 54.3, "pct_centro": 24.8, "pct_der": 20.9},
            {"eje": "territorial", "media": 4.8, "mediana": 5.0, "sd": 2.4, "pct_izq": 43.2, "pct_centro": 28.9, "pct_der": 27.9},
            {"eje": "valores", "media": 3.4, "mediana": 3.0, "sd": 1.8, "pct_izq": 62.1, "pct_centro": 22.4, "pct_der": 15.5},
        ],
    },
    {
        "cluster_id": 1002,
        "nombre_perfil": "Joven Progresista Urbano",
        "color": "#6B21D6",
        "tipo_perfil": "predefinido",
        "fuente_datos": "sintetico_calibrado",
        "peso_demografico_pct": 12.3,
        "n_respondentes": 1040,
        "ideologia_media": 2.8,
        "edad_media": 27.1,
        "cohorte_generacional": "GenZ",
        "habitat_dominante": "6",
        "clase_social_modal": "3",
        "estudios_modal": "6",
        "situacion_laboral_modal": "1",
        "eje_redistribucion": 2.1,
        "eje_inmigracion": 2.8,
        "eje_territorial": 5.2,
        "eje_valores": 2.3,
        "satisfaccion_demo_media": 1.9,
        "confianza_partidos_media": 2.4,
        "interes_politica_media": 2.9,
        "eco_personal_media": 2.3,
        "eco_espana_media": 2.1,
        "pct_pesimistas_eco": 58.4,
        "renta_media_anual": 15800.0,
        "pct_alquiler": 62.1,
        "pct_paro": 22.3,
        "voto": [
            {"partido": "SUMAR", "pct_intencion": 38.2, "pct_recuerdo": 34.1},
            {"partido": "PSOE", "pct_intencion": 22.4, "pct_recuerdo": 24.8},
            {"partido": "Abstención", "pct_intencion": 18.9, "pct_recuerdo": 21.3},
            {"partido": "PP", "pct_intencion": 8.3, "pct_recuerdo": 7.4},
            {"partido": "NS/NC", "pct_intencion": 12.2, "pct_recuerdo": 12.4},
        ],
        "problemas": [
            {"problema": "Vivienda y alquiler", "pct": 42.3, "ranking": 1},
            {"problema": "Paro / Empleo", "pct": 24.8, "ranking": 2},
            {"problema": "Cambio climático", "pct": 12.4, "ranking": 3},
            {"problema": "Igualdad de género", "pct": 9.1, "ranking": 4},
            {"problema": "Economía", "pct": 7.2, "ranking": 5},
            {"problema": "Educación", "pct": 4.2, "ranking": 6},
        ],
        "ccaa": [
            {"ccaa": "Madrid", "pct": 22.4},
            {"ccaa": "Cataluña", "pct": 18.3},
            {"ccaa": "C. Valenciana", "pct": 11.2},
            {"ccaa": "Andalucía", "pct": 10.8},
            {"ccaa": "País Vasco", "pct": 7.4},
            {"ccaa": "Otros", "pct": 29.9},
        ],
        "ejes": [
            {"eje": "ideologia", "media": 2.8, "mediana": 3.0, "sd": 1.3, "pct_izq": 78.4, "pct_centro": 14.2, "pct_der": 7.4},
            {"eje": "redistribucion", "media": 2.1, "mediana": 2.0, "sd": 1.4, "pct_izq": 84.2, "pct_centro": 10.3, "pct_der": 5.5},
            {"eje": "inmigracion", "media": 2.8, "mediana": 3.0, "sd": 1.8, "pct_izq": 71.3, "pct_centro": 18.4, "pct_der": 10.3},
            {"eje": "territorial", "media": 5.2, "mediana": 5.0, "sd": 2.6, "pct_izq": 38.4, "pct_centro": 26.3, "pct_der": 35.3},
            {"eje": "valores", "media": 2.3, "mediana": 2.0, "sd": 1.5, "pct_izq": 82.1, "pct_centro": 12.4, "pct_der": 5.5},
        ],
    },
    {
        "cluster_id": 1003,
        "nombre_perfil": "Popular Clásico",
        "color": "#1A56DB",
        "tipo_perfil": "predefinido",
        "fuente_datos": "sintetico_calibrado",
        "peso_demografico_pct": 19.4,
        "n_respondentes": 1640,
        "ideologia_media": 7.4,
        "edad_media": 58.7,
        "cohorte_generacional": "Boomer",
        "habitat_dominante": "4",
        "clase_social_modal": "2",
        "estudios_modal": "4",
        "situacion_laboral_modal": "3",
        "eje_redistribucion": 7.2,
        "eje_inmigracion": 7.8,
        "eje_territorial": 2.8,
        "eje_valores": 7.1,
        "satisfaccion_demo_media": 2.1,
        "confianza_partidos_media": 3.8,
        "interes_politica_media": 2.7,
        "eco_personal_media": 3.1,
        "eco_espana_media": 2.4,
        "pct_pesimistas_eco": 52.3,
        "renta_media_anual": 28400.0,
        "pct_alquiler": 12.4,
        "pct_paro": 6.8,
        "voto": [
            {"partido": "PP", "pct_intencion": 74.2, "pct_recuerdo": 71.8},
            {"partido": "VOX", "pct_intencion": 9.8, "pct_recuerdo": 10.4},
            {"partido": "Ciudadanos", "pct_intencion": 3.2, "pct_recuerdo": 5.1},
            {"partido": "PSOE", "pct_intencion": 4.8, "pct_recuerdo": 4.2},
            {"partido": "Abstención", "pct_intencion": 4.8, "pct_recuerdo": 5.2},
            {"partido": "NS/NC", "pct_intencion": 3.2, "pct_recuerdo": 3.3},
        ],
        "problemas": [
            {"problema": "Economía", "pct": 31.2, "ranking": 1},
            {"problema": "Inmigración", "pct": 24.8, "ranking": 2},
            {"problema": "Corrupción", "pct": 18.4, "ranking": 3},
            {"problema": "Paro / Empleo", "pct": 12.1, "ranking": 4},
            {"problema": "Política en general", "pct": 8.3, "ranking": 5},
            {"problema": "Independentismo / Unidad España", "pct": 5.2, "ranking": 6},
        ],
        "ccaa": [
            {"ccaa": "Madrid", "pct": 18.4},
            {"ccaa": "Andalucía", "pct": 17.2},
            {"ccaa": "C. Valenciana", "pct": 9.8},
            {"ccaa": "Cataluña", "pct": 8.4},
            {"ccaa": "C y León", "pct": 8.1},
            {"ccaa": "Galicia", "pct": 7.2},
            {"ccaa": "Murcia", "pct": 5.4},
            {"ccaa": "Otros", "pct": 25.5},
        ],
        "ejes": [
            {"eje": "ideologia", "media": 7.4, "mediana": 7.0, "sd": 1.5, "pct_izq": 8.2, "pct_centro": 18.4, "pct_der": 73.4},
            {"eje": "redistribucion", "media": 7.2, "mediana": 7.0, "sd": 1.7, "pct_izq": 9.4, "pct_centro": 17.3, "pct_der": 73.3},
            {"eje": "inmigracion", "media": 7.8, "mediana": 8.0, "sd": 1.8, "pct_izq": 7.2, "pct_centro": 14.8, "pct_der": 78.0},
            {"eje": "territorial", "media": 2.8, "mediana": 3.0, "sd": 1.9, "pct_izq": 72.4, "pct_centro": 18.3, "pct_der": 9.3},
            {"eje": "valores", "media": 7.1, "mediana": 7.0, "sd": 1.6, "pct_izq": 8.4, "pct_centro": 19.2, "pct_der": 72.4},
        ],
    },
    {
        "cluster_id": 1004,
        "nombre_perfil": "Votante de VOX",
        "color": "#5E9E23",
        "tipo_perfil": "predefinido",
        "fuente_datos": "sintetico_calibrado",
        "peso_demografico_pct": 11.2,
        "n_respondentes": 945,
        "ideologia_media": 8.6,
        "edad_media": 44.2,
        "cohorte_generacional": "GenX",
        "habitat_dominante": "3",
        "clase_social_modal": "4",
        "estudios_modal": "3",
        "situacion_laboral_modal": "1",
        "eje_redistribucion": 8.4,
        "eje_inmigracion": 9.1,
        "eje_territorial": 1.8,
        "eje_valores": 8.8,
        "satisfaccion_demo_media": 1.6,
        "confianza_partidos_media": 2.1,
        "interes_politica_media": 2.6,
        "eco_personal_media": 2.6,
        "eco_espana_media": 2.0,
        "pct_pesimistas_eco": 68.4,
        "renta_media_anual": 22100.0,
        "pct_alquiler": 24.8,
        "pct_paro": 11.4,
        "voto": [
            {"partido": "VOX", "pct_intencion": 72.4, "pct_recuerdo": 68.2},
            {"partido": "PP", "pct_intencion": 14.8, "pct_recuerdo": 16.4},
            {"partido": "Abstención", "pct_intencion": 8.4, "pct_recuerdo": 9.8},
            {"partido": "NS/NC", "pct_intencion": 4.4, "pct_recuerdo": 5.6},
        ],
        "problemas": [
            {"problema": "Inmigración", "pct": 38.4, "ranking": 1},
            {"problema": "Economía", "pct": 22.1, "ranking": 2},
            {"problema": "Independentismo / Unidad España", "pct": 18.4, "ranking": 3},
            {"problema": "Paro / Empleo", "pct": 10.3, "ranking": 4},
            {"problema": "Inseguridad ciudadana", "pct": 7.4, "ranking": 5},
            {"problema": "Crisis de valores", "pct": 3.4, "ranking": 6},
        ],
        "ccaa": [
            {"ccaa": "Madrid", "pct": 16.8},
            {"ccaa": "Andalucía", "pct": 16.2},
            {"ccaa": "C. Valenciana", "pct": 10.4},
            {"ccaa": "C y León", "pct": 9.2},
            {"ccaa": "C-La Mancha", "pct": 7.8},
            {"ccaa": "Murcia", "pct": 7.2},
            {"ccaa": "Otros", "pct": 32.4},
        ],
        "ejes": [
            {"eje": "ideologia", "media": 8.6, "mediana": 9.0, "sd": 1.2, "pct_izq": 2.4, "pct_centro": 8.4, "pct_der": 89.2},
            {"eje": "redistribucion", "media": 8.4, "mediana": 9.0, "sd": 1.4, "pct_izq": 3.2, "pct_centro": 9.8, "pct_der": 87.0},
            {"eje": "inmigracion", "media": 9.1, "mediana": 9.0, "sd": 1.1, "pct_izq": 1.8, "pct_centro": 6.4, "pct_der": 91.8},
            {"eje": "territorial", "media": 1.8, "mediana": 2.0, "sd": 1.3, "pct_izq": 89.4, "pct_centro": 8.2, "pct_der": 2.4},
            {"eje": "valores", "media": 8.8, "mediana": 9.0, "sd": 1.2, "pct_izq": 2.1, "pct_centro": 7.4, "pct_der": 90.5},
        ],
    },
    {
        "cluster_id": 1005,
        "nombre_perfil": "Centro Pragmático",
        "color": "#F59E0B",
        "tipo_perfil": "predefinido",
        "fuente_datos": "sintetico_calibrado",
        "peso_demografico_pct": 14.8,
        "n_respondentes": 1250,
        "ideologia_media": 5.1,
        "edad_media": 46.8,
        "cohorte_generacional": "GenX",
        "habitat_dominante": "4",
        "clase_social_modal": "3",
        "estudios_modal": "4",
        "situacion_laboral_modal": "1",
        "eje_redistribucion": 5.2,
        "eje_inmigracion": 5.8,
        "eje_territorial": 3.9,
        "eje_valores": 5.1,
        "satisfaccion_demo_media": 2.2,
        "confianza_partidos_media": 2.8,
        "interes_politica_media": 2.2,
        "eco_personal_media": 3.0,
        "eco_espana_media": 2.6,
        "pct_pesimistas_eco": 46.8,
        "renta_media_anual": 26800.0,
        "pct_alquiler": 21.4,
        "pct_paro": 8.4,
        "voto": [
            {"partido": "PP", "pct_intencion": 38.4, "pct_recuerdo": 36.8},
            {"partido": "PSOE", "pct_intencion": 28.4, "pct_recuerdo": 30.2},
            {"partido": "Abstención", "pct_intencion": 14.8, "pct_recuerdo": 14.4},
            {"partido": "SUMAR", "pct_intencion": 8.4, "pct_recuerdo": 7.8},
            {"partido": "VOX", "pct_intencion": 5.4, "pct_recuerdo": 5.2},
            {"partido": "NS/NC", "pct_intencion": 4.6, "pct_recuerdo": 5.6},
        ],
        "problemas": [
            {"problema": "Economía", "pct": 32.4, "ranking": 1},
            {"problema": "Paro / Empleo", "pct": 22.8, "ranking": 2},
            {"problema": "Sanidad pública", "pct": 14.4, "ranking": 3},
            {"problema": "Vivienda y alquiler", "pct": 12.8, "ranking": 4},
            {"problema": "Corrupción", "pct": 10.4, "ranking": 5},
            {"problema": "Pensiones", "pct": 7.2, "ranking": 6},
        ],
        "ccaa": [
            {"ccaa": "Madrid", "pct": 20.4},
            {"ccaa": "Andalucía", "pct": 16.8},
            {"ccaa": "Cataluña", "pct": 12.4},
            {"ccaa": "C. Valenciana", "pct": 10.8},
            {"ccaa": "Otros", "pct": 39.6},
        ],
        "ejes": [
            {"eje": "ideologia", "media": 5.1, "mediana": 5.0, "sd": 1.4, "pct_izq": 24.8, "pct_centro": 48.4, "pct_der": 26.8},
            {"eje": "redistribucion", "media": 5.2, "mediana": 5.0, "sd": 1.8, "pct_izq": 28.4, "pct_centro": 42.8, "pct_der": 28.8},
            {"eje": "inmigracion", "media": 5.8, "mediana": 6.0, "sd": 2.1, "pct_izq": 28.4, "pct_centro": 34.8, "pct_der": 36.8},
            {"eje": "territorial", "media": 3.9, "mediana": 4.0, "sd": 2.0, "pct_izq": 52.4, "pct_centro": 26.8, "pct_der": 20.8},
            {"eje": "valores", "media": 5.1, "mediana": 5.0, "sd": 1.6, "pct_izq": 26.8, "pct_centro": 44.8, "pct_der": 28.4},
        ],
    },
    {
        "cluster_id": 1006,
        "nombre_perfil": "Abstencionista Desencantado",
        "color": "#6B7280",
        "tipo_perfil": "predefinido",
        "fuente_datos": "sintetico_calibrado",
        "peso_demografico_pct": 18.4,
        "n_respondentes": 1554,
        "ideologia_media": 4.8,
        "edad_media": 38.4,
        "cohorte_generacional": "Millennial",
        "habitat_dominante": "3",
        "clase_social_modal": "4",
        "estudios_modal": "3",
        "situacion_laboral_modal": "1",
        "eje_redistribucion": 4.4,
        "eje_inmigracion": 5.2,
        "eje_territorial": 5.1,
        "eje_valores": 4.8,
        "satisfaccion_demo_media": 1.8,
        "confianza_partidos_media": 1.9,
        "interes_politica_media": 1.6,
        "eco_personal_media": 2.4,
        "eco_espana_media": 2.2,
        "pct_pesimistas_eco": 62.4,
        "renta_media_anual": 18400.0,
        "pct_alquiler": 42.8,
        "pct_paro": 18.4,
        "voto": [
            {"partido": "Abstención", "pct_intencion": 62.4, "pct_recuerdo": 58.4},
            {"partido": "NS/NC", "pct_intencion": 18.4, "pct_recuerdo": 20.8},
            {"partido": "PSOE", "pct_intencion": 7.8, "pct_recuerdo": 9.4},
            {"partido": "PP", "pct_intencion": 5.8, "pct_recuerdo": 6.2},
            {"partido": "SUMAR", "pct_intencion": 5.6, "pct_recuerdo": 5.2},
        ],
        "problemas": [
            {"problema": "Economía", "pct": 28.4, "ranking": 1},
            {"problema": "Paro / Empleo", "pct": 24.8, "ranking": 2},
            {"problema": "Vivienda y alquiler", "pct": 18.4, "ranking": 3},
            {"problema": "Política en general", "pct": 14.8, "ranking": 4},
            {"problema": "Corrupción", "pct": 8.4, "ranking": 5},
            {"problema": "Sanidad pública", "pct": 5.2, "ranking": 6},
        ],
        "ccaa": [
            {"ccaa": "Andalucía", "pct": 20.4},
            {"ccaa": "Madrid", "pct": 16.8},
            {"ccaa": "C. Valenciana", "pct": 10.8},
            {"ccaa": "Cataluña", "pct": 10.4},
            {"ccaa": "Otros", "pct": 41.6},
        ],
        "ejes": [
            {"eje": "ideologia", "media": 4.8, "mediana": 5.0, "sd": 2.1, "pct_izq": 34.8, "pct_centro": 38.4, "pct_der": 26.8},
            {"eje": "redistribucion", "media": 4.4, "mediana": 5.0, "sd": 2.2, "pct_izq": 38.4, "pct_centro": 34.8, "pct_der": 26.8},
            {"eje": "inmigracion", "media": 5.2, "mediana": 5.0, "sd": 2.4, "pct_izq": 34.8, "pct_centro": 28.4, "pct_der": 36.8},
            {"eje": "territorial", "media": 5.1, "mediana": 5.0, "sd": 2.3, "pct_izq": 36.8, "pct_centro": 28.4, "pct_der": 34.8},
            {"eje": "valores", "media": 4.8, "mediana": 5.0, "sd": 2.0, "pct_izq": 34.8, "pct_centro": 36.4, "pct_der": 28.8},
        ],
    },
]


def _normalize_pg_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgresql+psycopg://"):
        return "postgresql://" + url[len("postgresql+psycopg://") :]
    if url.startswith("postgresql+psycopg2://"):
        return "postgresql://" + url[len("postgresql+psycopg2://") :]
    return url


def poblar_perfil(conn: Any, perfil: dict[str, Any]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO perfiles_votante (
                cluster_id, nombre_perfil, label, color, tipo_perfil, fuente_datos,
                peso_demografico_pct, n_respondentes, ideologia_media, edad_media,
                cohorte_generacional, habitat_dominante, clase_social_modal,
                estudios_modal, situacion_laboral_modal,
                eje_redistribucion, eje_inmigracion, eje_territorial, eje_valores,
                satisfaccion_demo_media, confianza_partidos_media, interes_politica_media,
                eco_personal_media, eco_espana_media, pct_pesimistas_eco,
                renta_media_anual, pct_alquiler, pct_paro,
                distribucion_voto_json, fecha_calculo
            ) VALUES (
                %(cluster_id)s, %(nombre_perfil)s, %(nombre_perfil)s, %(color)s, %(tipo_perfil)s, %(fuente_datos)s,
                %(peso_demografico_pct)s, %(n_respondentes)s, %(ideologia_media)s, %(edad_media)s,
                %(cohorte_generacional)s, %(habitat_dominante)s, %(clase_social_modal)s,
                %(estudios_modal)s, %(situacion_laboral_modal)s,
                %(eje_redistribucion)s, %(eje_inmigracion)s, %(eje_territorial)s, %(eje_valores)s,
                %(satisfaccion_demo_media)s, %(confianza_partidos_media)s, %(interes_politica_media)s,
                %(eco_personal_media)s, %(eco_espana_media)s, %(pct_pesimistas_eco)s,
                %(renta_media_anual)s, %(pct_alquiler)s, %(pct_paro)s,
                %(distribucion_voto_json)s::jsonb, NOW()
            )
            ON CONFLICT (cluster_id) DO UPDATE SET
                nombre_perfil = EXCLUDED.nombre_perfil,
                label = EXCLUDED.label,
                color = EXCLUDED.color,
                tipo_perfil = EXCLUDED.tipo_perfil,
                fuente_datos = EXCLUDED.fuente_datos,
                peso_demografico_pct = EXCLUDED.peso_demografico_pct,
                n_respondentes = EXCLUDED.n_respondentes,
                ideologia_media = EXCLUDED.ideologia_media,
                edad_media = EXCLUDED.edad_media,
                cohorte_generacional = EXCLUDED.cohorte_generacional,
                habitat_dominante = EXCLUDED.habitat_dominante,
                clase_social_modal = EXCLUDED.clase_social_modal,
                estudios_modal = EXCLUDED.estudios_modal,
                situacion_laboral_modal = EXCLUDED.situacion_laboral_modal,
                eje_redistribucion = EXCLUDED.eje_redistribucion,
                eje_inmigracion = EXCLUDED.eje_inmigracion,
                eje_territorial = EXCLUDED.eje_territorial,
                eje_valores = EXCLUDED.eje_valores,
                satisfaccion_demo_media = EXCLUDED.satisfaccion_demo_media,
                confianza_partidos_media = EXCLUDED.confianza_partidos_media,
                interes_politica_media = EXCLUDED.interes_politica_media,
                eco_personal_media = EXCLUDED.eco_personal_media,
                eco_espana_media = EXCLUDED.eco_espana_media,
                pct_pesimistas_eco = EXCLUDED.pct_pesimistas_eco,
                renta_media_anual = EXCLUDED.renta_media_anual,
                pct_alquiler = EXCLUDED.pct_alquiler,
                pct_paro = EXCLUDED.pct_paro,
                distribucion_voto_json = EXCLUDED.distribucion_voto_json,
                fecha_calculo = NOW()
            """,
            {
                **{k: v for k, v in perfil.items() if k not in {"voto", "problemas", "ccaa", "ejes"}},
                "distribucion_voto_json": json.dumps(perfil.get("voto", []), ensure_ascii=False),
            },
        )

        cid = int(perfil["cluster_id"])
        for tabla in ("perfil_voto", "perfil_problemas", "perfil_ccaa", "perfil_ejes"):
            cur.execute(f"DELETE FROM {tabla} WHERE cluster_id = %s", (cid,))

        for v in perfil.get("voto", []):
            cur.execute(
                """
                INSERT INTO perfil_voto (cluster_id, partido, pct_intencion, pct_recuerdo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (cluster_id, partido) DO UPDATE SET
                    pct_intencion = EXCLUDED.pct_intencion,
                    pct_recuerdo = EXCLUDED.pct_recuerdo
                """,
                (cid, v["partido"], v.get("pct_intencion"), v.get("pct_recuerdo")),
            )

        for p in perfil.get("problemas", []):
            cur.execute(
                """
                INSERT INTO perfil_problemas (cluster_id, problema, pct, ranking)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (cluster_id, problema) DO UPDATE SET
                    pct = EXCLUDED.pct,
                    ranking = EXCLUDED.ranking
                """,
                (cid, p["problema"], p["pct"], p.get("ranking")),
            )

        for c in perfil.get("ccaa", []):
            cur.execute(
                """
                INSERT INTO perfil_ccaa (cluster_id, ccaa, pct)
                VALUES (%s, %s, %s)
                ON CONFLICT (cluster_id, ccaa) DO UPDATE SET
                    pct = EXCLUDED.pct
                """,
                (cid, c["ccaa"], c["pct"]),
            )

        for e in perfil.get("ejes", []):
            cur.execute(
                """
                INSERT INTO perfil_ejes
                    (cluster_id, eje, media, mediana, sd, pct_izq, pct_centro, pct_der)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (cluster_id, eje) DO UPDATE SET
                    media = EXCLUDED.media,
                    mediana = EXCLUDED.mediana,
                    sd = EXCLUDED.sd,
                    pct_izq = EXCLUDED.pct_izq,
                    pct_centro = EXCLUDED.pct_centro,
                    pct_der = EXCLUDED.pct_der
                """,
                (
                    cid,
                    e["eje"],
                    e.get("media"),
                    e.get("mediana"),
                    e.get("sd"),
                    e.get("pct_izq"),
                    e.get("pct_centro"),
                    e.get("pct_der"),
                ),
            )

    conn.commit()
    logger.info("Perfil %s (%s) poblado correctamente.", perfil["cluster_id"], perfil["nombre_perfil"])


def poblar_todos(conn: Any) -> None:
    for perfil in PERFILES_SINTETICOS:
        try:
            poblar_perfil(conn, perfil)
        except Exception as exc:
            logger.error("Error poblando perfil %s: %s", perfil.get("cluster_id"), exc)
            conn.rollback()


if __name__ == "__main__":
    db_url = _normalize_pg_url(os.environ.get("DATABASE_URL", ""))
    if not db_url:
        raise RuntimeError("DATABASE_URL no definida")

    conn = psycopg2.connect(db_url)
    try:
        poblar_todos(conn)
        print(f"✓ {len(PERFILES_SINTETICOS)} perfiles sintéticos poblados correctamente.")
    finally:
        conn.close()
