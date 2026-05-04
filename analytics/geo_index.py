"""
Indice geografico de coordenadas para geolocalización de eventos.

Cubre: CCAA españolas, provincias capitales, y capitales mundiales
de los países con fuentes en sources.yaml.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# CCAA españolas — centroide de la CCAA (capital)
# ---------------------------------------------------------------------------

SPAIN_CCAA_COORDS: dict[str, tuple[float, float]] = {
    "andalucia":            (37.3891, -5.9845),
    "aragon":               (41.6488, -0.8891),
    "asturias":             (43.3614, -5.8593),
    "baleares":             (39.5696,  2.6502),
    "illes_balears":        (39.5696,  2.6502),
    "canarias":             (28.1235, -15.4366),
    "cantabria":            (43.1828, -3.9878),
    "castilla_la_mancha":   (39.8628, -4.0273),
    "castilla_y_leon":      (41.6523, -4.7245),
    "cataluna":             (41.3851,  2.1734),
    "cataluña":             (41.3851,  2.1734),
    "extremadura":          (39.4753, -6.3724),
    "galicia":              (42.8802, -8.5448),
    "la_rioja":             (42.2871, -2.5396),
    "madrid":               (40.4168, -3.7038),
    "murcia":               (37.9922, -1.1307),
    "navarra":              (42.6954, -1.6761),
    "pais_vasco":           (43.2630, -2.9350),
    "euskadi":              (43.2630, -2.9350),
    "comunitat_valenciana": (39.4699, -0.3763),
    "valencia":             (39.4699, -0.3763),
    "ceuta":                (35.8894, -5.3198),
    "melilla":              (35.2923, -2.9381),
}

# ---------------------------------------------------------------------------
# Provincias españolas — capital de provincia
# ---------------------------------------------------------------------------

SPAIN_PROVINCE_COORDS: dict[str, tuple[float, float]] = {
    # Andalucía
    "almeria":    (36.8340, -2.4637),
    "cadiz":      (36.5271, -6.2886),
    "cordoba":    (37.8882, -4.7794),
    "granada":    (37.1773, -3.5986),
    "huelva":     (37.2614, -6.9447),
    "jaen":       (37.7796, -3.7849),
    "malaga":     (36.7213, -4.4216),
    "sevilla":    (37.3891, -5.9845),
    # Aragón
    "huesca":     (42.1401, -0.4089),
    "teruel":     (40.3440, -1.1065),
    "zaragoza":   (41.6488, -0.8891),
    # Asturias
    "asturias":   (43.3614, -5.8593),
    "oviedo":     (43.3614, -5.8593),
    # Baleares
    "palma":      (39.5696,  2.6502),
    "ibiza":      (38.9067,  1.4206),
    "menorca":    (39.8950,  4.2650),
    # Canarias
    "las_palmas": (28.1235, -15.4366),
    "santa_cruz_de_tenerife": (28.4636, -16.2518),
    # Cantabria
    "santander":  (43.4623, -3.8099),
    # Castilla-La Mancha
    "albacete":   (38.9943, -1.8564),
    "ciudad_real": (38.9848, -3.9274),
    "cuenca":     (40.0704, -2.1374),
    "guadalajara": (40.6330, -3.1662),
    "toledo":     (39.8628, -4.0273),
    # Castilla y León
    "avila":      (40.6566, -4.6818),
    "burgos":     (42.3440, -3.6969),
    "leon":       (42.5987, -5.5671),
    "palencia":   (42.0096, -4.5288),
    "salamanca":  (40.9650, -5.6641),
    "segovia":    (40.9429, -4.1088),
    "soria":      (41.7640, -2.4650),
    "valladolid": (41.6523, -4.7245),
    "zamora":     (41.5028, -5.7446),
    # Cataluña
    "barcelona":  (41.3851,  2.1734),
    "girona":     (41.9794,  2.8214),
    "lleida":     (41.6175,  0.6200),
    "tarragona":  (41.1189,  1.2445),
    # Extremadura
    "badajoz":    (38.8794, -6.9707),
    "caceres":    (39.4753, -6.3724),
    # Galicia
    "a_coruna":   (43.3623, -8.4115),
    "lugo":       (43.0097, -7.5567),
    "ourense":    (42.3360, -7.8639),
    "pontevedra": (42.4338, -8.6488),
    "vigo":       (42.2328, -8.7226),
    # La Rioja
    "logrono":    (42.4669, -2.4454),
    # Madrid
    "madrid":     (40.4168, -3.7038),
    # Murcia
    "murcia":     (37.9922, -1.1307),
    # Navarra
    "pamplona":   (42.8125,  1.6458),
    # País Vasco
    "bilbao":     (43.2630, -2.9350),
    "donostia":   (43.3183, -1.9812),
    "san_sebastian": (43.3183, -1.9812),
    "vitoria":    (42.8462, -2.6726),
    "gasteiz":    (42.8462, -2.6726),
    # Valencia
    "alicante":   (38.3453, -0.4831),
    "castellon":  (39.9864, -0.0513),
    "valencia":   (39.4699, -0.3763),
    # Ceuta / Melilla
    "ceuta":      (35.8894, -5.3198),
    "melilla":    (35.2923, -2.9381),
}

# ---------------------------------------------------------------------------
# Capitales mundiales — países con fuentes en el pipeline
# ---------------------------------------------------------------------------

WORLD_CAPITALS: dict[str, tuple[float, float]] = {
    # Europa
    "alemania":          (52.5200, 13.4050),
    "germany":           (52.5200, 13.4050),
    "berlin":            (52.5200, 13.4050),
    "austria":           (48.2082, 16.3738),
    "wien":              (48.2082, 16.3738),
    "belgica":           (50.8503,  4.3517),
    "belgium":           (50.8503,  4.3517),
    "bruselas":          (50.8503,  4.3517),
    "dinamarca":         (55.6761, 12.5683),
    "denmark":           (55.6761, 12.5683),
    "copenhague":        (55.6761, 12.5683),
    "eslovenia":         (46.0569, 14.5058),
    "espana":            (40.4168, -3.7038),
    "spain":             (40.4168, -3.7038),
    "finlandia":         (60.1699, 24.9384),
    "finland":           (60.1699, 24.9384),
    "helsinki":          (60.1699, 24.9384),
    "francia":           (48.8566,  2.3522),
    "france":            (48.8566,  2.3522),
    "paris":             (48.8566,  2.3522),
    "grecia":            (37.9838, 23.7275),
    "greece":            (37.9838, 23.7275),
    "atenas":            (37.9838, 23.7275),
    "hungria":           (47.4979, 19.0402),
    "budapest":          (47.4979, 19.0402),
    "irlanda":           (53.3498, -6.2603),
    "ireland":           (53.3498, -6.2603),
    "dublin":            (53.3498, -6.2603),
    "italia":            (41.9028, 12.4964),
    "italy":             (41.9028, 12.4964),
    "roma":              (41.9028, 12.4964),
    "milan":             (45.4642,  9.1900),
    "letonia":           (56.9460, 24.1059),
    "lituania":          (54.6872, 25.2797),
    "luxemburgo":        (49.8153,  6.1296),
    "malta":             (35.8997, 14.5147),
    "noruega":           (59.9139, 10.7522),
    "norway":            (59.9139, 10.7522),
    "oslo":              (59.9139, 10.7522),
    "paises_bajos":      (52.3676,  4.9041),
    "netherlands":       (52.3676,  4.9041),
    "amsterdam":         (52.3676,  4.9041),
    "polonia":           (52.2297, 21.0122),
    "poland":            (52.2297, 21.0122),
    "varsovia":          (52.2297, 21.0122),
    "portugal":          (38.7223, -9.1393),
    "lisboa":            (38.7223, -9.1393),
    "reino_unido":       (51.5074, -0.1278),
    "united_kingdom":    (51.5074, -0.1278),
    "uk":                (51.5074, -0.1278),
    "london":            (51.5074, -0.1278),
    "londres":           (51.5074, -0.1278),
    "rumania":           (44.4268, 26.1025),
    "suecia":            (59.3293, 18.0686),
    "sweden":            (59.3293, 18.0686),
    "estocolmo":         (59.3293, 18.0686),
    "suiza":             (46.9481,  7.4474),
    "switzerland":       (46.9481,  7.4474),
    "berna":             (46.9481,  7.4474),
    "ucrania":           (50.4501, 30.5234),
    "ukraine":           (50.4501, 30.5234),
    "kiev":              (50.4501, 30.5234),
    "kyiv":              (50.4501, 30.5234),
    "rusia":             (55.7558, 37.6173),
    "russia":            (55.7558, 37.6173),
    "moscu":             (55.7558, 37.6173),
    "turquia":           (39.9334, 32.8597),
    "turkey":            (39.9334, 32.8597),
    "ankara":            (39.9334, 32.8597),
    # America
    "estados_unidos":    (38.8951, -77.0364),
    "usa":               (38.8951, -77.0364),
    "washington":        (38.8951, -77.0364),
    "new_york":          (40.7128, -74.0060),
    "nueva_york":        (40.7128, -74.0060),
    "canada":            (45.4215, -75.6972),
    "ottawa":            (45.4215, -75.6972),
    "mexico":            (19.4326, -99.1332),
    "ciudad_de_mexico":  (19.4326, -99.1332),
    "argentina":         (-34.6037, -58.3816),
    "buenos_aires":      (-34.6037, -58.3816),
    "brasil":            (-15.8267, -47.9218),
    "brazil":            (-15.8267, -47.9218),
    "brasilia":          (-15.8267, -47.9218),
    "colombia":          (4.7110, -74.0721),
    "bogota":            (4.7110, -74.0721),
    "chile":             (-33.4569, -70.6483),
    "santiago":          (-33.4569, -70.6483),
    "peru":              (-12.0464, -77.0428),
    "lima":              (-12.0464, -77.0428),
    "venezuela":         (10.4806, -66.9036),
    "caracas":           (10.4806, -66.9036),
    "cuba":              (23.1136, -82.3666),
    "habana":            (23.1136, -82.3666),
    # Asia / Oriente Medio
    "china":             (39.9042, 116.4074),
    "beijing":           (39.9042, 116.4074),
    "pekin":             (39.9042, 116.4074),
    "japon":             (35.6762, 139.6503),
    "japan":             (35.6762, 139.6503),
    "tokio":             (35.6762, 139.6503),
    "india":             (28.6139, 77.2090),
    "nueva_delhi":       (28.6139, 77.2090),
    "corea_del_sur":     (37.5665, 126.9780),
    "seul":              (37.5665, 126.9780),
    "israel":            (31.7683, 35.2137),
    "jerusalen":         (31.7683, 35.2137),
    "tel_aviv":          (32.0853, 34.7818),
    "iran":              (35.6892, 51.3890),
    "teheran":           (35.6892, 51.3890),
    "arabia_saudita":    (24.7136, 46.6753),
    "riad":              (24.7136, 46.6753),
    "emiratos":          (24.4539, 54.3773),
    "abu_dhabi":         (24.4539, 54.3773),
    "dubai":             (25.2048, 55.2708),
    "taiwan":            (25.0330, 121.5654),
    "taipei":            (25.0330, 121.5654),
    "singapur":          (1.3521,  103.8198),
    "singapore":         (1.3521,  103.8198),
    # África
    "marruecos":         (33.9716, -6.8498),
    "morocco":           (33.9716, -6.8498),
    "rabat":             (33.9716, -6.8498),
    "argelia":           (36.7370,  3.0865),
    "algeria":           (36.7370,  3.0865),
    "argel":             (36.7370,  3.0865),
    "libia":             (32.8872, 13.1913),
    "egipto":            (30.0444, 31.2357),
    "egypt":             (30.0444, 31.2357),
    "el_cairo":          (30.0444, 31.2357),
    "sudafrica":         (-25.7461, 28.1881),
    "south_africa":      (-25.7461, 28.1881),
    "pretoria":          (-25.7461, 28.1881),
    "nigeria":           (9.0579,  7.4951),
    "abuja":             (9.0579,  7.4951),
    "etiopia":           (9.0320,  38.7469),
    # Instituciones supranacionales → Bruselas/Estrasburgo
    "union_europea":     (50.8503,  4.3517),
    "ue":                (50.8503,  4.3517),
    "nato":              (50.8797,  4.3278),
    "otan":              (50.8797,  4.3278),
    "onu":               (40.7489, -73.9680),
    "un":                (40.7489, -73.9680),
    "fmi":               (38.8962, -77.0419),
    "bce":               (50.1109, 8.6821),
    "estrasburgo":       (48.5734,  7.7521),
}

# Alias cortos para búsqueda en texto libre
LOCATION_ALIASES: dict[str, str] = {
    "eeuu": "usa",
    "ee.uu.": "usa",
    "u.s.": "usa",
    "u.k.": "uk",
    "gb": "uk",
    "gran bretana": "reino_unido",
    "gran bretaña": "reino_unido",
    "bruselas": "belgica",
    "estrasburgo": "estrasburgo",
    "moscu": "rusia",
    "moscú": "rusia",
    "pekín": "china",
    "cataluña": "cataluna",
    "país vasco": "pais_vasco",
    "euskadi": "pais_vasco",
    "c. valenciana": "comunitat_valenciana",
    "castilla-la mancha": "castilla_la_mancha",
    "castilla y leon": "castilla_y_leon",
    "castilla y león": "castilla_y_leon",
    "la rioja": "la_rioja",
    "islas baleares": "baleares",
    "illes balears": "baleares",
    "islas canarias": "canarias",
}


def lookup_coords(location: str) -> tuple[float, float] | None:
    """
    Busca coordenadas para un topónimo dado.

    Prueba en orden: CCAA → provincia → capital mundial → alias.
    Retorna None si no se encuentra.
    """
    if not location:
        return None
    key = _normalize_key(location)

    # Chequear alias primero
    if key in LOCATION_ALIASES:
        key = _normalize_key(LOCATION_ALIASES[key])

    if key in SPAIN_CCAA_COORDS:
        return SPAIN_CCAA_COORDS[key]
    if key in SPAIN_PROVINCE_COORDS:
        return SPAIN_PROVINCE_COORDS[key]
    if key in WORLD_CAPITALS:
        return WORLD_CAPITALS[key]

    # Búsqueda parcial en CCAA (p.ej. "comunitat" → "comunitat_valenciana")
    for k, coords in SPAIN_CCAA_COORDS.items():
        if key in k or k in key:
            return coords

    return None


def _normalize_key(location: str) -> str:
    """Normaliza un topónimo a clave de diccionario (lowercase, sin tildes, guiones→_)."""
    import unicodedata
    s = location.lower().strip()
    # Eliminar tildes
    s = "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    )
    # Espacios y guiones → _
    s = s.replace("-", "_").replace(" ", "_")
    # Eliminar caracteres especiales
    import re
    s = re.sub(r"[^a-z0-9_]", "", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s
