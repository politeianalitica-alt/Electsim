"""
GeopoliticalEnricher — Enriquecimiento LLM de scores geopoliticos.
Usa Claude opus para paises con score >= 70 y haiku para score 40-70.
Paises con score < 35 no se enriquecen.
Procesa en lotes de 3 con pausa de 2s entre lotes.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

UMBRAL_MINIMO_ENRICHMENT = 35.0

# ---------------------------------------------------------------------------
# Nombres de paises en castellano
# ---------------------------------------------------------------------------
NOMBRES_PAIS: dict[str, str] = {
    "DZA": "Argelia",       "MAR": "Marruecos",     "UKR": "Ucrania",
    "LBY": "Libia",         "RUS": "Rusia",          "VEN": "Venezuela",
    "PSE": "Palestina",     "ISR": "Israel",         "MEX": "Mexico",
    "MLI": "Mali",          "NER": "Niger",          "TUR": "Turquia",
    "IRN": "Iran",          "SYR": "Siria",          "LBN": "Libano",
    "BFA": "Burkina Faso",  "NGA": "Nigeria",        "COL": "Colombia",
    "TUN": "Tunisia",       "BRA": "Brasil",         "IRQ": "Iraq",
    "AGO": "Angola",        "SAU": "Arabia Saudi",   "ARG": "Argentina",
    "CUB": "Cuba",          "TCD": "Chad",           "MRT": "Mauritania",
    "MDA": "Moldova",       "GEO": "Georgia",        "PER": "Peru",
    "EGY": "Egipto",        "ECU": "Ecuador",        "BLR": "Bielorrusia",
    "YEM": "Yemen",         "SOM": "Somalia",        "SSD": "Sudan del Sur",
    "COD": "Rep. Dem. Congo", "AFG": "Afganistan",   "MMR": "Myanmar",
}

# ---------------------------------------------------------------------------
# Intereses espanoles por pais
# ---------------------------------------------------------------------------
INTERESES_POR_PAIS: dict[str, list[str]] = {
    "DZA": ["Suministro de gas natural — Medgaz y Transmed", "Ruta migratoria clave", "Relaciones diplomaticas bilaterales"],
    "MAR": ["Pesca — Acuerdo UE-Marruecos", "Ceuta y Melilla", "Migracion irregular", "Inversion turistica"],
    "UKR": ["Seguridad OTAN flanco Este", "Refugiados ucranianos en Espana", "Suministros de grano"],
    "LBY": ["Petroleo — Repsol", "Ruta migratoria", "Inestabilidad post-Gadafi"],
    "RUS": ["Sanciones y comercio", "Gas alternativo a Argelia", "Influencia en Sahel"],
    "VEN": ["Comunidad espanola — 200.000 personas", "Repsol operaciones", "Diaspora venezolana en Espana"],
    "MEX": ["BBVA primer banco del pais", "Telefonica — Movistar Mexico", "Iberdrola energia"],
    "MLI": ["Ex-mision EUTM Mali", "Flujos migratorios Sahel-Europa", "Base Gao"],
    "NER": ["Golpe de estado 2023", "Corredor migr. Agadez-Libia", "Presencia militar EEUU"],
    "ISR": ["Conflicto Gaza — impacto diplomatico UE", "Comunidad judia espanola", "Comercio tecnologia"],
    "IRN": ["Sanciones internacionales", "Amenaza al suministro petrolero Golfo", "Relaciones con Venezuela"],
    "TUR": ["OTAN — tensions Erdogan", "Migracion — Acuerdo UE-Turquia", "Mercado para Inditex"],
    "IRQ": ["Repsol — campo Kirkuk", "Estabilidad post-ISIS", "Refugiados"],
    "AGO": ["Repsol Angola", "Inversion infraestructura espanola"],
    "SAU": ["OPEC — precio del petroleo", "Inversiones en empresas espanolas", "Ruta comercial"],
    "COL": ["Telefonica", "Acuerdo de paz — monitorizacion UE", "Diaspora colombiana en Espana"],
}


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

PROMPT_BRIEFING_PAIS = """Eres un analista de inteligencia geopolitica especializado en los intereses espanoles.
Genera un briefing ejecutivo detallado sobre {nombre_pais} ({iso3}) en base a los siguientes datos:

SCORE DE RIESGO: {score_total}/100 (nivel: {nivel})
Sub-scores: Conflicto {score_cii:.1f} | Gobernanza WGI {score_wgi:.1f} | Economia IMF {score_imf:.1f} | GDELT {score_gdelt:.1f} | GPS-Jam {score_jamming:.1f}
Datos economicos IMF: {imf_data}
Datos de gobernanza WGI (indicador PV.EST): {wgi_pv}

INTERESES ESPANOLES EN ESTE PAIS:
{intereses}

INSTRUCCIONES:
- Briefing estructurado, maximo 350 palabras
- Secciones: SITUACION ACTUAL | VECTORES DE RIESGO | IMPACTO PARA ESPANA | RECOMENDACION
- Tono: analitico, objetivo, sin alarmismo innecesario
- Formato: markdown con headers ##
- Sin emojis"""

PROMPT_BRIEFING_RAPIDO = """Analista geopolitico. Genera un resumen ejecutivo breve sobre {nombre_pais} ({iso3}).

Score de riesgo: {score_total}/100 (nivel: {nivel})
Intereses espanoles: {intereses_resumen}

