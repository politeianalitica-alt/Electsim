"""Router /api/dosieres — CRUD de dosieres de personas políticas.

Sistema de dosieres estructurados con tres capas:

  - dosieres            · 1 fila por persona (slug único, foto, bio)
  - dossier_apartados   · apartados tipificados (identidad, trayectoria,
                          posiciones, redes, declaraciones, controversias,
                          evidencia) · max 1 por tipo por dossier
  - dossier_items       · items concretos dentro de cada apartado
                          (dato, declaracion, evento, contacto, documento)

Endpoints:
  GET    /api/dosieres                              · lista resumida
  GET    /api/dosieres/{slug}                       · detalle completo (con apartados + items)
  POST   /api/dosieres                              · crear dossier
  PUT    /api/dosieres/{slug}                       · actualizar dossier
  DELETE /api/dosieres/{slug}                       · borrar (cascada)

  POST   /api/dosieres/{slug}/apartados             · upsert un apartado (con sus items)
  DELETE /api/dosieres/{slug}/apartados/{tipo}      · borrar un apartado

  POST   /api/dosieres/{slug}/apartados/{tipo}/items       · añadir item
  PUT    /api/dosieres/items/{item_id}                     · editar item
  DELETE /api/dosieres/items/{item_id}                     · borrar item

Migración requerida: 0081_dosieres_personas.
"""
from __future__ import annotations

import re
from datetime import date as _date
from typing import Any, Literal, Optional

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.auth import require_role

router = APIRouter(prefix="/api/dosieres", tags=["dosieres"])

# Los dossiers son datos de referencia compartidos. Las LECTURAS quedan abiertas
# (el frontend las consume vía proxy), pero crear/editar/borrar exige un rol de
# escritura autenticado (CLIENT_VIEW queda excluido). En ELECTSIM_DEV_MODE=true
# el usuario de desarrollo es ORG_ADMIN y pasa.
_WRITE = require_role(["SUPERADMIN", "ORG_ADMIN", "ANALYST_SENIOR", "ANALYST_JUNIOR"])


TIPO_APARTADO = Literal[
    "identidad", "trayectoria", "posiciones",
    "redes", "declaraciones", "controversias", "evidencia",
]
TIPO_ITEM = Literal["dato", "declaracion", "evento", "contacto", "documento"]


# ────────────────────────────────────────────────────────────────────────────
# Schemas Pydantic
# ────────────────────────────────────────────────────────────────────────────

class ItemIn(BaseModel):
    tipo: TIPO_ITEM = "dato"
    titulo: Optional[str] = None
    contenido: str
    fecha: Optional[_date] = None
    fuente_url: Optional[str] = None
    fuente_titulo: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    orden: int = 0


class ItemOut(ItemIn):
    id: str
    apartado_id: str


class ApartadoIn(BaseModel):
    tipo: TIPO_APARTADO
    titulo: Optional[str] = None
    resumen: Optional[str] = None
    orden: int = 0
    items: list[ItemIn] = Field(default_factory=list)


class ApartadoOut(BaseModel):
    id: str
    tipo: TIPO_APARTADO
    titulo: Optional[str]
    resumen: Optional[str]
    orden: int
    items: list[ItemOut]


class DossierIn(BaseModel):
    slug: Optional[str] = None  # se autogenera del nombre si no se pasa
    nombre_completo: str
    alias: Optional[str] = None
    cargo_actual: Optional[str] = None
    partido: Optional[str] = None
    foto_url: Optional[str] = None
    bio_corta: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    fuente_principal: Optional[str] = None
    apartados: list[ApartadoIn] = Field(default_factory=list)


class DossierResumen(BaseModel):
    """Resumen para la lista (sin apartados/items)."""
    id: str
    slug: str
    nombre_completo: str
    alias: Optional[str]
    cargo_actual: Optional[str]
    partido: Optional[str]
    foto_url: Optional[str]
    bio_corta: Optional[str]
    tags: list[str]
    n_apartados: int
    updated_at: str


class DossierCompleto(BaseModel):
    id: str
    slug: str
    nombre_completo: str
    alias: Optional[str]
    cargo_actual: Optional[str]
    partido: Optional[str]
    foto_url: Optional[str]
    bio_corta: Optional[str]
    tags: list[str]
    fuente_principal: Optional[str]
    apartados: list[ApartadoOut]
    created_at: str
    updated_at: str


# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

