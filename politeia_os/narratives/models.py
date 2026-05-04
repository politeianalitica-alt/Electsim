"""
Modelos de datos para el modulo de narrativas (Capa 4).

Dataclasses tipadas para Narrative, NarrativeActor y DiffusionVector.
Son los contratos internos entre todos los submodulos del paquete.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class NarrativeActor:
    """Representa un actor dentro de una narrativa con su rol y frecuencia."""

    canonical_qid: str
    nombre_oficial: str
    rol: str  # protagonist | antagonist | victim | ally | neutral
    frecuencia: int = 1

    def validate(self) -> None:
        """Lanza ValueError si el rol no esta en el vocabulario controlado."""
        valid = {"protagonist", "antagonist", "victim", "ally", "neutral"}
        if self.rol not in valid:
            raise ValueError(f"Rol '{self.rol}' no valido. Opciones: {valid}")


@dataclass
class DiffusionVector:
    """Encapsula el patron de difusion de una narrativa en medios."""

    origen_scope: str  # local | comarcal | provincial | regional | nacional
    velocidad_difusion: float  # horas desde primera aparicion hasta pico
    patron_difusion: str  # bottom_up | top_down | coordinado | organico
    medios_amplificadores: list[str] = field(default_factory=list)
    nicho_origen: Optional[str] = None
    posible_coordinacion: bool = False
    ventana_coordinacion_h: float = 6.0

    def validate(self) -> None:
        """Lanza ValueError si los campos enumerados no son validos."""
        valid_scope = {"local", "comarcal", "provincial", "regional", "nacional"}
        valid_patron = {"bottom_up", "top_down", "coordinado", "organico"}
        if self.origen_scope not in valid_scope:
            raise ValueError(f"origen_scope '{self.origen_scope}' no valido")
        if self.patron_difusion not in valid_patron:
            raise ValueError(f"patron_difusion '{self.patron_difusion}' no valido")


@dataclass
class Narrative:
    """
    Unidad principal de analisis narrativo.

    Contiene los seis componentes: frame, actores, emocion,
    vector de difusion, ciclo vital y contexto territorial.
    """

    # Identificadores
    narrative_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    # 1. Frame
    frame_label: str = ""
    frame_tipo: str = ""        # diagnostico | pronostico | motivacional | evaluativo
    frame_embedding: Optional[list[float]] = None   # vector 768d
    frame_favorecido: str = ""  # quien sale beneficiado del frame
    frame_perjudicado: str = "" # quien sale perjudicado
    frame_terminos: list[str] = field(default_factory=list)  # top 3 terminos lexicos

    # 2. Actores
    actors: list[NarrativeActor] = field(default_factory=list)
    actor_principal_qid: Optional[str] = None
    actor_objetivo_qid: Optional[str] = None

    # 3. Emocion
    emocion_dominante: str = ""  # indignacion | miedo | esperanza | orgullo |
    #                               desprecio | desconfianza | solidaridad | urgencia
    emocion_intensidad: float = 0.0  # [0.0, 1.0]

    # 4. Vector de difusion
    diffusion: Optional[DiffusionVector] = None
    posible_coordinacion: bool = False
    origen_scope: str = "nacional"
    patron_difusion: str = "organico"

    # 5. Ciclo vital
    ciclo_vital: str = "emergente"  # emergente | creciente | plateau | declinante | zombie
    primera_deteccion: Optional[datetime] = None
    pico_menciones_at: Optional[datetime] = None
    menciones_acumuladas: int = 0
    fuentes_unicas: int = 0
    dias_activa: int = 0
    serie_temporal: list[float] = field(default_factory=list)  # valores diarios normalizados

    # 6. Territorio
    es_nacional: bool = False
    activa_en_ccaas: list[str] = field(default_factory=list)
    activa_en_provincias: list[str] = field(default_factory=list)

    # Metadata
    titulares_representativos: list[str] = field(default_factory=list)
    article_ids: list[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # --- helpers ---

    def add_actor(self, actor: NarrativeActor) -> None:
        """Agrega un actor a la narrativa; incrementa frecuencia si ya existe."""
        for existing in self.actors:
            if existing.canonical_qid == actor.canonical_qid:
                existing.frecuencia += actor.frecuencia
                return
        actor.validate()
        self.actors.append(actor)

    @property
    def actor_principal(self) -> Optional[NarrativeActor]:
        """Retorna el actor con rol 'protagonist' y mayor frecuencia."""
        protagonists = [a for a in self.actors if a.rol == "protagonist"]
        return max(protagonists, key=lambda a: a.frecuencia, default=None)

    @property
    def is_new(self) -> bool:
        """True si la narrativa tiene menos de 48 horas y menos de 5 fuentes."""
        return self.dias_activa == 0 and self.fuentes_unicas < 5


@dataclass
class NarrativeRunLog:
    """Registro de una ejecucion del pipeline de narrativas."""

    run_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    executed_at: Optional[datetime] = None
    articles_processed: int = 0
    narratives_new: int = 0
    narratives_updated: int = 0
    coordinations_flagged: int = 0
