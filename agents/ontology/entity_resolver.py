"""
Entity Resolver — deduplicacion y resolucion de entidades.

Garantiza que "Pedro Sanchez", "P. Sanchez Perez", "Pedro Sanchez Perez"
converjan en UN SOLO objeto UUID en persona_publica / organizacion.

Metodologia:
  1. Normalizacion de texto (unicode, titulos, stopwords)
  2. Busqueda exacta por nombre_norm en BD
  3. Fuzzy matching con pg_trgm + SequenceMatcher
  4. Enriquecimiento externo (Wikidata SPARQL, OpenSanctions API)
  5. Emision de senal si score de riesgo alto

Equivalente al People Record de NationBuilder y al Entity Resolution
de Palantir Foundry (Object Linking and Merging).
"""
from __future__ import annotations

import logging
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Optional
from uuid import UUID, uuid4

import psycopg
from psycopg.rows import dict_row

from config.settings import get_settings

log = logging.getLogger(__name__)

_settings = get_settings()

THRESHOLD_HIGH   = 0.92
THRESHOLD_MEDIUM = 0.82

TITULOS_COMUNES = {
    "don", "dona", "sr", "sra", "dr", "dra", "prof", "profesora",
    "excmo", "ilmo", "senor", "senora", "excelentisimo", "ilustrisimo",
}


def _conn_str() -> str:
    raw = _settings.database_url_raw
    # psycopg v3 espera postgresql:// o postgresql+psycopg://
    return re.sub(r"postgresql\+\w+://", "postgresql://", raw)