def _slug_from(name: str) -> str:
    """Slug normalizado en lowercase, ASCII a-z0-9 + guiones."""
    s = name.lower().strip()
    # Reemplazos básicos · NO usar unicodedata.normalize aquí para mantener
    # compatibilidad con el slug existente en visual-oscar/data/actores-fixture.ts
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"(^-|-$)", "", s)
    return s[:120]


def _conn():
    import os
    raw = os.environ.get("DATABASE_URL", "postgresql://electsim:electsim@localhost:5432/electsim_espana")
    dsn = re.sub(r"postgresql\+\w+://", "postgresql://", raw)
    return psycopg.connect(dsn)


def _row_to_dict(cur, row) -> dict:
    """Convierte una fila psycopg a dict usando los nombres de columna."""
    if row is None:
        return None
    cols = [d.name for d in cur.description]
    return dict(zip(cols, row))


def _iso(v) -> Optional[str]:
    if v is None:
        return None
    try:
        return v.isoformat()
    except Exception:
        return str(v)


# ────────────────────────────────────────────────────────────────────────────
# GET · lista
# ────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[DossierResumen])
def list_dosieres(
    partido: Optional[str] = Query(None, description="Filtrar por partido"),
    q: Optional[str] = Query(None, description="Búsqueda libre en nombre/alias/cargo"),
    limit: int = Query(100, ge=1, le=500),
):
    """Lista resumida de dosieres (sin apartados ni items)."""
    sql = """
        SELECT d.id, d.slug, d.nombre_completo, d.alias, d.cargo_actual,
               d.partido, d.foto_url, d.bio_corta, d.tags, d.updated_at,
               COALESCE((SELECT COUNT(*) FROM dossier_apartados a WHERE a.dossier_id = d.id), 0) AS n_apartados
          FROM dosieres d
         WHERE TRUE
    """
    params: list[Any] = []
    if partido:
        sql += " AND lower(d.partido) = lower(%s)"
        params.append(partido)
    if q:
        sql += " AND (lower(d.nombre_completo) LIKE lower(%s) OR lower(COALESCE(d.alias,'')) LIKE lower(%s) OR lower(COALESCE(d.cargo_actual,'')) LIKE lower(%s))"
        like = f"%{q}%"
        params += [like, like, like]
    sql += " ORDER BY d.updated_at DESC LIMIT %s"
    params.append(limit)

    with _conn() as cn, cn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [
            DossierResumen(
                id=str(r[0]), slug=r[1], nombre_completo=r[2], alias=r[3],
                cargo_actual=r[4], partido=r[5], foto_url=r[6], bio_corta=r[7],
                tags=r[8] or [], n_apartados=int(r[10]), updated_at=_iso(r[9]) or "",
            )
            for r in rows
        ]


# ────────────────────────────────────────────────────────────────────────────
# GET · detalle por slug
# ────────────────────────────────────────────────────────────────────────────

