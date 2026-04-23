"""Servicios de opposition research (bloque 2)."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from db.session import get_raw_conn
from etl.logger import get_logger

logger = get_logger(__name__)


@dataclass
class Contradiccion:
    decl_a_id: int
    decl_b_id: int
    persona: str
    partido: str
    tema: str
    tipo: str
    confianza: float
    descripcion: str
    gravedad: str
    dias_entre: int
    texto_a: str
    texto_b: str
    fecha_a: Any
    fecha_b: Any


@dataclass
class PosicionPartidoTema:
    partido: str
    tema: str
    posicion_x: float
    posicion_y: float
    intensidad: float
    n_decl: int


@dataclass
class ComparacionPropuesta:
    tema: str
    partido_a: str
    partido_b: str
    posicion_a: str
    posicion_b: str
    distancia_x: float
    afinidad: str
    citas_a: list[str] = field(default_factory=list)
    citas_b: list[str] = field(default_factory=list)


_PARES_OPUESTOS: list[tuple[list[str], list[str]]] = [
    (["subiremos", "aumentaremos", "incrementaremos"], ["bajaremos", "reduciremos", "eliminaremos"]),
    (["apoyamos", "defendemos", "a favor"], ["rechazamos", "en contra", "nos oponemos"]),
    (["es necesario", "hay que"], ["no es necesario", "innecesario"]),
    (["negociaremos", "dialogaremos"], ["no negociaremos", "no pactaremos"]),
]

_POS_REF: dict[str, tuple[float, float]] = {
    "PP": (0.55, 0.3),
    "PSOE": (-0.35, 0.1),
    "VOX": (0.85, 0.7),
    "SUMAR": (-0.75, -0.4),
    "PODEMOS": (-0.80, -0.5),
    "JUNTS": (0.20, -0.1),
    "ERC": (-0.45, -0.2),
    "PNV": (0.10, -0.2),
    "EH Bildu": (-0.70, -0.3),
    "CS": (0.40, 0.0),
}


def _table_exists(table_name: str) -> bool:
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass(%s)", (table_name,))
            row = cur.fetchone()
            return bool(row and row[0])
    finally:
        conn.close()


def _table_columns(table_name: str) -> set[str]:
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                """,
                (table_name,),
            )
            return {str(r[0]) for r in cur.fetchall() if r and r[0]}
    finally:
        conn.close()


