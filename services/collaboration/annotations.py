"""Annotations: comentarios, correcciones, decisiones sobre cualquier objeto."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

VALID_ANNOTATION_TYPES = {"comment", "highlight", "correction", "question", "decision"}


class Annotation(BaseModel):
    """Anotación sobre un objeto del sistema."""

    model_config = ConfigDict()

    id: str
    tenant_id: str
    object_type: str
    object_id: str
    author_id: str
    author_name: str
    text: str
    annotation_type: str
    parent_id: str = ""
    created_at: datetime
    updated_at: datetime | None = None
    resolved: bool = False
    tags: list[str] = Field(default_factory=list)


# claves: f"{object_type}:{object_id}"
_ANNOTATIONS: dict[str, list[Annotation]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


def _key(object_type: str, object_id: str) -> str:
    return f"{object_type}:{object_id}"


def add_annotation(
    tenant_id: str,
    object_type: str,
    object_id: str,
    author_id: str,
    author_name: str,
    text: str,
    annotation_type: str = "comment",
    parent_id: str = "",
    tags: list[str] | None = None,
) -> Annotation:
    annotation = Annotation(
        id=_gen_id(),
        tenant_id=tenant_id,
        object_type=object_type,
        object_id=object_id,
        author_id=author_id,
        author_name=author_name,
        text=text,
        annotation_type=annotation_type,
        parent_id=parent_id,
        created_at=_now(),
        tags=list(tags or []),
    )
    _ANNOTATIONS.setdefault(_key(object_type, object_id), []).append(annotation)
    return annotation


def get_annotations(
    object_type: str,
    object_id: str,
    include_resolved: bool = True,
) -> list[Annotation]:
    bucket = _ANNOTATIONS.get(_key(object_type, object_id), [])
    if include_resolved:
        return list(bucket)
    return [a for a in bucket if not a.resolved]


def _find(annotation_id: str) -> Annotation | None:
    for bucket in _ANNOTATIONS.values():
        for a in bucket:
            if a.id == annotation_id:
                return a
    return None


def update_annotation(
    annotation_id: str,
    text: str | None = None,
    resolved: bool | None = None,
) -> Annotation:
    annotation = _find(annotation_id)
    if annotation is None:
        raise KeyError(f"Annotation {annotation_id} no encontrada")
    if text is not None:
        annotation.text = text
    if resolved is not None:
        annotation.resolved = resolved
    annotation.updated_at = _now()
    return annotation


def delete_annotation(annotation_id: str) -> bool:
    for key, bucket in _ANNOTATIONS.items():
        for i, a in enumerate(bucket):
            if a.id == annotation_id:
                bucket.pop(i)
                if not bucket:
                    _ANNOTATIONS.pop(key, None)
                return True
    return False


def count_annotations_by_object(object_type: str, object_id: str) -> int:
    return len(_ANNOTATIONS.get(_key(object_type, object_id), []))


def list_recent_annotations(tenant_id: str, limit: int = 20) -> list[Annotation]:
    out: list[Annotation] = []
    for bucket in _ANNOTATIONS.values():
        out.extend(a for a in bucket if a.tenant_id == tenant_id)
    out.sort(key=lambda a: a.created_at, reverse=True)
    return out[:limit]


def get_user_annotations(tenant_id: str, user_id: str) -> list[Annotation]:
    out: list[Annotation] = []
    for bucket in _ANNOTATIONS.values():
        out.extend(
            a
            for a in bucket
            if a.tenant_id == tenant_id and a.author_id == user_id
        )
    out.sort(key=lambda a: a.created_at, reverse=True)
    return out


def _demo_annotations() -> None:
    """Carga 8 anotaciones de demostración sobre actores y narrativas."""

    if any(_ANNOTATIONS.values()):
        return

    demo_tenant = "demo"
    seeds = [
        ("actor", "actor_001", "ana_perez", "Ana Pérez", "Posible portavoz para la rueda de mañana.", "comment", ["portavoces"]),
        ("actor", "actor_001", "luis_g", "Luis García", "De acuerdo, pero verificar agenda parlamentaria.", "comment", []),
        ("actor", "actor_002", "ana_perez", "Ana Pérez", "Su posición sobre vivienda ha cambiado, revisar.", "correction", ["vivienda"]),
        ("narrative", "narr_001", "marta_s", "Marta Sanz", "Esta narrativa está creciendo en X y Telegram.", "highlight", ["redes"]),
        ("narrative", "narr_001", "luis_g", "Luis García", "¿Origen identificado?", "question", []),
        ("narrative", "narr_002", "ana_perez", "Ana Pérez", "Decidido: respondemos con datos del INE.", "decision", ["respuesta"]),
        ("alert", "alert_017", "marta_s", "Marta Sanz", "Falsa alarma, ya verificado.", "comment", []),
        ("issue", "issue_vivienda", "luis_g", "Luis García", "Acordado: prioridad alta para esta semana.", "decision", ["prioridad"]),
    ]

    for object_type, object_id, author_id, author_name, text, atype, tags in seeds:
        add_annotation(
            tenant_id=demo_tenant,
            object_type=object_type,
            object_id=object_id,
            author_id=author_id,
            author_name=author_name,
            text=text,
            annotation_type=atype,
            tags=tags,
        )


_demo_annotations()
