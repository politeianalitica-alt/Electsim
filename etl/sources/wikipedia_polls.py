"""
Scraper de Wikipedia — Opinion polling for the next Spanish general election.

Carga encuestas históricas desde la tabla principal de Wikipedia y las inserta
en las tablas `fuentes_encuesta`, `casa_encuestadora`, `encuestas`,
`preguntas_encuesta` y `resultados_agregados_encuesta`.

Uso:
    python -m etl.sources.wikipedia_polls
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
from datetime import date, datetime
from typing import Any

import pandas as pd
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

URLS = [
    "https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Spanish_general_election",
    "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2023_Spanish_general_election",
    "https://es.wikipedia.org/wiki/Elecciones_generales_de_Espa%C3%B1a_de_2023",
]

UA = "ElectSim/1.0 (+contacto: electsim@local) Mozilla/5.0"
TIMEOUT = 30

# Mapeo de etiquetas Wikipedia → siglas canónicas del sistema.
PARTIDO_ALIASES = {
    "PP": "PP",
    "PSOE": "PSOE",
    "VOX": "VOX",
    "Sumar": "SUMAR",
    "SUMAR": "SUMAR",
    "Unidas Podemos": "UP",
    "UP": "UP",
    "Podemos": "PODEMOS",
    "IU": "IU",
    "Cs": "CS",
    "Ciudadanos": "CS",
    "ERC": "ERC",
    "ERC-Sobiranistes": "ERC",
    "Junts": "JUNTS",
    "JxCat": "JUNTS",
    "JxCAT": "JUNTS",
    "EH Bildu": "EH_BILDU",
    "Bildu": "EH_BILDU",
    "PNV": "PNV",
    "EAJ-PNV": "PNV",
    "BNG": "BNG",
    "CC": "CC",
    "Coalición Canaria": "CC",
    "UPN": "UPN",
    "CUP": "CUP",
    "Más País": "MP",
    "MP": "MP",
    "Compromís": "COMPROMIS",
}


def _clean_party_col(col: str) -> str:
    """Quita footnotes y trimea la cabecera: 'PP[a]' → 'PP'."""
    return re.sub(r"\[[^\]]*\]", "", str(col)).strip()


def _pct_to_float(val: Any) -> float | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s in {"–", "—", "-", "?", "N/A"}:
        return None
    s = re.sub(r"\[[^\]]*\]", "", s)
    m = re.search(r"(-?\d+(?:[\.,]\d+)?)", s)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", "."))
    except ValueError:
        return None


def _parse_fieldwork_date(val: Any) -> date | None:
    """Extrae fecha final del campo: '3–10 Apr 2024' → 2024-04-10."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    s = re.sub(r"\[[^\]]*\]", "", s)
    # Busca el último número + mes + año (o número DD/MM/YYYY).
    patrones = [
        r"(\d{1,2})\s*[–\-]\s*(\d{1,2})\s+([A-Za-zÁ-ú]+)\s+(\d{4})",  # 3–10 Apr 2024
        r"(\d{1,2})\s+([A-Za-zÁ-ú]+)\s+(\d{4})",                      # 10 Apr 2024
        r"(\d{1,2})/(\d{1,2})/(\d{4})",                               # 10/04/2024
    ]
    meses = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        "ene": 1, "abr": 4, "ago": 8, "dic": 12,
    }
    for patt in patrones:
        m = re.search(patt, s)
        if not m:
            continue
        try:
            g = m.groups()
            if len(g) == 4:
                dia = int(g[1])
                mes = meses.get(g[2][:3].lower(), 0)
                año = int(g[3])
            elif len(g) == 3 and g[1].isalpha():
                dia = int(g[0])
                mes = meses.get(g[1][:3].lower(), 0)
                año = int(g[2])
            else:
                dia = int(g[0])
                mes = int(g[1])
                año = int(g[2])
            if 1 <= mes <= 12 and 1 <= dia <= 31 and 1990 <= año <= 2100:
                return date(año, mes, dia)
        except (ValueError, IndexError):
            continue
    return None


def _parse_sample(val: Any) -> int | None:
    if val is None:
        return None
    s = re.sub(r"[^\d]", "", str(val))
    if not s:
        return None
    try:
        n = int(s)
        return n if 100 <= n <= 50000 else None
    except ValueError:
        return None