@router.get("/{slug}", response_model=DossierCompleto)
def get_dossier(slug: str):
    with _conn() as cn, cn.cursor() as cur:
        cur.execute("""
            SELECT id, slug, nombre_completo, alias, cargo_actual, partido,
                   foto_url, bio_corta, tags, fuente_principal,
                   created_at, updated_at
              FROM dosieres
             WHERE slug = %s
        """, (slug,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, f"Dossier '{slug}' no encontrado")
        dossier_id = row[0]

        cur.execute("""
            SELECT id, tipo, titulo, resumen, orden
              FROM dossier_apartados
             WHERE dossier_id = %s
          ORDER BY orden, tipo
        """, (dossier_id,))
        apartados_rows = cur.fetchall()

        apartados_out: list[ApartadoOut] = []
        for a_row in apartados_rows:
            apartado_id, tipo, titulo, resumen, orden = a_row
            cur.execute("""
                SELECT id, tipo, titulo, contenido, fecha, fuente_url,
                       fuente_titulo, tags, orden
                  FROM dossier_items
                 WHERE apartado_id = %s
              ORDER BY orden, created_at
            """, (apartado_id,))
            items_rows = cur.fetchall()
            items_out = [
                ItemOut(
                    id=str(it[0]), apartado_id=str(apartado_id),
                    tipo=it[1], titulo=it[2], contenido=it[3],
                    fecha=it[4], fuente_url=it[5], fuente_titulo=it[6],
                    tags=it[7] or [], orden=it[8],
                )
                for it in items_rows
            ]
            apartados_out.append(ApartadoOut(
                id=str(apartado_id), tipo=tipo, titulo=titulo,
                resumen=resumen, orden=orden, items=items_out,
            ))

        return DossierCompleto(
            id=str(row[0]), slug=row[1], nombre_completo=row[2], alias=row[3],
            cargo_actual=row[4], partido=row[5], foto_url=row[6], bio_corta=row[7],
            tags=row[8] or [], fuente_principal=row[9],
            apartados=apartados_out,
            created_at=_iso(row[10]) or "", updated_at=_iso(row[11]) or "",
        )


# ────────────────────────────────────────────────────────────────────────────
# POST · crear dossier completo (con apartados e items en una llamada)
# ────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=DossierCompleto, status_code=201, dependencies=[Depends(_WRITE)])
def create_dossier(body: DossierIn):
    import json
    slug = body.slug or _slug_from(body.nombre_completo)
    if not slug:
        raise HTTPException(400, "slug vacío tras normalizar nombre")

    with _conn() as cn, cn.cursor() as cur:
        cur.execute("SELECT 1 FROM dosieres WHERE slug = %s", (slug,))
        if cur.fetchone():
            raise HTTPException(409, f"Ya existe un dossier con slug '{slug}'")

        cur.execute("""
            INSERT INTO dosieres (slug, nombre_completo, alias, cargo_actual,
                                  partido, foto_url, bio_corta, tags, fuente_principal)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
            RETURNING id
        """, (
            slug, body.nombre_completo, body.alias, body.cargo_actual,
            body.partido, body.foto_url, body.bio_corta,
            json.dumps(body.tags), body.fuente_principal,
        ))
        dossier_id = cur.fetchone()[0]

        for ap in body.apartados:
            cur.execute("""
                INSERT INTO dossier_apartados (dossier_id, tipo, titulo, resumen, orden)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (dossier_id, ap.tipo, ap.titulo, ap.resumen, ap.orden))
            apartado_id = cur.fetchone()[0]

            for it in ap.items:
                cur.execute("""
                    INSERT INTO dossier_items (apartado_id, tipo, titulo, contenido,
                                                fecha, fuente_url, fuente_titulo, tags, orden)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                """, (
                    apartado_id, it.tipo, it.titulo, it.contenido,
                    it.fecha, it.fuente_url, it.fuente_titulo,
                    json.dumps(it.tags), it.orden,
                ))

        cn.commit()

    return get_dossier(slug)


# ────────────────────────────────────────────────────────────────────────────
# PUT · actualizar campos del dossier (sin tocar apartados)
# ────────────────────────────────────────────────────────────────────────────

@router.put("/{slug}", response_model=DossierCompleto, dependencies=[Depends(_WRITE)])
def update_dossier(slug: str, body: DossierIn):
    import json
    with _conn() as cn, cn.cursor() as cur:
        cur.execute("SELECT id FROM dosieres WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, f"Dossier '{slug}' no encontrado")

        cur.execute("""
            UPDATE dosieres
               SET nombre_completo = %s, alias = %s, cargo_actual = %s,
                   partido = %s, foto_url = %s, bio_corta = %s,
                   tags = %s::jsonb, fuente_principal = %s,
                   updated_at = NOW()
             WHERE slug = %s
        """, (
            body.nombre_completo, body.alias, body.cargo_actual,
            body.partido, body.foto_url, body.bio_corta,
            json.dumps(body.tags), body.fuente_principal,
            slug,
        ))
        cn.commit()

    return get_dossier(slug)


# ────────────────────────────────────────────────────────────────────────────
# DELETE · cascada
# ────────────────────────────────────────────────────────────────────────────

@router.delete("/{slug}", status_code=204, dependencies=[Depends(_WRITE)])
def delete_dossier(slug: str):
    with _conn() as cn, cn.cursor() as cur:
        cur.execute("DELETE FROM dosieres WHERE slug = %s", (slug,))
        if cur.rowcount == 0:
            raise HTTPException(404, f"Dossier '{slug}' no encontrado")
        cn.commit()
    return None


# ────────────────────────────────────────────────────────────────────────────
# POST · upsert un apartado (junto con sus items)
# ────────────────────────────────────────────────────────────────────────────

@router.post("/{slug}/apartados", response_model=ApartadoOut, dependencies=[Depends(_WRITE)])
def upsert_apartado(slug: str, body: ApartadoIn):
    import json
    with _conn() as cn, cn.cursor() as cur:
        cur.execute("SELECT id FROM dosieres WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, f"Dossier '{slug}' no encontrado")
        dossier_id = row[0]

        # Upsert apartado (1 por tipo)
        cur.execute("""
            INSERT INTO dossier_apartados (dossier_id, tipo, titulo, resumen, orden)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (dossier_id, tipo)
            DO UPDATE SET titulo = EXCLUDED.titulo,
                          resumen = EXCLUDED.resumen,
                          orden = EXCLUDED.orden,
                          updated_at = NOW()
            RETURNING id
        """, (dossier_id, body.tipo, body.titulo, body.resumen, body.orden))
        apartado_id = cur.fetchone()[0]

        # Borrar items existentes y reinsertar (lo más simple)
        cur.execute("DELETE FROM dossier_items WHERE apartado_id = %s", (apartado_id,))
        items_out: list[ItemOut] = []
        for it in body.items:
            cur.execute("""
                INSERT INTO dossier_items (apartado_id, tipo, titulo, contenido,
                                            fecha, fuente_url, fuente_titulo, tags, orden)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                RETURNING id
            """, (
                apartado_id, it.tipo, it.titulo, it.contenido,
                it.fecha, it.fuente_url, it.fuente_titulo,
                json.dumps(it.tags), it.orden,
            ))
            item_id = cur.fetchone()[0]
            items_out.append(ItemOut(
                id=str(item_id), apartado_id=str(apartado_id),
                tipo=it.tipo, titulo=it.titulo, contenido=it.contenido,
                fecha=it.fecha, fuente_url=it.fuente_url,
                fuente_titulo=it.fuente_titulo, tags=it.tags, orden=it.orden,
            ))
        cn.commit()

    return ApartadoOut(
        id=str(apartado_id), tipo=body.tipo, titulo=body.titulo,
        resumen=body.resumen, orden=body.orden, items=items_out,
    )


# ────────────────────────────────────────────────────────────────────────────
# DELETE · apartado
# ────────────────────────────────────────────────────────────────────────────

@router.delete("/{slug}/apartados/{tipo}", status_code=204, dependencies=[Depends(_WRITE)])
def delete_apartado(slug: str, tipo: TIPO_APARTADO):
    with _conn() as cn, cn.cursor() as cur:
        cur.execute("""
            DELETE FROM dossier_apartados
             WHERE dossier_id = (SELECT id FROM dosieres WHERE slug = %s)
               AND tipo = %s
        """, (slug, tipo))
        if cur.rowcount == 0:
            raise HTTPException(404, "Apartado no encontrado")
        cn.commit()
    return None


# ────────────────────────────────────────────────────────────────────────────
# POST · añadir UN item a un apartado
# ────────────────────────────────────────────────────────────────────────────

@router.post("/{slug}/apartados/{tipo}/items", response_model=ItemOut, status_code=201, dependencies=[Depends(_WRITE)])
def add_item(slug: str, tipo: TIPO_APARTADO, body: ItemIn):
    import json
    with _conn() as cn, cn.cursor() as cur:
        cur.execute("""
            SELECT a.id
              FROM dossier_apartados a
              JOIN dosieres d ON d.id = a.dossier_id
             WHERE d.slug = %s AND a.tipo = %s
        """, (slug, tipo))
        row = cur.fetchone()
        if not row:
            # Crear apartado vacío si no existe
            cur.execute("SELECT id FROM dosieres WHERE slug = %s", (slug,))
            d_row = cur.fetchone()
            if not d_row:
                raise HTTPException(404, f"Dossier '{slug}' no encontrado")
            cur.execute("""
                INSERT INTO dossier_apartados (dossier_id, tipo)
                VALUES (%s, %s)
                RETURNING id
            """, (d_row[0], tipo))
            row = cur.fetchone()
        apartado_id = row[0]

        cur.execute("""
            INSERT INTO dossier_items (apartado_id, tipo, titulo, contenido,
                                        fecha, fuente_url, fuente_titulo, tags, orden)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
            RETURNING id
        """, (
            apartado_id, body.tipo, body.titulo, body.contenido,
            body.fecha, body.fuente_url, body.fuente_titulo,
            json.dumps(body.tags), body.orden,
        ))
        item_id = cur.fetchone()[0]
        cn.commit()

    return ItemOut(
        id=str(item_id), apartado_id=str(apartado_id),
        tipo=body.tipo, titulo=body.titulo, contenido=body.contenido,
        fecha=body.fecha, fuente_url=body.fuente_url,
        fuente_titulo=body.fuente_titulo, tags=body.tags, orden=body.orden,
    )


@router.delete("/items/{item_id}", status_code=204, dependencies=[Depends(_WRITE)])
def delete_item(item_id: str):
    with _conn() as cn, cn.cursor() as cur:
        cur.execute("DELETE FROM dossier_items WHERE id = %s::uuid", (item_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Item no encontrado")
        cn.commit()
    return None
