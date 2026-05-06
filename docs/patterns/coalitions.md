# coalitions — Patrones extraídos

**Repo de referencia:** `gits amigos/coalitions-master/` (CRAN package)
**Lenguaje original:** R (gtools, dplyr, purrr)
**Licencia:** MIT — Copyright (c) 2017 Andreas Bender. Adaptación libre con atribución.
**Cita académica:** Bender & Bauer (2018), JOSS, doi:10.21105/joss.00606.

## Hallazgo principal — leer antes de seguir

El paquete `coalitions` **NO implementa power indices clásicos** (Banzhaf,
Shapley-Shubik, kingmaker). `grep -i "banzhaf\|shapley\|kingmaker"` sobre
todo el repo no devuelve nada. Lo que implementa es algo distinto y
posiblemente más útil:

> **Bayesian "now-cast" estimation of coalition probabilities en sistemas
> multipartido** — dado un sondeo (encuesta), calcula la **probabilidad de
> que cada coalición posible obtenga mayoría** mediante simulación Monte Carlo.

Para implementar Banzhaf/Shapley en `analytics/coalition_finder.py:compute_kingmaker_score`
hay que escribir el algoritmo desde cero (es bien conocido y trivial); este
paquete aporta **otro patrón complementario** que conviene incorporar.

## Archivos clave inspeccionados

- `coalitions-master/R/DHondt.R` — D'Hondt vectorizado con manejo de empates
- `coalitions-master/R/draw-from-posterior.R` — Dirichlet sampling sobre el sondeo
- `coalitions-master/R/coalition-probability.R` — `has_majority`, `have_majority`,
  `calculate_prob` (excluye coaliciones superiores)
- `coalitions-master/R/seat-distribution.R`, `entry-probabilities.R`,
  `saint-lague-scheppers.R`, `hare_niemeyer.R` — métodos de reparto adicionales
- `coalitions-master/data/` — sondeos de muestra (`surveys_sample`)

## Algoritmo central — D'Hondt (R/DHondt.R)

Implementación R muy compacta:

```r
divisor.mat <- sum(votes) / sapply(votes, "/", seq(1, n_seats))
# Toma los n_seats valores más altos de toda la matriz divisores
m.mat <- m.mat[rank(m.mat$value, ties.method = "random") <= n_seats, ]
# rle() cuenta cuántos toca a cada partido
```

Empates: si el valor en posición `n_seats` == el de `n_seats+1` marca
`attr(result, "ties") <- TRUE` y resuelve aleatoriamente. Útil patrón a
replicar: **devolver no solo el reparto sino una flag de empate**.

> Politeia ya tiene D'Hondt en `etl/electoral_math.py` (ver memoria
> `project_bloque1_fixes.md`). Lo único nuevo a portar es la **flag de empates**
> y el sampling Monte Carlo (siguiente sección).

## Algoritmo central — Bayesian now-cast

**Pipeline conceptual** (a replicar en `analytics/coalition_nowcast.py` nuevo):

1. Sondeo de entrada: tabla con `party`, `votes` (recuento crudo o N×porcentaje),
   `percent`.
2. Modelo a-posteriori Dirichlet: `α = votos + prior` (Jeffreys = 0.5 por partido).
   `draws ~ Dirichlet(α)`, típicamente `nsim = 10_000`.
3. Para cada sample: aplicar D'Hondt → distribución de escaños.
4. Para cada coalición candidata: contar en qué fracción de samples obtiene
   mayoría → `P(coalición tiene mayoría)`.
5. Opcional: **excluir coaliciones superiores** (si una mayor también tiene
   mayoría, no contar la menor) — patrón de `calculate_prob(exclude_superior=TRUE)`.

Adaptación Python sugerida:

```python
# analytics/coalition_nowcast.py — esqueleto
from __future__ import annotations
from dataclasses import dataclass
import numpy as np

def dirichlet_draws(votes: np.ndarray, nsim: int = 10_000,
                    prior: float = 0.5, rng=None) -> np.ndarray:
    """Devuelve matriz (nsim, n_partidos) con shares simulados."""
    rng = rng or np.random.default_rng()
    return rng.dirichlet(votes + prior, size=nsim)

def dhondt(votes: np.ndarray, n_seats: int) -> tuple[np.ndarray, bool]:
    """Reparto D'Hondt. Devuelve (escaños, hubo_empate)."""
    divisors = np.arange(1, n_seats + 1)
    quotients = votes[:, None] / divisors[None, :]   # (n_partidos, n_seats)
    flat = quotients.ravel()
    threshold_idx = np.argpartition(-flat, n_seats - 1)[:n_seats]
    seats = np.zeros_like(votes, dtype=int)
    party_idx = threshold_idx // n_seats
    np.add.at(seats, party_idx, 1)
    sorted_q = np.sort(flat)[::-1]
    has_ties = sorted_q[n_seats - 1] == sorted_q[n_seats] if len(flat) > n_seats else False
    return seats, has_ties

def coalition_majority_probabilities(
    votes: np.ndarray, parties: list[str], n_seats: int,
    coalitions: list[tuple[str, ...]], nsim: int = 10_000,
    seats_majority: int | None = None,
) -> dict[tuple[str, ...], float]:
    seats_majority = seats_majority or (n_seats // 2 + 1)
    draws = dirichlet_draws(votes, nsim=nsim)
    out = {tuple(sorted(c)): 0 for c in coalitions}
    for sample in draws:
        seats, _ = dhondt(sample, n_seats)
        seat_by_party = dict(zip(parties, seats))
        for coal in out:
            if sum(seat_by_party.get(p, 0) for p in coal) >= seats_majority:
                out[coal] += 1
    return {k: v / nsim for k, v in out.items()}
```

## Patrón "exclude superior coalitions"

`R/coalition-probability.R::calculate_prob` filtra superconjuntos: si la
probabilidad de la coalición C₁ ⊂ C₂ ya cuenta los samples donde C₂ gana,
restamos los samples donde solo C₂ (no C₁) gana. Esto da la probabilidad de
que C₁ sea la **coalición mínima viable** — más informativo políticamente.

```python
def exclude_superior(probs: dict[frozenset, float]) -> dict[frozenset, float]:
    out = {}
    for c, p_c in probs.items():
        superior_p = sum(probs[c2] for c2 in probs if c < c2)
        out[c] = max(0.0, p_c - superior_p)
    return out
```

## Adaptación a `compute_kingmaker_score`

El kingmaker score clásico (Banzhaf) **no está en este paquete**, pero se
implementa así (independiente):

```python
# analytics/coalition_finder.py — kingmaker (Banzhaf normalizado)
from itertools import combinations

def banzhaf_kingmaker(seats: dict[str, int], majority: int) -> dict[str, float]:
    parties = list(seats)
    total_swings = {p: 0 for p in parties}
    grand = 0
    for r in range(1, len(parties) + 1):
        for coal in combinations(parties, r):
            if sum(seats[p] for p in coal) < majority:
                continue
            for p in coal:
                if sum(seats[q] for q in coal if q != p) < majority:
                    total_swings[p] += 1
                    grand += 1
    if grand == 0:
        return {p: 0.0 for p in parties}
    return {p: s / grand for p, s in total_swings.items()}
```

Con N partidos pequeño (≤ ~20) la enumeración es viable. Para Congreso con
13 grupos efectivos = 2¹³ = 8192 coaliciones, instantáneo.

**Combinar ambos enfoques:** (a) Banzhaf con escaños deterministas para el
informe principal; (b) usar el now-cast Bayesiano del paquete `coalitions`
para reportar **bandas de incertidumbre** (P(C tiene mayoría) basada en
los últimos sondeos) — esto es lo que hace este paquete y lo que aporta
respecto a lo que ya tenemos.

## Idempotencia y caching

- Para nowcast: cachear `(survey_id, nsim, seed)` → matriz de simulaciones.
- Para Banzhaf: cachear `(frozenset(seats.items()), majority)` → vector de scores.

## Hallazgos / blockers

- **Sin blockers de licencia.** MIT permite adaptar libremente con atribución
  en el fichero (`# Adapted from coalitions R package by A. Bender, MIT, 2017`).
- El paquete **NO** implementa Banzhaf/Shapley (asunción inicial errónea);
  esos algoritmos hay que escribirlos a mano (10-20 líneas Python).
- Lo verdaderamente valioso aquí es el **patrón Bayesiano de propagación de
  incertidumbre del sondeo a la probabilidad de cada coalición**. Esto es nuevo
  para Politeia y conviene añadirlo en `analytics/coalition_nowcast.py` como
  módulo separado.
- Rendimiento: 10k simulaciones × D'Hondt en 350 escaños = ~1s en NumPy
  vectorizado. Aceptable para job ETL nocturno; para tiempo real conviene
  cachear y solo recomputar cuando llega un sondeo nuevo.
