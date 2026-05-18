"""
Ficha Territorial Builder · orquesta los 12 bloques de la ficha dinámica
de un municipio o CCAA combinando:

  · Wikidata SPARQL (escudo, alcalde actual, histórico alcaldes, coordenadas)
  · INE API (población, evolución, pirámide, indicadores demográficos)
  · Infoelectoral (resultados históricos · si BD)
  · Google News RSS (noticias 30d filtradas)
  · TerritoriosEnricher (síntesis ejecutiva, perfil voto, segmentos, palancas)
  · DossierBuilder (análisis IA del bloque 11)

Construye un objeto `FichaTerritorial` con 12 bloques. Cada bloque tiene
`ok=True/False` y `error` independiente — si una fuente falla, los demás
siguen.

Uso:

    builder = FichaTerritorialBuilder()
    ficha = builder.build_municipio("30027")     # Mazarrón (cod INE)
    ficha = builder.build_ccaa("Murcia")

    # Persistir + cachear
    from agents.brain.pipelines.persistence_fichas import persist_ficha_territorial
    persist_ficha_territorial(ficha.model_dump())
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from agents.brain.pipelines.ficha_schemas import (
    FichaTerritorial,
    FuenteRef,
    PiramideTramo,
    ResultadoEleccion,
    CargoElectoralLocal,
    NoticiaItem,
    NarrativaItem,
    EmpresaTop,
)

logger = logging.getLogger(__name__)


class FichaTerritorialBuilder:
    """Construye fichas territoriales completas on-demand."""

    def __init__(self, *, brain: Any = None) -> None:
        self._brain = brain

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception:
            self._brain = None
        return self._brain

    # ─────────────────────────────────────────────────────────────
    def _run(self, ficha: FichaTerritorial, nombre: str, fn) -> None:
        try:
            fn()
            ficha.bloques_ok.append(nombre)
        except Exception as exc:
            logger.exception("ficha_territorial bloque %s falló", nombre)
            ficha.bloques_err[nombre] = f"{type(exc).__name__}: {str(exc)[:200]}"

    # ════════════════════════════════════════════════════════════════
    def build_municipio(self, codigo_ine: str) -> FichaTerritorial:
        """Construye ficha completa para un municipio por código INE."""
        from agents.brain.pipelines.data_sources import wikidata_territorios, ine_municipio, \
            rss_news, infoelectoral_index

        ficha = FichaTerritorial(id=str(codigo_ine), tipo="municipio")

        # ── Bundle Wikidata (base de muchos otros bloques) ─────────
        wiki_bundle: dict[str, Any] = {}
        def _stage_wiki():
            nonlocal wiki_bundle
            wiki_bundle = wikidata_territorios.fetch_municipio_by_ine(codigo_ine)
            if not wiki_bundle.get("found"):
                raise RuntimeError("no encontrado en wikidata")
        self._run(ficha, "_wiki_bundle", _stage_wiki)

        nombre_municipio = wiki_bundle.get("nombre", "")
        ccaa_detectado = ""  # se llena por hero si Wikidata lo trae

        # ── Bloque 0 · Hero ─────────────────────────────────────────
        def _stage_hero():
            from agents.brain.pipelines.ficha_schemas import TerritorioHero
            h = TerritorioHero()
            h.nombre = nombre_municipio or codigo_ine
            h.tipo = "municipio"
            h.codigo_ine = codigo_ine
            h.escudo_url = wiki_bundle.get("escudo_url", "")
            h.bandera_url = wiki_bundle.get("bandera_url", "")
            h.poblacion = wiki_bundle.get("poblacion")
            h.superficie_km2 = wiki_bundle.get("area_km2")
            if h.poblacion and h.superficie_km2:
                h.densidad_hab_km2 = round(h.poblacion / h.superficie_km2, 1)
            h.altitud_m = wiki_bundle.get("altitud_m")
            h.partido_gobernante = wiki_bundle.get("alcalde_partido", "")
            h.alcalde_o_presidente = wiki_bundle.get("alcalde", "")

            # Mejor población vía INE (más actualizado)
            pob_ine = ine_municipio.fetch_poblacion_municipio(codigo_ine)
            if pob_ine.get("ok"):
                h.poblacion = pob_ine.get("poblacion_total") or h.poblacion
                h.poblacion_fuente_fecha = str(pob_ine.get("fecha") or "")
                if h.poblacion and h.superficie_km2:
                    h.densidad_hab_km2 = round(h.poblacion / h.superficie_km2, 1)

            # Renta
            renta = ine_municipio.fetch_renta_municipio(codigo_ine)
            if renta.get("ok"):
                h.renta_media_hogar = renta.get("renta_media_hogar")
                h.renta_media_anio = str(renta.get("anio") or "")

            h.fuentes = [
                FuenteRef(tipo="wikidata", nombre="Wikidata",
                          url=wiki_bundle.get("wikipedia_url", "")),
                FuenteRef(tipo="ine", nombre="INE · Padrón continuo"),
                FuenteRef(tipo="ine", nombre="INE · Atlas de renta"),
            ]
            ficha.hero = h
            ficha.nombre = h.nombre
        self._run(ficha, "hero", _stage_hero)

        # ── Bloque 1 · Gobierno ─────────────────────────────────────
        def _stage_gobierno():
            from agents.brain.pipelines.ficha_schemas import TerritorioGobierno
            g = TerritorioGobierno()
            if wiki_bundle.get("alcalde"):
                g.alcalde = CargoElectoralLocal(
                    nombre=wiki_bundle["alcalde"],
                    partido=wiki_bundle.get("alcalde_partido", ""),
                    cargo="Alcalde/sa",
                    fecha_inicio=wiki_bundle.get("alcalde_inicio", ""),
                    es_actual=True,
                )
            historico = wiki_bundle.get("historico_alcaldes") or []
            g.historico_alcaldes = [
                CargoElectoralLocal(**h) for h in historico if isinstance(h, dict)
            ]
            g.fuentes = [FuenteRef(tipo="wikidata", nombre="Wikidata · P6 head of government")]
            ficha.gobierno = g
        self._run(ficha, "gobierno", _stage_gobierno)

        # ── Bloque 2 · Electoral ────────────────────────────────────
        def _stage_electoral():
            from agents.brain.pipelines.ficha_schemas import TerritorioElectoral
            e = TerritorioElectoral()
            municipales_raw = infoelectoral_index.historial_municipales(codigo_ine)
            e.municipales = [
                ResultadoEleccion(**{**m, "tipo": "municipales"})
                for m in municipales_raw if isinstance(m, dict)
            ]
            # Provincia inferida de los 2 primeros dígitos del cod INE
            cod_prov = codigo_ine[:2] if len(codigo_ine) >= 2 else ""
            if cod_prov:
                gen_raw = infoelectoral_index.historial_generales_provincia(cod_prov)
                e.generales = [
                    ResultadoEleccion(**{**g, "tipo": "generales"})
                    for g in gen_raw if isinstance(g, dict)
                ]
            e.fuentes = [
                FuenteRef(tipo="infoelectoral", nombre="Min. del Interior · Infoelectoral"),
            ]
            ficha.electoral = e
        self._run(ficha, "electoral", _stage_electoral)

        # ── Bloque 3 · Economía + Vivienda (INE IPV 25171) ────────
        def _stage_economia():
            from agents.brain.pipelines.ficha_schemas import TerritorioEconomia
            from agents.brain.pipelines.data_sources import precio_vivienda
            ec = TerritorioEconomia()
            renta = ine_municipio.fetch_renta_municipio(codigo_ine)
            if renta.get("ok"):
                ec.renta_media_hogar = renta.get("renta_media_hogar")
            cod_prov = codigo_ine[:2] if len(codigo_ine) >= 2 else ""
            fuentes = [
                FuenteRef(tipo="ine", nombre="INE · Atlas distribución renta"),
                FuenteRef(tipo="ine", nombre="INE · EPA paro provincial"),
            ]
            if cod_prov:
                paro = ine_municipio.fetch_paro_provincia(cod_prov)
                if paro.get("ok"):
                    ec.tasa_desempleo_pct = paro.get("tasa_paro_pct")
                # Precio vivienda
                viv = precio_vivienda.fetch_precio_provincia(cod_prov)
                if viv.get("ok"):
                    ec.precio_vivienda_m2 = viv.get("precio_m2")
                evol_viv = precio_vivienda.fetch_evolucion_precio_provincia(
                    cod_prov, periodos=12,
                )
                if evol_viv:
                    ec.precio_vivienda_evolucion = evol_viv
                    fuentes.append(FuenteRef(tipo="ine",
                                             nombre="INE · IPV (índice precio vivienda)"))
            ec.fuentes = fuentes
            ficha.economia = ec
        self._run(ficha, "economia", _stage_economia)

        # ── Bloque 4 · Demografía ───────────────────────────────────
        def _stage_demografia():
            from agents.brain.pipelines.ficha_schemas import TerritorioDemografia
            d = TerritorioDemografia()
            evol = ine_municipio.fetch_evolucion_poblacion(codigo_ine)
            d.evolucion_poblacion = evol
            if evol:
                d.poblacion_total = evol[-1].get("valor")
            piramide_raw = ine_municipio.fetch_piramide_poblacional(codigo_ine)
            d.piramide = [PiramideTramo(**p) for p in piramide_raw if isinstance(p, dict)]
            indicadores = ine_municipio.fetch_indicadores_demograficos(codigo_ine)
            for k in ("tasa_natalidad", "tasa_mortalidad",
                      "indice_envejecimiento", "tasa_dependencia"):
                if indicadores.get(k) is not None:
                    setattr(d, k, indicadores[k])
            d.fuentes = [
                FuenteRef(tipo="ine", nombre="INE · Padrón municipal continuo"),
                FuenteRef(tipo="ine", nombre="INE · Indicadores demográficos"),
            ]
            ficha.demografia = d
        self._run(ficha, "demografia", _stage_demografia)

        # ── Bloque 5 · Noticias + Narrativas (IA) ──────────────────
        def _stage_noticias():
            from agents.brain.pipelines.ficha_schemas import TerritorioNoticias
            n = TerritorioNoticias(ventana_dias=30)
            noticias_raw = rss_news.search_news_for_municipio(nombre_municipio, dias=30, max_items=25)
            n.noticias = [
                NoticiaItem(
                    titulo=nx.get("titulo", ""),
                    medio=nx.get("medio", ""),
                    url=nx.get("url", ""),
                    fecha=nx.get("fecha", ""),
                    snippet=nx.get("snippet", ""),
                    linea_editorial=rss_news.detect_editorial_lean(nx.get("medio", "")),
                )
                for nx in noticias_raw
            ]
            # Narrativas via brain.analyze_narrative si hay noticias
            brain = self._get_brain()
            if brain is not None and n.noticias:
                pieces = [
                    f"[{nx.fecha[:10]} · {nx.medio}] {nx.titulo}"
                    for nx in n.noticias[:20]
                ]
                try:
                    out = brain.analyze_narrative(
                        pieces=pieces, topic=nombre_municipio, time_window="últimos 30 días",
                    )
                    if out.get("ok") and isinstance(out.get("result"), dict):
                        r = out["result"]
                        # Narrativa principal
                        if r.get("narrative_name"):
                            n.narrativas.append(NarrativaItem(
                                nombre=str(r.get("narrative_name") or ""),
                                descripcion=str(r.get("core_claim") or ""),
                                fuerza=float(r.get("confidence") or 0.7),
                                medios_amplificadores=[
                                    str(x) for x in (r.get("amplifiers") or [])
                                ][:5],
                                n_articulos=len(n.noticias),
                            ))
                        # Contra-narrativas
                        for cn in (r.get("counter_narratives") or [])[:3]:
                            n.narrativas.append(NarrativaItem(
                                nombre=f"Contra: {str(cn)[:60]}",
                                descripcion=str(cn),
                                fuerza=0.4,
                            ))
                        # Preocupaciones derivadas de attack_vectors
                        for av in (r.get("attack_vectors") or [])[:5]:
                            n.preocupaciones.append({"tema": str(av), "urgencia": "media"})
                except Exception as exc:
                    logger.debug("brain analyze_narrative falló: %s", exc)
            n.fuentes = [
                FuenteRef(tipo="rss", nombre="Google News RSS"),
                FuenteRef(tipo="brain", nombre="GroqBrain · analyze_narrative"),
            ]
            ficha.noticias = n
        self._run(ficha, "noticias", _stage_noticias)

        # ── Bloque 6 · Agenda ──────────────────────────────────────
        def _stage_agenda():
            from agents.brain.pipelines.ficha_schemas import TerritorioAgenda
            a = TerritorioAgenda()
            a.fuentes = [FuenteRef(tipo="boe", nombre="BOE / web ayuntamiento (pendiente scraping)")]
            ficha.agenda = a
        self._run(ficha, "agenda", _stage_agenda)

        # ── Bloque 7 · Pleno ───────────────────────────────────────
        def _stage_pleno():
            from agents.brain.pipelines.ficha_schemas import TerritorioPleno
            p = TerritorioPleno()
            # Composición desde últimas municipales si hay
            if ficha.electoral.municipales:
                ultima = ficha.electoral.municipales[0]
                p.composicion = [
                    {
                        "partido": r.get("partido"),
                        "escanos": r.get("concejales_o_diputados"),
                        "porcentaje": r.get("porcentaje"),
                    }
                    for r in (ultima.resultados or [])
                    if r.get("concejales_o_diputados")
                ]
            p.fuentes = [FuenteRef(tipo="infoelectoral", nombre="Composición derivada de Infoelectoral")]
            ficha.pleno = p
        self._run(ficha, "pleno", _stage_pleno)

        # ── Bloque 8 · Mapa ────────────────────────────────────────
        def _stage_mapa():
            from agents.brain.pipelines.ficha_schemas import TerritorioMapa
            m = TerritorioMapa()
            # Si Wikidata tiene wkt o coords (sin sacar P625 aquí, lo dejamos)
            m.capas_disponibles = ["renta", "voto", "densidad", "envejecimiento"]
            m.fuentes = [FuenteRef(tipo="ine", nombre="INE secciones censales (geo)")]
            ficha.mapa = m
        self._run(ficha, "mapa", _stage_mapa)

        # ── Bloque 9 · Empresas ────────────────────────────────────
        def _stage_empresas():
            from agents.brain.pipelines.ficha_schemas import TerritorioEmpresas
            e = TerritorioEmpresas()
            e.fuentes = [FuenteRef(tipo="ine", nombre="INE DIRCE (pendiente integración SABI)")]
            ficha.empresas = e
        self._run(ficha, "empresas", _stage_empresas)

        # ── Bloque 10 · Tercer sector ──────────────────────────────
        def _stage_tercer():
            from agents.brain.pipelines.ficha_schemas import TerritorioTercerSector
            t = TerritorioTercerSector()
            t.fuentes = [FuenteRef(tipo="brain", nombre="Pendiente integración Ministerio Cultura")]
            ficha.tercer_sector = t
        self._run(ficha, "tercer_sector", _stage_tercer)

        # ── Bloque 11 · Análisis IA ────────────────────────────────
        def _stage_analisis():
            from agents.brain.pipelines.ficha_schemas import TerritorioAnalisisIA
            ai = TerritorioAnalisisIA()
            brain = self._get_brain()
            if brain is None:
                ai.ok = False
                ai.error = "brain no disponible"
                ficha.analisis_ia = ai
                return
            # Componemos contexto rico para el brain
            sit = (
                f"Municipio: {ficha.hero.nombre} (cod INE {codigo_ine}). "
                f"Población: {ficha.hero.poblacion or '?'}. "
                f"Alcalde: {ficha.hero.alcalde_o_presidente or '?'} ({ficha.hero.partido_gobernante or '?'}). "
                f"Renta media hogar: {ficha.hero.renta_media_hogar or '?'} €. "
                f"Histórico municipales: {len(ficha.electoral.municipales)} elecciones.\n"
                f"Últimas noticias (titulares): " + " | ".join(
                    n.titulo for n in ficha.noticias.noticias[:8] if n.titulo
                )
            )[:6000]
            out = brain.forecast_political_scenario(
                topic=f"Análisis político-territorial de {ficha.hero.nombre}",
                current_situation=sit, time_horizon="próxima legislatura",
                constraints=[],
            )
            if out.get("ok") and isinstance(out.get("result"), dict):
                r = out["result"]
                ai.resumen_ejecutivo = (
                    str(r.get("most_likely_scenario") or "")
                    or (str(r.get("scenarios", [{}])[0].get("narrative", "")) if r.get("scenarios") else "")
                )[:1500]
                # Riesgos del peor escenario
                for sc in r.get("scenarios") or []:
                    if isinstance(sc, dict) and "pesim" in str(sc.get("name", "")).lower():
                        cons = sc.get("consequences") or []
                        for c in cons[:5]:
                            if isinstance(c, dict):
                                ai.riesgos.append(c.get("detail", ""))
                            else:
                                ai.riesgos.append(str(c))
                ai.oportunidades = [str(x) for x in (r.get("watch_list") or [])][:5]
                ai.score_estabilidad = float(r.get("confidence") or 0.5) * 10.0
                ai.tokens_used = int(out.get("tokens_used") or 0)
                ai.latency_ms = int(out.get("latency_ms") or 0)
            ai.fuentes = [FuenteRef(tipo="brain", nombre="GroqBrain · forecast_political_scenario")]
            ficha.analisis_ia = ai
        self._run(ficha, "analisis_ia", _stage_analisis)

        # ── Score final ────────────────────────────────────────────
        n_ok = len(ficha.bloques_ok)
        n_total = 12  # 0 + 11 bloques (excluyendo _wiki_bundle helper)
        ficha.completeness = min(1.0, n_ok / n_total)
        return ficha

    # ════════════════════════════════════════════════════════════════
    def build_ccaa(self, nombre: str) -> FichaTerritorial:
        """Construye ficha de Comunidad Autónoma."""
        from agents.brain.pipelines.data_sources import wikidata_territorios, rss_news

        ficha = FichaTerritorial(id=nombre.lower().replace(" ", "_"), tipo="ccaa")
        wiki_bundle = wikidata_territorios.fetch_ccaa_by_name(nombre)

        def _stage_hero():
            from agents.brain.pipelines.ficha_schemas import TerritorioHero
            h = TerritorioHero()
            h.nombre = wiki_bundle.get("nombre") or nombre
            h.tipo = "ccaa"
            h.escudo_url = wiki_bundle.get("escudo_url", "")
            h.bandera_url = wiki_bundle.get("bandera_url", "")
            h.poblacion = wiki_bundle.get("poblacion")
            h.superficie_km2 = wiki_bundle.get("area_km2")
            if h.poblacion and h.superficie_km2:
                h.densidad_hab_km2 = round(h.poblacion / h.superficie_km2, 1)
            h.alcalde_o_presidente = wiki_bundle.get("presidente", "")
            h.partido_gobernante = wiki_bundle.get("presidente_partido", "")
            h.fuentes = [FuenteRef(tipo="wikidata",
                                   nombre="Wikidata · CCAA",
                                   url=wiki_bundle.get("wikipedia_url", ""))]
            ficha.hero = h
            ficha.nombre = h.nombre
        self._run(ficha, "hero", _stage_hero)

        # Noticias y análisis IA igual que municipio
        def _stage_noticias():
            from agents.brain.pipelines.ficha_schemas import TerritorioNoticias
            n = TerritorioNoticias(ventana_dias=14)
            for nx in rss_news.search_news_for_ccaa(nombre, max_items=20, dias=14):
                n.noticias.append(NoticiaItem(
                    titulo=nx.get("titulo", ""), medio=nx.get("medio", ""),
                    url=nx.get("url", ""), fecha=nx.get("fecha", ""),
                    snippet=nx.get("snippet", ""),
                    linea_editorial=rss_news.detect_editorial_lean(nx.get("medio", "")),
                ))
            n.fuentes = [FuenteRef(tipo="rss", nombre="Google News RSS")]
            ficha.noticias = n
        self._run(ficha, "noticias", _stage_noticias)

        def _stage_analisis():
            from agents.brain.pipelines.ficha_schemas import TerritorioAnalisisIA
            ai = TerritorioAnalisisIA()
            brain = self._get_brain()
            if brain is None:
                ai.ok = False; ai.error = "brain no disponible"
                ficha.analisis_ia = ai
                return
            sit = (
                f"CCAA: {ficha.hero.nombre}. "
                f"Población: {ficha.hero.poblacion or '?'}. "
                f"Presidente: {ficha.hero.alcalde_o_presidente or '?'} ({ficha.hero.partido_gobernante or '?'}). "
                f"Titulares recientes: " + " | ".join(
                    nx.titulo for nx in ficha.noticias.noticias[:8]
                )
            )[:6000]
            out = brain.forecast_political_scenario(
                topic=f"Situación política {ficha.hero.nombre}",
                current_situation=sit,
                time_horizon="próxima legislatura",
                constraints=[],
            )
            if out.get("ok") and isinstance(out.get("result"), dict):
                r = out["result"]
                ai.resumen_ejecutivo = str(r.get("most_likely_scenario") or "")[:1500]
                ai.oportunidades = [str(x) for x in (r.get("watch_list") or [])][:6]
                ai.tokens_used = int(out.get("tokens_used") or 0)
            ficha.analisis_ia = ai
        self._run(ficha, "analisis_ia", _stage_analisis)

        n_ok = len(ficha.bloques_ok)
        ficha.completeness = min(1.0, n_ok / 12.0)
        return ficha
