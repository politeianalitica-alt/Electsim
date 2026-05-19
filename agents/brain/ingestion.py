"""
Bloque 1 — Ingestion · 5 tools del GroqBrain.

Antes de tocar BD, el brain razona sobre las fuentes:

  · identify_source_relevance   — ¿esta fuente debería entrar al sistema?
  · extract_political_entities  — actores/partidos/leyes/eventos mencionados
  · classify_document           — tipo (BOE, prensa, dictamen, RRSS, tweet...)
  · detect_source_change        — ¿una fuente conocida ha cambiado de tono?
  · discover_new_sources        — ¿qué fuentes desconocidas mencionan X tema?

Cada tool delega en `self._call()` (GroqBrainBase) y devuelve dict normalizado:
    {ok, result, confidence, sources, reasoning_steps, model, tokens_used, ...}
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _http_head_check(url: str, *, timeout: float = 5.0) -> tuple[int, str]:
    """HEAD request a la URL con timeout corto. Devuelve (status, error).

    Si HEAD no es soportado por el servidor (405) cae a GET con stream=True.
    Cualquier error de red devuelve (0, error_msg).
    """
    try:
        import requests
    except ImportError:
        return 0, "requests not installed"
    try:
        r = requests.head(url, timeout=timeout, allow_redirects=True)
        if r.status_code == 405:
            # Algunos servidores no permiten HEAD → probamos GET stream
            r = requests.get(url, timeout=timeout, stream=True, allow_redirects=True)
            r.close()
        return r.status_code, ""
    except Exception as exc:
        return 0, f"{type(exc).__name__}: {str(exc)[:120]}"


class IngestionMixin:
    """Bloque 1 · Razonamiento sobre ingesta de fuentes."""

    # ─────────────────────────────────────────────────────────────
    def identify_source_relevance(
        self,
        *,
        source_url: str,
        source_title: str = "",
        source_excerpt: str = "",
        topic_focus: str = "política española",
    ) -> dict[str, Any]:
        """Razona si una fuente desconocida debe ser ingestada al sistema.

        Devuelve: {relevant: bool, score: 0..1, category, rationale, risks}
        """
        return self._call(
            "ingestion_identify_source_relevance",
            {
                "source_url": source_url,
                "source_title": source_title,
                "source_excerpt": (source_excerpt or "")[:3000],
                "topic_focus": topic_focus,
            },
        )

    # ─────────────────────────────────────────────────────────────
    # I5 · Política de truncado documentada (constante única reexportable)
    MAX_TEXT_ENTITIES: int = 8000
    MAX_TEXT_CLASSIFY: int = 6000

    def extract_political_entities(
        self,
        *,
        text: str,
        context: str = "",
        max_chars: int | None = None,
    ) -> dict[str, Any]:
        """Extrae entidades políticas estructuradas del texto.

        Devuelve: {actors, parties, institutions, laws, events, locations,
                   topics, dates_mentioned, truncated: bool, original_chars: int}

        I5 · Si el texto se trunca, el output incluye `truncated=True` y el
        número original de caracteres para que el caller decida si re-llamar
        con chunks o aceptar el análisis parcial.
        """
        original_chars = len(text or "")
        limit = int(max_chars or self.MAX_TEXT_ENTITIES)
        truncated = original_chars > limit
        result = self._call(
            "ingestion_extract_entities",
            {"text": (text or "")[:limit], "context": context},
        )
        if isinstance(result, dict):
            result.setdefault("result", {})
            if isinstance(result["result"], dict):
                result["result"]["truncated"] = truncated
                result["result"]["original_chars"] = original_chars
                result["result"]["chars_analyzed"] = min(original_chars, limit)
        return result

    # ─────────────────────────────────────────────────────────────
    def classify_document(
        self,
        *,
        text: str,
        url: str = "",
        title: str = "",
    ) -> dict[str, Any]:
        """Clasifica el documento por tipo, registro y nivel de credibilidad.

        Devuelve: {doc_type, register, credibility_tier, languages, ...}
        Categorías: BOE, ley_organica, dictamen, sentencia, prensa_diaria,
        prensa_partidista, blog_opinión, RRSS_oficial, RRSS_anónimo,
        nota_de_prensa, informe_técnico, transcripción, otro.
        """
        return self._call(
            "ingestion_classify_document",
            {
                "text": (text or "")[:6000],
                "url": url,
                "title": title,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def detect_source_change(
        self,
        *,
        source_name: str,
        baseline_summary: str,
        recent_samples: list[str] | str,
    ) -> dict[str, Any]:
        """Detecta deriva en una fuente conocida (cambio editorial/tono).

        Devuelve: {changed: bool, dimensions, severity, examples, drivers}
        """
        return self._call(
            "ingestion_detect_source_change",
            {
                "source_name": source_name,
                "baseline_summary": baseline_summary,
                "recent_samples": recent_samples,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def discover_new_sources(
        self,
        *,
        topic: str,
        existing_sources: list[str] | None = None,
        region_focus: str = "España",
        validate_urls: bool = True,
        url_timeout: float = 5.0,
    ) -> dict[str, Any]:
        """Sugiere fuentes que aún no están en BD pero cubren un tema.

        Devuelve: {candidates: [{name, url, why, tier, validated, http_status}],
                   gaps_detected, dropped_invalid}

        I3 · Por defecto valida cada URL devuelta por el LLM (HEAD con
        timeout 5s) antes de exponerla. Los candidates cuya URL no responda
        2xx/3xx se marcan `validated=False` y se mueven a `dropped_invalid`
        para no aceptar URLs alucinadas como fuentes reales.

        Pasa `validate_urls=False` solo si vas a validar tú mismo después.
        """
        raw = self._call(
            "ingestion_discover_new_sources",
            {
                "topic": topic,
                "existing_sources": existing_sources or [],
                "region_focus": region_focus,
            },
        )
        if not validate_urls or not isinstance(raw, dict):
            return raw

        res = raw.get("result")
        if not isinstance(res, dict):
            return raw
        cands = res.get("candidates") or []
        if not isinstance(cands, list):
            return raw

        validated_candidates: list[dict[str, Any]] = []
        dropped: list[dict[str, Any]] = []
        for c in cands:
            if not isinstance(c, dict):
                continue
            url = str(c.get("url") or "").strip()
            if not url or not url.startswith(("http://", "https://")):
                c["validated"] = False
                c["http_status"] = 0
                c["validation_error"] = "url malformada o vacía"
                dropped.append(c)
                continue
            status, err = _http_head_check(url, timeout=url_timeout)
            c["validated"] = bool(status and 200 <= status < 400)
            c["http_status"] = status
            if err:
                c["validation_error"] = err[:200]
            (validated_candidates if c["validated"] else dropped).append(c)

        res["candidates"] = validated_candidates
        res["dropped_invalid"] = dropped
        res["validation_meta"] = {
            "validated_count": len(validated_candidates),
            "dropped_count": len(dropped),
            "timeout_s": url_timeout,
        }
        return raw