def cargar_declaraciones(
    partido: str | None = None,
    persona: str | None = None,
    tema: str | None = None,
    cliente_id: int | None = None,
    limit: int = 500,
) -> pd.DataFrame:
    """Carga declaraciones con filtros opcionales."""
    if not _table_exists("declaraciones_politicas"):
        return pd.DataFrame()

    cols = _table_columns("declaraciones_politicas")
    tema_col = "tema_principal" if "tema_principal" in cols else ("tema" if "tema" in cols else None)
    subtema_col = "subtema" if "subtema" in cols else "NULL"
    alcance_col = "alcance_est" if "alcance_est" in cols else "NULL"
    tema_select = f"{tema_col} AS tema" if tema_col else "NULL AS tema"

    clauses: list[str] = []
    params: list[Any] = []
    if partido:
        clauses.append("partido ILIKE %s")
        params.append(f"%{partido}%")
    if persona:
        clauses.append("persona ILIKE %s")
        params.append(f"%{persona}%")
    if tema and tema_col:
        clauses.append(f"{tema_col} = %s")
        params.append(tema)
    if cliente_id is not None and "cliente_id" in cols:
        clauses.append("(cliente_id = %s OR cliente_id IS NULL)")
        params.append(int(cliente_id))

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT id, persona, partido, fecha, medio, contexto, texto,
               {tema_select}, {subtema_col} AS subtema, url, {alcance_col} AS alcance_est
        FROM declaraciones_politicas
        {where}
        ORDER BY fecha DESC
        LIMIT %s
    """
    params.append(int(limit))

    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            cols_out = [d[0] for d in cur.description]
        return pd.DataFrame(rows, columns=cols_out)
    finally:
        conn.close()


def cargar_contradicciones(
    persona: str | None = None,
    tema: str | None = None,
    score_minimo: float = 0.6,
    cliente_id: int | None = None,
    limit: int = 100,
) -> pd.DataFrame:
    """Carga contradicciones con join a declaraciones."""
    if not _table_exists("contradicciones") or not _table_exists("declaraciones_politicas"):
        return pd.DataFrame()

    cols = _table_columns("contradicciones")
    score_col = "score_nli" if "score_nli" in cols else ("confianza" if "confianza" in cols else "NULL")
    valida_col = "verificada" if "verificada" in cols else ("validada" if "validada" in cols else "false")
    fecha_col = "creado_en" if "creado_en" in cols else ("fecha_deteccion" if "fecha_deteccion" in cols else "NOW()")
    a_col = "declaracion_a" if "declaracion_a" in cols else "decl_a_id"
    b_col = "declaracion_b" if "declaracion_b" in cols else "decl_b_id"
    tema_col = "tema"

    clauses: list[str] = [f"COALESCE(c.{score_col}, 0) >= %s"]
    params: list[Any] = [float(score_minimo)]
    if persona:
        clauses.append("c.persona ILIKE %s")
        params.append(f"%{persona}%")
    if tema:
        clauses.append(f"c.{tema_col} = %s")
        params.append(tema)
    if cliente_id is not None and "cliente_id" in cols:
        clauses.append("(c.cliente_id = %s OR c.cliente_id IS NULL)")
        params.append(int(cliente_id))

    where = "WHERE " + " AND ".join(clauses)
    sql = f"""
        SELECT
            c.id,
            c.persona,
            c.{tema_col} AS tema,
            c.dias_entre AS distancia_dias,
            c.{score_col} AS score_nli,
            c.tipo,
            c.descripcion AS explicacion,
            c.{valida_col} AS verificada,
            c.{fecha_col} AS created_at,
            a.texto AS texto_a,
            a.fecha AS fecha_a,
            a.medio AS medio_a,
            a.contexto AS contexto_a,
            b.texto AS texto_b,
            b.fecha AS fecha_b,
            b.medio AS medio_b,
            b.contexto AS contexto_b
        FROM contradicciones c
        LEFT JOIN declaraciones_politicas a ON a.id = c.{a_col}
        LEFT JOIN declaraciones_politicas b ON b.id = c.{b_col}
        {where}
        ORDER BY c.{score_col} DESC NULLS LAST, c.{fecha_col} DESC
        LIMIT %s
    """
    params.append(int(limit))

    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            cols_out = [d[0] for d in cur.description]
        return pd.DataFrame(rows, columns=cols_out)
    finally:
        conn.close()


def _similitud_tema(a: str, b: str) -> bool:
    if not a or not b:
        return True
    return a.strip().lower() == b.strip().lower()


def _detectar_contradiccion_lexica(texto_a: str, texto_b: str) -> tuple[bool, float, str]:
    ta = (texto_a or "").lower()
    tb = (texto_b or "").lower()
    for pos, neg in _PARES_OPUESTOS:
        a_pos = any(k in ta for k in pos)
        a_neg = any(k in ta for k in neg)
        b_pos = any(k in tb for k in pos)
        b_neg = any(k in tb for k in neg)
        if (a_pos and b_neg) or (a_neg and b_pos):
            return True, 0.75, "contradiccion_directa"
    return False, 0.0, "sin_contradiccion"


def detectar_contradicciones_df(
    df_decl: pd.DataFrame,
    ventana_max_dias: int = 1460,
    confianza_min: float = 0.5,
) -> list[Contradiccion]:
    if df_decl.empty:
        return []
    req = {"id", "persona", "partido", "tema", "texto", "fecha"}
    if not req.issubset(df_decl.columns):
        return []

    out: list[Contradiccion] = []
    for persona, grp in df_decl.groupby("persona"):
        items = grp.sort_values("fecha").to_dict("records")
        for i, da in enumerate(items):
            for db in items[i + 1 :]:
                if not _similitud_tema(str(da.get("tema", "")), str(db.get("tema", ""))):
                    continue
                try:
                    dias = abs((pd.Timestamp(db.get("fecha")) - pd.Timestamp(da.get("fecha"))).days)
                except Exception:
                    dias = 0
                if dias > ventana_max_dias:
                    continue
                is_contra, conf, tipo = _detectar_contradiccion_lexica(
                    str(da.get("texto", "")),
                    str(db.get("texto", "")),
                )
                if not is_contra or conf < confianza_min:
                    continue

                gravedad = "alta" if conf >= 0.8 else ("media" if conf >= 0.65 else "baja")
                out.append(
                    Contradiccion(
                        decl_a_id=int(da.get("id", 0) or 0),
                        decl_b_id=int(db.get("id", 0) or 0),
                        persona=str(persona),
                        partido=str(da.get("partido", "")),
                        tema=str(da.get("tema", "")),
                        tipo=tipo,
                        confianza=conf,
                        descripcion=(
                            f"{persona} defendio '{str(da.get('texto', ''))[:120]}...' y luego "
                            f"'{str(db.get('texto', ''))[:120]}...'"
                        ),
                        gravedad=gravedad,
                        dias_entre=dias,
                        texto_a=str(da.get("texto", "")),
                        texto_b=str(db.get("texto", "")),
                        fecha_a=da.get("fecha"),
                        fecha_b=db.get("fecha"),
                    )
                )
    return sorted(out, key=lambda x: x.confianza, reverse=True)


def _nli_score(texto_a: str, texto_b: str) -> float | None:
    """NLI opcional; devuelve None si no hay dependencia o si falla."""
    if os.getenv("ELECTSIM_USE_NLI", "0") != "1":
        return None
    try:
        from sentence_transformers import CrossEncoder  # type: ignore
    except Exception:
        return None
    try:
        model = CrossEncoder("cross-encoder/nli-deberta-v3-small", max_length=512)
        scores = model.predict([[texto_a, texto_b]], apply_softmax=True)
        return float(scores[0][0])  # contradiccion
    except Exception:
        return None


def detectar_y_guardar_contradicciones(
    partido: str,
    tema: str | None = None,
    cliente_id: int | None = None,
    min_distancia_dias: int = 30,
    score_minimo: float = 0.75,
) -> int:
    """
    Detecta contradicciones y las persiste en `contradicciones`.
    Compatible con el esquema actual (decl_a_id/decl_b_id + confianza).
    """
    if not _table_exists("contradicciones"):
        return 0
    df = cargar_declaraciones(partido=partido, tema=tema, cliente_id=cliente_id, limit=1500)
    if df.empty:
        return 0

    detected = detectar_contradicciones_df(df, ventana_max_dias=3650, confianza_min=0.5)
    if not detected:
        return 0

    conn = get_raw_conn()
    inserted = 0
    try:
        with conn.cursor() as cur:
            for c in detected:
                if c.dias_entre < int(min_distancia_dias):
                    continue

                score_nli = _nli_score(c.texto_a, c.texto_b)
                final_score = float(score_nli) if score_nli is not None else float(c.confianza)
                if final_score < float(score_minimo):
                    continue

                cur.execute(
                    """
                    INSERT INTO contradicciones
                        (decl_a_id, decl_b_id, persona, partido, tema, tipo, confianza,
                         descripcion, gravedad, dias_entre, cliente_id)
                    SELECT %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM contradicciones
                        WHERE decl_a_id = %s AND decl_b_id = %s
                    )
                    """,
                    (
                        c.decl_a_id,
                        c.decl_b_id,
                        c.persona,
                        c.partido,
                        c.tema,
                        c.tipo,
                        round(final_score, 4),
                        c.descripcion,
                        c.gravedad,
                        c.dias_entre,
                        cliente_id,
                        c.decl_a_id,
                        c.decl_b_id,
                    ),
                )
                inserted += int(cur.rowcount or 0)
        conn.commit()
        return inserted
    except Exception as exc:
        conn.rollback()
        logger.error("detectar_y_guardar_contradicciones: %s", exc, exc_info=True)
        return 0
    finally:
        conn.close()


def calcular_posicionamiento(
    df_decl: pd.DataFrame,
    temas: list[str] | None = None,
    partidos: list[str] | None = None,
) -> list[PosicionPartidoTema]:
    if df_decl.empty:
        return []
    dff = df_decl.copy()
    if temas:
        dff = dff[dff["tema"].isin(temas)]
    if partidos:
        dff = dff[dff["partido"].isin(partidos)]

    out: list[PosicionPartidoTema] = []
    for (partido, tema), g in dff.groupby(["partido", "tema"]):
        n = int(len(g))
        if "posicion_x" in g.columns and g["posicion_x"].notna().any():
            px = float(g["posicion_x"].mean())
            py = float(g["posicion_y"].mean()) if "posicion_y" in g.columns else 0.0
        else:
            px, py = _POS_REF.get(str(partido), (0.0, 0.0))
        out.append(
            PosicionPartidoTema(
                partido=str(partido),
                tema=str(tema),
                posicion_x=round(px, 3),
                posicion_y=round(py, 3),
                intensidad=min(n / 20.0, 1.0),
                n_decl=n,
            )
        )
    return sorted(out, key=lambda x: x.n_decl, reverse=True)


def comparar_propuestas(
    df_decl: pd.DataFrame,
    partido_a: str,
    partido_b: str,
    temas: list[str] | None = None,
) -> list[ComparacionPropuesta]:
    if df_decl.empty:
        return []

    temas_iter = temas or df_decl.get("tema", pd.Series(dtype=str)).dropna().unique().tolist()
    pos = calcular_posicionamiento(df_decl, temas=temas_iter, partidos=[partido_a, partido_b])
    pos_map = {(p.partido, p.tema): p for p in pos}
    out: list[ComparacionPropuesta] = []

    for tema in temas_iter:
        pa = pos_map.get((partido_a, tema))
        pb = pos_map.get((partido_b, tema))
        if not pa or not pb:
            continue
        dist = abs(pa.posicion_x - pb.posicion_x)
        afinidad = "convergente" if dist < 0.3 else ("divergente" if dist < 0.6 else "opuestos")
        citas_a = (
            df_decl[(df_decl["partido"] == partido_a) & (df_decl["tema"] == tema)]["texto"]
            .dropna()
            .astype(str)
            .str[:200]
            .head(2)
            .tolist()
        )
        citas_b = (
            df_decl[(df_decl["partido"] == partido_b) & (df_decl["tema"] == tema)]["texto"]
            .dropna()
            .astype(str)
            .str[:200]
            .head(2)
            .tolist()
        )
        out.append(
            ComparacionPropuesta(
                tema=str(tema),
                partido_a=partido_a,
                partido_b=partido_b,
                posicion_a=f"Posicion eje x: {pa.posicion_x:+.2f} ({pa.n_decl} declaraciones)",
                posicion_b=f"Posicion eje x: {pb.posicion_x:+.2f} ({pb.n_decl} declaraciones)",
                distancia_x=round(dist, 3),
                afinidad=afinidad,
                citas_a=citas_a,
                citas_b=citas_b,
            )
        )
    return sorted(out, key=lambda x: x.distancia_x, reverse=True)


def cargar_posicionamiento(
    partidos: list[str],
    tema: str | None = None,
    cliente_id: int | None = None,
) -> pd.DataFrame:
    """
    Lee posicionamiento de `posicionamiento_rival` si existe.
    Fallback: calcula en caliente desde declaraciones.
    """
    if _table_exists("posicionamiento_rival"):
        conn = get_raw_conn()
        try:
            clauses = ["partido = ANY(%s)"]
            params: list[Any] = [partidos]
            if tema:
                clauses.append("tema = %s")
                params.append(tema)
            if cliente_id is not None:
                clauses.append("(cliente_id = %s OR cliente_id IS NULL)")
                params.append(int(cliente_id))
            where = "WHERE " + " AND ".join(clauses)
            sql = f"""
                SELECT partido, tema, fecha_inicio, fecha_fin, posicion_texto,
                       eje_x, eje_y, confianza, n_declaraciones
                FROM posicionamiento_rival
                {where}
                ORDER BY partido, tema, fecha_fin DESC
            """
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
            return pd.DataFrame(rows, columns=cols)
        finally:
            conn.close()

    df_decl = cargar_declaraciones(limit=5000, cliente_id=cliente_id)
    if df_decl.empty:
        return pd.DataFrame()
    temas = [tema] if tema else None
    pos = calcular_posicionamiento(df_decl, temas=temas, partidos=partidos)
    rows = [
        {
            "partido": p.partido,
            "tema": p.tema,
            "eje_x": p.posicion_x,
            "eje_y": p.posicion_y,
            "confianza": p.intensidad,
            "n_declaraciones": p.n_decl,
            "posicion_texto": "",
            "fecha_inicio": None,
            "fecha_fin": None,
        }
        for p in pos
    ]
    return pd.DataFrame(rows)


def _safe_llm(prompt: str) -> str:
    """
    LLM opcional (Anthropic). Fallback deterministic si no hay credenciales.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return (
            "Guion de debate (modo fallback):\n"
            "- Apertura: foco en propuestas ejecutables.\n"
            "- Ataque: contrastar cambios de posicion del rival.\n"
            "- Cierre: mensaje simple + llamada a credibilidad.\n"
        )
    try:
        import anthropic  # type: ignore

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-opus-4-1"),
            max_tokens=1800,
            messages=[{"role": "user", "content": prompt}],
        )
        blocks = getattr(msg, "content", []) or []
        if not blocks:
            return ""
        return str(getattr(blocks[0], "text", "") or "")
    except Exception as exc:
        logger.warning("LLM no disponible: %s", exc)
        return "No se pudo generar salida LLM en este entorno."


