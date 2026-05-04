"""
Scraper de la Red Diplomática Española — MAEC.

Fuente: Ministerio de Asuntos Exteriores, Unión Europea y Cooperación.
https://www.exteriores.gob.es/es/Ministerio/Paginas/Contacto.aspx

La red consular española incluye:
  - 116 embajadas
  - 99 consulados generales / secciones consulares
  - 87 oficinas económicas y comerciales (ICEX)
  - 89 centros / aulas del Instituto Cervantes
  - 31 oficinas AECID

Datos de seed: directorio MAEC 2026 (principales oficinas).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Seed Red Diplomática MAEC ─────────────────────────────────────────────────
# tipo: embajada | consulado | oficina_comercial | cervantes | aecid | multiple
SEED_RED_DIPLOMATICA: list[dict[str, Any]] = [
    # ── Europa ──────────────────────────────────────────────────────────────
    {"id": "maec_BEL_emb", "pais": "Bélgica / UE", "iso3": "BEL",
     "ciudad": "Bruselas", "lat": 50.85, "lon": 4.35,
     "tipo": "multiple", "unidades": ["Embajada", "Representación Permanente UE", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.95,
     "comentario": "Hub diplomático clave — instituciones UE y OTAN"},
    {"id": "maec_DEU_emb", "pais": "Alemania", "iso3": "DEU",
     "ciudad": "Berlín", "lat": 52.52, "lon": 13.41,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.90,
     "comentario": "Socio económico principal UE"},
    {"id": "maec_FRA_emb", "pais": "Francia", "iso3": "FRA",
     "ciudad": "París", "lat": 48.87, "lon": 2.30,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes", "AECID"],
     "nivel_alerta": "verde", "score_relevancia": 0.95,
     "comentario": "Frontera y principal socio bilateral europeo"},
    {"id": "maec_GBR_emb", "pais": "Reino Unido", "iso3": "GBR",
     "ciudad": "Londres", "lat": 51.49, "lon": -0.18,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "amarillo", "score_relevancia": 0.88,
     "comentario": "Post-Brexit: negociación Gibraltar, 148k españoles"},
    {"id": "maec_ITA_emb", "pais": "Italia", "iso3": "ITA",
     "ciudad": "Roma", "lat": 41.90, "lon": 12.50,
     "tipo": "multiple", "unidades": ["Embajada", "MAEC Santa Sede", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.82},
    {"id": "maec_PRT_emb", "pais": "Portugal", "iso3": "PRT",
     "ciudad": "Lisboa", "lat": 38.72, "lon": -9.14,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.90,
     "comentario": "Vecino e integración iberica — MIBEL"},
    {"id": "maec_NLD_emb", "pais": "Países Bajos", "iso3": "NLD",
     "ciudad": "La Haya", "lat": 52.08, "lon": 4.31,
     "tipo": "multiple", "unidades": ["Embajada", "CIJ/CPI", "ICEX"],
     "nivel_alerta": "verde", "score_relevancia": 0.78},
    {"id": "maec_CHE_emb", "pais": "Suiza", "iso3": "CHE",
     "ciudad": "Berna", "lat": 46.95, "lon": 7.45,
     "tipo": "multiple", "unidades": ["Embajada", "OIT/OMS Ginebra", "ICEX"],
     "nivel_alerta": "verde", "score_relevancia": 0.80},
    {"id": "maec_RUS_emb", "pais": "Rusia", "iso3": "RUS",
     "ciudad": "Moscú", "lat": 55.75, "lon": 37.62,
     "tipo": "embajada", "unidades": ["Embajada"],
     "nivel_alerta": "rojo", "score_relevancia": 0.75,
     "comentario": "Actividad reducida — sanciones UE y guerra Ucrania"},
    {"id": "maec_UKR_emb", "pais": "Ucrania", "iso3": "UKR",
     "ciudad": "Kiev", "lat": 50.45, "lon": 30.52,
     "tipo": "embajada", "unidades": ["Embajada (personal reducido)"],
     "nivel_alerta": "rojo", "score_relevancia": 0.85,
     "comentario": "Personal reforzado por asistencia humanitaria y apoyo UE"},
    # ── Africa y Oriente Medio ────────────────────────────────────────────
    {"id": "maec_MAR_emb", "pais": "Marruecos", "iso3": "MAR",
     "ciudad": "Rabat", "lat": 33.99, "lon": -6.85,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes", "AECID"],
     "nivel_alerta": "verde", "score_relevancia": 0.95,
     "comentario": "Vecino estratégico — migración, energía, comercio"},
    {"id": "maec_DZA_emb", "pais": "Argelia", "iso3": "DZA",
     "ciudad": "Argel", "lat": 36.73, "lon": 3.09,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX"],
     "nivel_alerta": "amarillo", "score_relevancia": 0.90,
     "comentario": "Proveedor gas crítico — Medgaz 28.5% del mix"},
    {"id": "maec_TUN_emb", "pais": "Túnez", "iso3": "TUN",
     "ciudad": "Túnez", "lat": 36.82, "lon": 10.17,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "AECID"],
     "nivel_alerta": "amarillo", "score_relevancia": 0.75,
     "comentario": "Ruta migratoria central Mediterráneo"},
    {"id": "maec_LBY_emb", "pais": "Libia", "iso3": "LBY",
     "ciudad": "Trípoli", "lat": 32.89, "lon": 13.18,
     "tipo": "embajada", "unidades": ["Embajada (presencia mínima)"],
     "nivel_alerta": "rojo", "score_relevancia": 0.72,
     "comentario": "País en conflicto — intereses energéticos Repsol en riesgo"},
    {"id": "maec_EGY_emb", "pais": "Egipto", "iso3": "EGY",
     "ciudad": "El Cairo", "lat": 30.06, "lon": 31.24,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes", "AECID"],
     "nivel_alerta": "amarillo", "score_relevancia": 0.78},
    {"id": "maec_SAU_emb", "pais": "Arabia Saudí", "iso3": "SAU",
     "ciudad": "Riad", "lat": 24.69, "lon": 46.72,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX"],
     "nivel_alerta": "verde", "score_relevancia": 0.82,
     "comentario": "Energía, contratos defensa, Aramco"},
    {"id": "maec_ISR_emb", "pais": "Israel", "iso3": "ISR",
     "ciudad": "Tel Aviv", "lat": 32.08, "lon": 34.78,
     "tipo": "embajada", "unidades": ["Embajada"],
     "nivel_alerta": "rojo", "score_relevancia": 0.80,
     "comentario": "Tensión por reconocimiento Palestina — relaciones suspendidas parcialmente"},
    {"id": "maec_IRN_emb", "pais": "Irán", "iso3": "IRN",
     "ciudad": "Teherán", "lat": 35.69, "lon": 51.39,
     "tipo": "embajada", "unidades": ["Embajada"],
     "nivel_alerta": "rojo", "score_relevancia": 0.65,
     "comentario": "Actividad mínima — sanciones nucleares"},
    {"id": "maec_TUR_emb", "pais": "Turquía", "iso3": "TUR",
     "ciudad": "Ankara", "lat": 39.93, "lon": 32.86,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.78,
     "comentario": "Socio OTAN — controversia migración Mediterráneo"},
    {"id": "maec_NGA_emb", "pais": "Nigeria", "iso3": "NGA",
     "ciudad": "Abuya", "lat": 9.07, "lon": 7.40,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX"],
     "nivel_alerta": "amarillo", "score_relevancia": 0.75,
     "comentario": "14% importaciones crudo español — Repsol operaciones"},
    {"id": "maec_ZAF_emb", "pais": "Sudáfrica", "iso3": "ZAF",
     "ciudad": "Pretoria", "lat": -25.75, "lon": 28.19,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.68},
    # ── Americas ──────────────────────────────────────────────────────────
    {"id": "maec_USA_emb", "pais": "Estados Unidos", "iso3": "USA",
     "ciudad": "Washington DC", "lat": 38.90, "lon": -77.04,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.92,
     "comentario": "OTAN, 12% crudo, inversiones, diáspora 98k"},
    {"id": "maec_MEX_emb", "pais": "México", "iso3": "MEX",
     "ciudad": "Ciudad de México", "lat": 19.43, "lon": -99.13,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes", "AECID"],
     "nivel_alerta": "verde", "score_relevancia": 0.88,
     "comentario": "180k españoles — BBVA, Santander, Telefónica"},
    {"id": "maec_ARG_emb", "pais": "Argentina", "iso3": "ARG",
     "ciudad": "Buenos Aires", "lat": -34.60, "lon": -58.38,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes", "AECID"],
     "nivel_alerta": "amarillo", "score_relevancia": 0.90,
     "comentario": "465k españoles — mayor comunidad mundial"},
    {"id": "maec_VEN_emb", "pais": "Venezuela", "iso3": "VEN",
     "ciudad": "Caracas", "lat": 10.49, "lon": -66.88,
     "tipo": "embajada", "unidades": ["Embajada"],
     "nivel_alerta": "rojo", "score_relevancia": 0.92,
     "comentario": "320k españoles — crisis régimen Maduro — plan consular emergencia"},
    {"id": "maec_BRA_emb", "pais": "Brasil", "iso3": "BRA",
     "ciudad": "Brasilia", "lat": -15.78, "lon": -47.93,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.85,
     "comentario": "95k españoles — Santander, Telefónica, Iberdrola"},
    {"id": "maec_COL_emb", "pais": "Colombia", "iso3": "COL",
     "ciudad": "Bogotá", "lat": 4.71, "lon": -74.07,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes", "AECID"],
     "nivel_alerta": "verde", "score_relevancia": 0.82,
     "comentario": "138k españoles — misión ONU verificación paz"},
    {"id": "maec_CHI_emb", "pais": "Chile", "iso3": "CHL",
     "ciudad": "Santiago", "lat": -33.46, "lon": -70.65,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.78},
    {"id": "maec_CUB_emb", "pais": "Cuba", "iso3": "CUB",
     "ciudad": "La Habana", "lat": 23.13, "lon": -82.38,
     "tipo": "multiple", "unidades": ["Embajada", "Cervantes", "AECID"],
     "nivel_alerta": "amarillo", "score_relevancia": 0.78,
     "comentario": "145k españoles — compleja relación bilateral"},
    {"id": "maec_CAN_emb", "pais": "Canadá", "iso3": "CAN",
     "ciudad": "Ottawa", "lat": 45.42, "lon": -75.70,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.70},
    # ── Asia-Pacífico ─────────────────────────────────────────────────────
    {"id": "maec_CHN_emb", "pais": "China", "iso3": "CHN",
     "ciudad": "Pekín", "lat": 39.91, "lon": 116.39,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX"],
     "nivel_alerta": "amarillo", "score_relevancia": 0.85,
     "comentario": "Socio comercial e inversor — tensiones UE sobre subvenciones"},
    {"id": "maec_JPN_emb", "pais": "Japón", "iso3": "JPN",
     "ciudad": "Tokio", "lat": 35.69, "lon": 139.74,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX", "Cervantes"],
     "nivel_alerta": "verde", "score_relevancia": 0.72},
    {"id": "maec_IND_emb", "pais": "India", "iso3": "IND",
     "ciudad": "Nueva Delhi", "lat": 28.61, "lon": 77.21,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX"],
     "nivel_alerta": "verde", "score_relevancia": 0.75,
     "comentario": "Socio emergente — energías renovables, defensa"},
    {"id": "maec_AUS_emb", "pais": "Australia", "iso3": "AUS",
     "ciudad": "Canberra", "lat": -35.28, "lon": 149.13,
     "tipo": "multiple", "unidades": ["Embajada", "ICEX"],
     "nivel_alerta": "verde", "score_relevancia": 0.65},
]


def get_red_diplomatica(
    nivel_alerta: str | None = None,
    tipo: str | None = None,
) -> list[dict[str, Any]]:
    """
    Retorna red diplomática filtrada.
    nivel_alerta: 'verde' | 'amarillo' | 'rojo'
    tipo: 'embajada' | 'multiple' | etc.
    """
    data = SEED_RED_DIPLOMATICA
    if nivel_alerta:
        data = [d for d in data if d.get("nivel_alerta") == nivel_alerta]
    if tipo:
        data = [d for d in data if d.get("tipo") == tipo]
    return sorted(data, key=lambda x: -x.get("score_relevancia", 0))


def get_alertas_diplomaticas() -> list[dict[str, Any]]:
    """Embajadas/consulados en nivel de alerta rojo o amarillo."""
    return [d for d in SEED_RED_DIPLOMATICA if d.get("nivel_alerta") in ("rojo", "amarillo")]


def to_presencia_format(entry: dict) -> dict:
    """Convierte a formato unificado espana_mundo."""
    return {
        "id": entry["id"],
        "pais_nombre": entry["pais"],
        "iso3": entry["iso3"],
        "categoria": "diplomatica",
        "subcategoria": entry.get("tipo", "embajada"),
        "titulo": f"{entry['ciudad']} — {', '.join(entry.get('unidades', ['Embajada'])[:2])}",
        "actor_espanol": "MAEC",
        "descripcion": (
            f"Oficinas: {', '.join(entry.get('unidades', []))}. "
            f"Alerta: {entry.get('nivel_alerta', 'verde').upper()}. "
            f"{entry.get('comentario', '')}"
        ).strip(),
        "valor": len(entry.get("unidades", [])),
        "unidad": "unidades_diplomaticas",
        "score_relevancia": entry.get("score_relevancia", 0.6),
        "lat": entry["lat"],
        "lon": entry["lon"],
        "nivel_alerta": entry.get("nivel_alerta", "verde"),
        "fuente_url": "https://www.exteriores.gob.es/es/Ministerio/Paginas/Contacto.aspx",
        "updated_at": "2026-01-14T00:00:00Z",
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = get_red_diplomatica()
    rojas = get_alertas_diplomaticas()
    print(f"Red diplomatica: {len(data)} paises")
    print(f"Alertas activas: {len(rojas)}")
    print("\nAlertas ROJO/AMARILLO:")
    for d in rojas:
        print(f"  [{d['nivel_alerta'].upper():8s}] {d['pais']:25s} {d.get('comentario','')[:60]}")
