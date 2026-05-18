"""
Schemas Pydantic para fichas dinámicas de territorios y políticos.

Cada ficha tiene 12 bloques (0..11) con campos opcionales — si una fuente
falla, el bloque devuelve lo que tenga sin romper el resto.

Identificación canónica:
  · Territorios: código INE de 5 dígitos (municipios) o sigla CCAA (2 chars)
  · Políticos: ID Wikidata (Q12345) o `nombre_normalizado + institucion`

NUNCA usar emojis en los campos `etiqueta`, `nombre`, `texto` (regla del
proyecto). Los iconos los pinta el frontend con SVG.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────
# COMMON HELPERS
# ─────────────────────────────────────────────────────────────────

class FuenteRef(BaseModel):
    """Referencia auditable a una fuente externa."""
    tipo: str = Field(..., description="ine | wikidata | wikipedia | infoelectoral | rss | boe | transparencia | aemet | brain")
    nombre: str = ""
    url: str = ""
    fecha_acceso: str = Field(default_factory=lambda: datetime.utcnow().date().isoformat())


class BloqueBase(BaseModel):
    """Cada bloque hereda esto. Si `ok=False` el frontend muestra "Datos no disponibles"."""
    ok: bool = True
    error: str | None = None
    fuentes: list[FuenteRef] = Field(default_factory=list)
    fecha_calculo: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


# ════════════════════════════════════════════════════════════════
# FICHA TERRITORIAL · 12 bloques
# ════════════════════════════════════════════════════════════════

class TerritorioHero(BloqueBase):
    """Bloque 0 · Hero / cabecera."""
    nombre: str = ""
    tipo: Literal["municipio", "provincia", "ccaa", "comarca", "isla", "ciudad_autonoma"] = "municipio"
    codigo_ine: str = ""
    ccaa: str = ""
    ccaa_codigo: str = ""
    provincia: str = ""
    provincia_codigo: str = ""
    escudo_url: str = ""
    bandera_url: str = ""
    coordenadas: dict[str, float] = Field(default_factory=dict)  # {lat, lon}

    # KPIs principales
    poblacion: int | None = None
    poblacion_fuente_fecha: str = ""
    superficie_km2: float | None = None
    densidad_hab_km2: float | None = None
    altitud_m: int | None = None
    renta_media_hogar: float | None = None
    renta_media_anio: str = ""
    pib_per_capita: float | None = None  # CCAA solamente

    # Gobierno snapshot
    partido_gobernante: str = ""
    alcalde_o_presidente: str = ""
    alcalde_foto: str = ""

    # Sentimiento (IA)
    sentimiento_score: float | None = None  # -1..1
    sentimiento_etiqueta: str = ""           # positivo | neutral | negativo
    sentimiento_tendencia: str = ""          # subiendo | estable | bajando
    sentimiento_n_articulos: int = 0


class CargoElectoralLocal(BaseModel):
    nombre: str = ""
    partido: str = ""
    cargo: str = ""
    foto_url: str = ""
    fecha_inicio: str = ""
    fecha_fin: str = ""
    es_actual: bool = True


class TerritorioGobierno(BloqueBase):
    """Bloque 1 · Gobierno y cargos."""
    alcalde: CargoElectoralLocal | None = None
    concejales: list[CargoElectoralLocal] = Field(default_factory=list)
    grupos_pleno: list[dict[str, Any]] = Field(default_factory=list)
    junta_gobierno: list[CargoElectoralLocal] = Field(default_factory=list)
    historico_alcaldes: list[CargoElectoralLocal] = Field(default_factory=list)


class ResultadoEleccion(BaseModel):
    fecha: str = ""
    tipo: str = ""        # municipales | autonomicas | generales | europeas
    censo: int | None = None
    participacion_pct: float | None = None
    votos_validos: int | None = None
    votos_nulos: int | None = None
    resultados: list[dict[str, Any]] = Field(default_factory=list)
    # cada resultado: {partido, votos, porcentaje, concejales_o_diputados, color}
    pacto_gobierno: str = ""  # texto breve si hubo pacto


class TerritorioElectoral(BloqueBase):
    """Bloque 2 · Histórico electoral."""
    municipales: list[ResultadoEleccion] = Field(default_factory=list)
    autonomicas: list[ResultadoEleccion] = Field(default_factory=list)
    generales: list[ResultadoEleccion] = Field(default_factory=list)
    europeas: list[ResultadoEleccion] = Field(default_factory=list)
    participacion_historica: list[dict[str, Any]] = Field(default_factory=list)


class EmpresaTop(BaseModel):
    nombre: str = ""
    sector: str = ""
    empleados: int | None = None
    facturacion: float | None = None
    cif: str = ""


class TerritorioEconomia(BloqueBase):
    """Bloque 3 · Situación económica."""
    renta_media_hogar: float | None = None
    evolucion_renta_5y: list[dict[str, Any]] = Field(default_factory=list)  # [{anio, valor}]
    tasa_desempleo_pct: float | None = None
    sectores_empleo: list[dict[str, Any]] = Field(default_factory=list)     # [{sector, pct}]
    top_empresas: list[EmpresaTop] = Field(default_factory=list)
    presupuesto_municipal_eur: float | None = None
    presupuesto_desglose: list[dict[str, Any]] = Field(default_factory=list)  # [{concepto, eur}]
    deuda_viva_eur: float | None = None
    deuda_per_capita: float | None = None
    inversion_pge_eur: float | None = None
    inversion_eu_eur: float | None = None
    precio_vivienda_m2: float | None = None
    precio_vivienda_evolucion: list[dict[str, Any]] = Field(default_factory=list)


class PiramideTramo(BaseModel):
    edad_min: int
    edad_max: int
    hombres: int = 0
    mujeres: int = 0


class TerritorioDemografia(BloqueBase):
    """Bloque 4 · Demografía y sociedad."""
    poblacion_total: int | None = None
    piramide: list[PiramideTramo] = Field(default_factory=list)
    evolucion_poblacion: list[dict[str, Any]] = Field(default_factory=list)  # [{anio, valor}]
    pct_extranjeros: float | None = None
    nacionalidades_extranjeras: list[dict[str, Any]] = Field(default_factory=list)
    tasa_natalidad: float | None = None
    tasa_mortalidad: float | None = None
    crecimiento_vegetativo: float | None = None
    tamano_medio_hogar: float | None = None
    pct_hogares_monoparentales: float | None = None
    nivel_estudios: list[dict[str, Any]] = Field(default_factory=list)  # [{nivel, pct}]
    indice_envejecimiento: float | None = None
    tasa_dependencia: float | None = None


class NoticiaItem(BaseModel):
    titulo: str = ""
    medio: str = ""
    url: str = ""
    fecha: str = ""
    snippet: str = ""
    sentimiento: float | None = None     # -1..1
    sentimiento_etiqueta: str = ""
    linea_editorial: str = ""            # liberal | progresista | conservador | centro
    tags: list[str] = Field(default_factory=list)


class NarrativaItem(BaseModel):
    nombre: str = ""
    descripcion: str = ""
    fuerza: float = 0.0                  # 0..1
    medios_amplificadores: list[str] = Field(default_factory=list)
    n_articulos: int = 0


class TerritorioNoticias(BloqueBase):
    """Bloque 5 · Noticias y narrativas (IA)."""
    ventana_dias: int = 30
    noticias: list[NoticiaItem] = Field(default_factory=list)
    narrativas: list[NarrativaItem] = Field(default_factory=list)
    preocupaciones: list[dict[str, str]] = Field(default_factory=list)    # [{tema, urgencia}]
    sentimiento_evolucion: list[dict[str, Any]] = Field(default_factory=list)  # [{fecha, valor}]
    tags: list[dict[str, Any]] = Field(default_factory=list)              # [{tag, frecuencia, sentimiento}]
    alertas_crisis: list[dict[str, Any]] = Field(default_factory=list)


class EventoAgenda(BaseModel):
    fecha: str = ""
    titulo: str = ""
    tipo: str = ""                       # pleno | evento | fiesta | electoral | comisión
    descripcion: str = ""
    url: str = ""


class TerritorioAgenda(BloqueBase):
    """Bloque 6 · Agenda y calendario."""
    plenos_proximos: list[EventoAgenda] = Field(default_factory=list)
    eventos_oficiales: list[EventoAgenda] = Field(default_factory=list)
    calendario_electoral: list[EventoAgenda] = Field(default_factory=list)
    hitos_legislativos: list[EventoAgenda] = Field(default_factory=list)
    subvenciones_abiertas: list[EventoAgenda] = Field(default_factory=list)


class VotacionPleno(BaseModel):
    fecha: str = ""
    titulo: str = ""
    resultado: str = ""                  # aprobado | rechazado | retirado
    votos_si: int = 0
    votos_no: int = 0
    abstenciones: int = 0
    url: str = ""


class TerritorioPleno(BloqueBase):
    """Bloque 7 · Pleno municipal / parlamento autonómico."""
    composicion: list[dict[str, Any]] = Field(default_factory=list)        # [{partido, escanos, color}]
    ultimas_votaciones: list[VotacionPleno] = Field(default_factory=list)
    iniciativas_tramitacion: list[dict[str, Any]] = Field(default_factory=list)
    historico_mociones_censura: list[dict[str, Any]] = Field(default_factory=list)
    asistencia_general_pct: float | None = None


class TerritorioMapa(BloqueBase):
    """Bloque 8 · Mapa interactivo."""
    geojson_url: str = ""
    centroid: dict[str, float] = Field(default_factory=dict)
    bbox: list[float] = Field(default_factory=list)  # [west, south, east, north]
    capas_disponibles: list[str] = Field(default_factory=list)  # renta | voto | densidad | envejecimiento
    infraestructuras: list[dict[str, Any]] = Field(default_factory=list)
    barrios: list[dict[str, Any]] = Field(default_factory=list)
    pois_institucionales: list[dict[str, Any]] = Field(default_factory=list)


class TerritorioEmpresas(BloqueBase):
    """Bloque 9 · Tejido empresarial."""
    top_empresas: list[EmpresaTop] = Field(default_factory=list)
    sectores_pct: list[dict[str, Any]] = Field(default_factory=list)
    principales_empleadores_publicos: list[dict[str, Any]] = Field(default_factory=list)
    poligonos_industriales: list[dict[str, Any]] = Field(default_factory=list)
    parques_tecnologicos: list[dict[str, Any]] = Field(default_factory=list)


class TerritorioTercerSector(BloqueBase):
    """Bloque 10 · Tercer sector y cultura."""
    ongs_total: int | None = None
    ongs_por_sector: list[dict[str, Any]] = Field(default_factory=list)
    equipamientos_culturales: list[dict[str, Any]] = Field(default_factory=list)
    fiestas_interes_turistico: list[dict[str, Any]] = Field(default_factory=list)
    bics: list[dict[str, Any]] = Field(default_factory=list)  # Bienes de Interés Cultural
    clubes_deportivos: list[dict[str, Any]] = Field(default_factory=list)


class TerritorioAnalisisIA(BloqueBase):
    """Bloque 11 · Análisis IA integrado."""
    resumen_ejecutivo: str = ""
    score_estabilidad: float | None = None       # 0..10
    riesgos: list[str] = Field(default_factory=list)
    oportunidades: list[str] = Field(default_factory=list)
    alertas: list[dict[str, str]] = Field(default_factory=list)
    territorios_similares: list[str] = Field(default_factory=list)
    razon_analogia: str = ""
    proyeccion: str = ""
    tokens_used: int = 0
    latency_ms: int = 0


class FichaTerritorial(BaseModel):
    """Ficha completa de territorio · 12 bloques."""
    id: str = ""                  # codigo_ine
    nombre: str = ""
    tipo: str = "municipio"
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    hero: TerritorioHero = Field(default_factory=TerritorioHero)
    gobierno: TerritorioGobierno = Field(default_factory=TerritorioGobierno)
    electoral: TerritorioElectoral = Field(default_factory=TerritorioElectoral)
    economia: TerritorioEconomia = Field(default_factory=TerritorioEconomia)
    demografia: TerritorioDemografia = Field(default_factory=TerritorioDemografia)
    noticias: TerritorioNoticias = Field(default_factory=TerritorioNoticias)
    agenda: TerritorioAgenda = Field(default_factory=TerritorioAgenda)
    pleno: TerritorioPleno = Field(default_factory=TerritorioPleno)
    mapa: TerritorioMapa = Field(default_factory=TerritorioMapa)
    empresas: TerritorioEmpresas = Field(default_factory=TerritorioEmpresas)
    tercer_sector: TerritorioTercerSector = Field(default_factory=TerritorioTercerSector)
    analisis_ia: TerritorioAnalisisIA = Field(default_factory=TerritorioAnalisisIA)

    # Auditoría global
    completeness: float = 0.0   # 0..1
    bloques_ok: list[str] = Field(default_factory=list)
    bloques_err: dict[str, str] = Field(default_factory=dict)


# ════════════════════════════════════════════════════════════════
# FICHA POLITICO · 12 bloques
# ════════════════════════════════════════════════════════════════

class PoliticoHero(BloqueBase):
    """Bloque 0 · Perfil cabecera."""
    nombre_completo: str = ""
    foto_url: str = ""
    cargo_actual: str = ""
    institucion: str = ""        # Congreso de los Diputados | Senado | Junta Andalucía…
    partido: str = ""
    partido_color: str = ""
    distrito_escano: str = ""
    fecha_nacimiento: str = ""
    edad: int | None = None
    lugar_nacimiento: str = ""
    formacion: list[str] = Field(default_factory=list)
    anios_en_politica: int | None = None
    fecha_posesion_cargo: str = ""
    score_influencia: float | None = None   # 0..100
    estado_mandato: str = ""                 # activo | en funciones | cesado | suspendido
    email_publico: str = ""
    telefono_despacho: str = ""
    wikidata_id: str = ""
    wikipedia_url: str = ""


class CargoTrayectoria(BaseModel):
    cargo: str = ""
    institucion: str = ""
    nivel_territorial: str = ""              # local | autonómico | nacional | europeo
    fecha_inicio: str = ""
    fecha_fin: str = ""
    es_actual: bool = False


class PoliticoTrayectoria(BloqueBase):
    """Bloque 1 · Trayectoria política y carrera."""
    cargos_publicos: list[CargoTrayectoria] = Field(default_factory=list)
    cargos_internos_partido: list[CargoTrayectoria] = Field(default_factory=list)
    elecciones_internas: list[dict[str, Any]] = Field(default_factory=list)
    evolucion_carrera: str = ""              # ascendente | estable | descendente
    primer_cargo_publico: str = ""
    primer_cargo_anio: str = ""


class Intervencion(BaseModel):
    fecha: str = ""
    titulo: str = ""
    organo: str = ""
    tipo: str = ""                           # intervención | pregunta | proposición | moción
    url_diario_sesiones: str = ""
    resumen: str = ""


class VotacionClave(BaseModel):
    fecha: str = ""
    titulo: str = ""
    voto: str = ""                           # a favor | en contra | abstención | ausente
    resultado_global: str = ""               # aprobado | rechazado
    url: str = ""


class PoliticoActividadInstitucional(BloqueBase):
    """Bloque 2 · Actividad institucional."""
    intervenciones_recientes: list[Intervencion] = Field(default_factory=list)
    n_intervenciones_anio: int = 0
    iniciativas_legislativas: list[dict[str, Any]] = Field(default_factory=list)
    n_preguntas_orales: int = 0
    n_preguntas_escritas: int = 0
    n_proposiciones_ley: int = 0
    n_mociones: int = 0
    votaciones_clave: list[VotacionClave] = Field(default_factory=list)
    asistencia_pct: float | None = None
    asistencia_media_grupo_pct: float | None = None
    comisiones: list[dict[str, Any]] = Field(default_factory=list)
    comparecencias: list[dict[str, Any]] = Field(default_factory=list)


class PoliticoPosicionamientoIdeologico(BloqueBase):
    """Bloque 3 · Posicionamiento ideológico y temático (IA)."""
    eje_izq_der: float | None = None         # -1..1
    eje_lib_aut: float | None = None         # -1..1
    eje_centro_periferia: float | None = None # -1..1
    temas_dominantes: list[dict[str, Any]] = Field(default_factory=list)  # [{tema, peso_pct}]
    fidelidad_partido_pct: float | None = None
    rebeldias: list[dict[str, str]] = Field(default_factory=list)
    posiciones_clave: list[dict[str, str]] = Field(default_factory=list)
    # cada posición: {tema, postura, evidencia, fecha}


class RelacionPolitica(BaseModel):
    nombre: str = ""
    partido: str = ""
    tipo: str = ""                           # aliado | rival | mentor | protegido | familiar | colateral
    fuerza: float = 0.5                      # 0..1
    evidencia: str = ""


class PoliticoRedesRelaciones(BloqueBase):
    """Bloque 4 · Redes y mapa de poder."""
    relaciones: list[RelacionPolitica] = Field(default_factory=list)
    facciones_internas: list[str] = Field(default_factory=list)
    mentor: str = ""
    protegidos: list[str] = Field(default_factory=list)
    lobbies_relacionados: list[dict[str, str]] = Field(default_factory=list)
    familia_politica: list[dict[str, str]] = Field(default_factory=list)
    pactos: list[dict[str, str]] = Field(default_factory=list)


class CitaDestacada(BaseModel):
    texto: str = ""
    fecha: str = ""
    contexto: str = ""
    medio: str = ""
    url: str = ""
    polemica: bool = False


class PoliticoPresenciaMediatica(BloqueBase):
    """Bloque 5 · Presencia mediática y narrativas (IA)."""
    noticias_30d: list[NoticiaItem] = Field(default_factory=list)
    narrativas_sobre_el: list[NarrativaItem] = Field(default_factory=list)
    sentimiento_por_medio: list[dict[str, Any]] = Field(default_factory=list)
    sentimiento_evolucion: list[dict[str, Any]] = Field(default_factory=list)
    citas_destacadas: list[CitaDestacada] = Field(default_factory=list)
    polemicas_activas: list[dict[str, str]] = Field(default_factory=list)
    tendencia_visibilidad: str = ""          # subiendo | estable | bajando
    n_menciones_90d: int = 0


class PerfilRedSocial(BaseModel):
    plataforma: str = ""                     # twitter | instagram | facebook | tiktok | youtube | bluesky | threads
    handle: str = ""
    url: str = ""
    followers: int | None = None
    posts_30d: int = 0
    engagement_medio: float | None = None
    ultimo_post_fecha: str = ""


class PoliticoComunicacionDigital(BloqueBase):
    """Bloque 6 · Comunicación digital y redes sociales."""
    perfiles: list[PerfilRedSocial] = Field(default_factory=list)
    hashtags_top: list[dict[str, Any]] = Field(default_factory=list)
    temas_digitales: list[str] = Field(default_factory=list)
    contenido_viral: list[dict[str, Any]] = Field(default_factory=list)
    crecimiento_mensual_pct: float | None = None


class BienDeclarado(BaseModel):
    tipo: str = ""                           # inmueble | cuenta | acciones | deuda | vehículo
    descripcion: str = ""
    valor_eur: float | None = None
    anio_declaracion: str = ""


class PoliticoPatrimonioTransparencia(BloqueBase):
    """Bloque 7 · Patrimonio, transparencia y ética."""
    patrimonio_bruto_eur: float | None = None
    evolucion_patrimonial: list[dict[str, Any]] = Field(default_factory=list)
    salario_anual_oficial_eur: float | None = None
    bienes: list[BienDeclarado] = Field(default_factory=list)
    actividades_complementarias: list[dict[str, str]] = Field(default_factory=list)
    conflictos_interes_detectados: list[dict[str, str]] = Field(default_factory=list)
    sanciones_expedientes: list[dict[str, str]] = Field(default_factory=list)
    badge_transparencia: str = ""            # verde | amarillo | rojo
    alerta_ia: str = ""


class CandidaturaElectoral(BaseModel):
    fecha: str = ""
    tipo_eleccion: str = ""
    distrito: str = ""
    partido: str = ""
    posicion_lista: int | None = None
    votos: int | None = None
    porcentaje: float | None = None
    resultado: str = ""                      # electo | no electo | cabeza_lista_no_obtuvo


class PoliticoHistoricoElectoral(BloqueBase):
    """Bloque 8 · Histórico electoral personal."""
    candidaturas: list[CandidaturaElectoral] = Field(default_factory=list)
    veces_cabeza_lista: int = 0
    veces_electo: int = 0
    veces_no_electo: int = 0
    distritos_distintos: list[str] = Field(default_factory=list)
    especialidad: str = ""                   # arrastrado | locomotora | mixto


class EmpresaVinculada(BaseModel):
    nombre: str = ""
    sector: str = ""
    relacion: str = ""                       # accionista | administrador | consejero | fundador
    fecha_inicio: str = ""
    fecha_fin: str = ""
    cif: str = ""


class PoliticoVinculosCorporativos(BloqueBase):
    """Bloque 9 · Vínculos corporativos y sectoriales."""
    empresas_vinculadas: list[EmpresaVinculada] = Field(default_factory=list)
    sectores_interes_legislativo: list[str] = Field(default_factory=list)
    patrocinadores_relacionados: list[dict[str, str]] = Field(default_factory=list)
    eventos_corporativos: list[dict[str, str]] = Field(default_factory=list)
    puertas_giratorias_detectadas: list[dict[str, str]] = Field(default_factory=list)
    alerta_solapamiento_legislador_regulado: bool = False


class PoliticoAgenda(BloqueBase):
    """Bloque 10 · Agenda y calendario."""
    actos_publicos: list[EventoAgenda] = Field(default_factory=list)
    viajes_institucionales: list[dict[str, str]] = Field(default_factory=list)
    recepciones: list[dict[str, str]] = Field(default_factory=list)
    fechas_clave: list[EventoAgenda] = Field(default_factory=list)


class PoliticoAnalisisIA(BloqueBase):
    """Bloque 11 · Análisis IA core."""
    perfil_ejecutivo: str = ""
    fortalezas: list[str] = Field(default_factory=list)
    debilidades: list[str] = Field(default_factory=list)
    riesgo_reputacional: float | None = None  # 0..10
    oportunidades_contacto: list[str] = Field(default_factory=list)
    proyeccion: str = ""                      # ascenso | estable | declive
    probabilidad_salto_nivel: float | None = None
    comparativa_perfiles_similares: list[str] = Field(default_factory=list)
    tokens_used: int = 0
    latency_ms: int = 0


class FichaPolitico(BaseModel):
    """Ficha completa de político · 12 bloques."""
    id: str = ""                  # wikidata_id o slug
    nombre: str = ""
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    hero: PoliticoHero = Field(default_factory=PoliticoHero)
    trayectoria: PoliticoTrayectoria = Field(default_factory=PoliticoTrayectoria)
    actividad_institucional: PoliticoActividadInstitucional = Field(default_factory=PoliticoActividadInstitucional)
    posicionamiento: PoliticoPosicionamientoIdeologico = Field(default_factory=PoliticoPosicionamientoIdeologico)
    redes: PoliticoRedesRelaciones = Field(default_factory=PoliticoRedesRelaciones)
    presencia_mediatica: PoliticoPresenciaMediatica = Field(default_factory=PoliticoPresenciaMediatica)
    comunicacion_digital: PoliticoComunicacionDigital = Field(default_factory=PoliticoComunicacionDigital)
    patrimonio: PoliticoPatrimonioTransparencia = Field(default_factory=PoliticoPatrimonioTransparencia)
    historico_electoral: PoliticoHistoricoElectoral = Field(default_factory=PoliticoHistoricoElectoral)
    vinculos_corporativos: PoliticoVinculosCorporativos = Field(default_factory=PoliticoVinculosCorporativos)
    agenda: PoliticoAgenda = Field(default_factory=PoliticoAgenda)
    analisis_ia: PoliticoAnalisisIA = Field(default_factory=PoliticoAnalisisIA)

    completeness: float = 0.0
    bloques_ok: list[str] = Field(default_factory=list)
    bloques_err: dict[str, str] = Field(default_factory=dict)