def _normalize_pollster(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


def _fetch_tables(urls: list[str]) -> list[pd.DataFrame]:
    for url in urls:
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT)
            r.raise_for_status()
            tables = pd.read_html(r.text)
            logger.info("Descargadas %d tablas desde %s", len(tables), url)
            return tables
        except Exception as e:
            logger.warning("Fallo fetch %s: %s", url, e)
    return []


def _ensure_casa_y_fuente(engine: Engine, nombre: str) -> tuple[int | None, int | None]:
    """Asegura que la casa existe en casa_encuestadora y fuentes_encuesta. Devuelve (casa_id, fuente_id)."""
    norm = _normalize_pollster(nombre)
    with engine.begin() as conn:
        # casa_encuestadora
        row = conn.execute(
            text("SELECT id FROM casa_encuestadora WHERE nombre_normalizado = :n LIMIT 1"),
            {"n": norm},
        ).fetchone()
        if row:
            casa_id = int(row[0])
        else:
            res = conn.execute(
                text("""
                    INSERT INTO casa_encuestadora (nombre, nombre_normalizado, activa)
                    VALUES (:nom, :norm, TRUE)
                    ON CONFLICT (nombre) DO UPDATE SET nombre_normalizado = EXCLUDED.nombre_normalizado
                    RETURNING id
                """),
                {"nom": nombre, "norm": norm},
            ).fetchone()
            casa_id = int(res[0]) if res else None
            if casa_id:
                conn.execute(
                    text("""
                        INSERT INTO casa_peso_vigente (casa_id, rating, metodo)
                        VALUES (:cid, 3.0, 'wikipedia_bootstrap')
                        ON CONFLICT (casa_id) DO NOTHING
                    """),
                    {"cid": casa_id},
                )

        # fuentes_encuesta
        row2 = conn.execute(
            text("SELECT id FROM fuentes_encuesta WHERE nombre = :n LIMIT 1"),
            {"n": nombre},
        ).fetchone()
        if row2:
            fuente_id = int(row2[0])
        else:
            res2 = conn.execute(
                text("""
                    INSERT INTO fuentes_encuesta (nombre, tipo, pais)
                    VALUES (:n, 'ENCUESTADORA', 'ESP')
                    RETURNING id
                """),
                {"n": nombre},
            ).fetchone()
            fuente_id = int(res2[0]) if res2 else None
            if fuente_id is None:
                row3 = conn.execute(
                    text("SELECT id FROM fuentes_encuesta WHERE nombre = :n LIMIT 1"),
                    {"n": nombre},
                ).fetchone()
                fuente_id = int(row3[0]) if row3 else None
    return casa_id, fuente_id


def _ensure_pregunta_intencion(engine: Engine, encuesta_id: int) -> int | None:
    """La tabla preguntas_encuesta tiene FK a encuestas, por lo que una pregunta
    pertenece a una encuesta concreta. Creamos una por encuesta si no existe."""
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT id FROM preguntas_encuesta
                WHERE encuesta_id = :eid
                  AND categoria_tematica = 'intencion_voto'
                LIMIT 1
            """),
            {"eid": encuesta_id},
        ).fetchone()
        if row:
            return int(row[0])
        res = conn.execute(
            text("""
                INSERT INTO preguntas_encuesta
                    (encuesta_id, texto_pregunta, categoria_tematica, tipo_respuesta)
                VALUES
                    (:eid, 'Intención de voto general (nacional)', 'intencion_voto', 'CERRADA_UNICA')
                RETURNING id
            """),
            {"eid": encuesta_id},
        ).fetchone()
        return int(res[0]) if res else None


def _encuesta_hash(fuente_id: int, fecha_pub: date, n: int | None) -> str:
    key = f"{fuente_id}|{fecha_pub.isoformat()}|{n or 0}"
    return hashlib.md5(key.encode()).hexdigest()[:24]


def _upsert_encuesta(
    engine: Engine,
    fuente_id: int,
    fecha_campo_fin: date | None,
    fecha_pub: date,
    n: int | None,
) -> int | None:
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT id FROM encuestas
                WHERE fuente_id = :fid
                  AND fecha_publicacion = :fp
                  AND COALESCE(n_entrevistas, 0) = COALESCE(:n, 0)
                LIMIT 1
            """),
            {"fid": fuente_id, "fp": fecha_pub, "n": n},
        ).fetchone()
        if row:
            return int(row[0])
        res = conn.execute(
            text("""
                INSERT INTO encuestas
                    (fuente_id, titulo, fecha_fin, fecha_publicacion, n_entrevistas,
                     tipo_encuesta, ambito_geografico)
                VALUES
                    (:fid, :tit, :fc, :fp, :n,
                     'intencion_voto_nacional', 'nacional')
                RETURNING id
            """),
            {
                "fid": fuente_id,
                "tit": f"Encuesta Wikipedia {fecha_pub.isoformat()}",
                "fc": fecha_campo_fin,
                "fp": fecha_pub,
                "n": n,
            },
        ).fetchone()
        return int(res[0]) if res else None


