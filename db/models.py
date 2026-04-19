"""
Modelos SQLAlchemy 2.0 alineados con ``db/schema.sql`` (subconjunto gestionado por Alembic).

Sirven como referencia para ``alembic revision --autogenerate``. Tras cargar el esquema con
Docker/init SQL, marque la revisión baseline con ``alembic stamp 0001_baseline``.

Objetos solo en BD (Timescale, tablas no declaradas aquí) no se eliminan en autogenerate
gracias a ``include_object`` en ``db/migrations/env.py``.
"""

from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


class TipoEleccion(enum.Enum):
    generales = "generales"
    autonomicas = "autonomicas"
    municipales = "municipales"
    europeas = "europeas"
    referendum = "referendum"


tipo_eleccion_type = PGEnum(
    TipoEleccion,
    name="tipo_eleccion",
    values_callable=lambda e: [i.value for i in e],
    create_type=False,
)


class ComunidadAutonoma(Base):
    __tablename__ = "comunidades_autonomas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_ine: Mapped[str] = mapped_column(String(2), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    capital: Mapped[Optional[str]] = mapped_column(String(100))
    superficie_km2: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    provincias: Mapped[list["Provincia"]] = relationship(back_populates="ccaa")


class Provincia(Base):
    __tablename__ = "provincias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_ine: Mapped[str] = mapped_column(String(2), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    ccaa_id: Mapped[int] = mapped_column(ForeignKey("comunidades_autonomas.id"), nullable=False)
    capital: Mapped[Optional[str]] = mapped_column(String(100))
    superficie_km2: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    escanos_congreso: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    ccaa: Mapped["ComunidadAutonoma"] = relationship(back_populates="provincias")
    municipios: Mapped[list["Municipio"]] = relationship(back_populates="provincia")


class Municipio(Base):
    __tablename__ = "municipios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_ine: Mapped[str] = mapped_column(String(5), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    provincia_id: Mapped[int] = mapped_column(ForeignKey("provincias.id"), nullable=False)
    ccaa_id: Mapped[int] = mapped_column(ForeignKey("comunidades_autonomas.id"), nullable=False)
    poblacion: Mapped[Optional[int]] = mapped_column(Integer)
    superficie_km2: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    altitud_media: Mapped[Optional[int]] = mapped_column(Integer)
    tipo_municipio: Mapped[Optional[str]] = mapped_column(String(50))
    nuts3_code: Mapped[Optional[str]] = mapped_column(String(10))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    provincia: Mapped["Provincia"] = relationship(back_populates="municipios")


class Partido(Base):
    __tablename__ = "partidos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    siglas: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    nombre_completo: Mapped[str] = mapped_column(String(200), nullable=False)
    ideologia: Mapped[Optional[str]] = mapped_column(String(50))
    eje_izda_dcha: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1))
    eje_libertario_autoritario: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1))
    fundacion_año: Mapped[Optional[int]] = mapped_column(Integer)
    activo: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text("true"))
    ambito: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class Eleccion(Base):
    __tablename__ = "elecciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[TipoEleccion] = mapped_column(tipo_eleccion_type, nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    vuelta: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("1"))
    ambito: Mapped[Optional[str]] = mapped_column(String(100))
    ccaa_id: Mapped[Optional[int]] = mapped_column(ForeignKey("comunidades_autonomas.id"))
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    censo_total: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    es_activa: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text("false"))
    url_feed_interior: Mapped[Optional[str]] = mapped_column(Text)
    pct_escrutado_maximo: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), server_default=text("0"))