Formato: 3 puntos clave (150 palabras max). Sin emojis. Markdown."""


# ===========================================================================
# GeopoliticalEnricher
# ===========================================================================

class GeopoliticalEnricher:
    """
    Enriquece scores geopoliticos con analisis LLM via Anthropic API.
    Claude opus para score >= 70, haiku para score 40-70.
    """

    MODELO_CRITICO  = os.getenv("ANTHROPIC_MODEL_GEO_CRITICO", "claude-opus-4-1")
    MODELO_MODERADO = os.getenv("ANTHROPIC_MODEL_GEO_MODERADO", "claude-3-5-haiku-20241022")
    MAX_TOKENS_CRITICO  = 1200
    MAX_TOKENS_MODERADO = 500
    PAUSA_ENTRE_LOTES = 2.0

    def __init__(self) -> None:
        self._cliente: Any = None
        self._inicializado = False

    def _inicializar_claude(self) -> bool:
        if self._inicializado:
            return self._cliente is not None
        self._inicializado = True
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY no configurada — LLM enrichment desactivado")
            return False
        try:
            import anthropic
            self._cliente = anthropic.Anthropic(api_key=api_key)
            return True
        except ImportError:
            logger.warning("anthropic no instalado — pip install anthropic")
            return False
        except Exception as exc:
            logger.error("Claude init error: %s", exc)
            return False

    def _seleccionar_modelo(self, score: float) -> tuple[str, int]:
        """Retorna (modelo, max_tokens) segun el score."""
        if score >= 70:
            return self.MODELO_CRITICO, self.MAX_TOKENS_CRITICO
        return self.MODELO_MODERADO, self.MAX_TOKENS_MODERADO

    def enriquecer_pais(self, score_dict: dict) -> str:
        """
        Genera un briefing LLM para un pais.
        Retorna string con el briefing o mensaje de error.
        """
        score = float(score_dict.get("score_total", 0.0))
        if score < UMBRAL_MINIMO_ENRICHMENT:
            return ""

        if not self._inicializar_claude():
            return ""

        pais = str(score_dict.get("pais", ""))
        nombre = NOMBRES_PAIS.get(pais, pais)
        intereses = INTERESES_POR_PAIS.get(pais, ["Sin datos de interes especifico"])
        modelo, max_tokens = self._seleccionar_modelo(score)

        if score >= 70:
            wgi_data = score_dict.get("wgi_data", {})
            wgi_pv = wgi_data.get("PV.EST", "N/D")
            imf_data = score_dict.get("imf_data", {})
            prompt = PROMPT_BRIEFING_PAIS.format(
                nombre_pais=nombre,
                iso3=pais,
                score_total=score,
                nivel=score_dict.get("nivel", ""),
                score_cii=float(score_dict.get("score_cii", 0)),
                score_wgi=float(score_dict.get("score_wgi", 0)),
                score_imf=float(score_dict.get("score_imf", 0)),
                score_gdelt=float(score_dict.get("score_gdelt", 0)),
                score_jamming=float(score_dict.get("score_jamming", 0)),
                imf_data=json.dumps(imf_data, ensure_ascii=False),
                wgi_pv=wgi_pv,
                intereses="\n".join(f"- {i}" for i in intereses),
            )
        else:
            intereses_resumen = "; ".join(intereses[:3])
            prompt = PROMPT_BRIEFING_RAPIDO.format(
                nombre_pais=nombre,
                iso3=pais,
                score_total=score,
                nivel=score_dict.get("nivel", ""),
                intereses_resumen=intereses_resumen,
            )

        try:
            respuesta = self._cliente.messages.create(
                model=modelo,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            texto = respuesta.content[0].text
            return self._limpiar_json(texto)
        except Exception as exc:
            logger.error("Claude enriquecer_pais %s error: %s", pais, exc)
            return ""

    def enriquecer_lote(
        self,
        scores: list[dict],
        batch_size: int = 3,
    ) -> dict[str, str]:
        """
        Enriquece una lista de scores en lotes de `batch_size`.
        Retorna {iso3: briefing_texto}.
        """
        candidatos = [
            s for s in scores
            if float(s.get("score_total", 0)) >= UMBRAL_MINIMO_ENRICHMENT
        ]
        candidatos_sorted = sorted(
            candidatos,
            key=lambda s: float(s.get("score_total", 0)),
            reverse=True,
        )

        resultados: dict[str, str] = {}
        for i in range(0, len(candidatos_sorted), batch_size):
            lote = candidatos_sorted[i:i + batch_size]
            for score_dict in lote:
                pais = str(score_dict.get("pais", ""))
                briefing = self.enriquecer_pais(score_dict)
                if briefing:
                    resultados[pais] = briefing
                    logger.info(
                        "Briefing generado para %s (score=%.1f)",
                        pais, float(score_dict.get("score_total", 0)),
                    )
            if i + batch_size < len(candidatos_sorted):
                time.sleep(self.PAUSA_ENTRE_LOTES)

        return resultados

    def guardar_briefings(
        self,
        briefings: dict[str, str],
        ruta: Path | None = None,
    ) -> None:
        """Guarda los briefings en un JSON local."""
        if not briefings:
            return
        if ruta is None:
            ruta = Path("data/cache/geopolitico") / "briefings_ultimo.json"
        ruta.parent.mkdir(parents=True, exist_ok=True)
        try:
            datos = {
                "generado": __import__("datetime").datetime.utcnow().isoformat(),
                "briefings": briefings,
            }
            ruta.write_text(
                json.dumps(datos, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            logger.info("Briefings guardados en %s (%d paises)", ruta, len(briefings))
        except Exception as exc:
            logger.error("guardar_briefings error: %s", exc)

    @staticmethod
    def _limpiar_json(texto: str) -> str:
        """Elimina bloques de codigo markdown si el LLM los incluye."""
        texto = re.sub(r"^```(?:markdown|json|text)?\n?", "", texto.strip(), flags=re.IGNORECASE)
        texto = re.sub(r"\n?```$", "", texto.strip())
        return texto.strip()