def _insert_resultados(
    engine: Engine,
    encuesta_id: int,
    pregunta_id: int,
    votos: dict[str, float],
) -> int:
    n_ok = 0
    with engine.begin() as conn:
        for partido, pct in votos.items():
            try:
                conn.execute(
                    text("""
                        INSERT INTO resultados_agregados_encuesta
                            (encuesta_id, pregunta_id, categoria, porcentaje)
                        VALUES (:eid, :pid, :cat, :pct)
                        ON CONFLICT DO NOTHING
                    """),
                    {"eid": encuesta_id, "pid": pregunta_id, "cat": partido, "pct": float(pct)},
                )
                n_ok += 1
            except Exception as e:
                logger.debug("Resultado skip %s %s: %s", encuesta_id, partido, e)
    return n_ok


# ── Entry point ──────────────────────────────────────────────────────────────

def _pick_best_table(tables: list[pd.DataFrame]) -> pd.DataFrame | None:
    """Escoge la tabla de Wikipedia con más filas y columnas parecidas a encuestas."""
    partidos_keys = {a.lower() for a in PARTIDO_ALIASES}
    mejor, mejor_score = None, 0
    for t in tables:
        if len(t) < 5:
            continue
        cols = [_clean_party_col(c).lower() for c in t.columns]
        score = sum(1 for c in cols if c in partidos_keys or any(p in c for p in ("pp", "psoe", "vox", "sumar")))
        # Bonus por cabeceras típicas.
        if any("poll" in c or "encuestadora" in c or "firm" in c or "casa" in c for c in cols):
            score += 3
        if any("fieldwork" in c or "campo" in c or "fecha" in c for c in cols):
            score += 2
        if score > mejor_score:
            mejor, mejor_score = t, score
    return mejor


def _detect_columns(df: pd.DataFrame) -> dict[str, str]:
    """Mapea columnas reales → roles (pollster, date, sample)."""
    cols = list(df.columns)
    out = {"pollster": None, "date": None, "sample": None}
    for c in cols:
        low = _clean_party_col(c).lower()
        if out["pollster"] is None and any(k in low for k in ("poll", "firm", "encuest", "casa")):
            out["pollster"] = c
        elif out["date"] is None and any(k in low for k in ("fieldwork", "campo", "fecha", "date")):
            out["date"] = c
        elif out["sample"] is None and any(k in low for k in ("sample", "muestra", "tamaño", "size", "n")):
            # Evitamos que coja la columna de un partido ("PP" pasa sin problema; pero "N.")
            if low.strip() in {"sample size", "muestra", "tamaño muestra", "n", "sample"}:
                out["sample"] = c
    return out