def _build_prompt(
    tipo_output: str,
    partido_propio: str,
    partido_rival: str,
    tema: str,
    formato: str,
    contradicciones: pd.DataFrame,
    declaraciones: pd.DataFrame,
    contexto_extra: dict[str, Any] | None = None,
) -> str:
    base = (
        f"Eres asesor politico senior.\n"
        f"Partido propio: {partido_propio}\n"
        f"Partido rival: {partido_rival}\n"
        f"Tema: {tema}\n"
        f"Formato: {formato}\n\n"
    )
    if not contradicciones.empty:
        base += "Contradicciones detectadas del rival:\n"
        for _, r in contradicciones.head(6).iterrows():
            base += f"- {r.get('persona','?')}: {str(r.get('explicacion',''))[:220]}\n"
        base += "\n"
    if not declaraciones.empty:
        base += "Declaraciones recientes del rival:\n"
        for _, r in declaraciones.head(8).iterrows():
            base += f"- {r.get('persona','?')} ({r.get('fecha','?')}): {str(r.get('texto',''))[:220]}\n"
        base += "\n"
    if contexto_extra:
        base += f"Contexto extra (JSON): {json.dumps(contexto_extra, ensure_ascii=False, default=str)}\n\n"

    if tipo_output == "guion":
        return base + (
            "Genera guion de debate: apertura, 6 bullets, 4 ataques al rival con evidencia, "
            "4 respuestas a contraataques y cierre."
        )
    if tipo_output == "argumentario":
        return base + (
            "Genera argumentario interno: posicion, mensajes clave, objeciones previstas, "
            "respuesta corta y respuesta larga."
        )
    if tipo_output == "nota_prensa":
        return base + "Redacta nota de prensa: titular, entradilla, 3 parrafos, cita portavoz y cierre."
    if tipo_output == "qa":
        return base + "Genera 10 preguntas dificiles y respuestas de 2-3 frases."
    return base + "Genera analisis estrategico."


