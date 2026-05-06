# Congreso — Patrones extraídos

**Repo de referencia:** `gits amigos/Congreso-Scrapper-main 3/`
**Lenguaje original:** Python 3 (requests + BeautifulSoup + psycopg2)
**Licencia:** No `LICENSE` file en el repo. Tratarlo como **estudio-only** y
escribir código original. Solo el endpoint público y el formato JSON oficial son
reutilizables (el portal `congreso.es/opendata` los expone explícitamente).

## Archivos clave inspeccionados

- `Congreso-Scrapper-main 3/scrapper.py` — orquestador principal (HTML → ZIP → JSON → DB)
- `Congreso-Scrapper-main 3/requestutils.py` — request con cookies y user-agent
- `Congreso-Scrapper-main 3/votesutils.py` — extracción de campos del JSON oficial
- `Congreso-Scrapper-main 3/vote.py` — modelo `Vote`
- `Congreso-Scrapper-main 3/dateutils.py`, `fileutils.py` — utilidades
- `Congreso-Scrapper-main 3/db/` — esquema PostgreSQL para votaciones

## URL de referencia (open data oficial)

```
# Página de descarga (HTML, contiene un <a download> con el ZIP del día)
https://www.congreso.es/opendata/votaciones?p_p_id=votaciones
  &p_p_lifecycle=0&p_p_state=normal&p_p_mode=view
  &targetLegislatura={LEGISLATURA}      # romano: XIV, XV, XVI…
  &targetDate={DD}/{MM}/{YYYY}

# El ZIP descargado contiene N JSON (uno por votación de la sesión):
#   sesion{S}votacion{V}.json
```

Selector clave (BeautifulSoup):

```python
soup.find("a", download=True)   # devuelve el <a download="…" href="/…/x.zip">
```

Si no hay `<a download>` en la página, no hubo sesión ese día → skip.

## Patrón de scraping (algorítmico, no copy-paste)

1. Para cada legislatura abierta (`X`, `XI`, `XII`, `XIII`, `XIV`, `XV`)
2. Iterar día a día desde `last_seen_day` hacia atrás (o hacia adelante)
3. Construir URL del portal con la fecha
4. Cargar HTML con headers `Mozilla/5.0…`, `Referer` = misma URL, cookies de
   sesión obtenidas de un GET previo
5. Si encuentra `<a download>`, descargar ZIP, descomprimir, parsear cada JSON
6. Si no, continuar al día anterior

> **Nota de robustez:** el código de referencia usa `fake_useragent` pero luego
> sobrescribe con UA fijo de Chrome. Para Politeia, fijar un UA identificable
> (`Politeia-ETL/1.0`) es preferible: no engañamos al servidor, y open data
> permite scraping educado.

## Schema del JSON oficial (clave para `etl/sources/congreso.py`)

Cada `sesion{S}votacion{V}.json` tiene esta forma (campos extraídos en `votesutils.py`):

```jsonc
{
  "informacion": {
    "fecha": "01/03/2024",
    "sesion": 42,
    "numeroVotacion": 3,
    "titulo": "Proyecto de Ley Orgánica de…",
    "textoSubGrupo": "Aprobación con modificaciones del Senado",
    "textoExpediente": "121/000123",        // expediente parlamentario
    "asunto": "...",
    "presentes": 350,
    "afavor": 175,
    "encontra": 174,
    "abstenciones": 1,
    "novotan": 0
  },
  "votaciones": [
    { "asiento": 12, "diputado": "Apellido, Nombre",
      "grupo": "G.P. Socialista", "voto": "Sí" },
    // …una entrada por escaño
  ]
}
```

Valores de `voto` (normalizar antes de comparar — ver `update_group`):

- `"Sí"` / `"SI"`
- `"No"`
- `"Abstención"` (con o sin tilde — el ref usa `unidecode` para comparar)
- ausencia / cualquier otro → "no vota"

## Adaptación recomendada para `etl/sources/congreso.py`