def ingest_wikipedia_polls(engine: Engine, max_rows: int | None = None) -> dict:
    tables = _fetch_tables(URLS)
    if not tables:
        return {"ok": False, "error": "no_tables_fetched"}

    df = _pick_best_table(tables)
    if df is None or df.empty:
        return {"ok": False, "error": "tabla_no_identificada", "n_tablas": len(tables)}

    # Aplana multi-index (mantiene unicidad añadiendo índice si queda vacío).
    if isinstance(df.columns, pd.MultiIndex):
        nuevas = []
        for i, col in enumerate(df.columns):
            partes = [str(c) for c in col if str(c) != "nan" and "Unnamed" not in str(c)]
            nombre = " ".join(partes).strip()
            nuevas.append(nombre if nombre else f"_col{i}")
        df.columns = nuevas

    logger.info("Tabla elegida: %d filas, %d cols", len(df), len(df.columns))
    mapping = _detect_columns(df)
    col_pollster = mapping["pollster"] or df.columns[0]
    col_date = mapping["date"]
    col_sample = mapping["sample"]

    # Columnas de partido: primero por nombre, luego fallback posicional
    # (Wikipedia usa logos como cabecera → columnas "Unnamed" con orden fijo).
    party_cols: dict[str, str] = {}
    for c in df.columns:
        cn = _clean_party_col(c)
        if cn in PARTIDO_ALIASES:
            party_cols[c] = PARTIDO_ALIASES[cn]
        elif cn.split() and cn.split()[0] in PARTIDO_ALIASES:
            party_cols[c] = PARTIDO_ALIASES[cn.split()[0]]

    # Fallback posicional si no hay columnas identificadas: asume layout Wikipedia ES.
    # Col 0: pollster, Col 1: fieldwork, Col 2: sample, Col 3: turnout,
    # Col 4..: PP, PSOE, VOX, Sumar, ERC, Junts, EH Bildu, PNV, BNG, CC, UPN, others...
    ORDEN_POSICIONAL = ["PP", "PSOE", "VOX", "SUMAR", "ERC", "JUNTS",
                        "EH_BILDU", "PNV", "BNG", "CC", "UPN"]
    if not party_cols:
        cols = list(df.columns)
        # Detecta primera columna de partido: la primera "Unnamed" o vacía tras pollster/date/sample.
        inicio = 4 if len(cols) > 14 else 3
        for i, siglas in enumerate(ORDEN_POSICIONAL):
            idx = inicio + i
            if idx >= len(cols):
                break
            party_cols[cols[idx]] = siglas
        logger.info("Detección posicional: %d columnas de partido", len(party_cols))

    if not party_cols:
        return {"ok": False, "error": "sin_columnas_partido"}

    n_polls = 0
    n_results = 0
    n_skip = 0
    errores: list[str] = []

    it = df.iterrows()
    if max_rows:
        it = list(df.head(max_rows).iterrows())
    else:
        it = list(df.iterrows())

    for _, row in it:
        try:
            name = _clean_party_col(row[col_pollster]) if col_pollster else ""
            if not name or name.lower() in {"nan", "election", "elecciones"}:
                n_skip += 1
                continue
            # Limpia sufijos de cita y autor.
            name = re.sub(r"/.*$", "", name).strip()
            name = re.sub(r"\s*\(.*?\)\s*$", "", name).strip()
            if not name:
                n_skip += 1
                continue

            fecha_campo = _parse_fieldwork_date(row[col_date]) if col_date else None
            fecha_pub = fecha_campo or date.today()
            n_muestra = _parse_sample(row[col_sample]) if col_sample else None

            votos: dict[str, float] = {}
            for col, siglas in party_cols.items():
                pct = _pct_to_float(row[col])
                if pct is not None and 0 <= pct <= 100:
                    votos[siglas] = pct

            if not votos:
                n_skip += 1
                continue

            casa_id, fuente_id = _ensure_casa_y_fuente(engine, name)
            if fuente_id is None:
                n_skip += 1
                continue
            encuesta_id = _upsert_encuesta(engine, fuente_id, fecha_campo, fecha_pub, n_muestra)
            if encuesta_id is None:
                n_skip += 1
                continue
            pregunta_id = _ensure_pregunta_intencion(engine, encuesta_id)
            if pregunta_id is None:
                n_skip += 1
                continue
            n_ins = _insert_resultados(engine, encuesta_id, pregunta_id, votos)
            n_polls += 1
            n_results += n_ins
        except Exception as e:
            errores.append(f"{name}: {e}"[:180])
            if len(errores) > 20:
                break

    return {
        "ok": True,
        "n_polls_inserted": n_polls,
        "n_results": n_results,
        "n_skip": n_skip,
        "errors": errores[:10],
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    engine = create_engine(os.environ["DATABASE_URL"])
    import json
    res = ingest_wikipedia_polls(engine)
    print(json.dumps(res, indent=2, ensure_ascii=False))