def _guardar_simulacion(
    partido_propio: str,
    partido_rival: str,
    tema: str,
    formato: str,
    prompt_contexto: dict[str, Any],
    resultado_llm: str,
    tipo_output: str,
    cliente_id: int | None = None,
    tokens_usados: int | None = None,
) -> None:
    if not _table_exists("simulaciones_debate"):
        return
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO simulaciones_debate
                    (cliente_id, partido_propio, partido_rival, tema, formato,
                     prompt_contexto, resultado_llm, tipo_output, tokens_usados)
                VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s)
                """,
                (
                    cliente_id,
                    partido_propio,
                    partido_rival,
                    tema,
                    formato,
                    json.dumps(prompt_contexto, ensure_ascii=False, default=str),
                    resultado_llm,
                    tipo_output,
                    tokens_usados,
                ),
            )
        conn.commit()
    except Exception as exc:
        conn.rollback()
        logger.warning("No se pudo guardar simulacion_debate: %s", exc)
    finally:
        conn.close()


def simular_debate(
    partido_propio: str,
    partido_rival: str,
    tema: str,
    formato: str = "debate_televisivo",
    tipo_output: str = "guion",
    contexto_extra: dict[str, Any] | None = None,
    cliente_id: int | None = None,
) -> str:
    contradicciones = cargar_contradicciones(tema=tema, cliente_id=cliente_id, limit=10)
    declaraciones = cargar_declaraciones(partido=partido_rival, tema=tema, cliente_id=cliente_id, limit=20)
    prompt = _build_prompt(
        tipo_output=tipo_output,
        partido_propio=partido_propio,
        partido_rival=partido_rival,
        tema=tema,
        formato=formato,
        contradicciones=contradicciones,
        declaraciones=declaraciones,
        contexto_extra=contexto_extra,
    )
    result = _safe_llm(prompt)
    _guardar_simulacion(
        partido_propio=partido_propio,
        partido_rival=partido_rival,
        tema=tema,
        formato=formato,
        prompt_contexto={
            "tema": tema,
            "partido_propio": partido_propio,
            "partido_rival": partido_rival,
            "n_contradicciones": int(len(contradicciones.index)),
            "n_declaraciones": int(len(declaraciones.index)),
            "contexto_extra": contexto_extra or {},
        },
        resultado_llm=result,
        tipo_output=tipo_output,
        cliente_id=cliente_id,
        tokens_usados=None,
    )
    return result

