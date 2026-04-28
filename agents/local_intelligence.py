from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

import pandas as pd
from dotenv import load_dotenv

from agents.llm import get_llm_client


_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")
DEFAULT_KNOWLEDGE_DIR = _ROOT / "data" / "processed" / "ai_knowledge"

SUPPORTED_EXTENSIONS = {".csv", ".json", ".jsonl", ".ndjson", ".parquet", ".txt", ".md", ".html", ".htm"}

TEXT_COLUMNS = (
    "texto",
    "text",
    "body_text",
    "body",
    "content",
    "contenido",
    "article",
    "descripcion",
    "description",
    "summary",
    "resumen",
)
TITLE_COLUMNS = ("titular", "title", "titulo", "headline", "asunto", "name", "nombre")
URL_COLUMNS = ("url", "link", "href", "url_canonical", "source_url")
DATE_COLUMNS = (
    "fecha_publicacion",
    "published_at",
    "publication_date",
    "date",
    "fecha",
    "created_at",
    "timestamp",
)
SOURCE_COLUMNS = ("fuente", "source", "source_id", "medio", "publisher", "platform", "plataforma")


DOMAIN_KEYWORDS: dict[str, tuple[str, ...]] = {
    "electoral": (
        "elecciones",
        "encuesta",
        "sondeo",
        "voto",
        "votantes",
        "escaños",
        "participacion",
        "abstencion",
        "censo",
        "mayoria absoluta",
        "coalicion",
        "circunscripcion",
        "d'hondt",
    ),
    "politica": (
        "gobierno",
        "oposicion",
        "partido",
        "ministro",
        "presidente",
        "congreso",
        "senado",
        "parlamento",
        "ley",
        "decreto",
        "coalicion",
        "pacto",
        "investidura",
        "legislatura",
    ),
    "economia": (
        "pib",
        "ipc",
        "inflacion",
        "paro",
        "empleo",
        "euribor",
        "deuda",
        "deficit",
        "renta",
        "salarios",
        "presupuesto",
        "mercado",
        "energia",
        "vivienda",
        "exportaciones",
        "importaciones",
    ),
    "social": (
        "sanidad",
        "educacion",
        "vivienda",
        "igualdad",
        "juventud",
        "pensionistas",
        "migracion",
        "inmigracion",
        "pobreza",
        "desigualdad",
        "barrios",
        "familias",
        "colectivo",
    ),
    "institucional": (
        "boe",
        "tribunal",
        "fiscalia",
        "consejo",
        "comision",
        "directiva",
        "reglamento",
        "contratacion",
        "licitacion",
        "administracion",
        "ayuntamiento",
        "comunidad autonoma",
    ),
    "medios": (
        "prensa",
        "periodico",
        "television",
        "radio",
        "redes sociales",
        "twitter",
        "x.com",
        "facebook",
        "instagram",
        "tiktok",
        "viral",
        "narrativa",
        "desinformacion",
    ),
}

TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "vivienda": ("vivienda", "alquiler", "hipoteca", "desahucio", "precio de la vivienda"),
    "empleo": ("paro", "empleo", "desempleo", "contratacion", "salarios", "temporalidad"),
    "inflacion": ("ipc", "inflacion", "precios", "cesta de la compra", "alimentos"),
    "energia": ("energia", "luz", "gas", "electrico", "renovable", "nuclear", "petroleo"),
    "fiscalidad": ("impuesto", "fiscal", "tributario", "irpf", "iva", "sociedades"),
    "presupuestos": ("presupuesto", "pge", "gasto publico", "deficit", "deuda"),
    "sanidad": ("sanidad", "hospital", "atencion primaria", "listas de espera"),
    "educacion": ("educacion", "universidad", "escuela", "becas", "formacion profesional"),
    "territorial": ("cataluña", "pais vasco", "autonomia", "financiacion autonomica", "independencia"),
    "corrupcion": ("corrupcion", "comision", "mordida", "prevaricacion", "malversacion"),
    "seguridad": ("seguridad", "delincuencia", "policia", "terrorismo", "crimen"),
    "migracion": ("migracion", "inmigracion", "frontera", "asilo", "refugiados"),
    "campaña": ("campaña", "mitin", "candidato", "debate", "mensaje", "eslogan"),
    "legislativo": ("congreso", "senado", "enmienda", "proposicion", "votacion", "ley"),
}

PARTY_ALIASES: dict[str, tuple[str, ...]] = {
    "PSOE": ("psoe", "partido socialista", "socialistas"),
    "PP": ("pp", "partido popular", "populares"),
    "VOX": ("vox",),
    "SUMAR": ("sumar",),
    "PODEMOS": ("podemos",),
    "ERC": ("erc", "esquerra"),
    "JUNTS": ("junts", "jxcat", "juntos por cataluña"),
    "PNV": ("pnv", "eaj-pnv"),
    "EH Bildu": ("eh bildu", "bildu"),
    "BNG": ("bng", "bloque nacionalista galego"),
    "CC": ("coalicion canaria", "cc"),
    "UPN": ("upn", "union del pueblo navarro"),
}

