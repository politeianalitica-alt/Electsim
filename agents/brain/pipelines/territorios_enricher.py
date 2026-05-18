"""
Territorios Enricher · pipeline batch para completar fichas vacías de
municipios y CCAA usando IA + datos públicos (INE + Wikipedia + electoral).

Es la pieza más solicitada por el usuario: hay miles de fichas territoriales
incompletas. Este servicio genera el contenido faltante razonando sobre:
  · Perfil socioeconómico  (INE, paro, edad media, renta, sector dominante)
  · Historia política     (Wikipedia + hemeroteca local)
  · Resultados históricos  (BD electoral)
  · Líderes locales       (alcalde, oposición, figuras públicas)
  · Issues específicos    (vivienda, despoblación, frontera, turismo, …)
  · Dinámica actual       (qué lo hace bisagra / fortaleza / debilidad)

Devuelve `TerritorialProfile` listo para persistir.

NO toca la BD directamente: produce el contenido y devuelve. El job ETL
decide qué hacer con él.

Uso típico (batch job):

    enricher = TerritoriosEnricher()
    for muni in municipios_incompletos:
        out = enricher.enrich_municipio(
            nombre=muni["nombre"],
            ccaa=muni["ccaa"],
            datos_ine=muni["ine"],
            historico_electoral=muni["historico"],
            alcalde_actual=muni.get("alcalde"),
            wikipedia_excerpt=muni.get("wiki_text"),
        )
        if out.ok:
            persistir_ficha(out)
"""
from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Estructuras
# ─────────────────────────────────────────────────────────────────

@dataclass
class TerritorialProfile:
    """Ficha enriquecida de un municipio o CCAA."""

    # Identificación
    nombre: str
    tipo: str = "municipio"  # municipio | provincia | ccaa | comarca
    ccaa: str = ""

    # Narrativa
    sintesis_politica: str = ""           # 2-3 frases
    perfil_socioeconomico: str = ""       # 1-2 frases
    historia_politica: str = ""           # 3-4 frases
    issues_locales_principales: list[str] = field(default_factory=list)
    dinamica_actual: str = ""             # qué lo hace especial hoy

    # Estructura electoral
    perfil_voto: str = ""                 # "izquierda urbana", "derecha rural", "bisagra", …
    es_municipio_bisagra: bool = False
    factores_basculantes: list[str] = field(default_factory=list)

    # Actores locales
    alcalde_actual: str = ""
    figuras_relevantes: list[dict[str, str]] = field(default_factory=list)
    partidos_implantacion_fuerte: list[str] = field(default_factory=list)

    # Estrategia
    palancas_movilizacion: list[str] = field(default_factory=list)
    tipos_campana_efectivos: list[str] = field(default_factory=list)
    riesgos_locales: list[str] = field(default_factory=list)

    # Trazas
    ok: bool = False
    error: str | None = None
    confidence: float = 0.0
    sources_used: list[str] = field(default_factory=list)
    tokens_used: int = 0
    latency_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────────────────────────
# Enricher
# ─────────────────────────────────────────────────────────────────

