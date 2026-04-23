"""Pipeline de microdatos propios (CIS/encuestas internas) para ElectSim.

Incluye:
- Ingesta desde carpeta local (CSV/SAV).
- Normalización a `microdatos_encuesta`.
- Cohortes multidimensionales.
- Métricas de asociación predictor -> intención de voto.
- Pool IA con prompts y labels reales.
- Construcción de `perfiles_votante` desde cohortes reales.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
import hashlib
import json
import logging
import os
from pathlib import Path
import re
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

try:  # opcional para SAV
    import pyreadstat  # type: ignore
except Exception:  # pragma: no cover
    pyreadstat = None

DEFAULT_MICRODATOS_DIR = str(
    Path(
        os.environ.get(
            "MICRODATOS_DIR",
            Path(__file__).resolve().parents[2] / "data" / "microdatos",
        )
    )
)

_MISSING_CODES = {"-9", "-8", "-7", "97", "98", "99", "999", "9999", "nan", "none", ""}

# Mapeo de código provincial INE -> id de CCAA (tabla comunidades_autonomas: 1..19)
_PROVINCE_TO_CCAA_ID = {
    1: 16, 2: 7, 3: 3, 4: 3, 5: 7, 6: 11, 7: 4, 8: 9, 9: 7, 10: 11,
    11: 1, 12: 10, 13: 8, 14: 1, 15: 12, 16: 8, 17: 9, 18: 1, 19: 9, 20: 16,
    21: 1, 22: 2, 23: 1, 24: 7, 25: 9, 26: 17, 27: 12, 28: 13, 29: 1, 30: 14,
    31: 15, 32: 12, 33: 3, 34: 7, 35: 5, 36: 12, 37: 7, 38: 5, 39: 6, 40: 7,
    41: 1, 42: 7, 43: 9, 44: 2, 45: 8, 46: 10, 47: 7, 48: 16, 49: 7, 50: 2,
    51: 18, 52: 19,
}

_CCAA_NAME_TO_ID = {
    "andalucia": 1,
    "aragon": 2,
    "principado de asturias": 3,
    "asturias": 3,
    "illes balears": 4,
    "islas baleares": 4,
    "baleares": 4,
    "canarias": 5,
    "cantabria": 6,
    "castilla y leon": 7,
    "castillayleon": 7,
    "castilla-la mancha": 8,
    "castilla la mancha": 8,
    "cataluna": 9,
    "catalunya": 9,
    "comunitat valenciana": 10,
    "comunidad valenciana": 10,
    "extremadura": 11,
    "galicia": 12,
    "comunidad de madrid": 13,
    "madrid": 13,
    "region de murcia": 14,
    "murcia": 14,
    "comunidad foral de navarra": 15,
    "navarra": 15,
    "pais vasco": 16,
    "euskadi": 16,
    "la rioja": 17,
    "rioja": 17,
    "ceuta": 18,
    "melilla": 19,
}


def _clean_col(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]+", "", str(name).upper())


def _as_num(v: Any) -> float | None:
    if v is None or pd.isna(v):
        return None
    try:
        x = float(v)
    except Exception:
        return None
    if str(int(x)) in {"-9", "-8", "-7", "97", "98", "99", "999", "9999"}:
        return None
    return x


def _as_str(v: Any, max_len: int = 80) -> str | None:
    if v is None or pd.isna(v):
        return None
    s = str(v).strip()
    if s.lower() in _MISSING_CODES:
        return None
    return s[:max_len]


def _slug_text(value: str) -> str:
    s = value.lower().strip()
    s = (
        s.replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ü", "u")
    )
    s = re.sub(r"\s+", " ", s)
    return s


def _normalize_ccaa_id(raw_value: Any) -> int | None:
    sval = _as_str(raw_value, 80)
    if not sval:
        return None
    s = sval.replace(".0", "").strip()
    if re.fullmatch(r"\d+", s):
        n = int(s)
        if 1 <= n <= 19:
            return n
        # Si llega un código provincial (CPRO), lo mapeamos a CCAA.
        return _PROVINCE_TO_CCAA_ID.get(n)
    return _CCAA_NAME_TO_ID.get(_slug_text(s))


def _normalize_sex(v: Any) -> str | None:
    s = _as_str(v, 20)
    if not s:
        return None
    sl = s.lower()
    if sl in {"1", "hombre", "h", "male", "m"}:
        return "H"
    if sl in {"2", "mujer", "f", "female"}:
        return "M"
    return None


def _age_group(edad: float | None) -> str | None:
    if edad is None:
        return None
    e = int(round(edad))
    if e < 18:
        return "<18"
    if e <= 24:
        return "18-24"
    if e <= 34:
        return "25-34"
    if e <= 44:
        return "35-44"
    if e <= 54:
        return "45-54"
    if e <= 64:
        return "55-64"
    return "65+"


def _ideology_bin(v: float | None) -> str:
    if v is None:
        return "NA"
    if v <= 2:
        return "1-2"
    if v <= 4:
        return "3-4"
    if v <= 6:
        return "5-6"
    if v <= 8:
        return "7-8"
    return "9-10"


def _normalize_party(value: Any) -> str | None:
    s = _as_str(value, 60)
    if not s:
        return None
    u = s.upper().strip().replace("_", " ").replace("-", " ")
    mapping = {
        "1": "PSOE", "1.0": "PSOE",
        "2": "PP", "2.0": "PP",
        "3": "VOX", "3.0": "VOX",
        "4": "SUMAR", "4.0": "SUMAR",
        "5": "CIUDADANOS", "5.0": "CIUDADANOS",
        "6": "ERC", "6.0": "ERC",
        "7": "JUNTS", "7.0": "JUNTS",
        "8": "PNV", "8.0": "PNV",
        "9": "EH BILDU", "9.0": "EH BILDU",
        "10": "BNG", "10.0": "BNG",
        "21": "SUMAR", "21.0": "SUMAR",
        "8996": "ABSTENCIÓN", "8996.0": "ABSTENCIÓN",
        "9997": "NS/NC", "9997.0": "NS/NC",
        "9998": "NS/NC", "9998.0": "NS/NC",
        "9999": "NS/NC", "9999.0": "NS/NC",
        "NO DECLARA": "NS/NC",
        "NO DECLARADO": "NS/NC",
        "NO CONTESTA": "NS/NC",
        "NO SABE": "NS/NC",
        "NO RECUERDA": "NS/NC",
        "NS NC": "NS/NC",
    }
    u = mapping.get(u, u)
    if any(k in u for k in ["ABSTEN", "ABSTENC"]):
        return "Abstención"
    if u in {"NS/NC", "NSNC", "N.S./N.C.", "N.S", "N.C"}:
        return "NS/NC"
    if any(k in u for k in ["BLANCO", "NULO"]):
        return "Blanco/Nulo"
    party_alias = {
        "PSOE": "PSOE",
        "PP": "PP",
        "VOX": "VOX",
        "SUMAR": "SUMAR",
        "PODEMOS": "SUMAR",
        "UP": "SUMAR",
        "CIUDADANOS": "Ciudadanos",
        "CS": "Ciudadanos",
        "ERC": "ERC",
        "JUNTS": "Junts",
        "JXCAT": "Junts",
        "PNV": "PNV",
        "EH BILDU": "EH Bildu",
        "BILDU": "EH Bildu",
        "BNG": "BNG",
    }
    if u in party_alias:
        return party_alias[u]
    if re.fullmatch(r"\d+(\.\d+)?", u):
        return "Otros"
    return s


def _vote_fallback_from_signals(ideologia_media: float | None, recuerdo: str | None, cercania: str | None) -> dict[str, float]:
    rec = _normalize_party(recuerdo) if recuerdo else None
    cer = _normalize_party(cercania) if cercania else None
    base_party = cer or rec
    if base_party and base_party not in {"NS/NC", "Blanco/Nulo", "Otros", "Abstención"}:
        return {base_party: 62.0, "Abstención": 18.0, "Otros": 20.0}
    ideo = float(ideologia_media) if ideologia_media is not None else 5.0
    if ideo <= 3:
        return {"SUMAR": 36.0, "PSOE": 34.0, "Abstención": 17.0, "Otros": 13.0}
    if ideo <= 5.8:
        return {"PSOE": 34.0, "PP": 31.0, "SUMAR": 14.0, "Abstención": 11.0, "Otros": 10.0}
    if ideo <= 7.2:
        return {"PP": 42.0, "VOX": 20.0, "PSOE": 21.0, "Abstención": 9.0, "Otros": 8.0}
    return {"PP": 46.0, "VOX": 30.0, "PSOE": 12.0, "Abstención": 7.0, "Otros": 5.0}


def _cohort_vote_bucket(vote: str | None) -> str:
    if not vote:
        return "NS/NC"
    vv = str(vote).strip()
    if vv in {"NS/NC", "Blanco/Nulo"}:
        return vv
    return vv


def _age_mid_from_group(grp: str | None) -> float | None:
    if not grp:
        return None
    return {
        "<18": 17.0,
        "18-24": 21.0,
        "25-34": 29.5,
        "35-44": 39.5,
        "45-54": 49.5,
        "55-64": 59.5,
        "65+": 70.0,
    }.get(str(grp).strip())


def _find_col(df: pd.DataFrame, labels: dict[str, str], aliases: list[str], label_regex: str | None = None) -> str | None:
    clean_map = {_clean_col(c): c for c in df.columns}
    for a in aliases:
        c = clean_map.get(_clean_col(a))
        if c:
            return c
    if label_regex:
        pat = re.compile(label_regex, re.IGNORECASE)
        for c, lbl in labels.items():
            if c in df.columns and pat.search(str(lbl or "")):
                return c
    return None


def _extract_study_code(path: Path, df: pd.DataFrame) -> str:
    m = re.search(r"\b(3\d{3}|34\d{2}|35\d{2}|39\d{2})\b", path.stem)
    if m:
        return m.group(1)
    if "ESTUDIO" in df.columns:
        try:
            raw = str(df["ESTUDIO"].dropna().iloc[0])
            m2 = re.search(r"\d{4}", raw)
            if m2:
                return m2.group(0)
        except Exception:
            pass
    return re.sub(r"[^A-Za-z0-9]+", "_", path.stem)[:40]


def _dataset_group(path: Path) -> str:
    parts = [p.name.lower() for p in path.parents]
    for tag in ["cis", "andalucia", "40db", "microdatos"]:
        if tag in parts:
            return tag
    return "general"


def _is_political_dataset(df: pd.DataFrame, labels: dict[str, str], path: Path) -> bool:
    cols = {_clean_col(c) for c in df.columns}
    direct = {
        "INTENCIONG", "INTENCIONGR", "INTENCIONGALTER", "VOTOSIMG",
        "RECUVOTOG", "RECUVOTOGR", "RECUERDO", "ESCIDEOL", "CERCANIA", "PROBVOTO",
    }
    if cols.intersection(direct):
        return True
    labels_txt = " ".join(str(v or "") for v in labels.values()).lower()
    if any(k in labels_txt for k in ["intención de voto", "intencion de voto", "autoubicación ideológica", "autoubicacion ideologica", "recuerdo de voto"]):
        return True
    # Aceptar microdatos con base sociodemográfica aunque no incluyan voto explícito.
    demo_core = {"SEXO", "EDAD", "ESTUDIOS", "SITLAB", "CCAA", "CPRO"}
    if len(cols.intersection(demo_core)) >= 3:
        return True
    # dataset interno de usuario: si el nombre contiene pistas electorales
    n = path.name.lower()
    return any(k in n for k in ["barometro", "voto", "elec", "cis"])


def _read_table(path: Path) -> tuple[pd.DataFrame, dict[str, str]]:
    suf = path.suffix.lower()
    if suf == ".sav":
        if pyreadstat is None:
            raise RuntimeError("pyreadstat no disponible para leer .sav")
        df, meta = pyreadstat.read_sav(str(path), apply_value_formats=False)
        labels = {k: str(v or "") for k, v in (meta.column_names_to_labels or {}).items()}
        return df, labels
    if suf == ".csv":
        encodings = ["utf-8", "utf-8-sig", "cp1252", "latin1"]
        separators = [";", ",", "\t", "|"]
        for enc in encodings:
            for sep in separators:
                try:
                    df = pd.read_csv(path, sep=sep, encoding=enc, low_memory=False)
                    if df.shape[1] >= 5:
                        return df, {}
                except Exception:
                    continue
        raise RuntimeError(f"No se pudo leer CSV: {path}")
    if suf == ".dta":
        df = pd.read_stata(path)
        return df, {}
    if suf in {".xlsx", ".xls"}:
        df = pd.read_excel(path)
        return df, {}
    raise ValueError(f"Formato no soportado: {path}")


def _ensure_tables(engine: Engine) -> None:
    ddl = """
    CREATE TABLE IF NOT EXISTS microdatos_cis_raw (
      id BIGSERIAL PRIMARY KEY,
      encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE SET NULL,
      source_file TEXT NOT NULL,
      dataset_grupo TEXT,
      row_hash VARCHAR(40) NOT NULL,
      payload_json JSONB NOT NULL,
      source_labels JSONB,
      has_vote BOOLEAN DEFAULT FALSE,
      has_ideology BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(source_file, row_hash)
    );

    CREATE TABLE IF NOT EXISTS microdatos_cohortes (
      id BIGSERIAL PRIMARY KEY,
      run_id VARCHAR(32) NOT NULL,
      encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE CASCADE,
      cohorte_key TEXT NOT NULL,
      sexo CHAR(1),
      grupo_edad VARCHAR(20),
      estudios VARCHAR(80),
      sitlab VARCHAR(80),
      clase_subjetiva VARCHAR(40),
      ccaa VARCHAR(80),
      ideologia_tramo VARCHAR(20),
      recuerdo_voto VARCHAR(80),
      cercania VARCHAR(80),
      n_obs INTEGER NOT NULL,
      peso_total NUMERIC(14,4) NOT NULL,
      ideologia_media NUMERIC(6,3),
      voto_dist_json JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(run_id, encuesta_id, cohorte_key)
    );

    CREATE TABLE IF NOT EXISTS microdatos_asociaciones (
      id SERIAL PRIMARY KEY,
      run_id VARCHAR(32) NOT NULL,
      encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE CASCADE,
      predictor VARCHAR(80) NOT NULL,
      target VARCHAR(80) DEFAULT 'INTENCIONG',
      n_obs INTEGER NOT NULL,
      chi2 NUMERIC(18,4),
      cramers_v NUMERIC(10,6),
      n_levels_pred INTEGER,
      n_levels_target INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS microdatos_ai_pool (
      id BIGSERIAL PRIMARY KEY,
      run_id VARCHAR(32) NOT NULL,
      encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE CASCADE,
      respondent_hash VARCHAR(40) NOT NULL,
      cohorte_key TEXT,
      prompt_perfil TEXT NOT NULL,
      label_voto VARCHAR(80),
      escala_ideologica NUMERIC(4,1),
      peso NUMERIC(12,4),
      metadata_json JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(encuesta_id, respondent_hash)
    );

    CREATE TABLE IF NOT EXISTS perfil_usuario_custom (
      id SERIAL PRIMARY KEY,
      usuario_id VARCHAR(80) NOT NULL DEFAULT 'default',
      nombre_perfil VARCHAR(120) NOT NULL,
      sexo CHAR(1),
      edad INTEGER,
      estudios VARCHAR(80),
      sitlab VARCHAR(80),
      clasesub VARCHAR(40),
      ccaa VARCHAR(80),
      escideol NUMERIC(4,1),
      cercania VARCHAR(80),
      recuerdo VARCHAR(80),
      p12 VARCHAR(40),
      p13 VARCHAR(40),
      valor_lider_1 NUMERIC(4,1),
      valor_lider_2 NUMERIC(4,1),
      valor_lider_3 NUMERIC(4,1),
      valor_lider_4 NUMERIC(4,1),
      valor_lider_5 NUMERIC(4,1),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(usuario_id, nombre_perfil)
    );
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))
        # Compatibilidad hacia atrás con esquemas previos ya creados.
        conn.execute(text("ALTER TABLE microdatos_cis_raw ADD COLUMN IF NOT EXISTS dataset_grupo TEXT"))
        conn.execute(text("ALTER TABLE microdatos_cis_raw ADD COLUMN IF NOT EXISTS source_labels JSONB"))
        conn.execute(text("ALTER TABLE microdatos_cis_raw ADD COLUMN IF NOT EXISTS has_vote BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE microdatos_cis_raw ADD COLUMN IF NOT EXISTS has_ideology BOOLEAN DEFAULT FALSE"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_microdatos_raw_source_row ON microdatos_cis_raw(source_file, row_hash)"))
        conn.execute(text("ALTER TABLE microdatos_cohortes ADD COLUMN IF NOT EXISTS sitlab VARCHAR(80)"))
        conn.execute(text("ALTER TABLE microdatos_cohortes ADD COLUMN IF NOT EXISTS clase_subjetiva VARCHAR(40)"))
        conn.execute(text("ALTER TABLE microdatos_cohortes ADD COLUMN IF NOT EXISTS ccaa VARCHAR(80)"))
        conn.execute(text("ALTER TABLE microdatos_cohortes ADD COLUMN IF NOT EXISTS cercania VARCHAR(80)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS sitlab VARCHAR(80)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS clasesub VARCHAR(40)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS ccaa VARCHAR(80)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS escideol NUMERIC(4,1)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS cercania VARCHAR(80)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS recuerdo VARCHAR(80)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS p12 VARCHAR(40)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS p13 VARCHAR(40)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS valor_lider_1 NUMERIC(4,1)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS valor_lider_2 NUMERIC(4,1)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS valor_lider_3 NUMERIC(4,1)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS valor_lider_4 NUMERIC(4,1)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS valor_lider_5 NUMERIC(4,1)"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS notes TEXT"))
        conn.execute(text("ALTER TABLE perfil_usuario_custom ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()"))


def _get_or_create_fuente(conn) -> int:
    row = conn.execute(
        text("SELECT id FROM fuentes_encuesta WHERE nombre = 'Microdatos propios (CIS/cliente)' LIMIT 1")
    ).fetchone()
    if row:
        return int(row[0])
    rid = conn.execute(
        text(
            """
            INSERT INTO fuentes_encuesta(nombre, tipo, pais, web, descripcion)
            VALUES('Microdatos propios (CIS/cliente)', 'microdatos', 'ESP', 'local://microdatos',
                   'Ingesta de microdatos propios para cohortes, perfiles y pool IA')
            RETURNING id
            """
        )
    ).scalar_one()
    return int(rid)


def _get_or_create_encuesta(conn, fuente_id: int, study_code: str, path: Path, grupo: str) -> int:
    row = conn.execute(text("SELECT id FROM encuestas WHERE numero_estudio = :n LIMIT 1"), {"n": study_code}).fetchone()
    if row:
        return int(row[0])
    rid = conn.execute(
        text(
            """
            INSERT INTO encuestas(
              fuente_id, numero_estudio, titulo, tipo_encuesta, fecha_publicacion,
              metodologia, ambito_geografico, url_microdatos, disponible_microdatos
            )
            VALUES(
              :fuente_id, :numero_estudio, :titulo, 'microdatos', CURRENT_DATE,
              'importación local automática', :ambito, :url_microdatos, TRUE
            )
            RETURNING id
            """
        ),
        {
            "fuente_id": fuente_id,
            "numero_estudio": study_code,
            "titulo": f"Microdatos {study_code} ({grupo})",
            "ambito": "Andalucía" if grupo == "andalucia" else "España",
            "url_microdatos": f"file://{path}",
        },
    ).scalar_one()
    return int(rid)


def _mk_prompt(row: dict[str, Any]) -> str:
    return (
        "Eres una persona encuestada en España con el siguiente perfil: "
        f"sexo {row.get('sexo') or 'ND'}, edad {row.get('edad') or 'ND'}, "
        f"estudios {row.get('estudios') or 'ND'}, situación laboral {row.get('sitlab') or 'ND'}, "
        f"clase social {row.get('clasesub') or 'ND'}, CCAA {row.get('ccaa') or 'ND'}, "
        f"autoposicionamiento ideológico {row.get('escideol') if row.get('escideol') is not None else 'ND'} (1-10), "
        f"partido más cercano {row.get('cercania') or 'ND'}, recuerdo de voto {row.get('recuerdo') or 'ND'}. "
        "En unas elecciones generales hoy, ¿a qué partido votarías?"
    )


def _chi2_and_cramers_v(ct: pd.DataFrame) -> tuple[float, float]:
    obs = ct.to_numpy(dtype=float)
    n = obs.sum()
    if n <= 0:
        return 0.0, 0.0
    row_sum = obs.sum(axis=1, keepdims=True)
    col_sum = obs.sum(axis=0, keepdims=True)
    exp = (row_sum @ col_sum) / n
    with np.errstate(divide="ignore", invalid="ignore"):
        contrib = np.where(exp > 0, ((obs - exp) ** 2) / exp, 0.0)
        chi2 = float(np.nansum(contrib))
    r, c = obs.shape
    k = min(r - 1, c - 1)
    if k <= 0:
        return chi2, 0.0
    v = ((chi2 / n) / k) ** 0.5
    return chi2, float(v)


def ingest_microdatos_folder(
    engine: Engine,
    source_dir: str = DEFAULT_MICRODATOS_DIR,
    max_files: int | None = None,
    replace_existing_for_survey: bool = True,
) -> dict[str, Any]:
    _ensure_tables(engine)
    src = Path(source_dir)
    if not src.exists():
        return {"ok": False, "error": f"No existe la carpeta: {source_dir}"}

    files = [p for p in sorted(src.rglob("*")) if p.is_file() and p.suffix.lower() in {".csv", ".sav", ".dta", ".xlsx", ".xls"}]
    files = [p for p in files if "_etiq" not in p.name.lower() and not p.name.startswith(".")]
    # Si existen CSV numéricos por estudio, priorizarlos frente a SAV para acelerar y evitar dependencia opcional.
    preferred: dict[tuple[str, str], Path] = {}
    for f in files:
        key = (str(f.parent), re.sub(r"(_num|_etiq)$", "", f.stem.lower()))
        score = 0
        if f.suffix.lower() == ".csv" and f.stem.lower().endswith("_num"):
            score = 3
        elif f.suffix.lower() == ".csv":
            score = 2
        elif f.suffix.lower() == ".sav":
            score = 1
        cur = preferred.get(key)
        if cur is None:
            preferred[key] = f
            continue
        cur_score = 3 if (cur.suffix.lower() == ".csv" and cur.stem.lower().endswith("_num")) else (2 if cur.suffix.lower() == ".csv" else (1 if cur.suffix.lower() == ".sav" else 0))
        if score > cur_score:
            preferred[key] = f
    files = sorted(set(preferred.values()), key=lambda p: str(p))
    if max_files:
        files = files[:max_files]

    run_id = datetime.now().strftime("%Y%m%d%H%M%S")
    processed = 0
    inserted_micro = 0
    inserted_raw = 0
    inserted_ai = 0
    inserted_cohortes = 0
    inserted_assoc = 0

    with engine.begin() as conn:
        fuente_id = _get_or_create_fuente(conn)

        for path in files:
            try:
                df, labels = _read_table(path)
            except Exception as exc:
                logger.warning("No se pudo leer %s: %s", path, exc)
                continue

            if df.empty or not _is_political_dataset(df, labels, path):
                continue

            try:
                with conn.begin_nested():
                    study_code = _extract_study_code(path, df)
                    grupo = _dataset_group(path)
                    encuesta_id = _get_or_create_encuesta(conn, fuente_id, study_code, path, grupo)
        
                    if replace_existing_for_survey:
                        conn.execute(text("DELETE FROM microdatos_encuesta WHERE encuesta_id = :e"), {"e": encuesta_id})
        
                    col_id = _find_col(df, labels, ["ID", "IDP", "NENTRE", "NUMERO"])
                    col_sex = _find_col(df, labels, ["SEXO", "A.3"], r"\bsexo\b")
                    col_age = _find_col(df, labels, ["EDAD", "A.4"], r"\bedad\b")
                    col_studies = _find_col(df, labels, ["ESTUDIOS", "NIVELESTENTREV", "E.2", "E.2.1", "E.2.2"], r"estudios")
                    col_sitlab = _find_col(df, labels, ["SITLAB", "SITULABA1T3"], r"situaci[oó]n laboral")
                    col_class = _find_col(df, labels, ["CLASESUB", "CLASESOCIAL", "H.1", "CS"], r"clase social")
                    col_ccaa = _find_col(df, labels, ["CCAA", "A.6", "CPRO"], r"comunidad aut[oó]noma|provincia")
                    col_vote = _find_col(df, labels, ["INTENCIONG", "INTENCIONGR", "INTENCIONGALTER", "VOTOSIMG", "P3"], r"intenci[oó]n de voto")
                    col_rec = _find_col(df, labels, ["RECUVOTOG", "RECUVOTOGR", "RECUERDO"], r"recuerdo de voto")
                    col_cercania = _find_col(df, labels, ["CERCANIA", "SIMPATIA", "P4"], r"partido.*cercan|simpat[ií]a")
                    col_ideol = _find_col(df, labels, ["ESCIDEOL", "G.1", "F.1", "C.3.1", "H.4.1"], r"autoubicaci[oó]n ideol[oó]gica|escala.*ideol")
                    col_weight = _find_col(df, labels, ["PESO", "PESOCCAA", "PESO_A", "I.1", "H.1"], r"ponderaci[oó]n|peso")
                    col_p12 = _find_col(df, labels, ["P12"], r"situaci[oó]n econ[oó]mica.*espa")
                    col_p13 = _find_col(df, labels, ["P13"], r"situaci[oó]n econ[oó]mica.*personal")
                    lider_cols = [
                        _find_col(df, labels, [f"VALORALIDERES{i}", f"LIDERESCORONA{i}"], r"valoraci[oó]n.*lider")
                        for i in range(1, 6)
                    ]
        
                    micro_rows: list[dict[str, Any]] = []
                    raw_rows: list[dict[str, Any]] = []
                    ai_rows: list[dict[str, Any]] = []
        
                    cohortes: dict[str, dict[str, Any]] = defaultdict(
                        lambda: {
                            "n_obs": 0,
                            "peso_total": 0.0,
                            "ideo_sum_w": 0.0,
                            "ideo_w": 0.0,
                            "votos": Counter(),
                        }
                    )
                    assoc_records: list[dict[str, Any]] = []
        
                    assoc_df = pd.DataFrame()
        
                    for idx, row in df.iterrows():
                        respondent = _as_str(row.get(col_id) if col_id else None, 20) or f"{study_code}-{idx+1}"
                        respondent_hash = hashlib.sha1(f"{path.name}|{respondent}|{idx}".encode("utf-8")).hexdigest()
        
                        sex = _normalize_sex(row.get(col_sex) if col_sex else None)
                        age = _as_num(row.get(col_age) if col_age else None)
                        if age is not None and (age < 15 or age > 100):
                            age = None
                        studies = _as_str(row.get(col_studies) if col_studies else None, 50)
                        sitlab = _as_str(row.get(col_sitlab) if col_sitlab else None, 50)
                        clasesub = _as_str(row.get(col_class) if col_class else None, 30)
                        ccaa = _as_str(row.get(col_ccaa) if col_ccaa else None, 80)
                        ccaa_id: int | None = _normalize_ccaa_id(row.get(col_ccaa) if col_ccaa else None)
                        vote = _normalize_party(row.get(col_vote) if col_vote else None)
                        rec = _normalize_party(row.get(col_rec) if col_rec else None)
                        cercania = _normalize_party(row.get(col_cercania) if col_cercania else None)
                        ideol = _as_num(row.get(col_ideol) if col_ideol else None)
                        if ideol is not None and (ideol < 0 or ideol > 10):
                            ideol = None
                        weight = _as_num(row.get(col_weight) if col_weight else None)
                        if weight is None or weight <= 0:
                            weight = 1.0
        
                        p12 = _as_str(row.get(col_p12) if col_p12 else None, 40)
                        p13 = _as_str(row.get(col_p13) if col_p13 else None, 40)
                        lider_vals = [(_as_num(row.get(c)) if c else None) for c in lider_cols]
        
                        micro_rows.append(
                            {
                                "encuesta_id": encuesta_id,
                                "id_respondente": respondent,
                                "sexo": sex,
                                "edad": int(age) if age is not None else None,
                                "grupo_edad": _age_group(age),
                                "estudios": studies,
                                "ocupacion": None,
                                "situacion_laboral": sitlab,
                                "ccaa_id": ccaa_id,
                                "tamano_habitat": None,
                                "religion": None,
                                "clase_social_subjetiva": clasesub,
                                "ingresos_hogar": None,
                                "recuerdo_voto_anterior": rec,
                                "intencion_voto": vote,
                                "intencion_voto_cocina": None,
                                "escala_ideologica": ideol,
                                "valoracion_gobierno": None,
                                "valoracion_oposicion": None,
                                "satisfaccion_democracia": None,
                                "principal_problema": None,
                                "situacion_economica_personal": p13,
                                "situacion_economica_españa": p12,
                                "identidad_territorial": ccaa,
                                "peso_muestral": weight,
                            }
                        )
                        raw_rows.append(
                            {
                                "encuesta_id": encuesta_id,
                                "source_file": str(path),
                                "dataset_grupo": grupo,
                                "row_hash": respondent_hash,
                                "payload_json": json.dumps({k: (None if pd.isna(v) else v) for k, v in row.to_dict().items()}, default=str, ensure_ascii=False),
                                "source_labels": json.dumps(labels, ensure_ascii=False) if labels else None,
                                "has_vote": vote is not None,
                                "has_ideology": ideol is not None,
                            }
                        )
        
                        cohort_key = "|".join(
                            [
                                sex or "NA",
                                _age_group(age) or "NA",
                                studies or "NA",
                                sitlab or "NA",
                                clasesub or "NA",
                                ccaa or "NA",
                                _ideology_bin(ideol),
                                rec or "NA",
                                cercania or "NA",
                            ]
                        )
                        c = cohortes[cohort_key]
                        c["n_obs"] += 1
                        c["peso_total"] += float(weight)
                        if ideol is not None:
                            c["ideo_sum_w"] += float(ideol) * float(weight)
                            c["ideo_w"] += float(weight)
                        c["votos"][_cohort_vote_bucket(vote)] += float(weight)
                        assoc_records.append(
                            {
                                "sexo": sex,
                                "grupo_edad": _age_group(age),
                                "estudios": studies,
                                "sitlab": sitlab,
                                "clasesub": clasesub,
                                "ccaa": ccaa,
                                "escideol_bin": _ideology_bin(ideol),
                                "recuerdo": rec,
                                "cercania": cercania,
                                "intencion": vote,
                            }
                        )
        
                        if vote is not None or ideol is not None:
                            ai_rows.append(
                                {
                                    "run_id": run_id,
                                    "encuesta_id": encuesta_id,
                                    "respondent_hash": respondent_hash,
                                    "cohorte_key": cohort_key,
                                    "prompt_perfil": _mk_prompt(
                                        {
                                            "sexo": sex, "edad": int(age) if age is not None else None, "estudios": studies,
                                            "sitlab": sitlab, "clasesub": clasesub, "ccaa": ccaa, "escideol": ideol,
                                            "cercania": cercania, "recuerdo": rec,
                                        }
                                    ),
                                    "label_voto": vote,
                                    "escala_ideologica": ideol,
                                    "peso": float(weight),
                                    "metadata_json": json.dumps(
                                        {
                                            "sexo": sex, "edad": int(age) if age is not None else None, "grupo_edad": _age_group(age),
                                            "estudios": studies, "sitlab": sitlab, "clasesub": clasesub, "ccaa": ccaa,
                                            "escideol": ideol, "cercania": cercania, "recuerdo": rec,
                                            "p12": p12, "p13": p13,
                                            "valor_lider_1": lider_vals[0], "valor_lider_2": lider_vals[1], "valor_lider_3": lider_vals[2],
                                            "valor_lider_4": lider_vals[3], "valor_lider_5": lider_vals[4],
                                        },
                                        ensure_ascii=False,
                                    ),
                                }
                            )
        
                    if not micro_rows:
                        continue
        
                    processed += 1
        
                    conn.execute(
                        text(
                            """
                            INSERT INTO microdatos_encuesta (
                              encuesta_id, id_respondente, sexo, edad, grupo_edad, estudios,
                              ocupacion, situacion_laboral, ccaa_id, tamano_habitat, religion,
                              clase_social_subjetiva, ingresos_hogar, recuerdo_voto_anterior,
                              intencion_voto, intencion_voto_cocina, escala_ideologica,
                              valoracion_gobierno, valoracion_oposicion, satisfaccion_democracia,
                              principal_problema, situacion_economica_personal, situacion_economica_españa,
                              identidad_territorial, peso_muestral
                            )
                            VALUES (
                              :encuesta_id, :id_respondente, :sexo, :edad, :grupo_edad, :estudios,
                              :ocupacion, :situacion_laboral, :ccaa_id, :tamano_habitat, :religion,
                              :clase_social_subjetiva, :ingresos_hogar, :recuerdo_voto_anterior,
                              :intencion_voto, :intencion_voto_cocina, :escala_ideologica,
                              :valoracion_gobierno, :valoracion_oposicion, :satisfaccion_democracia,
                              :principal_problema, :situacion_economica_personal, :situacion_economica_españa,
                              :identidad_territorial, :peso_muestral
                            )
                            """
                        ),
                        micro_rows,
                    )
                    inserted_micro += len(micro_rows)
        
                    conn.execute(
                        text(
                            """
                            INSERT INTO microdatos_cis_raw (
                              encuesta_id, source_file, dataset_grupo, row_hash, payload_json, source_labels, has_vote, has_ideology
                            )
                            VALUES (
                              :encuesta_id, :source_file, :dataset_grupo, :row_hash,
                              CAST(:payload_json AS JSONB), CAST(:source_labels AS JSONB), :has_vote, :has_ideology
                            )
                            ON CONFLICT (source_file, row_hash) DO UPDATE SET
                              dataset_grupo = EXCLUDED.dataset_grupo,
                              payload_json = EXCLUDED.payload_json,
                              source_labels = EXCLUDED.source_labels,
                              has_vote = EXCLUDED.has_vote,
                              has_ideology = EXCLUDED.has_ideology
                            """
                        ),
                        raw_rows,
                    )
                    inserted_raw += len(raw_rows)
        
                    if ai_rows:
                        conn.execute(
                            text(
                                """
                                INSERT INTO microdatos_ai_pool (
                                  run_id, encuesta_id, respondent_hash, cohorte_key, prompt_perfil,
                                  label_voto, escala_ideologica, peso, metadata_json
                                )
                                VALUES (
                                  :run_id, :encuesta_id, :respondent_hash, :cohorte_key, :prompt_perfil,
                                  :label_voto, :escala_ideologica, :peso, CAST(:metadata_json AS JSONB)
                                )
                                ON CONFLICT (encuesta_id, respondent_hash) DO UPDATE SET
                                  run_id = EXCLUDED.run_id,
                                  cohorte_key = EXCLUDED.cohorte_key,
                                  prompt_perfil = EXCLUDED.prompt_perfil,
                                  label_voto = EXCLUDED.label_voto,
                                  escala_ideologica = EXCLUDED.escala_ideologica,
                                  peso = EXCLUDED.peso,
                                  metadata_json = EXCLUDED.metadata_json
                                """
                            ),
                            ai_rows,
                        )
                        inserted_ai += len(ai_rows)
        
                    cohort_rows = []
                    for key, c in cohortes.items():
                        p = key.split("|")
                        sexo_val = p[0] if len(p) > 0 else None
                        if sexo_val == "NA":
                            sexo_val = "N"
                        if sexo_val:
                            sexo_val = sexo_val[:1]
                        voto_total = sum(c["votos"].values())
                        voto_dist: dict[str, float] = {}
                        if voto_total > 0:
                            raw_dist = {k: round((v / voto_total) * 100.0, 3) for k, v in c["votos"].most_common()}
                            informative = {k: v for k, v in raw_dist.items() if k not in {"NS/NC", "Blanco/Nulo", "NO_DECLARA", "NO DECLARA"}}
                            informative_total = sum(informative.values())
                            if informative_total >= 20.0 and len(informative) >= 2:
                                voto_dist = {
                                    k: round((v / informative_total) * 100.0, 3)
                                    for k, v in sorted(informative.items(), key=lambda x: x[1], reverse=True)
                                }
                            else:
                                voto_dist = _vote_fallback_from_signals(
                                    (c["ideo_sum_w"] / c["ideo_w"]) if c["ideo_w"] > 0 else None,
                                    p[7] if len(p) > 7 else None,
                                    p[8] if len(p) > 8 else None,
                                )
                        cohort_rows.append(
                            {
                                "run_id": run_id,
                                "encuesta_id": encuesta_id,
                                "cohorte_key": key,
                                "sexo": sexo_val,
                                "grupo_edad": p[1] if len(p) > 1 else None,
                                "estudios": p[2] if len(p) > 2 else None,
                                "sitlab": p[3] if len(p) > 3 else None,
                                "clase_subjetiva": p[4] if len(p) > 4 else None,
                                "ccaa": p[5] if len(p) > 5 else None,
                                "ideologia_tramo": p[6] if len(p) > 6 else None,
                                "recuerdo_voto": p[7] if len(p) > 7 else None,
                                "cercania": p[8] if len(p) > 8 else None,
                                "n_obs": c["n_obs"],
                                "peso_total": c["peso_total"],
                                "ideologia_media": (c["ideo_sum_w"] / c["ideo_w"]) if c["ideo_w"] > 0 else None,
                                "voto_dist_json": json.dumps(voto_dist, ensure_ascii=False),
                            }
                        )
                    if cohort_rows:
                        conn.execute(
                            text(
                                """
                                INSERT INTO microdatos_cohortes (
                                  run_id, encuesta_id, cohorte_key, sexo, grupo_edad, estudios,
                                  sitlab, clase_subjetiva, ccaa, ideologia_tramo, recuerdo_voto,
                                  cercania, n_obs, peso_total, ideologia_media, voto_dist_json
                                )
                                VALUES (
                                  :run_id, :encuesta_id, :cohorte_key, :sexo, :grupo_edad, :estudios,
                                  :sitlab, :clase_subjetiva, :ccaa, :ideologia_tramo, :recuerdo_voto,
                                  :cercania, :n_obs, :peso_total, :ideologia_media, CAST(:voto_dist_json AS JSONB)
                                )
                                ON CONFLICT (run_id, encuesta_id, cohorte_key) DO NOTHING
                                """
                            ),
                            cohort_rows,
                        )
                        inserted_cohortes += len(cohort_rows)
        
                    # asociaciones
                    assoc_df = pd.DataFrame(assoc_records)
                    assoc_rows = []
                    if not assoc_df.empty:
                        assoc_df = assoc_df.dropna(subset=["intencion"])
                        predictors = ["sexo", "grupo_edad", "estudios", "sitlab", "clasesub", "ccaa", "escideol_bin", "recuerdo", "cercania"]
                        for pred in predictors:
                            tdf = assoc_df[[pred, "intencion"]].dropna()
                            if tdf.empty:
                                continue
                            ct = pd.crosstab(tdf[pred].astype(str), tdf["intencion"].astype(str))
                            if ct.shape[0] < 2 or ct.shape[1] < 2:
                                continue
                            chi2, cv = _chi2_and_cramers_v(ct)
                            assoc_rows.append(
                                {
                                    "run_id": run_id,
                                    "encuesta_id": encuesta_id,
                                    "predictor": pred,
                                    "target": "INTENCIONG",
                                    "n_obs": int(tdf.shape[0]),
                                    "chi2": chi2,
                                    "cramers_v": cv,
                                    "n_levels_pred": int(ct.shape[0]),
                                    "n_levels_target": int(ct.shape[1]),
                                }
                            )
                    if assoc_rows:
                        conn.execute(
                            text(
                                """
                                INSERT INTO microdatos_asociaciones (
                                  run_id, encuesta_id, predictor, target, n_obs, chi2, cramers_v, n_levels_pred, n_levels_target
                                )
                                VALUES (
                                  :run_id, :encuesta_id, :predictor, :target, :n_obs, :chi2, :cramers_v, :n_levels_pred, :n_levels_target
                                )
                                """
                            ),
                            assoc_rows,
                        )
                        inserted_assoc += len(assoc_rows)
            except Exception as exc:
                logger.error("Error procesando %s — saltando: %s", path, exc)
                continue

        # Añade perfiles derivados de microdatos sin eliminar los perfiles base existentes.
        cohort_df = pd.read_sql(
            text(
                """
                SELECT cohorte_key, sexo, grupo_edad, estudios, sitlab, clase_subjetiva,
                       ideologia_tramo, recuerdo_voto, cercania, n_obs, peso_total, ideologia_media, voto_dist_json
                FROM microdatos_cohortes
                WHERE run_id = :run_id
                ORDER BY peso_total DESC
                LIMIT 20
                """
            ),
            conn,
            params={"run_id": run_id},
        )
        if not cohort_df.empty:
            total_w = float(cohort_df["peso_total"].astype(float).sum()) or 1.0
            conn.execute(text("DELETE FROM perfiles_votante WHERE cluster_id >= 1000 OR label LIKE 'Microdatos · %'"))
            rows = []
            for idx, r in cohort_df.reset_index(drop=True).iterrows():
                label = f"Microdatos · {r['sexo'] or 'NA'} · {r['grupo_edad'] or 'NA'} · {r['ideologia_tramo'] or 'NA'}"
                edad_media = _age_mid_from_group(r.get("grupo_edad"))
                voto_payload = r["voto_dist_json"]
                if isinstance(voto_payload, str):
                    try:
                        voto_payload = json.loads(voto_payload)
                    except Exception:
                        voto_payload = {}
                if not isinstance(voto_payload, dict):
                    voto_payload = {}
                cleaned_payload = {}
                for k, v in voto_payload.items():
                    try:
                        vv = float(v)
                    except Exception:
                        continue
                    kk = _normalize_party(k) or str(k)
                    cleaned_payload[kk] = cleaned_payload.get(kk, 0.0) + max(0.0, vv)
                informative_payload = {
                    k: v for k, v in cleaned_payload.items()
                    if k not in {"NS/NC", "Blanco/Nulo", "NO_DECLARA", "NO DECLARA"}
                }
                if not informative_payload or sum(informative_payload.values()) < 20.0:
                    cleaned_payload = _vote_fallback_from_signals(
                        r.get("ideologia_media"),
                        r.get("recuerdo_voto"),
                        r.get("cercania"),
                    )
                else:
                    tot = sum(informative_payload.values()) or 1.0
                    cleaned_payload = {
                        k: round((v / tot) * 100.0, 3)
                        for k, v in sorted(informative_payload.items(), key=lambda x: x[1], reverse=True)
                    }
                rows.append(
                    {
                        "cluster_id": 1000 + idx + 1,
                        "label": label,
                        "n_respondentes": int(r["n_obs"]),
                        "peso_demografico_pct": round(float(r["peso_total"]) * 100.0 / total_w, 3),
                        "edad_media": edad_media,
                        "ideologia_media": float(r["ideologia_media"]) if r["ideologia_media"] is not None else None,
                        "distribucion_voto_json": json.dumps(cleaned_payload, ensure_ascii=False),
                        "descripcion_perfil_llm": (
                            f"Cohorte real microdatos: estudios={r['estudios']}, sitlab={r['sitlab']}, "
                            f"clase={r['clase_subjetiva']}, recuerdo={r['recuerdo_voto']}"
                        )[:1200],
                    }
                )
            conn.execute(
                text(
                    """
                    INSERT INTO perfiles_votante(
                      cluster_id, label, n_respondentes, peso_demografico_pct,
                      edad_media, ideologia_media, distribucion_voto_json, descripcion_perfil_llm
                    )
                    VALUES(
                      :cluster_id, :label, :n_respondentes, :peso_demografico_pct,
                      :edad_media, :ideologia_media, :distribucion_voto_json, :descripcion_perfil_llm
                    )
                    ON CONFLICT (cluster_id) DO UPDATE SET
                      label = EXCLUDED.label,
                      n_respondentes = EXCLUDED.n_respondentes,
                      peso_demografico_pct = EXCLUDED.peso_demografico_pct,
                      edad_media = EXCLUDED.edad_media,
                      ideologia_media = EXCLUDED.ideologia_media,
                      distribucion_voto_json = EXCLUDED.distribucion_voto_json,
                      descripcion_perfil_llm = EXCLUDED.descripcion_perfil_llm
                    """
                ),
                rows,
            )

    return {
        "ok": True,
        "run_id": run_id,
        "source_dir": source_dir,
        "ficheros_procesados": processed,
        "microdatos_insertados": inserted_micro,
        "raw_insertados": inserted_raw,
        "cohortes_insertadas": inserted_cohortes,
        "asociaciones_insertadas": inserted_assoc,
        "pool_ia_insertado": inserted_ai,
    }


def save_custom_user_profile(
    engine: Engine,
    payload: dict[str, Any],
) -> None:
    _ensure_tables(engine)
    params = {
        "usuario_id": payload.get("usuario_id", "default"),
        "nombre_perfil": payload["nombre_perfil"],
        "sexo": payload.get("sexo"),
        "edad": payload.get("edad"),
        "estudios": payload.get("estudios"),
        "sitlab": payload.get("sitlab"),
        "clasesub": payload.get("clasesub"),
        "ccaa": payload.get("ccaa"),
        "escideol": payload.get("escideol"),
        "cercania": payload.get("cercania"),
        "recuerdo": payload.get("recuerdo"),
        "p12": payload.get("p12"),
        "p13": payload.get("p13"),
        "valor_lider_1": payload.get("valor_lider_1"),
        "valor_lider_2": payload.get("valor_lider_2"),
        "valor_lider_3": payload.get("valor_lider_3"),
        "valor_lider_4": payload.get("valor_lider_4"),
        "valor_lider_5": payload.get("valor_lider_5"),
        "notes": payload.get("notes"),
    }
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO perfil_usuario_custom(
                  usuario_id, nombre_perfil, sexo, edad, estudios, sitlab, clasesub, ccaa,
                  escideol, cercania, recuerdo, p12, p13,
                  valor_lider_1, valor_lider_2, valor_lider_3, valor_lider_4, valor_lider_5,
                  notes, updated_at
                )
                VALUES(
                  :usuario_id, :nombre_perfil, :sexo, :edad, :estudios, :sitlab, :clasesub, :ccaa,
                  :escideol, :cercania, :recuerdo, :p12, :p13,
                  :valor_lider_1, :valor_lider_2, :valor_lider_3, :valor_lider_4, :valor_lider_5,
                  :notes, NOW()
                )
                ON CONFLICT (usuario_id, nombre_perfil) DO UPDATE SET
                  sexo = EXCLUDED.sexo,
                  edad = EXCLUDED.edad,
                  estudios = EXCLUDED.estudios,
                  sitlab = EXCLUDED.sitlab,
                  clasesub = EXCLUDED.clasesub,
                  ccaa = EXCLUDED.ccaa,
                  escideol = EXCLUDED.escideol,
                  cercania = EXCLUDED.cercania,
                  recuerdo = EXCLUDED.recuerdo,
                  p12 = EXCLUDED.p12,
                  p13 = EXCLUDED.p13,
                  valor_lider_1 = EXCLUDED.valor_lider_1,
                  valor_lider_2 = EXCLUDED.valor_lider_2,
                  valor_lider_3 = EXCLUDED.valor_lider_3,
                  valor_lider_4 = EXCLUDED.valor_lider_4,
                  valor_lider_5 = EXCLUDED.valor_lider_5,
                  notes = EXCLUDED.notes,
                  updated_at = NOW()
                """
            ),
            params,
        )
