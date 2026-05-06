# BOE — Patrones extraídos

**Repo de referencia:** `gits amigos/BOE-master/` (R package `rOpenSpain/BOE`)
**Lenguaje original:** R (httr + xml2)
**Licencia:** MIT — Copyright (c) 2020 Lluís Revilla Sancho. Adaptación libre permitida con atribución.

## API surface relevante

Archivos clave inspeccionados:

- `BOE-master/R/queries.R` — construcción de URLs (XML, HTML, PDF, consolidada)
- `BOE-master/R/retrieve.R` — pipeline de descarga: `retrieve_sumario(date)` y `retrieve_document(cve)`
- `BOE-master/R/tidy.R` — parser XML → data.frame con 11 columnas
- `BOE-master/R/codes.R` — generación de identificadores `BOE-A-YYYY-N`, `BOE-B-YYYY-N`, `BOE-S-YYYY-NBO`
- `BOE-master/R/last_date_boe.R` — descubre el último sumario publicado
- `BOE-master/DESCRIPTION` — dependencias: `httr (>= 1.4.1)`, `xml2 (>= 1.2.2)`

## URL building (clave para `etl/sources/boe.py`)

```
BASE_URL    = "https://boe.es/"
JOURNAL_URL = {"BOE": "diario_boe", "BORME": "diario_borme"}

# Sumario diario (XML, primer punto de entrada)
GET https://boe.es/diario_boe/xml.php?id=BOE-S-YYYYMMDD

# Documento individual (XML)
GET https://boe.es/diario_boe/xml.php?id=BOE-A-YYYY-N    # disposiciones (leyes/RD)
GET https://boe.es/diario_boe/xml.php?id=BOE-B-YYYY-N    # anuncios (B = boletín)

# HTML legible
GET https://boe.es/diario_boe/text.php?id=BOE-A-YYYY-N

# Texto consolidado (solo BOE-A, leyes vigentes)
GET https://boe.es/buscar/act.php?id=BOE-A-YYYY-N

# PDF de la pieza
GET https://boe.es/boe/dias/YYYY/MM/DD/pdfs/BOE-A-YYYY-N.pdf
```

Validación de IDs antes de la query (ver `codes.R`): primer segmento debe estar en
`{BOE, BORME}`, el segundo en `{A, B, S}`, el tercero parseable como año o como
fecha `YYYYMMDD`.

## Retry / resiliencia

El paquete original es minimal: `httr::GET` + `stop_for_status` + checks de
`http_type` (debe ser `application/xml`; si vuelve `text/html` significa que el
servidor devolvió una página de error en lugar del XML solicitado y emite warning).

**Recomendación para Python:** usar `tenacity` con backoff exponencial (3 reintentos,
2-8s) y respetar `User-Agent` identificable. El BOE no rate-limita agresivamente,
pero conviene espaciar 0.5-1s entre peticiones cuando se barre histórico.

## Schema del sumario diario (output de `tidy_sumario`)

11 columnas, una fila por publicación:

| Columna | Tipo | Descripción |
|---|---|---|
| `date` | Date | Fecha de publicación (`%d/%m/%Y` en XML) |
| `sumario_nbo` | str | ID del sumario (`BOE-S-YYYYMMDD`) |
| `sumario_code` | str | Número de boletín (atributo `nbo`) |
| `section` | str | Sección (I = disposiciones generales, II, III…) |
| `section_number` | str | Número de sección |
| `departament` | str | Ministerio/órgano emisor |
| `departament_etq` | str | Etiqueta corta |
| `epigraph` | str/None | Subgrupo dentro del departamento |
| `text` | str | Título legible de la disposición |
| `publication` | str | CVE (`BOE-A-YYYY-N` o `BOE-B-YYYY-N`) |
| `pages` | int | Nº de páginas del PDF |

XPath relevantes (xml2):
- `./meta/fecha` → fecha del sumario
- `//diario` con atributo `nbo` → metadatos del boletín
- `//item` → cada publicación (atributo `id` = CVE, hijo `titulo`, hijo `urlPdf` con `numPag`)
- `xml_parent` se usa dos veces para reconstruir jerarquía `seccion > departamento > epigrafe > publicacion`

