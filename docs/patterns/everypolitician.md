# everypolitician-data — Patrones extraídos

**Repo de referencia:** `gits amigos/everypolitician-data-master/`
**Lenguaje original:** Ruby (rake tasks) + datos en JSON/CSV
**Licencia:** **No `LICENSE` file** en el repo. La web del proyecto declaraba los
datos como **CC0/Public Domain** (mySociety, project on hold desde 2019). Los
datos son hechos públicos (parlamentarios), reutilizables; el código rake del
build pipeline no nos interesa.

## Estado del proyecto

> "The EveryPolitician project is currently on hold. See [this blog post]
> (https://www.mysociety.org/2019/06/26/placing-everypolitician-on-hold/)."

Los datos están **congelados** desde ~2019. Para términos posteriores
(legislatura XIII, XIV, XV) hay que combinar con scrapers propios o Wikidata.
Aún así, sirve como:

1. **Esquema de referencia** (Popolo v1.0) — estándar internacional.
2. **Bootstrap data** para diputados con identificadores estables (Wikidata QIDs).
3. **Mapping nombre → wikidata QID** para conciliar con otras fuentes.

## Archivos clave para España

```
data/Spain/meta.json                                # ISO ES, wikidata Q29
data/Spain/Congress/meta.json
data/Spain/Congress/ep-popolo-v1.0.json             # PRINCIPAL — schema Popolo
data/Spain/Congress/names.csv                       # name → uuid (todos los alias)
data/Spain/Congress/term-10.csv                     # legislatura X (CSV plano)
data/Spain/Congress/term-11.csv                     # legislatura XI
data/Spain/Congress/sources/                        # fuentes originales (Wikidata SPARQL, scrapers)
```

`data/Spain/Senate` **no existe** en este snapshot (proyecto solo cubrió Congreso).

## Schema Popolo v1.0 (`ep-popolo-v1.0.json`)

Estándar internacional `popoloproject.com`. Tres entidades principales:

```jsonc
{
  "persons": [...],           // diputados
  "organizations": [...],     // partidos, grupos parlamentarios, cámaras
  "memberships": [...],       // relación persona ↔ organización en un periodo
  "areas": [...],             // circunscripciones (Madrid, Asturias, …)
  "events": [...],            // legislaturas (con start/end)
  "posts": []                 // (vacío para ES, usado en algunos países)
}
```

### Person

```jsonc
{
  "id": "003dfc68-8719-404b-98de-dc0f98d7a53a",   // UUID estable EP
  "name": "María José García-Pelayo Jurado",
  "sort_name": "García-Pelayo Jurado, María José",
  "given_name": "María José",
  "family_name": "García-Pelayo Jurado",
  "gender": "female",
  "birth_date": "1968-01-08",
  "image": "http://www.congreso.es/wc/htdocs/web/img/diputados/32_11.jpg",
  "images": [{"url": "..."}],                     // múltiples (Wikipedia + congreso)
  "identifiers": [{"identifier": "Q5687854", "scheme": "wikidata"}],
  "links": [{"note": "Wikipedia (es)", "url": "https://es.wikipedia.org/wiki/..."}],
  "other_names": [{"lang": "ru", "name": "...", "note": "multilingual"}],
  "contact_details": [{"type": "twitter", "value": "@..."}]
}
```

### Term-{N}.csv (más práctico para bulk-import)

19 columnas:

```
id, name, sort_name, email, twitter, facebook,
group, group_id, area_id, area, chamber,
term, start_date, end_date,
image, gender, wikidata, wikidata_group, wikidata_area
```

Ejemplo real (`term-11.csv`):

```
d514d040-5479-4a3d-a530-7b1e532daecc, Adriana Lastra Fernández, "Lastra Fernández, Adriana",
,Adrilastra,adriana.lastra.7,
G.P. Socialista, GS, asturias, Asturias, Congreso de los Diputados,
11,,, http://www.congreso.es/wc/htdocs/web/img/diputados/328_11.jpg,
female, Q17620225, , 
```

### names.csv (alias resolver)

```
name,id
Adriana Lastra,d514d040-5479-4a3d-a530-7b1e532daecc
Adriana Lastra Fernández,d514d040-5479-4a3d-a530-7b1e532daecc
```

Múltiples filas por persona — un alias por fila → UUID. Útil para fuzzy matching
contra textos de prensa o ETL del Congreso (que usa nombres no normalizados).

## Mapping a `data_seeds/political_actors.py`

```python
# data_seeds/political_actors.py — patrón sugerido
from __future__ import annotations
from dataclasses import dataclass
import csv, json
from pathlib import Path

@dataclass(frozen=True)
class PoliticalActor:
    ep_uuid: str                  # everypolitician UUID (estable internacional)
    full_name: str
    sort_name: str
    given_name: str | None
    family_name: str | None
    gender: str | None
    birth_date: str | None
    wikidata_qid: str | None      # ej "Q17620225"
    twitter: str | None
    image_url: str | None
    aliases: list[str]            # de names.csv

@dataclass(frozen=True)
class Membership:
    person_uuid: str
    term: int                     # 10, 11, 12, …
    chamber: str                  # "Congreso de los Diputados"
    group_name: str               # "G.P. Socialista"
    group_short: str              # "GS"
    area: str                     # "Asturias"
    area_id: str                  # "asturias"
    wikidata_group: str | None    # QID del partido/grupo
    wikidata_area: str | None     # QID de la circunscripción
    start_date: str | None
    end_date: str | None
    email: str | None
    twitter: str | None
    facebook: str | None

def load_spain_congress(seed_dir: Path) -> tuple[list[PoliticalActor], list[Membership]]:
    """Lee data/Spain/Congress/{names.csv, term-*.csv, ep-popolo-v1.0.json}."""
    base = seed_dir / "Spain" / "Congress"

    # 1. UUID → lista de alias
    aliases: dict[str, list[str]] = {}
    with (base / "names.csv").open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            aliases.setdefault(row["id"], []).append(row["name"])

    # 2. Persons desde popolo (más rico que term-*.csv)
    popolo = json.loads((base / "ep-popolo-v1.0.json").read_text(encoding="utf-8"))
    by_qid = {
        ident["identifier"]: p["id"]
        for p in popolo["persons"]
        for ident in p.get("identifiers", [])
        if ident["scheme"] == "wikidata"
    }
    actors = [_to_actor(p, aliases.get(p["id"], [])) for p in popolo["persons"]]

    # 3. Memberships desde term-*.csv (más fácil que parsear popolo memberships)
    memberships: list[Membership] = []
    for term_csv in sorted(base.glob("term-*.csv")):
        term = int(term_csv.stem.split("-")[1])
        with term_csv.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                memberships.append(_to_membership(row, term))

    return actors, memberships
```

## Estrategia de ingesta

1. **Bulk import inicial** desde `term-10.csv` y `term-11.csv` → tablas
   `politicos` y `politicos_legislatura`. UUID de EP como columna externa, no PK
   (la PK debe ser nuestro propio surrogate, porque añadiremos políticos
   no cubiertos por EP).
2. **Tabla de alias** (`politicos_alias`) populada desde `names.csv` para fuzzy
   match en NLP/scrapers (ver memoria `project_bloque1_fixes.md` party_alias).
3. **Wikidata QIDs como puente** para enriquecer con queries SPARQL en vivo
   (cargo actual, partido actual, fecha de nacimiento corregida).
4. **Para legislaturas XII+** (no cubiertas por EP), generar UUIDs propios y
   reconciliar a posteriori vía Wikidata.

## Cobertura España

```bash
$ ls data/Spain/Congress/term-*.csv
term-10.csv      # Legislatura X (2011-2015) — completa
term-11.csv      # Legislatura XI (2015-2016) — completa
# term-12, 13, 14, 15: AUSENTES (proyecto on hold desde 2019)
```

Para legislaturas posteriores conviene scrapear el portal del Congreso:
`https://www.congreso.es/busqueda-de-diputados` o queries SPARQL Wikidata
(`P39 = Q19366314` "miembro del Congreso de los Diputados de España").

## Identificadores estables disponibles

| Esquema | Ejemplo | Estabilidad |
|---|---|---|
| EP UUID | `d514d040-…` | Total (definido por el proyecto) |
| Wikidata QID | `Q17620225` | Total (estándar mundial) |
| Twitter handle | `@Adrilastra` | Media (cambia ocasionalmente) |
| Foto congreso.es | `…/diputados/328_11.jpg` | Baja (ID interno por legislatura) |

## Hallazgos / blockers

- **Datos congelados en 2019** → solo cubre hasta legislatura XI. Útil como
  bootstrap pero no como única fuente.
- **Sin LICENSE explícito** en el repo, pero la web del proyecto y la
  política de mySociety declaran los datos como CC0/Public Domain. Conservador:
  usar como referencia y citar la fuente en `data_seeds/`.
- Schema Popolo v1.0 es estándar (popoloproject.com) — nuestro modelo interno
  debería tener un export Popolo para interoperabilidad.
- `names.csv` es **oro** para resolver alias → UUID con un simple lookup; no
  hace falta entrenar NER si el texto contiene el nombre tal cual.
- Senado no está cubierto en este snapshot.