class ResultadoElectoral(Base):
    __tablename__ = "resultados_electorales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    eleccion_id: Mapped[Optional[int]] = mapped_column(ForeignKey("elecciones.id"))
    partido_id: Mapped[Optional[int]] = mapped_column(ForeignKey("partidos.id"))
    provincia_id: Mapped[Optional[int]] = mapped_column(ForeignKey("provincias.id"))
    municipio_id: Mapped[Optional[int]] = mapped_column(ForeignKey("municipios.id"))
    ccaa_id: Mapped[Optional[int]] = mapped_column(ForeignKey("comunidades_autonomas.id"))
    votos: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    porcentaje: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    escanos: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("0"))
    votos_validos: Mapped[Optional[int]] = mapped_column(Integer)
    censo: Mapped[Optional[int]] = mapped_column(Integer)
    participacion: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    votos_blancos: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("0"))
    votos_nulos: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("0"))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    pct_escrutado: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    timestamp_parcial: Mapped[Optional[datetime]] = mapped_column(DateTime)

    __table_args__ = (UniqueConstraint("eleccion_id", "partido_id", "provincia_id"),)


# --- Fase 2: tablas de salida (migración 0002) ---


class PerfilVotante(Base):
    __tablename__ = "perfiles_votante"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cluster_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(100))
    n_respondentes: Mapped[Optional[int]] = mapped_column(Integer)
    peso_demografico_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    edad_media: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1))
    ideologia_media: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 2))
    distribucion_voto_json: Mapped[Optional[str]] = mapped_column(Text)
    descripcion_perfil_llm: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    memory_logs: Mapped[list["AgentMemoryLog"]] = relationship(back_populates="perfil")


class AgentMemoryLog(Base):
    """Trazas de conversación, delimitación CoT y contexto RAG (Fase 3)."""

    __tablename__ = "agent_memory_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    perfil_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("perfiles_votante.id", ondelete="SET NULL"),
        nullable=True,
    )
    cluster_id: Mapped[Optional[int]] = mapped_column(Integer)
    session_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    kind: Mapped[str] = mapped_column(String(50), nullable=False, server_default=text("'turn'"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text)
    modelo: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    perfil: Mapped[Optional["PerfilVotante"]] = relationship(back_populates="memory_logs")


class EstimacionVotoAgregada(Base):
    __tablename__ = "estimaciones_voto_agregadas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha_estimacion: Mapped[date] = mapped_column(Date, nullable=False)
    partido_id: Mapped[int] = mapped_column(ForeignKey("partidos.id"), nullable=False)
    estimacion_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    ic_95_inf: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    ic_95_sup: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    n_encuestas: Mapped[Optional[int]] = mapped_column(Integer)
    modelo: Mapped[Optional[str]] = mapped_column(String(50))
    ventana_dias: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("fecha_estimacion", "partido_id", "modelo"),
    )


class VolatilidadElectoralHistorica(Base):
    __tablename__ = "volatilidad_electoral_historica"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    eleccion_anterior: Mapped[Optional[date]] = mapped_column(Date)
    eleccion_actual: Mapped[date] = mapped_column(Date, nullable=False)
    volatilidad_total: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    volatilidad_bloques: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    volatilidad_interna: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    interpretacion: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint("eleccion_anterior", "eleccion_actual"),)


class InformeRiesgoPolitico(Base):
    __tablename__ = "informes_riesgo_politico"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha_calculo: Mapped[Optional[datetime]] = mapped_column(DateTime)
    indice_compuesto: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    semaforo: Mapped[Optional[str]] = mapped_column(String(20))
    dimensiones_json: Mapped[Optional[str]] = mapped_column(Text)
    drivers_json: Mapped[Optional[str]] = mapped_column(Text)
    recomendaciones_json: Mapped[Optional[str]] = mapped_column(Text)


class EscenarioGenerado(Base):
    __tablename__ = "escenarios_generados"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    nombre: Mapped[Optional[str]] = mapped_column(String(200))
    probabilidad: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 6))
    coherencia: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))
    estados_json: Mapped[Optional[str]] = mapped_column(Text)
    descripcion_narrativa: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class SimulacionMcEscanos(Base):
    __tablename__ = "simulaciones_mc_escanos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha_simulacion: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    partido_id: Mapped[int] = mapped_column(ForeignKey("partidos.id"), nullable=False)
    n_simulaciones: Mapped[Optional[int]] = mapped_column(Integer)
    escanos_media: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    escanos_mediana: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    escanos_p5: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    escanos_p25: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    escanos_p75: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    escanos_p95: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    prob_mayoria_absoluta: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 4))
    prob_primer_partido: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 4))
    escenario_id: Mapped[Optional[str]] = mapped_column(
        String(20), ForeignKey("escenarios_generados.id")
    )


