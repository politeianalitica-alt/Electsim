# Railway · Runbook y optimización del ecosistema

> Fuente de verdad operativa del despliegue de Politeia en Railway.
> Plan de pago. Arquitectura multi-servicio. Spec: `docs/superpowers/specs/2026-06-02-railway-optimizacion-design.md`.

---

## 1. Arquitectura

```
Railway project "Politeia"
├── api        · FastAPI · Dockerfile.railway · railway.toml (canónico)
├── worker     · Celery worker · Dockerfile.worker · scheduler/worker-start.sh
├── beat       · Celery beat (cron) · Dockerfile.worker · scheduler/beat-start.sh
├── redis      · plugin Railway · broker + result backend (private networking)
└── Postgres   · plugin Railway · 15 tablas Prensa + Investigations + core
```

- **api**: sirve la API HTTP que consume el frontend Vercel. Ligera
  (`requirements-api-prod.txt`, sin torch/spacy/BERTopic).
- **worker**: ejecuta el pipeline pesado (ingesta mediática, NLP, Ollama
  actores, intelligence). Imagen completa (`requirements-worker.txt`).
- **beat**: scheduler always-on de 1 instancia que encola las tareas
  programadas (`scheduler/beat_schedule.py`).
- **redis**: broker + backend de Celery, vía red privada interna (sin egress).
- **Postgres**: base de datos compartida por api + worker.

---

## 2. Servicios · arranque y config

| Servicio | Dockerfile | startCommand | Healthcheck | minInstances |
|----------|-----------|--------------|-------------|--------------|
| api | `Dockerfile.railway` | (en `railway.toml`) uvicorn | `/health` | 1 |
| worker | `Dockerfile.worker` | `bash scheduler/worker-start.sh` | `celery inspect ping` (opcional) | 1 |
| beat | `Dockerfile.worker` | `bash scheduler/beat-start.sh` | — (proceso único) | 1 |

`railway.toml` solo configura el servicio por defecto (`api`). Los servicios
`worker` y `beat` se crean en el dashboard apuntando al mismo repo, con su
`dockerfilePath` (`Dockerfile.worker`) y su `startCommand`.

---

## 3. Variables de entorno por servicio

**Comunes (api + worker + beat):**
- `DATABASE_URL` → Postgres interno (`postgresql://...@postgres.railway.internal:5432/railway`)
- `OPENAI_API_KEY`, `OPENAI_BASE_URL` (Groq), `ELECTSIM_OPENAI_MODEL`

**api:**
- `WEB_CONCURRENCY` (workers uvicorn · default 2)
- `DB_POOL_SIZE=5`, `DB_MAX_OVERFLOW=10`

**worker + beat:**
- `REDIS_URL` → Redis interno (`redis://...@redis.railway.internal:6379`)
  (lo usan `celery_broker_url`/`celery_result_backend` en `config/settings.py`)
- `OLLAMA_BASE_URL` (si el worker usa Ollama)
- `CELERY_CONCURRENCY` (default 4), `CELERY_MAX_MEM_KB` (default 1500000)
- `DB_POOL_SIZE=2`, `DB_MAX_OVERFLOW=4` (pool pequeño por proceso · ver §5)

> No pongas secretos en el repo. Si se compartió alguno en chat, **rótalo**.

---

## 4. Migraciones

Release command del servicio `api` en el dashboard:

```
bash scripts/railway-release.sh
```

Ejecuta `alembic upgrade head` (idempotente, nunca downgrade) antes de cada
deploy. Si `DATABASE_URL` falta, no rompe (sale 0).

---

## 5. Base de datos · pooling y conexiones

Pool SQLAlchemy en `db/session.py` (configurable por env). Cálculo del total de
conexiones a Postgres para no agotarlo:

```
total ≈ api_instances × (DB_POOL_SIZE + DB_MAX_OVERFLOW)
      + worker_concurrency × (DB_POOL_SIZE + DB_MAX_OVERFLOW)
      + beat (1)
```

Ejemplo: api(1×15) + worker(4×6) + beat(1) = 40 conns. Verifica < límite de tu
plan Postgres. Recomendado:
- **api**: `DB_POOL_SIZE=5`, `DB_MAX_OVERFLOW=10`
- **worker**: `DB_POOL_SIZE=2`, `DB_MAX_OVERFLOW=4` (concurrencia alta → pool
  pequeño por proceso)