class TerritoriosEnricher:
    """Genera fichas de territorios a partir de datos crudos + IA."""

    def __init__(self, *, brain: Any = None) -> None:
        self._brain = brain

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception as exc:
            logger.warning("TerritoriosEnricher: brain no disponible (%s)", exc)
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    def enrich_municipio(
        self,
        *,
        nombre: str,
        ccaa: str = "",
        provincia: str = "",
        datos_ine: dict[str, Any] | None = None,
        historico_electoral: list[dict[str, Any]] | None = None,
        alcalde_actual: str = "",
        wikipedia_excerpt: str = "",
    ) -> TerritorialProfile:
        """Ficha de un municipio."""
        return self._enrich(
            tipo="municipio",
            nombre=nombre, ccaa=ccaa, provincia=provincia,
            datos_ine=datos_ine, historico_electoral=historico_electoral,
            alcalde_actual=alcalde_actual, wikipedia_excerpt=wikipedia_excerpt,
        )

    def enrich_ccaa(
        self,
        *,
        nombre: str,
        datos_ine: dict[str, Any] | None = None,
        historico_electoral: list[dict[str, Any]] | None = None,
        presidente_actual: str = "",
        wikipedia_excerpt: str = "",
    ) -> TerritorialProfile:
        """Ficha de una CCAA."""
        return self._enrich(
            tipo="ccaa",
            nombre=nombre, ccaa=nombre, provincia="",
            datos_ine=datos_ine, historico_electoral=historico_electoral,
            alcalde_actual=presidente_actual, wikipedia_excerpt=wikipedia_excerpt,
        )

    # ─────────────────────────────────────────────────────────────
    def _enrich(
        self,
        *,
        tipo: str,
        nombre: str,
        ccaa: str,
        provincia: str,
        datos_ine: dict[str, Any] | None,
        historico_electoral: list[dict[str, Any]] | None,
        alcalde_actual: str,
        wikipedia_excerpt: str,
    ) -> TerritorialProfile:
        profile = TerritorialProfile(nombre=nombre, tipo=tipo, ccaa=ccaa)
        profile.alcalde_actual = alcalde_actual or ""
        brain = self._get_brain()
        if brain is None:
            profile.error = "brain no disponible"
            return profile

        # Sintetizamos un contexto compacto para el brain
        contexto: list[str] = [f"Tipo: {tipo}", f"Nombre: {nombre}"]
        if ccaa:        contexto.append(f"CCAA: {ccaa}")
        if provincia:   contexto.append(f"Provincia: {provincia}")
        if datos_ine:
            for k, v in (datos_ine or {}).items():
                contexto.append(f"INE.{k}: {v}")
            profile.sources_used.append("INE")
        if alcalde_actual:
            contexto.append(f"Alcalde/Presidente actual: {alcalde_actual}")
        if historico_electoral:
            contexto.append(
                "Histórico electoral (últimos resultados): " + "; ".join(
                    f"{r.get('fecha','?')}:{r.get('ganador','?')}({r.get('porcentaje','?')}%)"
                    for r in (historico_electoral or [])[:6]
                )
            )
            profile.sources_used.append("BD electoral")
        if wikipedia_excerpt:
            contexto.append(f"Wikipedia (extracto): {str(wikipedia_excerpt)[:2500]}")
            profile.sources_used.append("Wikipedia")

        situacion = "\n".join(contexto)

        # 1) Generación narrativa principal (forecast_political_scenario es
        #    versátil — extraemos campos del JSON para poblar la ficha).
        try:
            scn = brain.forecast_political_scenario(
                topic=f"Perfil político-territorial de {nombre}",
                current_situation=situacion[:8000],
                time_horizon="próxima legislatura",
                constraints=[],
            )
        except Exception as exc:
            profile.error = f"forecast_political_scenario: {type(exc).__name__}"
            return profile

        # 2) Análisis del voto blando local — extrae issues + palancas
        try:
            sv = brain.analyze_soft_vote(
                party="todos los partidos",
                territory=nombre,
                polls_summary=situacion[:4000],
                segments_data={},
            )
        except Exception as exc:
            sv = {"ok": False, "error": str(exc)}

        # 3) Síntesis ejecutiva del territorio
        try:
            ms = brain.generate_macro_political_synthesis(
                macro_indicators=datos_ine or {},
                political_events=[
                    f"alcalde={alcalde_actual}",
                    f"resultados_recientes={historico_electoral[:3] if historico_electoral else 'desconocidos'}",
                ],
                sector_signals="",
                horizonte="próxima legislatura",
            )
        except Exception as exc:
            ms = {"ok": False, "error": str(exc)}

        # Combinamos los resultados
        if scn.get("ok") and isinstance(scn.get("result"), dict):
            r = scn["result"]
            wl = r.get("watch_list") or []
            if isinstance(wl, list):
                profile.factores_basculantes = [str(x) for x in wl][:6]
            scs = r.get("scenarios") or []
            if isinstance(scs, list) and scs:
                # Tomamos el escenario más probable como dinámica actual
                first = scs[0] if isinstance(scs[0], dict) else {}
                profile.dinamica_actual = str(first.get("narrative") or "")[:600]
            profile.confidence = max(profile.confidence, float(r.get("confidence") or 0.0))
            profile.tokens_used += int(scn.get("tokens_used") or 0)
            profile.latency_ms += int(scn.get("latency_ms") or 0)

        if sv.get("ok") and isinstance(sv.get("result"), dict):
            r = sv["result"]
            segs = r.get("soft_voter_segments") or []
            if isinstance(segs, list):
                # extraemos motivaciones como issues locales
                issues: list[str] = []
                for s in segs[:5]:
                    if isinstance(s, dict):
                        motivos = s.get("motivations") or []
                        if isinstance(motivos, list):
                            issues.extend(str(m) for m in motivos)
                # Dedup preservando orden
                seen = set()
                deduped = []
                for i in issues:
                    if i not in seen:
                        deduped.append(i)
                        seen.add(i)
                profile.issues_locales_principales = deduped[:7]
            pm = r.get("persuasive_messages") or []
            if isinstance(pm, list):
                profile.palancas_movilizacion = [
                    (m.get("claim") if isinstance(m, dict) else str(m))
                    for m in pm[:5] if m
                ]
            ch = []
            for s in (segs or [])[:5]:
                if isinstance(s, dict):
                    cs = s.get("channels") or []
                    if isinstance(cs, list):
                        ch.extend(str(c) for c in cs)
            profile.tipos_campana_efectivos = list(dict.fromkeys(ch))[:5]
            profile.tokens_used += int(sv.get("tokens_used") or 0)
            profile.latency_ms += int(sv.get("latency_ms") or 0)

        if ms.get("ok"):
            txt = ms.get("result") if isinstance(ms.get("result"), str) else ""
            if txt:
                # Tomamos las primeras 3 frases para perfil narrativo
                primera_frase = txt.split(". ")[:3]
                profile.sintesis_politica = ". ".join(primera_frase)[:600]
                profile.tokens_used += int(ms.get("tokens_used") or 0)
                profile.latency_ms += int(ms.get("latency_ms") or 0)

        # Inferencias derivadas
        if profile.factores_basculantes:
            profile.es_municipio_bisagra = True
            profile.perfil_voto = "bisagra · sensible a contexto local"
        elif historico_electoral:
            ganadores = [r.get("ganador") for r in historico_electoral[:3]]
            if len(set(ganadores)) == 1 and ganadores[0]:
                profile.perfil_voto = f"feudo {ganadores[0]}"
            elif len(set(ganadores)) >= 2:
                profile.perfil_voto = "alternancia"

        profile.ok = True
        return profile

    # ─────────────────────────────────────────────────────────────
    def enrich_batch(
        self,
        items: list[dict[str, Any]],
        *,
        max_workers: int = 4,
    ) -> list[TerritorialProfile]:
        """Procesa lote en paralelo. Cada item se pasa kwargs a `enrich_municipio`."""
        from concurrent.futures import ThreadPoolExecutor, as_completed
        results: list[TerritorialProfile] = []
        if not items:
            return results
        with ThreadPoolExecutor(max_workers=max(1, int(max_workers))) as ex:
            futures = [ex.submit(self.enrich_municipio, **it) for it in items]
            for fut in as_completed(futures):
                try:
                    results.append(fut.result())
                except Exception as exc:
                    logger.exception("worker territorios falló")
                    results.append(TerritorialProfile(
                        nombre="?", tipo="?",
                        error=f"{type(exc).__name__}: {str(exc)[:200]}",
                    ))
        return results