class EntityResolver:
    """
    Resuelve, deduplica y enriquece entidades del tipo persona o organizacion.
    Usa psycopg v3 (mismo patron que el resto del proyecto).
    """

    def __init__(self) -> None:
        self._dsn = _conn_str()
        self._cache: dict[str, str] = {}   # nombre_norm -> UUID str

    # ------------------------------------------------------------------
    # API publica
    # ------------------------------------------------------------------

    def resolve_persona(
        self,
        nombre: str,
        partido: str = "",
        cargo: str = "",
        fuente: str = "",
    ) -> Optional[str]:
        """Devuelve el UUID canonico (str) de la persona, creandola si no existe."""
        nombre_norm = self._normalize(nombre)
        if not nombre_norm:
            return None

        if nombre_norm in self._cache:
            return self._cache[nombre_norm]

        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            # 1. Busqueda exacta
            uid = self._lookup_exact(conn, "persona_publica", nombre_norm)
            if uid:
                self._cache[nombre_norm] = uid
                return uid

            # 2. Fuzzy matching
            candidates = self._get_candidates(conn, "persona_publica", nombre_norm)
            best_id, best_score = self._best_match(nombre_norm, candidates)

            if best_score >= THRESHOLD_HIGH:
                self._merge_persona(conn, best_id, partido, cargo)
                self._cache[nombre_norm] = best_id
                return best_id

            if best_score >= THRESHOLD_MEDIUM:
                self._flag_review(conn, nombre_norm, best_id, best_score)
                self._cache[nombre_norm] = best_id
                return best_id

            # 3. Nueva entidad
            uid = self._create_persona(conn, nombre, nombre_norm, partido, cargo)
            self._cache[nombre_norm] = uid

        # Enriquecimiento externo (sin mantener la conexion abierta)
        self._enrich_wikidata(uid, nombre)
        self._enrich_opensanctions(uid, nombre)
        return uid

    def resolve_organizacion(
        self,
        nombre: str,
        tipo: str = "",
        cif: str = "",
        fuente: str = "",
    ) -> Optional[str]:
        """Devuelve el UUID canonico de la organizacion, creandola si no existe."""
        nombre_norm = self._normalize(nombre)
        if not nombre_norm:
            return None

        cache_key = f"org:{nombre_norm}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            # Busqueda por CIF (identificador inequivoco)
            if cif:
                uid = self._lookup_by_cif(conn, cif)
                if uid:
                    self._cache[cache_key] = uid
                    return uid

            uid = self._lookup_exact(conn, "organizacion", nombre_norm)
            if uid:
                self._cache[cache_key] = uid
                return uid

            candidates = self._get_candidates(conn, "organizacion", nombre_norm)
            best_id, best_score = self._best_match(nombre_norm, candidates)

            if best_score >= THRESHOLD_HIGH:
                self._cache[cache_key] = best_id
                return best_id

            uid = self._create_org(conn, nombre, nombre_norm, tipo, cif)
            self._cache[cache_key] = uid
            return uid

    def link(
        self,
        a_id: str,
        a_tipo: str,
        tipo_relacion: str,
        b_id: str,
        b_tipo: str,
        peso: float = 1.0,
        fuente: str = "",
    ) -> bool:
        """Crea una relacion tipada entre dos entidades en relacion_politeia."""
        try:
            with psycopg.connect(self._dsn) as conn:
                conn.execute(
                    """
                    INSERT INTO relacion_politeia
                        (elemento_a_id, elemento_a_tipo, tipo_relacion,
                         elemento_b_id, elemento_b_tipo, peso, fuente_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (elemento_a_id, tipo_relacion, elemento_b_id)
                    DO UPDATE SET peso = EXCLUDED.peso, activa = TRUE
                    """,
                    (a_id, a_tipo, tipo_relacion, b_id, b_tipo, peso, fuente or None),
                )
            return True
        except Exception as exc:
            log.debug("link error: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Enriquecimiento externo
    # ------------------------------------------------------------------

    def _enrich_wikidata(self, persona_id: str, nombre: str) -> None:
        try:
            import requests

            sparql = f"""
            SELECT ?person ?cargo ?cargoLabel ?partido ?partidoLabel
                   ?fechaNac ?imagen WHERE {{
              ?person rdfs:label "{nombre}"@es;
                      wikibase:sitelinks ?links.
              OPTIONAL {{ ?person wdt:P39 ?cargo. }}
              OPTIONAL {{ ?person wdt:P102 ?partido. }}
              OPTIONAL {{ ?person wdt:P569 ?fechaNac. }}
              OPTIONAL {{ ?person wdt:P18 ?imagen. }}
              SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en". }}
            }} LIMIT 3
            """
            r = requests.get(
                "https://query.wikidata.org/sparql",
                params={"query": sparql, "format": "json"},
                headers={"User-Agent": "PoliteiaOS/2.0"},
                timeout=10,
            )
            bindings = r.json().get("results", {}).get("bindings", [])
            if not bindings:
                return

            row = bindings[0]
            wikidata_id = row.get("person", {}).get("value", "").split("/")[-1]
            cargo   = row.get("cargoLabel", {}).get("value", "")
            partido = row.get("partidoLabel", {}).get("value", "")
            foto    = row.get("imagen", {}).get("value", "")
            fecha_str = (row.get("fechaNac", {}).get("value", "") or "")[:10] or None

            with psycopg.connect(self._dsn) as conn:
                conn.execute(
                    """
                    UPDATE persona_publica
                    SET wikidata_id  = COALESCE(wikidata_id, %s),
                        cargo_actual = COALESCE(NULLIF(cargo_actual, ''), %s),
                        partido      = COALESCE(NULLIF(partido, ''), %s),
                        foto_url     = COALESCE(foto_url, %s),
                        fecha_nac    = COALESCE(fecha_nac, %s::date),
                        updated_at   = NOW()
                    WHERE id = %s
                    """,
                    (wikidata_id or None, cargo or None, partido or None,
                     foto or None, fecha_str, persona_id),
                )
            log.debug("Wikidata OK: %s -> %s", nombre, wikidata_id)
        except Exception as exc:
            log.debug("Wikidata skip (%s): %s", nombre, exc)

    def _enrich_opensanctions(self, persona_id: str, nombre: str) -> None:
        import os
        api_key = os.getenv("OPENSANCTIONS_API_KEY", "")
        if not api_key:
            return
        try:
            import requests

            r = requests.post(
                "https://api.opensanctions.org/match/default",
                json={"queries": {"q0": {"schema": "Person",
                                          "properties": {"name": [nombre]}}}},
                headers={"Authorization": f"ApiKey {api_key}"},
                timeout=10,
            )
            results = r.json().get("responses", {}).get("q0", {})
            total = results.get("total", {}).get("value", 0)
            if total == 0:
                return

            best = (results.get("results") or [{}])[0]
            score_riesgo = min(best.get("score", 0) / 100.0, 1.0)
            os_id = best.get("id", "")

            with psycopg.connect(self._dsn) as conn:
                conn.execute(
                    """
                    UPDATE persona_publica
                    SET opensanctions_id = COALESCE(opensanctions_id, %s),
                        score_riesgo     = GREATEST(score_riesgo, %s),
                        updated_at       = NOW()
                    WHERE id = %s
                    """,
                    (os_id or None, score_riesgo, persona_id),
                )
                if score_riesgo > 0.5:
                    conn.execute(
                        """
                        INSERT INTO signal_politeia
                            (tipo, urgencia, titulo, resumen, personas, modulo_origen)
                        VALUES ('compliance', 4, %s, %s, %s, 'entity_resolver')
                        """,
                        (
                            f"Alerta OpenSanctions: {nombre}",
                            f"Match en sanciones/PEPs. Score: {score_riesgo:.2f}",
                            [persona_id],
                        ),
                    )
            log.info("OpenSanctions: %s -> riesgo %.2f", nombre, score_riesgo)
        except Exception as exc:
            log.debug("OpenSanctions skip (%s): %s", nombre, exc)

    # ------------------------------------------------------------------
    # Helpers internos BD
    # ------------------------------------------------------------------

    def _normalize(self, text: str) -> str:
        if not text:
            return ""
        text = unicodedata.normalize("NFD", text.lower())
        text = "".join(c for c in text if unicodedata.category(c) != "Mn")
        text = re.sub(r"[^\w\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        for titulo in TITULOS_COMUNES:
            text = re.sub(rf"\b{titulo}\b\.?", "", text).strip()
        return text

    def _lookup_exact(self, conn: psycopg.Connection, tabla: str, nombre_norm: str) -> Optional[str]:
        row = conn.execute(
            f"SELECT id FROM {tabla} WHERE nombre_norm = %s LIMIT 1",
            (nombre_norm,),
        ).fetchone()
        return str(row[0]) if row else None

    def _lookup_by_cif(self, conn: psycopg.Connection, cif: str) -> Optional[str]:
        row = conn.execute(
            "SELECT id FROM organizacion WHERE cif = %s LIMIT 1",
            (cif,),
        ).fetchone()
        return str(row[0]) if row else None

    def _get_candidates(
        self, conn: psycopg.Connection, tabla: str, nombre_norm: str, limit: int = 20
    ) -> list[dict]:
        rows = conn.execute(
            f"""
            SELECT id::text, nombre_norm,
                   similarity(nombre_norm, %s) AS sim
            FROM {tabla}
            WHERE nombre_norm %% %s
            ORDER BY sim DESC
            LIMIT %s
            """,
            (nombre_norm, nombre_norm, limit),
        ).fetchall()
        return [{"id": r[0], "nombre_norm": r[1], "sim": r[2]} for r in rows]

    def _best_match(
        self, nombre_norm: str, candidates: list[dict]
    ) -> tuple[Optional[str], float]:
        best_id, best_score = None, 0.0
        for c in candidates:
            seq = SequenceMatcher(None, nombre_norm, c["nombre_norm"]).ratio()
            trgm = float(c.get("sim") or 0)
            combined = 0.6 * seq + 0.4 * trgm
            if combined > best_score:
                best_score = combined
                best_id = c["id"]
        return best_id, best_score

    def _create_persona(
        self, conn: psycopg.Connection,
        nombre: str, nombre_norm: str, partido: str, cargo: str,
    ) -> str:
        uid = str(uuid4())
        conn.execute(
            """
            INSERT INTO persona_publica
                (id, nombre_completo, nombre_norm, partido, cargo_actual)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (uid, nombre, nombre_norm, partido or None, cargo or None),
        )
        log.info("Nueva persona: %s [%s]", nombre, uid)
        return uid

    def _create_org(
        self, conn: psycopg.Connection,
        nombre: str, nombre_norm: str, tipo: str, cif: str,
    ) -> str:
        uid = str(uuid4())
        conn.execute(
            """
            INSERT INTO organizacion (id, nombre, nombre_norm, tipo, cif)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (uid, nombre, nombre_norm, tipo or None, cif or None),
        )
        log.info("Nueva org: %s [%s]", nombre, uid)
        return uid

    def _merge_persona(
        self, conn: psycopg.Connection, persona_id: str, partido: str, cargo: str
    ) -> None:
        conn.execute(
            """
            UPDATE persona_publica
            SET partido      = COALESCE(NULLIF(partido, ''), %s),
                cargo_actual = COALESCE(NULLIF(cargo_actual, ''), %s),
                updated_at   = NOW()
            WHERE id = %s
            """,
            (partido or None, cargo or None, persona_id),
        )

    def _flag_review(
        self, conn: psycopg.Connection, nombre_norm: str,
        candidate_id: str, score: float,
    ) -> None:
        try:
            conn.execute(
                """
                INSERT INTO entity_review_queue (nombre_norm, candidate_id, score)
                VALUES (%s, %s::uuid, %s)
                ON CONFLICT (nombre_norm, candidate_id) DO NOTHING
                """,
                (nombre_norm, candidate_id, score),
            )
        except Exception:
            pass