Si la concurrencia crece, activar **PgBouncer** (transaction mode) delante de
Postgres y apuntar `DATABASE_URL` al pooler.

---

## 6. Backups

Activar en el dashboard de Postgres: **backups automáticos** + retención
(diario, 7-30 días según plan). Probar un restore al menos una vez.

---

## 7. Escalado y coste

- **api**: autoescalado por request/CPU. `minInstances=1` (no cold-start en
  fichas que tardan 30-40s), `maxInstances` según tráfico.
- **worker**: `minInstances=1`; escalar horizontal si las colas se atascan
  (Railway: réplicas del servicio worker).
- **beat**: SIEMPRE `minInstances=1` y NUNCA más de 1 (un solo scheduler, o se
  duplican los crons).
- **redis**: instancia pequeña (broker ligero).
- Right-sizing RAM: api ~512MB-1GB; worker según Ollama/BERTopic (2-4GB);
  beat ~256MB; redis ~256MB. Ajustar tras ver métricas reales.

---

## 8. Observabilidad

- Healthcheck `/health` (liveness) + `/api/system/health` (readiness rica:
  DB, migraciones, tablas, módulos · `core/health.py`).
- Logs estructurados vía `RequestLoggingMiddleware` (api/middleware.py).
- Activar **alertas** de Railway (fallo de deploy, crash loop) + revisar
  métricas RAM/CPU para right-sizing.

---

## 9. Checklist dashboard (acciones que requieren `railway login` / dashboard)

> El repo (este runbook + configs + scripts) deja TODO listo. Estos pasos se
> aplican una vez en el dashboard de Railway (o por Claude en vivo tras
> `railway login`).

- [ ] **Redis**: añadir plugin Redis al proyecto. Copiar su URL interna.
- [ ] **Servicio `worker`**: nuevo servicio desde el repo · `Dockerfile.worker`
      · startCommand `bash scheduler/worker-start.sh` · env (REDIS_URL,
      DATABASE_URL, OPENAI_*, OLLAMA_BASE_URL, CELERY_*, DB_POOL_SIZE=2).
- [ ] **Servicio `beat`**: nuevo servicio · `Dockerfile.worker` · startCommand
      `bash scheduler/beat-start.sh` · misma env · `minInstances=1` fijo.
- [ ] **Postgres backups**: activar automáticos + retención.
- [ ] **Release command** del `api`: `bash scripts/railway-release.sh`.
- [ ] **Autoescalado** del `api` (request/CPU). Revisar `minInstances`.
- [ ] **Pooling**: si el plan ofrece PgBouncer gestionado, activarlo.
- [ ] **Alertas/métricas**: notificaciones de fallo + revisar RAM/CPU.
- [ ] **Env vars**: confirmar todas por servicio. Rotar secretos compartidos.
- [ ] **Verificar tras cambios**: `api` responde `/health`; worker consume
      colas (`celery inspect active`); beat encola (logs); migraciones OK.

---

## 10. Troubleshooting

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| Worker no procesa | Redis caído / `REDIS_URL` mal | Revisar Redis + env |
| `too many connections` Postgres | pool×concurrencia > límite | Bajar pools / PgBouncer (§5) |
| beat duplica tareas | >1 instancia de beat | Forzar 1 sola instancia |
| Deploy api falla healthcheck | arranque lento / `/health` caído | Subir `healthcheckTimeout` / revisar logs |
| Migración no aplicada | release command no configurado | Configurar `scripts/railway-release.sh` |
| OOM en worker | BERTopic/Ollama RAM | Bajar `CELERY_CONCURRENCY` / subir RAM servicio |

---

## 11. Cambios de config (historial)

- **R1** (2026-06-02): `railway.toml` canónico, `railway.json` eliminado
  (deriva de config), healthcheck `/health` consistente, `WEB_CONCURRENCY`.
- **R2**: `Dockerfile.worker` + `scheduler/{worker,beat}-start.sh` +
  `requirements-worker.txt`.
- **R3**: `scripts/railway-release.sh` (migraciones automáticas) + guía pooling.
- **R4**: este runbook.
- **R5** (pendiente · requiere `railway login`): crear Redis + worker + beat,
  backups, autoescalado, release command, deploy y smoke en vivo.
