"""
Territorios Enricher · pipeline batch para generar fichas RICAS y VERIFICABLES
de municipios y CCAA combinando:

  · Wikipedia ES (infobox + extracto + summary)
  · INE / opendata (cuando hay) — vía hooks externos
  · Histórico electoral (cuando hay) — pasado como parámetro
  · GroqBrain razonando sobre todos los anteriores

A diferencia de la versión anterior (simple), ahora produce una ficha de 15+
secciones: identidad, geografía, demografía, economía, política local,
historia política reciente, perfil electoral, líderes y partidos con
implantación, issues locales con detalle, dinámica actual, palancas de
campaña por tipo de votante, riesgos políticos, factores basculantes,
analogías con territorios similares y citaciones de fuentes.

NO toca la BD. Devuelve TerritorialProfile completo listo para persistir.
Si Wikipedia falla, degrada con los datos disponibles. Si el brain falla,
devuelve la parte de Wikipedia + infobox sin pedir conclusión narrativa.

Uso típico (batch nocturno):

    from agents.brain.pipelines.territorios_enricher import TerritoriosEnricher
    en = TerritoriosEnricher()
    profile = en.enrich_municipio(
        nombre="Albacete",
        ccaa="Castilla-La Mancha",
        provincia="Albacete",
        datos_ine={"poblacion": 174000, "paro_pct": 18.5},
        historico_electoral=[...],
        usar_wikipedia=True,
    )
    if profile.ok:
        persist_to_db(profile)
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
    """Ficha enriquecida de un territorio · 15+ secciones."""

    # ── Identidad ────────────────────────────────────────────────
    nombre: str
    tipo: str = "municipio"   # municipio | provincia | ccaa | comarca
    ccaa: str = ""
    provincia: str = ""
    comarca: str = ""
    gentilicio: str = ""
    coords: str = ""
    url_wikipedia: str = ""
    image_url: str | None = None

    # ── Geografía + demografía ───────────────────────────────────
    poblacion: str = ""
    superficie: str = ""
    altitud: str = ""
    densidad: str = ""
    pib_per_capita: str = ""

    # ── Narrativa principal ──────────────────────────────────────
    sintesis_ejecutiva: str = ""         # 3-4 frases · "qué es y qué importa"
    perfil_socioeconomico: str = ""      # 2-3 frases
    historia_politica_reciente: str = "" # 3-5 frases · últimas legislaturas
    contexto_cultural: str = ""          # gentilicio, lengua, identidad

    # ── Política local ───────────────────────────────────────────
    alcalde_o_presidente: str = ""
    partido_alcalde: str = ""
    composicion_pleno: list[dict[str, Any]] = field(default_factory=list)
    figuras_relevantes: list[dict[str, str]] = field(default_factory=list)
    partidos_implantacion_fuerte: list[str] = field(default_factory=list)

    # ── Perfil electoral ─────────────────────────────────────────
    perfil_voto: str = ""                # "feudo X", "alternancia", "bisagra", "fragmentado"
    es_bisagra: bool = False
    historico_ganadores: list[dict[str, Any]] = field(default_factory=list)
    transferencias_clave: list[str] = field(default_factory=list)

    # ── Issues locales ──────────────────────────────────────────
    issues_principales: list[dict[str, str]] = field(default_factory=list)
    # cada issue: {"tema": "vivienda", "descripcion": "...", "polarizacion": "alta", "afecta_a": "..."}

    # ── Dinámica actual ─────────────────────────────────────────
    dinamica_actual: str = ""            # 3-4 frases · estado de la situación
    factores_basculantes: list[str] = field(default_factory=list)
    riesgos_locales: list[str] = field(default_factory=list)

    # ── Estrategia · palancas de campaña ────────────────────────
    segmentos_voto: list[dict[str, Any]] = field(default_factory=list)
    palancas_movilizacion: list[str] = field(default_factory=list)
    mensajes_que_funcionan: list[str] = field(default_factory=list)
    tipos_campana_efectivos: list[str] = field(default_factory=list)
    canales_preferidos: list[str] = field(default_factory=list)

    # ── Analogías ───────────────────────────────────────────────
    territorios_similares: list[str] = field(default_factory=list)
    razon_analogia: str = ""

    # ── Citaciones ──────────────────────────────────────────────
    fuentes_usadas: list[dict[str, str]] = field(default_factory=list)
    # cada fuente: {"tipo":"wikipedia","url":"...","accessed":"YYYY-MM-DD"}

    # ── Trazas técnicas ─────────────────────────────────────────
    ok: bool = False
    error: str | None = None
    confidence: float = 0.0
    completeness_score: float = 0.0  # 0..1 · cuántos campos llenos
    stages_ok: list[str] = field(default_factory=list)
    stages_err: dict[str, str] = field(default_factory=dict)
    tokens_used: int = 0
    latency_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def _count_filled(self) -> int:
        d = self.to_dict()
        n = 0
        for k, v in d.items():
            if k in {"ok", "error", "confidence", "completeness_score", "stages_ok",
                     "stages_err", "tokens_used", "latency_ms", "fuentes_usadas"}:
                continue
            if isinstance(v, str) and v.strip():
                n += 1
            elif isinstance(v, list) and v:
                n += 1
            elif isinstance(v, bool) and v:
                n += 1
        return n


# ─────────────────────────────────────────────────────────────────
# Enricher
# ─────────────────────────────────────────────────────────────────

class TerritoriosEnricher:
    """Genera fichas territoriales completas combinando IA + Wikipedia + INE."""

    def __init__(
        self,
        *,
        brain: Any = None,
        wiki: Any = None,
        usar_wikipedia_default: bool = True,
    ) -> None:
        self._brain = brain
        self._wiki = wiki
        self.usar_wikipedia_default = bool(usar_wikipedia_default)

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

    def _get_wiki(self):
        if self._wiki is not None:
            return self._wiki
        try:
            from agents.brain.pipelines.wikipedia_fetcher import get_wikipedia_fetcher
            self._wiki = get_wikipedia_fetcher()
        except Exception as exc:
            logger.warning("TerritoriosEnricher: wiki no disponible (%s)", exc)
            self._wiki = None
        return self._wiki

    # ─────────────────────────────────────────────────────────────
    def _run_stage(self, prof: TerritorialProfile, name: str, fn) -> None:
        try:
            fn()
            prof.stages_ok.append(name)
        except Exception as exc:
            logger.exception("territorios stage %s falló", name)
            prof.stages_err[name] = f"{type(exc).__name__}: {str(exc)[:200]}"

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
        usar_wikipedia: bool | None = None,
    ) -> TerritorialProfile:
        return self._enrich(
            tipo="municipio",
            nombre=nombre, ccaa=ccaa, provincia=provincia,
            datos_ine=datos_ine, historico_electoral=historico_electoral,
            alcalde_actual=alcalde_actual,
            wikipedia_excerpt=wikipedia_excerpt,
            usar_wikipedia=usar_wikipedia,
        )

    def enrich_ccaa(
        self,
        *,
        nombre: str,
        datos_ine: dict[str, Any] | None = None,
        historico_electoral: list[dict[str, Any]] | None = None,
        presidente_actual: str = "",
        wikipedia_excerpt: str = "",
        usar_wikipedia: bool | None = None,
    ) -> TerritorialProfile:
        return self._enrich(
            tipo="ccaa",
            nombre=nombre, ccaa=nombre, provincia="",
            datos_ine=datos_ine, historico_electoral=historico_electoral,
            alcalde_actual=presidente_actual,
            wikipedia_excerpt=wikipedia_excerpt,
            usar_wikipedia=usar_wikipedia,
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
        usar_wikipedia: bool | None,
    ) -> TerritorialProfile:
        prof = TerritorialProfile(
            nombre=nombre, tipo=tipo, ccaa=ccaa, provincia=provincia,
            alcalde_o_presidente=alcalde_actual,
        )
        use_wiki = self.usar_wikipedia_default if usar_wikipedia is None else bool(usar_wikipedia)

        # ── Stage 1 · Wikipedia (datos crudos verificables) ──────
        wiki_bundle: dict[str, Any] = {}
        if use_wiki:
            def _stage_wiki():
                nonlocal wiki_bundle
                wiki = self._get_wiki()
                if wiki is None:
                    raise RuntimeError("wiki no disponible")
                if tipo == "ccaa":
                    wiki_bundle = wiki.fetch_ccaa(nombre)
                else:
                    wiki_bundle = wiki.fetch_municipio(nombre, ccaa=ccaa)
                if not wiki_bundle.get("found"):
                    raise RuntimeError("articulo no encontrado")
                # Mapeo a campos del perfil
                prof.url_wikipedia = wiki_bundle.get("url", "")
                prof.image_url = wiki_bundle.get("image_url")
                prof.poblacion = wiki_bundle.get("poblacion") or prof.poblacion
                prof.superficie = wiki_bundle.get("superficie") or prof.superficie
                prof.altitud = wiki_bundle.get("altitud") or prof.altitud
                prof.gentilicio = wiki_bundle.get("gentilicio") or prof.gentilicio
                prof.comarca = wiki_bundle.get("comarca") or prof.comarca
                if not prof.provincia:
                    prof.provincia = wiki_bundle.get("provincia") or prof.provincia
                if not prof.alcalde_o_presidente:
                    prof.alcalde_o_presidente = (
                        wiki_bundle.get("alcalde")
                        or wiki_bundle.get("presidente")
                        or prof.alcalde_o_presidente
                    )
                if not prof.partido_alcalde:
                    prof.partido_alcalde = wiki_bundle.get("partido_alcalde", "")
                if tipo == "ccaa":
                    prof.pib_per_capita = wiki_bundle.get("pib_per_capita", "")
                prof.fuentes_usadas.append({
                    "tipo": "wikipedia",
                    "url": wiki_bundle.get("url", ""),
                    "titulo": wiki_bundle.get("name", nombre),
                })
            self._run_stage(prof, "wikipedia", _stage_wiki)

        wiki_summary = wiki_bundle.get("summary", "") if wiki_bundle else (wikipedia_excerpt or "")
        wiki_extract = wiki_bundle.get("extract", "") if wiki_bundle else (wikipedia_excerpt or "")
        infobox = wiki_bundle.get("infobox", {}) if wiki_bundle else {}

        brain = self._get_brain()
        if brain is None:
            prof.error = "brain no disponible"
            # Aún así, lo que tengamos de Wikipedia lo conservamos
            prof.completeness_score = prof._count_filled() / 30.0
            prof.completeness_score = min(1.0, prof.completeness_score)
            prof.ok = bool(prof.stages_ok)
            return prof

        # ── Stage 2 · Síntesis narrativa principal ───────────────
        def _stage_summary():
            sit = (
                f"Tipo: {tipo}\n"
                f"Nombre: {nombre}\n"
                f"CCAA: {ccaa or 'desconocida'}\n"
                f"Provincia: {provincia or 'desconocida'}\n"
                f"Alcalde/Presidente actual: {prof.alcalde_o_presidente or 'desconocido'}\n"
                f"Población: {prof.poblacion or 'desconocida'}\n"
                f"INE: {datos_ine or {}}\n\n"
                f"Wikipedia (summary): {wiki_summary[:2500]}\n\n"
                f"Wikipedia (extract): {wiki_extract[:5500]}\n\n"
                f"Histórico electoral (resumen):\n" + "\n".join(
                    f"- {r.get('fecha','?')}: ganador {r.get('ganador','?')} ({r.get('porcentaje','?')}%)"
                    for r in (historico_electoral or [])[:8]
                )
            )
            out = brain.generate_macro_political_synthesis(
                macro_indicators={
                    "poblacion": prof.poblacion,
                    "superficie": prof.superficie,
                    **(datos_ine or {}),
                },
                political_events=[
                    f"alcalde={prof.alcalde_o_presidente}",
                    f"partido={prof.partido_alcalde}",
                ] + [
                    f"electoral={r.get('fecha','?')}:{r.get('ganador','?')}"
                    for r in (historico_electoral or [])[:5]
                ],
                sector_signals=wiki_summary[:2000],
                horizon=f"perfil {tipo}",
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "synthesis falló")
            txt = out.get("result") if isinstance(out.get("result"), str) else ""
            if txt:
                # Extraemos secciones del markdown que devuelve la tool
                prof.sintesis_ejecutiva = self._extract_section(txt, "lectura corta") \
                    or txt[:500]
                prof.perfil_socioeconomico = self._extract_section(txt, "macro") \
                    or self._extract_section(txt, "economía") \
                    or ""
                prof.historia_politica_reciente = self._extract_section(txt, "política nacional") \
                    or self._extract_section(txt, "política") \
                    or ""
            prof.tokens_used += int(out.get("tokens_used") or 0)
            prof.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(prof, "summary", _stage_summary)

        # ── Stage 3 · Issues + dinámica + escenarios ─────────────
        def _stage_scenarios():
            situacion = (
                f"{nombre} ({tipo}). Población {prof.poblacion or '?'}. "
                f"Alcalde/Presidente: {prof.alcalde_o_presidente or '?'}. "
                f"Wikipedia: {wiki_summary[:1500]}"
            )
            out = brain.forecast_political_scenario(
                topic=f"Perfil político-territorial de {nombre}",
                current_situation=situacion[:6000],
                time_horizon="próxima legislatura",
                constraints=[],
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "scenarios falló")
            r = out.get("result")
            if isinstance(r, dict):
                # Watch list → factores basculantes
                wl = r.get("watch_list") or []
                if isinstance(wl, list):
                    prof.factores_basculantes = [str(x) for x in wl][:8]
                # Escenarios → dinámica actual (más probable) + analogía
                scs = r.get("scenarios") or []
                if isinstance(scs, list) and scs:
                    base = next(
                        (s for s in scs if isinstance(s, dict) and "base" in str(s.get("name","")).lower()),
                        scs[0] if isinstance(scs[0], dict) else None,
                    )
                    if isinstance(base, dict):
                        prof.dinamica_actual = str(base.get("narrative") or "")[:600]
                        # Convertimos triggers en factores adicionales
                        triggers = base.get("triggers") or []
                        if isinstance(triggers, list):
                            for t in triggers:
                                if str(t) not in prof.factores_basculantes:
                                    prof.factores_basculantes.append(str(t))
                # Riesgos derivados de escenarios pesimistas
                for s in scs:
                    if not isinstance(s, dict):
                        continue
                    if "pesim" in str(s.get("name", "")).lower() or "cisne" in str(s.get("name", "")).lower():
                        cons = s.get("consequences") or []
                        if isinstance(cons, list):
                            prof.riesgos_locales = [
                                (c.get("detail") if isinstance(c, dict) else str(c))
                                for c in cons[:5] if c
                            ]
                prof.confidence = max(prof.confidence, float(r.get("confidence") or 0.0))
            prof.tokens_used += int(out.get("tokens_used") or 0)
            prof.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(prof, "scenarios", _stage_scenarios)

        # ── Stage 4 · Análisis de voto blando → segmentos + palancas ──
        def _stage_soft_vote():
            polls_summary = (
                f"Histórico reciente: " + ", ".join(
                    f"{r.get('fecha','?')}:{r.get('ganador','?')}"
                    for r in (historico_electoral or [])[:5]
                ) if historico_electoral else "sin histórico"
            )
            out = brain.analyze_soft_vote(
                party="todos los partidos",
                territory=nombre,
                polls_summary=polls_summary,
                segments_data={
                    "ine": datos_ine or {},
                    "wikipedia_extracto": wiki_extract[:2000],
                },
            )
            if not out.get("ok"):
                raise RuntimeError(out.get("error") or "soft_vote falló")
            r = out.get("result")
            if isinstance(r, dict):
                # Segmentos
                segs = r.get("soft_voter_segments") or []
                if isinstance(segs, list):
                    prof.segmentos_voto = [
                        {
                            "nombre": s.get("name", ""),
                            "size_pct": s.get("size_pct"),
                            "current_lean": s.get("current_lean", ""),
                            "motivations": s.get("motivations") or [],
                            "deal_breakers": s.get("deal_breakers") or [],
                            "channels": s.get("channels") or [],
                        }
                        for s in segs if isinstance(s, dict)
                    ][:6]
                    # Issues principales derivados de motivations
                    motivos: list[str] = []
                    for s in segs[:6]:
                        if isinstance(s, dict):
                            mm = s.get("motivations") or []
                            if isinstance(mm, list):
                                motivos.extend(str(x) for x in mm)
                    seen = set()
                    for m in motivos:
                        key = m.lower()
                        if key not in seen and len(prof.issues_principales) < 7:
                            prof.issues_principales.append({
                                "tema": m,
                                "descripcion": "",
                                "polarizacion": "media",
                                "afecta_a": "",
                            })
                            seen.add(key)
                # Mensajes que funcionan
                pm = r.get("persuasive_messages") or []
                if isinstance(pm, list):
                    prof.mensajes_que_funcionan = [
                        (m.get("claim") if isinstance(m, dict) else str(m))
                        for m in pm[:6] if m
                    ]
                # Palancas
                prof.palancas_movilizacion = []
                for s in segs[:5]:
                    if isinstance(s, dict):
                        for mot in (s.get("motivations") or []):
                            if str(mot) not in prof.palancas_movilizacion:
                                prof.palancas_movilizacion.append(str(mot))
                prof.palancas_movilizacion = prof.palancas_movilizacion[:8]
                # Canales preferidos (unión)
                channels: list[str] = []
                for s in segs[:6]:
                    if isinstance(s, dict):
                        for c in s.get("channels") or []:
                            if c and str(c) not in channels:
                                channels.append(str(c))
                prof.canales_preferidos = channels[:8]
                # Tipos de campaña efectivos = mapeo desde canales
                tipo_map = {
                    "tv": "publicidad televisiva", "instagram": "campaña visual digital",
                    "tiktok": "video corto viral", "radio_local": "tertulia y entrevistas locales",
                    "boca a boca": "campaña de calle y militancia",
                    "x": "campaña digital de líder", "facebook": "campaña digital de mayores",
                }
                tipos = []
                for c in channels:
                    key = c.lower()
                    if key in tipo_map and tipo_map[key] not in tipos:
                        tipos.append(tipo_map[key])
                prof.tipos_campana_efectivos = tipos or ["mix digital + calle"]
            prof.tokens_used += int(out.get("tokens_used") or 0)
            prof.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(prof, "soft_vote", _stage_soft_vote)

        # ── Stage 5 · Histórico ganadores + perfil_voto ──────────
        if historico_electoral:
            prof.historico_ganadores = [
                {
                    "fecha": r.get("fecha", ""),
                    "ganador": r.get("ganador", ""),
                    "porcentaje": r.get("porcentaje"),
                    "tipo_eleccion": r.get("tipo_eleccion", ""),
                }
                for r in historico_electoral[:10]
            ]
            ganadores = [r.get("ganador") for r in historico_electoral[:5] if r.get("ganador")]
            if ganadores:
                if len(set(ganadores)) == 1:
                    prof.perfil_voto = f"feudo {ganadores[0]}"
                elif len(set(ganadores)) >= 3:
                    prof.perfil_voto = "fragmentado / muy volátil"
                else:
                    prof.perfil_voto = "alternancia entre dos bloques"
            if prof.factores_basculantes and not prof.es_bisagra:
                prof.es_bisagra = True
                if prof.perfil_voto in {"", "alternancia entre dos bloques"}:
                    prof.perfil_voto = "bisagra · sensible a contexto"

        # ── Stage 6 · Cultura local (lengua, identidad) ──────────
        if infobox.get("idiomas") or infobox.get("lenguas"):
            prof.contexto_cultural = (
                f"Idiomas oficiales: {infobox.get('idiomas') or infobox.get('lenguas')}. "
                f"Gentilicio: {prof.gentilicio or 'no especificado'}."
            )
        elif prof.gentilicio:
            prof.contexto_cultural = f"Gentilicio: {prof.gentilicio}."

        # ── Stage 7 · Analogías con territorios similares ────────
        def _stage_analogies():
            # Pedimos al brain que diga territorios similares en políticamente relevantes
            out = brain.search_institutional_memory(
                query=f"Territorios españoles comparables a {nombre} políticamente",
                retrieved_items=[{
                    "id": "self",
                    "text": prof.dinamica_actual or wiki_summary[:1500],
                }],
                purpose="encontrar 3-5 territorios análogos para extrapolar lecciones",
            )
            if not out.get("ok"):
                return
            r = out.get("result")
            if isinstance(r, dict):
                applicable = r.get("applicable_now") or []
                if isinstance(applicable, list) and applicable:
                    prof.territorios_similares = [str(x) for x in applicable][:5]
                synth = str(r.get("synthesis") or "")
                if synth:
                    prof.razon_analogia = synth[:400]
            prof.tokens_used += int(out.get("tokens_used") or 0)
            prof.latency_ms += int(out.get("latency_ms") or 0)
        self._run_stage(prof, "analogies", _stage_analogies)

        # ── Cierre ───────────────────────────────────────────────
        prof.completeness_score = min(1.0, prof._count_filled() / 30.0)
        prof.ok = (len(prof.stages_ok) >= 3)
        return prof

    # ─────────────────────────────────────────────────────────────
    def enrich_batch(
        self,
        items: list[dict[str, Any]],
        *,
        max_workers: int = 3,
    ) -> list[TerritorialProfile]:
        """Procesa lote en paralelo (cuidado con Wikipedia rate-limit)."""
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
                    logger.exception("territorios batch worker falló")
                    results.append(TerritorialProfile(
                        nombre="?", tipo="?",
                        error=f"{type(exc).__name__}: {str(exc)[:200]}",
                    ))
        return results

    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def _extract_section(markdown: str, section_keyword: str) -> str:
        """Extrae el bloque tras `## … <section_keyword>` de un markdown."""
        if not markdown:
            return ""
        lower = markdown.lower()
        kw = section_keyword.lower()
        idx = lower.find(f"## ")
        # Buscamos un heading que contenga la keyword
        cur = idx
        while cur >= 0:
            next_h = lower.find("\n## ", cur + 1)
            chunk = markdown[cur:next_h] if next_h >= 0 else markdown[cur:]
            if kw in chunk[:100].lower():
                # Quitamos la cabecera y devolvemos el cuerpo
                body = chunk.split("\n", 1)[1] if "\n" in chunk else ""
                return body.strip()[:1500]
            cur = next_h if next_h > 0 else -1
        return ""