ORG_KEYWORDS = (
    "Gobierno",
    "Congreso",
    "Senado",
    "Moncloa",
    "Banco de España",
    "INE",
    "CIS",
    "BOE",
    "Comisión Europea",
    "Parlamento Europeo",
    "Consejo de Ministros",
)

GEO_TERMS = (
    "España",
    "Andalucía",
    "Aragón",
    "Asturias",
    "Baleares",
    "Canarias",
    "Cantabria",
    "Castilla-La Mancha",
    "Castilla y León",
    "Cataluña",
    "Comunitat Valenciana",
    "Extremadura",
    "Galicia",
    "Madrid",
    "Murcia",
    "Navarra",
    "País Vasco",
    "La Rioja",
    "Ceuta",
    "Melilla",
)

STOPWORDS = {
    "para",
    "como",
    "este",
    "esta",
    "estos",
    "estas",
    "desde",
    "hasta",
    "sobre",
    "entre",
    "porque",
    "pero",
    "tambien",
    "también",
    "donde",
    "cuando",
    "quien",
    "quienes",
    "ante",
    "tras",
    "segun",
    "según",
    "contra",
    "durante",
    "politica",
    "política",
    "economia",
    "economía",
    "social",
    "electoral",
    "datos",
    "analisis",
    "análisis",
}


@dataclass(slots=True)
class ScraperRecord:
    source: str
    text: str
    title: str = ""
    url: str = ""
    published_at: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ExtractedEntity:
    name: str
    type: str
    canonical: str | None = None
    confidence: float = 0.75
    mentions: int = 1


@dataclass(slots=True)
class ExtractedMetric:
    name: str
    value: float
    unit: str
    raw: str
    context: str


@dataclass(slots=True)
class ExtractedEvent:
    type: str
    label: str
    date: str | None
    confidence: float
    evidence: str


@dataclass(slots=True)
class IntelligenceDocument:
    id: str
    source: str
    title: str
    text: str
    url: str
    published_at: str | None
    domain: str
    topics: list[str]
    entities: list[ExtractedEntity]
    metrics: list[ExtractedMetric]
    events: list[ExtractedEvent]
    keywords: list[str]
    summary: str
    ingested_at: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class OntologyNode:
    id: str
    type: str
    label: str
    properties: dict[str, Any] = field(default_factory=dict)
    mentions: int = 1


@dataclass(slots=True)
class OntologyEdge:
    source: str
    target: str
    relation: str
    weight: float = 1.0
    evidence_ids: list[str] = field(default_factory=list)


@dataclass(slots=True)
class IngestResult:
    records_seen: int
    documents_added: int
    documents_skipped: int
    facts_added: int
    ontology_nodes: int
    ontology_edges: int
    domains: dict[str, int]
    topics: dict[str, int]
    store_path: str


@dataclass(slots=True)
class ChatResult:
    answer: str
    citations: list[dict[str, Any]]
    tool_results: list[dict[str, Any]]
    model: str
    used_llm: bool


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _strip_accents_light(value: str) -> str:
    table = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
    return value.translate(table)


def _norm(value: Any) -> str:
    return _strip_accents_light(str(value or "")).lower().strip()


def _slug(value: str) -> str:
    text = _norm(value)
    text = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return text or "unknown"


def _stable_id(*parts: Any) -> str:
    h = hashlib.sha256()
    for part in parts:
        h.update(str(part or "").encode("utf-8", errors="ignore"))
        h.update(b"\x1f")
    return h.hexdigest()[:24]