class StressTestResultado(Base):
    __tablename__ = "stress_test_resultados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha_test: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    escenario_nombre: Mapped[Optional[str]] = mapped_column(String(100))
    coalicion_analizada: Mapped[Optional[str]] = mapped_column(Text)
    escanos_base: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    escanos_stress: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    perdida_escanos: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    pierden_mayoria: Mapped[Optional[bool]] = mapped_column(Boolean)
    riesgo_ruptura_coalicion: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))
    vare_95: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2))
    riesgo_compuesto: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 3))


class AnalisisCoalicion(Base):
    __tablename__ = "analisis_coaliciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    eleccion_id: Mapped[Optional[int]] = mapped_column(ForeignKey("elecciones.id"))
    partidos_coalicion: Mapped[Optional[str]] = mapped_column(Text)
    escanos_totales: Mapped[Optional[int]] = mapped_column(Integer)
    n_partidos: Mapped[Optional[int]] = mapped_column(Integer)
    distancia_ideologica: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3))
    valor_shapley_total: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 4))
    score_viabilidad: Mapped[Optional[Decimal]] = mapped_column(Numeric(7, 3))
    es_minima: Mapped[Optional[bool]] = mapped_column(Boolean)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class DafoPartido(Base):
    __tablename__ = "dafo_partidos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    partido_id: Mapped[int] = mapped_column(ForeignKey("partidos.id"), nullable=False)
    fecha_calculo: Mapped[date] = mapped_column(Date, nullable=False)
    score_interno: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))
    score_externo: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))
    cuadrante: Mapped[Optional[str]] = mapped_column(String(20))
    fortalezas_json: Mapped[Optional[str]] = mapped_column(Text)
    debilidades_json: Mapped[Optional[str]] = mapped_column(Text)
    oportunidades_json: Mapped[Optional[str]] = mapped_column(Text)
    amenazas_json: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


# --- Fase 3: simulaciones agentes (migración 0004) ---


class SimulacionEncuesta(Base):
    __tablename__ = "simulaciones_encuesta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[Optional[str]] = mapped_column(String(200))
    fecha_simulacion: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    n_perfiles: Mapped[Optional[int]] = mapped_column(Integer)
    uso_rag: Mapped[Optional[bool]] = mapped_column(Boolean)
    preguntas_json: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class SimulacionCampana(Base):
    __tablename__ = "simulaciones_campana"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    partido_emisor: Mapped[Optional[str]] = mapped_column(String(20))
    texto_mensaje: Mapped[Optional[str]] = mapped_column(Text)
    tipo: Mapped[Optional[str]] = mapped_column(String(30))
    tema: Mapped[Optional[str]] = mapped_column(String(30))
    fecha_simulacion: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    receptividad_media: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))
    cambio_intencion_medio: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 3))
    analisis_json: Mapped[Optional[str]] = mapped_column(Text)
    n_perfiles: Mapped[Optional[int]] = mapped_column(Integer)


class PropagacionRed(Base):
    __tablename__ = "propagaciones_red"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    simulacion_campana_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("simulaciones_campana.id"), nullable=True
    )
    fecha_simulacion: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    n_iteraciones: Mapped[Optional[int]] = mapped_column(Integer)
    resultados_json: Mapped[Optional[str]] = mapped_column(Text)
    metricas_red_json: Mapped[Optional[str]] = mapped_column(Text)


# --- Fase 4: tiempo real (migraciones 0005–0006) ---


