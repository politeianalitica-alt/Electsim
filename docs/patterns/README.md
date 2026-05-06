# Patrones extraídos de `gits amigos/`

Documentos de referencia para reescribir (no copiar) componentes inspirados en
repos de terceros. Cada doc cita licencia, archivos inspeccionados y bloque
de Politeia donde aplica.

| Doc | Repo origen | Licencia | Aplica a |
|---|---|---|---|
| [boe.md](./boe.md) | `BOE-master/` (rOpenSpain, R) | MIT | `etl/sources/boe.py` |
| [congreso.md](./congreso.md) | `Congreso-Scrapper-main 3/` (Python) | Sin LICENSE — solo estudio | `etl/sources/congreso.py`, `congreso_iniciativas.py` |
| [pysentimiento.md](./pysentimiento.md) | `pysentimiento-master/` | **Non-commercial** — investigación interna o reentrenar | `analytics/sentiment_engine_v2.py` (research backend) |
| [coalitions.md](./coalitions.md) | `coalitions-master/` (CRAN, R) | MIT | `analytics/coalition_finder.py`, nuevo `analytics/coalition_nowcast.py` |
| [everypolitician.md](./everypolitician.md) | `everypolitician-data-master/` | Datos CC0 (proyecto on hold) | `data_seeds/political_actors.py` |

## Resumen ejecutivo

**boe.md** documenta la estructura URL del BOE (`/diario_boe/xml.php?id=BOE-{A,B,S}-…`),
el schema del sumario diario (11 columnas, una por publicación) y el pipeline
recomendado en Python con `httpx` + `lxml` + `tenacity`. Sin blockers; licencia
MIT permite adaptación libre. Incluye esqueleto `BoeClient` y mapeo a la
migración 0013 existente.

**congreso.md** describe el flujo del portal opendata del Congreso (HTML →
ZIP con N JSONs por sesión) y el schema completo del JSON oficial de
votaciones (`informacion` + `votaciones[]` con voto por escaño). Sin LICENSE
en el repo origen → escribir código original. Aporta esqueleto
`CongresoClient` y nota sobre el endpoint paralelo `/iniciativas`. Identifica
la falta de IDs estables de diputado entre legislaturas como gotcha.

**pysentimiento.md** es **bloqueante para SaaS comercial** (licencia
non-commercial). Documenta el registro `models` con todos los checkpoints HF
para español (RoBERTuito-base por tarea), API `create_analyzer(task, lang)`
y propone tres opciones de migración: (A) backend research-only detrás de
flag, (B) reentrenar sobre BNE-RoBERTa con datasets compatibles, (C) API
externa (Cohere/OpenAI/Azure). Tamaños y latencia de modelos documentados.

**coalitions.md** corrige una asunción inicial: el paquete **NO implementa**
Banzhaf/Shapley/kingmaker. Lo que aporta es un patrón Bayesiano de
nowcasting (Dirichlet sampling sobre el sondeo + D'Hondt × 10k samples →
P(coalición tiene mayoría)) que conviene añadir como módulo
`analytics/coalition_nowcast.py` complementario. Incluye implementación
NumPy vectorizada de D'Hondt con flag de empates y Banzhaf clásico (10
líneas) para el kingmaker score real.

**everypolitician.md** documenta el schema Popolo v1.0 y el formato de los
CSV por legislatura con 19 columnas (incluyendo Wikidata QID y alias).
Cobertura solo hasta legislatura XI (2015-2016) — proyecto on hold. Aporta
`names.csv` (alias → UUID) como tabla de oro para fuzzy matching en
scrapers/NLP. Esqueleto `load_spain_congress` para bulk import en
`data_seeds/political_actors.py`. Senado no cubierto.

## Reglas de uso

1. **MIT (BOE, coalitions):** adaptar libremente, citar autor en cabecera del
   archivo Python que se inspire.
2. **Sin LICENSE (Congreso scrapper):** reescribir desde cero usando solo el
   conocimiento del schema JSON público del Congreso, no las líneas de código
   del repo.
3. **Non-commercial (pysentimiento):** no usar en código de producción facturada.
   Confinar a notebooks / research / pipelines internas. Migrar a backend con
   licencia comercial antes de exponer la funcionalidad a clientes.
4. **CC0/sin LICENSE pero datos públicos (everypolitician):** los datos son
   reutilizables; añadir nota de atribución en `data_seeds/`.

## Próximos pasos sugeridos

- [ ] Implementar `etl/sources/boe.py` siguiendo `boe.md` (low risk, MIT).
- [ ] Implementar `etl/sources/congreso.py` (votaciones) siguiendo `congreso.md`.
- [ ] Crear `analytics/coalition_nowcast.py` con el patrón Bayesiano de
      `coalitions.md` (alto valor analítico, complementa Banzhaf).
- [ ] Añadir backend research `pysentimiento` con flag `POLITEIA_RESEARCH_MODE`
      mientras se evalúa opción B/C para producción.
- [ ] Bulk import `data/Spain/Congress/term-*.csv` y `names.csv` a
      `data_seeds/political_actors.py` + tabla de alias.
