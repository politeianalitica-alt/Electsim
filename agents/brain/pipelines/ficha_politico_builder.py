"""
Ficha Politico Builder · orquesta los 12 bloques de la ficha dinámica de
un político español combinando:

  · Wikidata (cargos históricos, biografía, formación, redes sociales)
  · Wikipedia (extracto biográfico ampliado)
  · Google News RSS (presencia mediática 30/90 días)
  · Infoelectoral (candidaturas históricas si BD)
  · DossierBuilder + brain.build_actor_profile + brain.opposition_research
    + brain.analyze_legislative_position (Bloque 11 y enriquecimiento)

Identificación primaria por QID Wikidata; fallback por nombre+país.

Uso:
    builder = FichaPoliticoBuilder()
    ficha = builder.build_by_qid("Q186200")     # Pedro Sánchez
    ficha = builder.build_by_name("Yolanda Díaz")
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from agents.brain.pipelines.ficha_schemas import (
    FichaPolitico,
    FuenteRef,
    CargoTrayectoria,
    NoticiaItem,
    NarrativaItem,
    PerfilRedSocial,
    CandidaturaElectoral,
    CitaDestacada,
)

logger = logging.getLogger(__name__)


class FichaPoliticoBuilder:
    """Construye fichas de político completas on-demand."""

    def __init__(self, *, brain: Any = None) -> None:
        self._brain = brain
        self._wiki = None

    def _get_brain(self):
        if self._brain is not None:
            return self._brain
        try:
            from agents.brain import get_groq_brain
            self._brain = get_groq_brain()
        except Exception:
            self._brain = None
        return self._brain

    def _get_wiki(self):
        if self._wiki is not None:
            return self._wiki
        try:
            from agents.brain.pipelines.wikipedia_fetcher import get_wikipedia_fetcher
            self._wiki = get_wikipedia_fetcher()
        except Exception:
            self._wiki = None
        return self._wiki

    def _run(self, ficha: FichaPolitico, nombre: str, fn) -> None:
        try:
            fn()
            ficha.bloques_ok.append(nombre)
        except Exception as exc:
            logger.exception("ficha_politico bloque %s falló", nombre)
            ficha.bloques_err[nombre] = f"{type(exc).__name__}: {str(exc)[:200]}"

    # ════════════════════════════════════════════════════════════════
    def build_by_qid(self, qid: str) -> FichaPolitico:
        from agents.brain.pipelines.data_sources import wikidata_politicos, rss_news, \
            infoelectoral_index

        ficha = FichaPolitico(id=qid)

        # Bundle Wikidata principal
        wd_bundle: dict[str, Any] = {}
        def _stage_wd():
            nonlocal wd_bundle
            wd_bundle = wikidata_politicos.fetch_politico_by_qid(qid)
            if not wd_bundle.get("found"):
                raise RuntimeError("no encontrado en wikidata")
        self._run(ficha, "_wd_bundle", _stage_wd)

        nombre_politico = wd_bundle.get("nombre_completo", "")
        ficha.nombre = nombre_politico
        partido_actual = wd_bundle.get("partido_actual", "")

        # Bundle Wikipedia bio
        wp_bundle: dict[str, Any] = {}
        def _stage_wp():
            nonlocal wp_bundle
            wiki = self._get_wiki()
            if wiki is None or not nombre_politico:
                raise RuntimeError("wiki/nombre no disponibles")
            wp_bundle = wiki.fetch_actor(nombre_politico)
            if not wp_bundle.get("found"):
                raise RuntimeError("no en wikipedia")
        self._run(ficha, "_wp_bundle", _stage_wp)

        # ── Bloque 0 · Hero ────────────────────────────────────────
        def _stage_hero():
            from agents.brain.pipelines.ficha_schemas import PoliticoHero
            h = PoliticoHero()
            h.nombre_completo = nombre_politico
            h.foto_url = wd_bundle.get("foto_url", "")
            h.cargo_actual = wd_bundle.get("cargo_actual", "")
            h.institucion = wd_bundle.get("institucion_actual", "")
            h.partido = partido_actual
            h.fecha_nacimiento = wd_bundle.get("fecha_nacimiento", "")
            if h.fecha_nacimiento:
                try:
                    nac = datetime.fromisoformat(h.fecha_nacimiento[:10]).date()
                    h.edad = (datetime.utcnow().date() - nac).days // 365
                except Exception:
                    pass
            h.lugar_nacimiento = wd_bundle.get("lugar_nacimiento", "")
            h.formacion = wd_bundle.get("formacion", [])
            h.fecha_posesion_cargo = wd_bundle.get("fecha_posesion_cargo", "")
            h.email_publico = wd_bundle.get("email_publico", "")
            h.wikidata_id = qid
            h.wikipedia_url = wd_bundle.get("wikipedia_url", "")
            h.estado_mandato = "activo"

            # Años en política (cuenta cargos)
            cargos = wd_bundle.get("cargos") or []
            if cargos:
                fechas = [c.get("fecha_inicio") for c in cargos
                          if c.get("fecha_inicio") and len(c["fecha_inicio"]) >= 4]
                if fechas:
                    try:
                        primer_anio = min(int(f[:4]) for f in fechas)
                        h.anios_en_politica = datetime.utcnow().year - primer_anio
                    except Exception:
                        pass

            # Score de influencia heurístico (compone cargo + antigüedad + redes)
            score = 0.0
            if h.cargo_actual:
                c_lower = h.cargo_actual.lower()
                if "presidente del gobierno" in c_lower or "ministro" in c_lower:
                    score += 40
                elif "presidente" in c_lower:
                    score += 30
                elif "vicepresidente" in c_lower or "secretari" in c_lower:
                    score += 25
                elif "diputado" in c_lower or "senador" in c_lower:
                    score += 15
                elif "alcalde" in c_lower or "concejal" in c_lower:
                    score += 10
            if h.anios_en_politica:
                score += min(30, h.anios_en_politica * 1.5)
            rrss = wd_bundle.get("redes_sociales") or {}
            if any(rrss.values()):
                score += 15
            h.score_influencia = round(min(100.0, score), 1)
            h.fuentes = [
                FuenteRef(tipo="wikidata", url=h.wikipedia_url,
                          nombre="Wikidata · biografía"),
            ]
            ficha.hero = h
        self._run(ficha, "hero", _stage_hero)

        # ── Bloque 1 · Trayectoria ──────────────────────────────────
        def _stage_trayectoria():
            from agents.brain.pipelines.ficha_schemas import PoliticoTrayectoria
            t = PoliticoTrayectoria()
            cargos = wd_bundle.get("cargos") or []
            t.cargos_publicos = [CargoTrayectoria(**c) for c in cargos if isinstance(c, dict)]
            if t.cargos_publicos:
                primero = min(t.cargos_publicos,
                              key=lambda c: c.fecha_inicio or "9999")
                t.primer_cargo_publico = primero.cargo
                t.primer_cargo_anio = primero.fecha_inicio[:4] if primero.fecha_inicio else ""
            # Detectar evolución por nivel territorial
            niveles = [c.nivel_territorial for c in t.cargos_publicos if c.nivel_territorial]
            jerarquia = {"local": 1, "autonomico": 2, "nacional": 3, "europeo": 4}
            if niveles:
                vals = [jerarquia.get(n, 0) for n in niveles]
                if len(vals) > 1:
                    if vals[0] > vals[-1]:
                        t.evolucion_carrera = "ascendente"
                    elif vals[0] < vals[-1]:
                        t.evolucion_carrera = "descendente"
                    else:
                        t.evolucion_carrera = "estable"
            t.fuentes = [FuenteRef(tipo="wikidata", nombre="Wikidata · P39 position held")]
            ficha.trayectoria = t
        self._run(ficha, "trayectoria", _stage_trayectoria)

        # ── Bloque 2 · Actividad institucional (congreso.es) ───────
        def _stage_actividad():
            from agents.brain.pipelines.ficha_schemas import (
                PoliticoActividadInstitucional, Intervencion, VotacionClave,
            )
            from agents.brain.pipelines.data_sources import congreso_actividad
            ai_ = PoliticoActividadInstitucional()
            id_dip = congreso_actividad.find_diputado_id(nombre_politico)
            if id_dip:
                bundle = congreso_actividad.fetch_actividad_completa(id_dip)
                if bundle.get("ok"):
                    ai_.intervenciones_recientes = [
                        Intervencion(**i) for i in bundle.get("intervenciones", [])[:10]
                        if isinstance(i, dict)
                    ]
                    ai_.n_intervenciones_anio = len(bundle.get("intervenciones", []))
                    iniciativas = bundle.get("iniciativas", [])
                    ai_.iniciativas_legislativas = iniciativas[:15]
                    for it in iniciativas:
                        if not isinstance(it, dict):
                            continue
                        tipo = str(it.get("tipo", "")).lower()
                        if "pregunta" in tipo and "oral" in tipo:
                            ai_.n_preguntas_orales += 1
                        elif "pregunta" in tipo:
                            ai_.n_preguntas_escritas += 1
                        elif "proposici" in tipo and "ley" in tipo:
                            ai_.n_proposiciones_ley += 1
                        elif "moci" in tipo or "resoluci" in tipo:
                            ai_.n_mociones += 1
                    ai_.votaciones_clave = [
                        VotacionClave(**v) for v in bundle.get("votaciones", [])[:10]
                        if isinstance(v, dict)
                    ]
                    ai_.comisiones = bundle.get("comisiones", [])
                    ai_.fuentes = [FuenteRef(tipo="brain",
                                             nombre="datos.congreso.es",
                                             url="https://www.congreso.es/opendata")]
                else:
                    ai_.fuentes = [FuenteRef(tipo="brain",
                                             nombre=f"congreso.es error: {bundle.get('error', '?')}")]
            else:
                ai_.fuentes = [FuenteRef(tipo="brain",
                                         nombre="No es diputado nacional o no resuelto en Congreso")]
            ficha.actividad_institucional = ai_
        self._run(ficha, "actividad_institucional", _stage_actividad)

        # ── Bloque 3 · Posicionamiento ideológico (IA) ─────────────
        def _stage_posicionamiento():
            from agents.brain.pipelines.ficha_schemas import PoliticoPosicionamientoIdeologico
            p = PoliticoPosicionamientoIdeologico()
            brain = self._get_brain()
            if brain is None:
                p.ok = False; p.error = "brain no disponible"
                ficha.posicionamiento = p
                return
            facts: list[str] = []
            if wp_bundle.get("summary"):
                facts.append(f"[Wiki summary] {wp_bundle['summary'][:1500]}")
            if partido_actual:
                facts.append(f"Partido: {partido_actual}")
            if ficha.trayectoria.cargos_publicos:
                facts.append("Cargos: " + "; ".join(
                    f"{c.cargo} ({c.fecha_inicio[:4] if c.fecha_inicio else '?'})"
                    for c in ficha.trayectoria.cargos_publicos[:8]
                ))
            out = brain.build_actor_profile(
                actor_name=nombre_politico, role=ficha.hero.cargo_actual,
                known_facts=facts, recent_statements=[],
            )
            if out.get("ok") and isinstance(out.get("result"), dict):
                r = out["result"]
                axis = r.get("ideological_axis") or {}
                if isinstance(axis, dict):
                    p.eje_izq_der = float(axis.get("left_right") or 0.0)
                    p.eje_lib_aut = float(axis.get("lib_auth") or 0.0)
                    p.eje_centro_periferia = float(axis.get("centro_periferia") or 0.0)
                p.fidelidad_partido_pct = float(r.get("party_loyalty") or 75.0)
            p.fuentes = [FuenteRef(tipo="brain", nombre="GroqBrain · build_actor_profile")]
            ficha.posicionamiento = p
        self._run(ficha, "posicionamiento", _stage_posicionamiento)

        # ── Bloque 4 · Redes y relaciones (IA + edges) ─────────────
        def _stage_redes():
            from agents.brain.pipelines.ficha_schemas import PoliticoRedesRelaciones, RelacionPolitica
            r = PoliticoRedesRelaciones()
            # Lee edges desde brain_actor_graph_edges si hay
            try:
                from dashboard.services.brain_content import get_actor_edges
                edges = get_actor_edges(actor_id=qid, limit=20)
            except Exception:
                edges = []
            for e in edges[:15]:
                r.relaciones.append(RelacionPolitica(
                    nombre=e.get("actor_to_name") if e.get("actor_from") == qid else e.get("actor_from_name"),
                    tipo=e.get("relation_type", ""),
                    fuerza=float(e.get("strength") or e.get("avg_strength") or 0.5),
                    evidencia=(e.get("evidence_text") or "")[:240],
                ))
            r.fuentes = [FuenteRef(tipo="brain", nombre="brain_actor_graph_edges")]
            ficha.redes = r
        self._run(ficha, "redes", _stage_redes)

        # ── Bloque 5 · Presencia mediática (IA) ────────────────────
        def _stage_mediatica():
            from agents.brain.pipelines.ficha_schemas import PoliticoPresenciaMediatica
            pm = PoliticoPresenciaMediatica()
            noticias_raw = rss_news.search_news_for_politico(
                nombre_politico, partido=partido_actual,
                max_items=25, dias=30,
            )
            pm.noticias_30d = [
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
            pm.n_menciones_90d = len(pm.noticias_30d) * 3  # estimación
            # Narrativa via brain
            brain = self._get_brain()
            if brain is not None and pm.noticias_30d:
                pieces = [
                    f"[{n.fecha[:10]} · {n.medio}] {n.titulo}"
                    for n in pm.noticias_30d[:18]
                ]
                try:
                    out = brain.analyze_narrative(
                        pieces=pieces, topic=f"Cobertura sobre {nombre_politico}",
                        time_window="últimos 30 días",
                    )
                    if out.get("ok") and isinstance(out.get("result"), dict):
                        nr = out["result"]
                        if nr.get("narrative_name"):
                            pm.narrativas_sobre_el.append(NarrativaItem(
                                nombre=str(nr.get("narrative_name") or ""),
                                descripcion=str(nr.get("core_claim") or ""),
                                fuerza=float(nr.get("confidence") or 0.7),
                                n_articulos=len(pm.noticias_30d),
                            ))
                        intensity = nr.get("intensity_trend")
                        if intensity:
                            pm.tendencia_visibilidad = (
                                "subiendo" if "crec" in str(intensity).lower()
                                else ("bajando" if "decay" in str(intensity).lower() else "estable")
                            )
                except Exception as exc:
                    logger.debug("brain analyze_narrative en mediática falló: %s", exc)
            pm.fuentes = [
                FuenteRef(tipo="rss", nombre="Google News RSS"),
                FuenteRef(tipo="brain", nombre="GroqBrain · analyze_narrative"),
            ]
            ficha.presencia_mediatica = pm
        self._run(ficha, "presencia_mediatica", _stage_mediatica)

        # ── Bloque 6 · Comunicación digital ────────────────────────
        def _stage_digital():
            from agents.brain.pipelines.ficha_schemas import PoliticoComunicacionDigital
            cd = PoliticoComunicacionDigital()
            rrss = wd_bundle.get("redes_sociales") or {}
            mapping = {
                "twitter": ("X/Twitter", "https://x.com/"),
                "instagram": ("Instagram", "https://instagram.com/"),
                "facebook": ("Facebook", "https://facebook.com/"),
                "youtube": ("YouTube", "https://youtube.com/channel/"),
                "tiktok": ("TikTok", "https://tiktok.com/@"),
            }
            for k, (plat, base) in mapping.items():
                handle = rrss.get(k)
                if handle:
                    cd.perfiles.append(PerfilRedSocial(
                        plataforma=plat, handle=str(handle),
                        url=base + str(handle).lstrip("@"),
                    ))
            cd.fuentes = [FuenteRef(tipo="wikidata", nombre="Wikidata · handles oficiales")]
            ficha.comunicacion_digital = cd
        self._run(ficha, "comunicacion_digital", _stage_digital)

        # ── Bloque 7 · Patrimonio y transparencia (con OCR) ────────
        def _stage_patrimonio():
            from agents.brain.pipelines.ficha_schemas import (
                PoliticoPatrimonioTransparencia, BienDeclarado,
            )
            from agents.brain.pipelines.data_sources import transparencia_bienes, congreso_actividad
            p = PoliticoPatrimonioTransparencia()
            id_dip = congreso_actividad.find_diputado_id(nombre_politico)
            if not id_dip:
                p.badge_transparencia = "amarillo"
                p.fuentes = [FuenteRef(tipo="transparencia",
                                       nombre="No es diputado nacional · pendiente Senado/auton.")]
                ficha.patrimonio = p
                return

            decl = transparencia_bienes.fetch_declaracion_diputado(id_dip)
            if not decl.get("ok"):
                p.badge_transparencia = decl.get("badge_transparencia") or "amarillo"
                p.fuentes = [FuenteRef(tipo="transparencia",
                                       nombre=f"transparencia: {decl.get('error', '?')}")]
                ficha.patrimonio = p
                return

            # Tenemos URL del PDF · intentar OCR
            p.badge_transparencia = "verde"
            url_pdf = decl["url_pdf"]
            ocr = transparencia_bienes.ocr_declaracion(url_pdf)
            fuentes = [FuenteRef(
                tipo="transparencia",
                nombre=f"Declaración bienes {decl.get('anio') or ocr.get('anio_declaracion') or '?'}",
                url=url_pdf,
            )]
            if ocr.get("ok"):
                p.patrimonio_bruto_eur = ocr.get("patrimonio_bruto_eur")
                p.salario_anual_oficial_eur = ocr.get("salario_anual_oficial_eur")
                anio = ocr.get("anio_declaracion") or decl.get("anio") or ""
                bienes_raw = ocr.get("bienes") or []
                p.bienes = [
                    BienDeclarado(
                        tipo=b.get("tipo") or "otro",
                        descripcion=b.get("descripcion") or "",
                        valor_eur=b.get("valor_eur"),
                        anio_declaracion=str(anio),
                    )
                    for b in bienes_raw if isinstance(b, dict)
                ]
                # Evaluar inconsistencia patrimonio vs salario
                if p.patrimonio_bruto_eur and p.salario_anual_oficial_eur:
                    historico = [{
                        "anio": int(anio) if anio.isdigit() else 2024,
                        "patrimonio_bruto_eur": p.patrimonio_bruto_eur,
                    }]
                    eval_ = transparencia_bienes.evaluar_consistencia_patrimonio(
                        historico, p.salario_anual_oficial_eur,
                    )
                    if eval_.get("alerta"):
                        p.alerta_ia = eval_.get("razon", "")
                fuentes.append(FuenteRef(tipo="brain",
                                         nombre=f"OCR · {ocr.get('backend', '?')} "
                                                f"({ocr.get('n_pages') or '?'} pág)"))
            else:
                # OCR no instalado · marcamos amarillo y dejamos PDF como referencia
                if ocr.get("error") == "no_pdf_backend_installed":
                    p.alerta_ia = (
                        "PDF disponible pero OCR no extrajo campos · "
                        "instalar pdfplumber para activar"
                    )
            p.fuentes = fuentes
            ficha.patrimonio = p
        self._run(ficha, "patrimonio", _stage_patrimonio)

        # ── Bloque 8 · Histórico electoral ─────────────────────────
        def _stage_historico():
            from agents.brain.pipelines.ficha_schemas import PoliticoHistoricoElectoral
            he = PoliticoHistoricoElectoral()
            cands = infoelectoral_index.historial_personal(nombre_politico)
            he.candidaturas = [CandidaturaElectoral(**c) for c in cands if isinstance(c, dict)]
            he.veces_electo = sum(1 for c in he.candidaturas if "elect" in (c.resultado or "").lower())
            he.veces_no_electo = sum(1 for c in he.candidaturas
                                      if "no" in (c.resultado or "").lower())
            he.fuentes = [FuenteRef(tipo="infoelectoral", nombre="Min. del Interior")]
            ficha.historico_electoral = he
        self._run(ficha, "historico_electoral", _stage_historico)

        # ── Bloque 9 · Vínculos corporativos (BORME + OpenCorporates + SABI) ─
        def _stage_vinculos():
            from agents.brain.pipelines.ficha_schemas import (
                PoliticoVinculosCorporativos, EmpresaVinculada,
            )
            from agents.brain.pipelines.data_sources import (
                borme_sabi, opencorporates,
            )
            v = PoliticoVinculosCorporativos()

            # 1) BORME · actos mercantiles con su nombre
            actos = borme_sabi.search_borme_actos(nombre_politico, dias_atras=730,
                                                   max_items=20)
            for a in actos:
                tipo = str(a.get("tipo_acto") or "")
                if tipo in {"nombramiento", "cese", "constitución sociedad",
                             "ampliación capital"}:
                    v.empresas_vinculadas.append(EmpresaVinculada(
                        nombre=str(a.get("titulo") or "")[:160],
                        sector="",
                        relacion=tipo,
                        fecha_inicio=str(a.get("fecha") or ""),
                    ))

            # 2) OpenCorporates · oficiales / consejeros declarados
            try:
                oc_results = opencorporates.find_officer_companies(
                    nombre_politico, country="es", limit=20,
                )
            except Exception as exc:
                logger.debug("OpenCorporates falló: %s", exc)
                oc_results = []
            for o in oc_results:
                v.empresas_vinculadas.append(EmpresaVinculada(
                    nombre=str(o.get("empresa_nombre") or "")[:160],
                    sector="",
                    relacion=str(o.get("rol") or "consejero"),
                    fecha_inicio=str(o.get("fecha_inicio") or ""),
                    fecha_fin=str(o.get("fecha_fin") or ""),
                    cif=str(o.get("empresa_numero") or ""),
                ))
            if oc_results:
                v.sectores_interes_legislativo = opencorporates.inferir_sectores_de_empresas(
                    oc_results,
                )

            # 3) SABI (cuando licencia configurada via SABI_API_KEY/SABI_TOKEN)
            sabi = opencorporates.get_sabi_client()
            if sabi.configured:
                sabi_results = sabi.search_officer(nombre_politico)
                for o in sabi_results[:10]:
                    v.empresas_vinculadas.append(EmpresaVinculada(
                        nombre=str(o.get("nombre", ""))[:160],
                        sector=o.get("sector", ""),
                        relacion=o.get("rol", "consejero"),
                        fecha_inicio=str(o.get("fecha_inicio", "")),
                        cif=o.get("cif", ""),
                    ))

            # 4) Puertas giratorias · cruza trayectoria con BORME
            try:
                cargos = [c.model_dump() for c in (ficha.trayectoria.cargos_publicos or [])]
            except Exception:
                cargos = []
            pg = borme_sabi.detectar_puertas_giratorias(cargos, actos)
            if pg:
                v.puertas_giratorias_detectadas = pg
                v.alerta_solapamiento_legislador_regulado = True

            v.fuentes = [
                FuenteRef(tipo="brain", nombre="BORME · BOE",
                          url="https://www.boe.es/buscar/borme.php"),
                FuenteRef(tipo="brain", nombre="OpenCorporates",
                          url="https://opencorporates.com"),
            ]
            if sabi.configured:
                v.fuentes.append(FuenteRef(tipo="brain", nombre="SABI (Bureau van Dijk)"))
            ficha.vinculos_corporativos = v
        self._run(ficha, "vinculos_corporativos", _stage_vinculos)

        # ── Bloque 10 · Agenda ─────────────────────────────────────
        def _stage_agenda():
            from agents.brain.pipelines.ficha_schemas import PoliticoAgenda
            a = PoliticoAgenda()
            a.fuentes = [FuenteRef(tipo="brain", nombre="Pendiente agenda institucional")]
            ficha.agenda = a
        self._run(ficha, "agenda", _stage_agenda)

        # ── Bloque 11 · Análisis IA core ───────────────────────────
        def _stage_analisis():
            from agents.brain.pipelines.ficha_schemas import PoliticoAnalisisIA
            ai = PoliticoAnalisisIA()
            brain = self._get_brain()
            if brain is None:
                ai.ok = False; ai.error = "brain no disponible"
                ficha.analisis_ia = ai
                return
            # Construimos un dossier completo y extraemos lo relevante
            try:
                from agents.brain.pipelines.dossier_builder import DossierBuilder
                db = DossierBuilder(brain=self._brain)
                declaraciones = [n.titulo for n in ficha.presencia_mediatica.noticias_30d[:8]]
                dossier = db.build_actor_dossier(
                    nombre_politico,
                    role=ficha.hero.cargo_actual,
                    party=partido_actual,
                    biography=wp_bundle.get("summary", ""),
                    declarations_recent=declaraciones,
                    controversies=[],
                    relations_from_graph=[
                        {"actor_to_name": r.nombre, "relation_type": r.tipo,
                         "valence": 0.5, "strength": r.fuerza}
                        for r in ficha.redes.relaciones[:8]
                    ],
                    depth="medium",
                    usar_wikipedia=False,  # ya tenemos wp_bundle
                )
                if dossier.ok:
                    ai.perfil_ejecutivo = dossier.executive_summary[:1500]
                    secs = dossier.sections or {}
                    ai.fortalezas = [
                        x.strip("- ") for x in (secs.get("fortalezas") or "").split("\n")
                        if x.strip()
                    ][:6]
                    ai.debilidades = [
                        x.strip("- ") for x in (secs.get("debilidades") or "").split("\n")
                        if x.strip()
                    ][:6]
                    ai.oportunidades_contacto = [
                        x for x in (dossier.opportunities or [])
                    ][:6]
                    # Riesgo reputacional desde dossier.risks
                    n_risks = len(dossier.risks or [])
                    ai.riesgo_reputacional = min(10.0, n_risks * 1.5 + 3.0)
                    # Proyección: derivamos de evolucion_carrera
                    if ficha.trayectoria.evolucion_carrera == "ascendente":
                        ai.proyeccion = "ascenso"
                        ai.probabilidad_salto_nivel = 0.6
                    elif ficha.trayectoria.evolucion_carrera == "descendente":
                        ai.proyeccion = "declive"
                        ai.probabilidad_salto_nivel = 0.2
                    else:
                        ai.proyeccion = "estable"
                        ai.probabilidad_salto_nivel = 0.4
                    ai.tokens_used = int(dossier.tokens_used)
                    ai.latency_ms = int(dossier.latency_ms)
            except Exception as exc:
                ai.ok = False; ai.error = f"dossier: {type(exc).__name__}"
            ai.fuentes = [FuenteRef(tipo="brain", nombre="GroqBrain · DossierBuilder")]
            ficha.analisis_ia = ai
        self._run(ficha, "analisis_ia", _stage_analisis)

        # Score final
        ficha.completeness = min(1.0, len(ficha.bloques_ok) / 12.0)
        return ficha

    # ════════════════════════════════════════════════════════════════
    def build_by_name(self, nombre: str) -> FichaPolitico:
        """Fallback: busca por nombre y resuelve QID antes de build_by_qid."""
        from agents.brain.pipelines.data_sources import wikidata_politicos
        bundle = wikidata_politicos.fetch_politico_by_name(nombre)
        if bundle.get("found") and bundle.get("qid"):
            return self.build_by_qid(bundle["qid"])
        # Sin QID, devolvemos ficha vacía
        ficha = FichaPolitico(id=nombre.lower().replace(" ", "_"),
                              nombre=nombre)
        ficha.bloques_err["_wd_bundle"] = "no encontrado en Wikidata"
        return ficha