```python
# etl/sources/congreso.py — esqueleto recomendado
from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from typing import Iterator
import io, zipfile, json, unicodedata
import httpx
from selectolax.parser import HTMLParser  # más rápido que bs4 + lxml

LEGISLATURAS_ABIERTAS = ("XIV", "XV")     # ajustar al ciclo activo

PORTAL_URL = (
    "https://www.congreso.es/opendata/votaciones"
    "?p_p_id=votaciones&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view"
    "&targetLegislatura={leg}&targetDate={day:%d/%m/%Y}"
)

def _norm_voto(v: str) -> str:
    s = unicodedata.normalize("NFKD", v).encode("ascii", "ignore").decode().upper()
    if s == "SI": return "si"
    if s == "NO": return "no"
    if s.startswith("ABSTENCION"): return "abstencion"
    return "no_vota"

@dataclass(frozen=True)
class Votacion:
    legislatura: str
    sesion: int
    numero: int
    fecha: date
    titulo: str
    expediente: str | None
    subtitulo: str | None
    afavor: int; encontra: int; abstenciones: int; no_vota: int
    detalle: list[dict]                # voto desglosado por diputado

class CongresoClient:
    def __init__(self) -> None:
        self._http = httpx.Client(
            headers={"User-Agent": "Politeia-ETL/1.0",
                     "Accept-Language": "es-ES,es;q=0.9"},
            timeout=20.0, follow_redirects=True,
        )

    def _zip_url_for(self, leg: str, day: date) -> str | None:
        url = PORTAL_URL.format(leg=leg, day=day)
        r = self._http.get(url); r.raise_for_status()
        anchor = HTMLParser(r.text).css_first("a[download]")
        if anchor is None:
            return None
        href = anchor.attributes.get("href", "")
        return f"https://www.congreso.es{href}" if href.startswith("/") else href

    def votaciones_del_dia(self, leg: str, day: date) -> Iterator[Votacion]:
        zip_url = self._zip_url_for(leg, day)
        if zip_url is None:
            return
        z = self._http.get(zip_url); z.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(z.content)) as zf:
            for name in zf.namelist():
                if not name.endswith(".json"):
                    continue
                with zf.open(name) as f:
                    payload = json.load(f)
                yield _to_votacion(payload, legislatura=leg)
```

`_to_votacion` agrega contadores por grupo recorriendo `payload["votaciones"]`
y aplicando `_norm_voto` (mismo patrón que `update_group` en el ref, sin
necesidad de copiar el código).

## Iniciativas (no cubierto por este repo)

Este scrapper se centra en **votaciones**. Para **iniciativas** (proyectos de
ley, mociones, PNL…) la fuente recomendada es:

```
https://www.congreso.es/opendata/iniciativas?targetLegislatura=XV
# Devuelve también un ZIP con JSON por iniciativa
```

El esquema del ZIP de iniciativas tiene campos `numeroExpediente`, `tipoExpediente`,
`titulo`, `autor`, `fechaCalificacion`, `tramites[]`, `enlaces[]`. Recomendable
crear `etl/sources/congreso_iniciativas.py` paralelo al de votaciones.

## Idempotencia / claves naturales

- **Votación:** `(legislatura, sesion, numeroVotacion)` único
- **Voto individual:** añadir `asiento` para PK compuesta
- **Iniciativa:** `numeroExpediente` (formato `121/000123`)
- **Refresh strategy:** descargar siempre el JSON del día más reciente y los
  últimos 7 días (a veces se publican correcciones tarde). Hashear el JSON
  crudo para detectar cambios y re-emitir solo si cambia.

## Gotchas observados

- El portal tiene **rate limiting suave**: si se barre histórico completo
  (todas las legislaturas en paralelo), bloquea ~1h. Limitar a 1 request/seg
  y usar `httpx.AsyncClient` con `Semaphore(2)`.
- El nombre del ZIP no es estable; siempre extraer del `<a download href=…>`.
- En sesiones con votaciones telemáticas, `asiento` puede ser `null`.
- Algunos JSON antiguos (legislaturas X-XII) tienen `voto` con encoding
  inconsistente — siempre `unicodedata.normalize("NFKD", v)` antes de comparar.

## Dependencias Python sugeridas

```
httpx>=0.27
selectolax>=0.3      # HTML parser ~10x más rápido que bs4
# unicodedata es stdlib — no necesitamos `unidecode`
```

## Hallazgos / blockers

- **Sin LICENSE** en el repo de referencia → escribir código original; no
  copiar líneas. El esquema JSON es del Congreso (público) y reusarlo es OK.
- Los IDs de diputado en el JSON oficial no son estables entre legislaturas
  (no hay `diputadoId`). Para cruzar con `everypolitician` hay que matchear
  por nombre normalizado + grupo + circunscripción.