def _json_default(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return str(value)
    if not isinstance(value, (list, tuple, dict, set)):
        try:
            if pd.isna(value):
                return None
        except Exception:
            pass
    return str(value)


def _as_jsonable_dict(row: dict[str, Any]) -> dict[str, Any]:
    return {str(k): _json_default(v) for k, v in row.items()}


def _pick(row: dict[str, Any], candidates: Iterable[str]) -> Any:
    lowered = {str(k).lower(): k for k in row}
    for candidate in candidates:
        key = lowered.get(candidate.lower())
        if key is not None and row.get(key) not in (None, ""):
            return row.get(key)
    return None


def _clean_text(value: Any, max_chars: int = 12000) -> str:
    text = str(value or "")
    text = re.sub(r"<script.*?</script>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def _record_from_mapping(row: dict[str, Any], *, default_source: str) -> ScraperRecord | None:
    raw = _as_jsonable_dict(row)
    title = _clean_text(_pick(raw, TITLE_COLUMNS), max_chars=500)
    pieces = []
    for col in TEXT_COLUMNS:
        value = _pick(raw, (col,))
        cleaned = _clean_text(value)
        if cleaned and cleaned not in pieces:
            pieces.append(cleaned)
    if not pieces:
        fallback_values = [
            _clean_text(v)
            for v in raw.values()
            if isinstance(v, str) and len(str(v).strip()) > 40
        ]
        pieces.extend(fallback_values[:3])
    text = "\n".join(pieces).strip()
    if not text and title:
        text = title
    if not text:
        return None
    source = str(_pick(raw, SOURCE_COLUMNS) or default_source or "scraper")
    url = str(_pick(raw, URL_COLUMNS) or "")
    published = _pick(raw, DATE_COLUMNS)
    return ScraperRecord(
        source=source,
        title=title,
        text=text,
        url=url,
        published_at=str(published) if published not in (None, "") else None,
        raw=raw,
    )


def load_scraper_records(path: str | Path, *, recursive: bool = True, max_records: int | None = None) -> list[ScraperRecord]:
    """Carga salidas típicas de scrapers sin imponer un esquema único.

    Soporta CSV, JSON, JSONL/NDJSON, Parquet y textos/html simples. La normalización
    detecta columnas comunes como ``title``, ``titular``, ``texto``, ``body_text``,
    ``url`` y ``fecha_publicacion``.
    """
    root = Path(path).expanduser()
    if not root.is_absolute():
        root = (_ROOT / root).resolve()
    if not root.exists():
        raise FileNotFoundError(f"No existe ruta de ingesta: {root}")

    files: list[Path]
    if root.is_dir():
        pattern = "**/*" if recursive else "*"
        files = [p for p in root.glob(pattern) if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS]
    else:
        files = [root]

    records: list[ScraperRecord] = []
    for file_path in sorted(files):
        if max_records is not None and len(records) >= max_records:
            break
        remaining = None if max_records is None else max_records - len(records)
        records.extend(_load_file_records(file_path, limit=remaining))
    return records


def _load_file_records(file_path: Path, *, limit: int | None = None) -> list[ScraperRecord]:
    ext = file_path.suffix.lower()
    default_source = file_path.parent.name or file_path.stem
    out: list[ScraperRecord] = []

    if ext in {".txt", ".md", ".html", ".htm"}:
        text = _clean_text(file_path.read_text(encoding="utf-8", errors="ignore"))
        if text:
            out.append(ScraperRecord(source=default_source, title=file_path.stem, text=text, raw={"path": str(file_path)}))
        return out

    if ext in {".jsonl", ".ndjson"}:
        with file_path.open("r", encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                if limit is not None and len(out) >= limit:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(obj, dict):
                    record = _record_from_mapping(obj, default_source=default_source)
                    if record:
                        out.append(record)
        return out

    if ext == ".json":
        data = json.loads(file_path.read_text(encoding="utf-8", errors="ignore"))
        rows: list[Any]
        if isinstance(data, list):
            rows = data
        elif isinstance(data, dict):
            rows = _extract_json_rows(data)
        else:
            rows = []
        for obj in rows[:limit]:
            if isinstance(obj, dict):
                record = _record_from_mapping(obj, default_source=default_source)
                if record:
                    out.append(record)
        return out

    if ext == ".csv":
        with file_path.open("r", encoding="utf-8-sig", errors="ignore", newline="") as fh:
            sample = fh.read(4096)
            fh.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample) if sample.strip() else csv.excel
            except csv.Error:
                dialect = csv.excel
            reader = csv.DictReader(fh, dialect=dialect)
            for row in reader:
                if limit is not None and len(out) >= limit:
                    break
                record = _record_from_mapping(dict(row), default_source=default_source)
                if record:
                    out.append(record)
        return out

    if ext == ".parquet":
        df = pd.read_parquet(file_path)
        if limit is not None:
            df = df.head(limit)
        for row in df.to_dict(orient="records"):
            record = _record_from_mapping(row, default_source=default_source)
            if record:
                out.append(record)
        return out

    return out


def _extract_json_rows(data: dict[str, Any]) -> list[Any]:
    for key in ("items", "data", "results", "articles", "records", "rows", "noticias", "posts"):
        value = data.get(key)
        if isinstance(value, list):
            return value
    if any(k.lower() in set(TEXT_COLUMNS + TITLE_COLUMNS) for k in data):
        return [data]
    rows = []
    for value in data.values():
        if isinstance(value, list) and value and isinstance(value[0], dict):
            rows.extend(value)
    return rows


class PoliticalIntelligenceExtractor:
    """Extractor local inspirado por los repos de `gits amigos`.

    La capa mezcla patrones de OSINT/scraping, extracción de entidades de prensa,
    ontologías de conocimiento y análisis de texto político sin depender de un
    modelo pesado. Cuando hay LLM disponible, el chatbot lo usa encima de esta
    estructura, pero la ingesta funciona offline.
    """

    def extract(self, record: ScraperRecord) -> IntelligenceDocument:
        joined = f"{record.title}\n{record.text}".strip()
        domain = self.classify_domain(joined)
        topics = self.extract_topics(joined)
        entities = self.extract_entities(joined)
        metrics = self.extract_metrics(joined)
        events = self.extract_events(joined, record.published_at)
        keywords = self.extract_keywords(joined)
        summary = self.summarize(record.title, record.text, domain, topics, metrics)
        doc_id = _stable_id(record.source, record.url, record.title, record.text[:1000])
        return IntelligenceDocument(
            id=doc_id,
            source=record.source,
            title=record.title,
            text=record.text,
            url=record.url,
            published_at=record.published_at,
            domain=domain,
            topics=topics,
            entities=entities,
            metrics=metrics,
            events=events,
            keywords=keywords,
            summary=summary,
            ingested_at=_now_iso(),
            raw=record.raw,
        )

    def classify_domain(self, text: str) -> str:
        norm_text = _norm(text)
        scores: dict[str, int] = {}
        for domain, words in DOMAIN_KEYWORDS.items():
            scores[domain] = sum(norm_text.count(_norm(word)) for word in words)
        if not scores or max(scores.values()) == 0:
            return "general"
        return max(scores.items(), key=lambda kv: (kv[1], kv[0]))[0]

    def extract_topics(self, text: str) -> list[str]:
        norm_text = _norm(text)
        scored = []
        for topic, words in TOPIC_KEYWORDS.items():
            score = sum(norm_text.count(_norm(word)) for word in words)
            if score:
                scored.append((topic, score))
        scored.sort(key=lambda kv: (-kv[1], kv[0]))
        return [topic for topic, _ in scored[:8]]

    def extract_entities(self, text: str) -> list[ExtractedEntity]:
        entities: dict[tuple[str, str], ExtractedEntity] = {}
        norm_text = _norm(text)

        for canonical, aliases in PARTY_ALIASES.items():
            mentions = 0
            for alias in aliases:
                mentions += len(re.findall(rf"(?<!\w){re.escape(_norm(alias))}(?!\w)", norm_text))
            if mentions:
                entities[(canonical, "Partido")] = ExtractedEntity(
                    name=canonical,
                    type="Partido",
                    canonical=canonical,
                    confidence=min(0.98, 0.7 + mentions * 0.05),
                    mentions=mentions,
                )

        for org in ORG_KEYWORDS:
            mentions = norm_text.count(_norm(org))
            if mentions:
                entities[(org, "Organizacion")] = ExtractedEntity(
                    name=org,
                    type="Organizacion",
                    canonical=org,
                    confidence=0.82,
                    mentions=mentions,
                )

        for place in GEO_TERMS:
            mentions = norm_text.count(_norm(place))
            if mentions:
                entities[(place, "Lugar")] = ExtractedEntity(
                    name=place,
                    type="Lugar",
                    canonical=place,
                    confidence=0.8,
                    mentions=mentions,
                )

        # Personas y organizaciones no conocidas: secuencias de nombres propios.
        for match in re.finditer(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b", text):
            name = match.group(1).strip()
            if len(name) < 5 or _norm(name.split()[0]) in STOPWORDS:
                continue
            if name in ORG_KEYWORDS or name in GEO_TERMS:
                continue
            key = (name, "Persona")
            if key not in entities:
                entities[key] = ExtractedEntity(name=name, type="Persona", canonical=name, confidence=0.62, mentions=1)
            else:
                entities[key].mentions += 1

        return sorted(entities.values(), key=lambda e: (-e.mentions, e.type, e.name))[:40]

    def extract_metrics(self, text: str) -> list[ExtractedMetric]:
        metrics: list[ExtractedMetric] = []
        patterns = [
            (r"(?P<num>-?\d+(?:[,.]\d+)?)\s?(?P<unit>%|por ciento|pp|puntos|escaños|votos|millones|M€|€)", "dato"),
            (r"(?P<label>IPC|PIB|paro|deuda|déficit|deficit|euribor|inflación|inflacion)\D{0,35}(?P<num>-?\d+(?:[,.]\d+)?)\s?(?P<unit>%|pp|puntos|millones|M€|€)?", "indicador"),
        ]
        for pattern, default_name in patterns:
            for match in re.finditer(pattern, text, flags=re.I):
                raw = match.group(0)
                number = match.group("num").replace(",", ".")
                try:
                    value = float(number)
                except ValueError:
                    continue
                unit = match.groupdict().get("unit") or ""
                label = match.groupdict().get("label") or default_name
                start = max(0, match.start() - 80)
                end = min(len(text), match.end() + 80)
                metrics.append(
                    ExtractedMetric(
                        name=_norm(label).replace("deficit", "déficit"),
                        value=value,
                        unit=unit.strip(),
                        raw=raw.strip(),
                        context=_clean_text(text[start:end], max_chars=220),
                    )
                )
        dedup: dict[str, ExtractedMetric] = {}
        for metric in metrics:
            key = f"{metric.name}:{metric.value}:{metric.unit}:{metric.raw}"
            dedup[key] = metric
        return list(dedup.values())[:30]

    def extract_events(self, text: str, published_at: str | None) -> list[ExtractedEvent]:
        norm_text = _norm(text)
        event_specs = [
            ("encuesta", ("encuesta", "sondeo", "barometro", "intencion de voto")),
            ("resultado_electoral", ("escrutado", "resultados electorales", "votos", "escaños")),
            ("acto_parlamentario", ("congreso", "senado", "votacion", "enmienda", "proposicion", "ley")),
            ("decision_gobierno", ("consejo de ministros", "decreto", "aprueba", "anuncia", "gobierno")),
            ("indicador_economico", ("ipc", "pib", "paro", "euribor", "deuda", "deficit")),
            ("señal_social", ("manifestacion", "huelga", "protesta", "movilizacion")),
            ("narrativa_mediatica", ("viral", "redes sociales", "prensa", "narrativa", "desinformacion")),
        ]
        events: list[ExtractedEvent] = []
        first_sentence = _first_sentence(text, limit=240)
        for event_type, words in event_specs:
            score = sum(norm_text.count(word) for word in words)
            if score:
                events.append(
                    ExtractedEvent(
                        type=event_type,
                        label=first_sentence,
                        date=published_at,
                        confidence=min(0.95, 0.55 + score * 0.08),
                        evidence=first_sentence,
                    )
                )
        return sorted(events, key=lambda e: -e.confidence)[:6]

    def extract_keywords(self, text: str) -> list[str]:
        words = re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{4,}", _norm(text))
        counts = Counter(w for w in words if w not in STOPWORDS)
        for canonical, aliases in PARTY_ALIASES.items():
            if any(_norm(alias) in _norm(text) for alias in aliases):
                counts[canonical.lower()] += 4
        return [word for word, _ in counts.most_common(18)]

    def summarize(
        self,
        title: str,
        text: str,
        domain: str,
        topics: list[str],
        metrics: list[ExtractedMetric],
    ) -> str:
        base = title.strip() or _first_sentence(text, limit=220)
        topic_txt = ", ".join(topics[:4]) if topics else "sin tema dominante"
        metric_txt = ""
        if metrics:
            metric_txt = " Métricas: " + "; ".join(f"{m.name}={m.value:g}{m.unit}" for m in metrics[:4]) + "."
        return f"[{domain}] {base[:260]} Temas: {topic_txt}.{metric_txt}".strip()


def _first_sentence(text: str, *, limit: int = 220) -> str:
    cleaned = _clean_text(text, max_chars=limit * 2)
    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    sentence = parts[0] if parts else cleaned
    return sentence[:limit].strip()


class LocalKnowledgeStore:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self.base_dir = Path(base_dir or os.environ.get("ELECTSIM_AI_STORE", DEFAULT_KNOWLEDGE_DIR)).expanduser()
        if not self.base_dir.is_absolute():
            self.base_dir = (_ROOT / self.base_dir).resolve()
        self.documents_path = self.base_dir / "documents.jsonl"
        self.facts_path = self.base_dir / "facts.jsonl"
        self.ontology_path = self.base_dir / "ontology.json"
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.extractor = PoliticalIntelligenceExtractor()

    def ingest_records(self, records: Iterable[ScraperRecord], *, persist: bool = True) -> IngestResult:
        records_list = list(records)
        existing_ids = {doc["id"] for doc in self._read_jsonl(self.documents_path)}
        docs: list[IntelligenceDocument] = []
        skipped = 0
        for record in records_list:
            doc = self.extractor.extract(record)
            if doc.id in existing_ids:
                skipped += 1
                continue
            docs.append(doc)
            existing_ids.add(doc.id)

        ontology = self._load_ontology()
        facts: list[dict[str, Any]] = []
        for doc in docs:
            facts.extend(self._facts_from_document(doc))
            self._merge_document_into_ontology(ontology, doc)

        if persist and docs:
            self._append_jsonl(self.documents_path, (asdict(doc) for doc in docs))
            self._append_jsonl(self.facts_path, facts)
            self._write_json(self.ontology_path, ontology)

        domain_counts = Counter(doc.domain for doc in docs)
        topic_counts = Counter(topic for doc in docs for topic in doc.topics)
        return IngestResult(
            records_seen=len(records_list),
            documents_added=len(docs),
            documents_skipped=skipped,
            facts_added=len(facts),
            ontology_nodes=len(ontology.get("nodes", {})),
            ontology_edges=len(ontology.get("edges", [])),
            domains=dict(domain_counts),
            topics=dict(topic_counts),
            store_path=str(self.base_dir),
        )

    def ingest_path(self, path: str | Path, *, recursive: bool = True, max_records: int | None = None) -> IngestResult:
        records = load_scraper_records(path, recursive=recursive, max_records=max_records)
        return self.ingest_records(records)

    def search(self, query: str, *, k: int = 8, domain: str | None = None) -> list[dict[str, Any]]:
        docs = self._read_jsonl(self.documents_path)
        if domain:
            docs = [doc for doc in docs if str(doc.get("domain")) == domain]
        q_terms = self._query_terms(query)
        if not q_terms:
            return []
        scored: list[tuple[float, dict[str, Any]]] = []
        total_docs = max(1, len(docs))
        doc_freq = Counter()
        tokenized_docs: list[tuple[dict[str, Any], list[str]]] = []
        for doc in docs:
            tokens = self._query_terms(
                " ".join(
                    [
                        str(doc.get("title", "")),
                        str(doc.get("summary", "")),
                        str(doc.get("text", ""))[:3000],
                        " ".join(doc.get("topics") or []),
                        " ".join(doc.get("keywords") or []),
                    ]
                )
            )
            tokenized_docs.append((doc, tokens))
            doc_freq.update(set(tokens))

        for doc, tokens in tokenized_docs:
            counts = Counter(tokens)
            score = 0.0
            for term in q_terms:
                tf = counts.get(term, 0)
                if not tf:
                    continue
                idf = math.log((1 + total_docs) / (1 + doc_freq.get(term, 0))) + 1
                score += (1 + math.log(tf)) * idf
            if score:
                result = {
                    "id": doc.get("id"),
                    "score": round(float(score), 4),
                    "source": doc.get("source"),
                    "title": doc.get("title"),
                    "summary": doc.get("summary"),
                    "url": doc.get("url"),
                    "published_at": doc.get("published_at"),
                    "domain": doc.get("domain"),
                    "topics": doc.get("topics") or [],
                }
                scored.append((score, result))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [item for _, item in scored[: max(1, int(k))]]

    def ontology_summary(self) -> dict[str, Any]:
        ontology = self._load_ontology()
        nodes = ontology.get("nodes", {})
        edges = ontology.get("edges", [])
        docs = self._read_jsonl(self.documents_path)
        facts = self._read_jsonl(self.facts_path)
        node_types = Counter(node.get("type") for node in nodes.values())
        domains = Counter(doc.get("domain") for doc in docs)
        topics = Counter(topic for doc in docs for topic in (doc.get("topics") or []))
        return {
            "store_path": str(self.base_dir),
            "documents": len(docs),
            "facts": len(facts),
            "nodes": len(nodes),
            "edges": len(edges),
            "node_types": dict(node_types),
            "domains": dict(domains),
            "top_topics": dict(topics.most_common(15)),
            "updated_at": ontology.get("updated_at"),
        }

    def chat(
        self,
        question: str,
        *,
        k: int = 8,
        domain: str | None = None,
        use_llm: bool = True,
        allow_tools: bool = True,
    ) -> ChatResult:
        citations = self.search(question, k=k, domain=domain)
        tool_results = self._run_tools(question) if allow_tools else []
        context = self._build_context(citations, tool_results)
        if use_llm:
            llm_answer = self._answer_with_llm(question, context)
            if llm_answer:
                return ChatResult(
                    answer=llm_answer["answer"],
                    citations=citations,
                    tool_results=tool_results,
                    model=llm_answer["model"],
                    used_llm=True,
                )
        return ChatResult(
            answer=self._answer_without_llm(question, citations, tool_results),
            citations=citations,
            tool_results=tool_results,
            model="local-heuristic",
            used_llm=False,
        )

    def _facts_from_document(self, doc: IntelligenceDocument) -> list[dict[str, Any]]:
        facts: list[dict[str, Any]] = []
        for entity in doc.entities:
            facts.append(
                {
                    "id": _stable_id(doc.id, "entity", entity.type, entity.name),
                    "document_id": doc.id,
                    "kind": "entity_mention",
                    "domain": doc.domain,
                    "topic": doc.topics[0] if doc.topics else None,
                    "subject": entity.canonical or entity.name,
                    "predicate": "mentioned_in",
                    "object": doc.title or doc.source,
                    "value": entity.mentions,
                    "unit": "mentions",
                    "confidence": entity.confidence,
                    "evidence": doc.summary,
                    "created_at": _now_iso(),
                }
            )
        for metric in doc.metrics:
            facts.append(
                {
                    "id": _stable_id(doc.id, "metric", metric.name, metric.value, metric.unit),
                    "document_id": doc.id,
                    "kind": "metric",
                    "domain": doc.domain,
                    "topic": doc.topics[0] if doc.topics else None,
                    "subject": metric.name,
                    "predicate": "has_value",
                    "object": metric.context,
                    "value": metric.value,
                    "unit": metric.unit,
                    "confidence": 0.78,
                    "evidence": metric.raw,
                    "created_at": _now_iso(),
                }
            )
        for event in doc.events:
            facts.append(
                {
                    "id": _stable_id(doc.id, "event", event.type, event.label),
                    "document_id": doc.id,
                    "kind": "event",
                    "domain": doc.domain,
                    "topic": doc.topics[0] if doc.topics else None,
                    "subject": event.type,
                    "predicate": "detected",
                    "object": event.label,
                    "value": None,
                    "unit": None,
                    "confidence": event.confidence,
                    "evidence": event.evidence,
                    "created_at": _now_iso(),
                }
            )
        return facts

    def _merge_document_into_ontology(self, ontology: dict[str, Any], doc: IntelligenceDocument) -> None:
        nodes = ontology.setdefault("nodes", {})
        edges = ontology.setdefault("edges", [])
        edge_index = {
            (edge.get("source"), edge.get("target"), edge.get("relation")): edge
            for edge in edges
            if isinstance(edge, dict)
        }

        doc_node_id = f"Documento:{doc.id}"
        self._upsert_node(
            nodes,
            OntologyNode(
                id=doc_node_id,
                type="Documento",
                label=doc.title or doc.source,
                properties={
                    "source": doc.source,
                    "url": doc.url,
                    "published_at": doc.published_at,
                    "domain": doc.domain,
                    "summary": doc.summary,
                },
            ),
        )
        domain_id = f"Dominio:{doc.domain}"
        self._upsert_node(nodes, OntologyNode(id=domain_id, type="Dominio", label=doc.domain))
        self._upsert_edge(edge_index, doc_node_id, domain_id, "classified_as", doc.id)

        for topic in doc.topics:
            topic_id = f"Tema:{_slug(topic)}"
            self._upsert_node(nodes, OntologyNode(id=topic_id, type="Tema", label=topic))
            self._upsert_edge(edge_index, doc_node_id, topic_id, "about", doc.id)

        for entity in doc.entities:
            ent_id = f"{entity.type}:{_slug(entity.canonical or entity.name)}"
            self._upsert_node(
                nodes,
                OntologyNode(
                    id=ent_id,
                    type=entity.type,
                    label=entity.canonical or entity.name,
                    properties={"confidence": entity.confidence},
                    mentions=entity.mentions,
                ),
            )
            self._upsert_edge(edge_index, doc_node_id, ent_id, "mentions", doc.id, weight=entity.mentions)

        for event in doc.events:
            event_id = f"Evento:{_stable_id(doc.id, event.type, event.label)}"
            self._upsert_node(
                nodes,
                OntologyNode(
                    id=event_id,
                    type="Evento",
                    label=event.label[:180],
                    properties={"event_type": event.type, "date": event.date, "confidence": event.confidence},
                ),
            )
            self._upsert_edge(edge_index, event_id, doc_node_id, "evidenced_by", doc.id)

        ontology["edges"] = list(edge_index.values())
        ontology["updated_at"] = _now_iso()

    def _upsert_node(self, nodes: dict[str, Any], node: OntologyNode) -> None:
        current = nodes.get(node.id)
        if current:
            current["mentions"] = int(current.get("mentions") or 0) + int(node.mentions)
            current.setdefault("properties", {}).update(node.properties)
        else:
            nodes[node.id] = asdict(node)

    def _upsert_edge(
        self,
        edge_index: dict[tuple[Any, Any, Any], dict[str, Any]],
        source: str,
        target: str,
        relation: str,
        evidence_id: str,
        *,
        weight: float = 1.0,
    ) -> None:
        key = (source, target, relation)
        if key in edge_index:
            edge_index[key]["weight"] = float(edge_index[key].get("weight") or 0.0) + weight
            evidence = edge_index[key].setdefault("evidence_ids", [])
            if evidence_id not in evidence:
                evidence.append(evidence_id)
        else:
            edge_index[key] = asdict(OntologyEdge(source=source, target=target, relation=relation, weight=weight, evidence_ids=[evidence_id]))

    def _run_tools(self, question: str) -> list[dict[str, Any]]:
        norm_q = _norm(question)
        results: list[dict[str, Any]] = []
        if any(word in norm_q for word in ("ontologia", "ontología", "grafo", "entidades")):
            results.append({"tool": "ontology_summary", "output": self.ontology_summary()})
        if any(word in norm_q for word in ("buscar", "cita", "fuente", "noticia", "documento")):
            results.append({"tool": "local_search", "output": self.search(question, k=5)})
        return results

    def _build_context(self, citations: list[dict[str, Any]], tool_results: list[dict[str, Any]]) -> str:
        blocks = []
        for i, item in enumerate(citations, start=1):
            blocks.append(
                f"[{i}] {item.get('title') or item.get('source')} | dominio={item.get('domain')} | "
                f"temas={', '.join(item.get('topics') or [])}\n{item.get('summary')}"
            )
        if tool_results:
            blocks.append("Herramientas locales:\n" + json.dumps(tool_results, ensure_ascii=False, default=_json_default)[:4000])
        return "\n\n".join(blocks)

    def _answer_with_llm(self, question: str, context: str) -> dict[str, str] | None:
        provider = os.environ.get("ELECTSIM_LOCAL_AI_PROVIDER", os.environ.get("ELECTSIM_LLM_PROVIDER", "ollama"))
        try:
            client = get_llm_client(provider)
            messages = [
                {
                    "role": "system",
                    "content": (
                        "Eres Politeia Local AI, un analista senior de ciencia política y economía. "
                        "Responde en español, separa hechos de inferencias, usa solo el contexto local "
                        "cuando cites datos concretos y señala incertidumbre si la evidencia es escasa."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Pregunta:\n{question}\n\n"
                        f"Contexto local recuperado de scrapers y ontología:\n{context or 'Sin contexto recuperado.'}\n\n"
                        "Responde con síntesis ejecutiva, evidencias y siguientes comprobaciones útiles."
                    ),
                },
            ]
            answer = client.complete(messages, temperature=0.25, max_tokens=900)
            return {"answer": str(answer).strip(), "model": getattr(client, "modelo", provider)}
        except Exception:
            return None

    def _answer_without_llm(
        self,
        question: str,
        citations: list[dict[str, Any]],
        tool_results: list[dict[str, Any]],
    ) -> str:
        if not citations and not tool_results:
            return (
                "No tengo todavía evidencia local suficiente para responder. "
                "Ingiere salidas de scrapers con `python -m agents.local_intelligence ingest <ruta>` "
                "o usa el endpoint `/ai/ingest/path`."
            )
        lines = ["Síntesis local sin LLM:"]
        if citations:
            domains = Counter(str(c.get("domain")) for c in citations)
            topics = Counter(topic for c in citations for topic in (c.get("topics") or []))
            lines.append(f"- Evidencia recuperada: {len(citations)} documentos. Dominio dominante: {domains.most_common(1)[0][0]}.")
            if topics:
                lines.append("- Temas principales: " + ", ".join(t for t, _ in topics.most_common(6)) + ".")
            for idx, item in enumerate(citations[:5], start=1):
                title = item.get("title") or item.get("source") or item.get("id")
                lines.append(f"- [{idx}] {title}: {item.get('summary')}")
        if tool_results:
            lines.append(f"- Herramientas locales ejecutadas: {', '.join(t['tool'] for t in tool_results)}.")
        lines.append("Inferencia: la respuesta debe verificarse contra fuentes primarias si se va a usar para decisión pública o campaña.")
        return "\n".join(lines)

    def _query_terms(self, text: str) -> list[str]:
        return [
            term
            for term in re.findall(r"[a-z0-9áéíóúüñ]+", _norm(text))
            if len(term) >= 3 and term not in STOPWORDS
        ]

    def _load_ontology(self) -> dict[str, Any]:
        if not self.ontology_path.exists():
            return {"nodes": {}, "edges": [], "created_at": _now_iso(), "updated_at": None}
        try:
            return json.loads(self.ontology_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {"nodes": {}, "edges": [], "created_at": _now_iso(), "updated_at": None}

    def _read_jsonl(self, path: Path) -> list[dict[str, Any]]:
        if not path.exists():
            return []
        rows: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(obj, dict):
                    rows.append(obj)
        return rows

    def _append_jsonl(self, path: Path, rows: Iterable[dict[str, Any]]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as fh:
            for row in rows:
                fh.write(json.dumps(row, ensure_ascii=False, default=_json_default) + "\n")

    def _write_json(self, path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=_json_default), encoding="utf-8")


def get_local_store(base_dir: str | Path | None = None) -> LocalKnowledgeStore:
    return LocalKnowledgeStore(base_dir=base_dir)


def _cmd_ingest(args: argparse.Namespace) -> None:
    store = get_local_store(args.store)
    result = store.ingest_path(args.path, recursive=not args.no_recursive, max_records=args.max_records)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


def _cmd_search(args: argparse.Namespace) -> None:
    store = get_local_store(args.store)
    result = store.search(args.query, k=args.k, domain=args.domain)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=_json_default))


def _cmd_chat(args: argparse.Namespace) -> None:
    store = get_local_store(args.store)
    result = store.chat(args.question, k=args.k, domain=args.domain, use_llm=not args.no_llm)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2, default=_json_default))