class ScrapingLog(Base):
    __tablename__ = "scraping_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fuente: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[Optional[str]] = mapped_column(String(50))
    url: Mapped[Optional[str]] = mapped_column(Text)
    estado: Mapped[Optional[str]] = mapped_column(String(20))
    n_registros_nuevos: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("0"))
    n_registros_duplicados: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("0"))
    error_mensaje: Mapped[Optional[str]] = mapped_column(Text)
    duracion_segundos: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 3))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class AlertaSistema(Base):
    __tablename__ = "alertas_sistema"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[Optional[str]] = mapped_column(String(50))
    severidad: Mapped[Optional[str]] = mapped_column(String(20))
    titulo: Mapped[Optional[str]] = mapped_column(String(200))
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    datos_json: Mapped[Optional[str]] = mapped_column(Text)
    leida: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class EncuestaTracking(Base):
    __tablename__ = "encuestas_tracking"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    url_fuente: Mapped[str] = mapped_column(Text, nullable=False)
    titular: Mapped[Optional[str]] = mapped_column(Text)
    casa_encuestadora: Mapped[Optional[str]] = mapped_column(String(100))
    fecha_publicacion: Mapped[Optional[date]] = mapped_column(Date)
    fecha_campo_inicio: Mapped[Optional[date]] = mapped_column(Date)
    fecha_campo_fin: Mapped[Optional[date]] = mapped_column(Date)
    n_entrevistas: Mapped[Optional[int]] = mapped_column(Integer)
    partido_datos_json: Mapped[Optional[str]] = mapped_column(Text)
    confianza_parseo: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 3))
    procesada: Mapped[Optional[bool]] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint("url_fuente", name="uq_encuestas_tracking_url_fuente"),)


class CacheHttp(Base):
    __tablename__ = "cache_http"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    url_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    respuesta_body: Mapped[Optional[str]] = mapped_column(Text)
    content_type: Mapped[Optional[str]] = mapped_column(String(100))
    status_code: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    __table_args__ = (UniqueConstraint("url_hash", name="uq_cache_http_url_hash"),)


class DecisionLog(Base):
    __tablename__ = "decision_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_type: Mapped[Optional[str]] = mapped_column(String(64))
    object_id: Mapped[Optional[str]] = mapped_column(String(64))
    action_name: Mapped[str] = mapped_column(String(128), nullable=False)
    input_params: Mapped[dict] = mapped_column(JSON, nullable=False)
    output_summary: Mapped[str] = mapped_column(Text, nullable=False)
    evaluation: Mapped[Optional[str]] = mapped_column(Text)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, server_default=text("'default'"))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class AgentEvalRun(Base):
    __tablename__ = "agent_eval_run"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cluster_id: Mapped[int] = mapped_column(Integer, nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, server_default=text("'default'"))
    n_prompts: Mapped[int] = mapped_column(Integer, nullable=False)
    coherence_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 4))
    detalle_json: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class PostRedesSociales(Base):
    __tablename__ = "posts_redes_sociales"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    plataforma: Mapped[Optional[str]] = mapped_column(String(30))
    post_id_original: Mapped[Optional[str]] = mapped_column(String(100))
    autor_handle: Mapped[Optional[str]] = mapped_column(String(100))
    autor_tipo: Mapped[Optional[str]] = mapped_column(String(30))
    partido_id: Mapped[Optional[int]] = mapped_column(Integer)
    parlamentario_id: Mapped[Optional[int]] = mapped_column(Integer)
    fecha_publicacion: Mapped[Optional[datetime]] = mapped_column(DateTime)
    texto: Mapped[Optional[str]] = mapped_column(Text)
    idioma: Mapped[Optional[str]] = mapped_column(String(5))
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(1536))
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, server_default=text("'default'"))
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class MicrodatoEncuesta(Base):
    __tablename__ = "microdatos_encuesta"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    encuesta_id: Mapped[Optional[int]] = mapped_column(Integer)
    id_respondente: Mapped[Optional[str]] = mapped_column(String(20))
    principal_problema: Mapped[Optional[str]] = mapped_column(String(200))
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(1536))
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, server_default=text("'default'"))