## Schema del documento individual

`tidy_disposicion` (BOE-A) y `tidy_anuncio` (BOE-B) extraen del XML:

- `metadatos` (id, fecha publicación, fecha actualización, departamento, rango,
  título, número oficial, URL PDF/EPub, observaciones, materias, alertas)
- `analisis` (referencias normativas: deroga, modifica, deroga parcialmente, base legal)
- `texto` (HTML del cuerpo legal)

## Plan de implementación para `etl/sources/boe.py`

Diseño limpio (no copy-paste; reescritura idiomática Python):

```python
# etl/sources/boe.py — esqueleto recomendado
from __future__ import annotations
from dataclasses import dataclass
from datetime import date as _date
from typing import Iterator
import httpx
from lxml import etree
from tenacity import retry, stop_after_attempt, wait_exponential

BASE_URL = "https://boe.es"
USER_AGENT = "Politeia-ETL/1.0 (+https://politeia.app)"

@dataclass(frozen=True)
class BoeEntry:
    cve: str                  # BOE-A-2024-12345
    date: _date
    section: str              # "I", "II", "III", "IV", "V"
    department: str
    department_short: str | None
    epigraph: str | None
    title: str
    pdf_url: str
    pages: int

class BoeClient:
    def __init__(self, timeout: float = 15.0) -> None:
        self._http = httpx.Client(
            base_url=BASE_URL,
            headers={"User-Agent": USER_AGENT, "Accept": "application/xml"},
            timeout=timeout,
        )

    @retry(stop=stop_after_attempt(3),
           wait=wait_exponential(multiplier=1, min=2, max=8))
    def _get_xml(self, path: str, params: dict[str, str]) -> etree._Element:
        r = self._http.get(path, params=params)
        r.raise_for_status()
        ctype = r.headers.get("content-type", "")
        if "xml" not in ctype:
            raise ValueError(f"Expected XML, got {ctype!r} for {r.url}")
        return etree.fromstring(r.content)

    def fetch_sumario(self, day: _date) -> Iterator[BoeEntry]:
        sid = f"BOE-S-{day:%Y%m%d}"
        root = self._get_xml("/diario_boe/xml.php", {"id": sid})
        yield from _parse_sumario(root)

    def fetch_document(self, cve: str) -> dict:
        root = self._get_xml("/diario_boe/xml.php", {"id": cve})
        return _parse_documento(root)
```

`_parse_sumario` recorre `//item`, extrae `id`, `titulo`, `urlPdf/@numPag` y
sube por `xml_parent` dos veces para recuperar departamento y sección. La
estructura del árbol XML del BOE es estable desde 2009.

## Integración con la migración 0013

El módulo institucional ya tiene tablas BOE (ver memoria
`project_institucional.md`). Mapear `BoeEntry` directamente a la tabla
`boe_publicaciones` con `cve` como clave primaria (es único e inmutable).

## Idempotencia y deduplicación

- **Clave natural:** `cve` (formato `BOE-A-YYYY-N`) — único globalmente
- **Sumarios:** un sumario por día como mucho (clave `BOE-S-YYYYMMDD`)
- **Detección de cambios:** `metadatos.fecha_actualizacion` (atributo en raíz
  del XML del documento individual) cambia cuando el BOE corrige una
  disposición publicada — usar para invalidar caché

## Dependencias Python sugeridas

```
httpx>=0.27          # cliente HTTP moderno
lxml>=5.0            # parser XML (más rápido que xml.etree)
tenacity>=8.0        # reintentos con backoff
pydantic>=2.0        # validación de modelos (opcional)
```

## Hallazgos / blockers

- **Sin blockers.** Licencia MIT permite adaptación libre. Las URLs del BOE
  son públicas y estables.
- El paquete R no soporta `BORME` completamente (solo retrieve, no tidy del
  documento individual). Para Politeia, BORME es lower priority.
- El XML del BOE tiene encoding declarado `ISO-8859-1` en algunos endpoints
  legacy — `lxml` lo gestiona automáticamente; con `httpx` usar `r.content`
  (bytes) en lugar de `r.text` para no forzar UTF-8 prematuramente.