def _cmd_summary(args: argparse.Namespace) -> None:
    store = get_local_store(args.store)
    print(json.dumps(store.ontology_summary(), ensure_ascii=False, indent=2, default=_json_default))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Politeia Local AI: ingesta, ontología y chatbot local.")
    parser.add_argument("--store", default=None, help="Directorio del almacén local de conocimiento.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_ingest = sub.add_parser("ingest", help="Ingiere salidas de scrapers desde archivo o carpeta.")
    p_ingest.add_argument("path")
    p_ingest.add_argument("--max-records", type=int, default=None)
    p_ingest.add_argument("--no-recursive", action="store_true")
    p_ingest.set_defaults(func=_cmd_ingest)

    p_search = sub.add_parser("search", help="Busca en el conocimiento local.")
    p_search.add_argument("query")
    p_search.add_argument("-k", type=int, default=8)
    p_search.add_argument("--domain", default=None)
    p_search.set_defaults(func=_cmd_search)

    p_chat = sub.add_parser("chat", help="Pregunta al chatbot local.")
    p_chat.add_argument("question")
    p_chat.add_argument("-k", type=int, default=8)
    p_chat.add_argument("--domain", default=None)
    p_chat.add_argument("--no-llm", action="store_true", help="Usa solo síntesis heurística local.")
    p_chat.set_defaults(func=_cmd_chat)

    p_summary = sub.add_parser("summary", help="Resume la ontología local.")
    p_summary.set_defaults(func=_cmd_summary)

    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
