# Optimización del ecosistema Railway · Design

**Fecha:** 2026-06-02
**Estado:** Aprobado por el usuario (verbal). Ejecución autónoma repo-side + checklist dashboard.
**Branch:** `claude/sharp-keller-3d6d48`

---

## §0 · Objetivo

Explotar el máximo potencial del plan de pago de Railway de Politeia. Hoy Railway
solo corre la **API FastAPI** + **Postgres**; el pipeline automático (Celery
worker + beat + Redis) está definido en el repo (`/scheduler/`) pero **no
desplegado**. Cubrir las 4 dimensiones aprobadas: activar pipeline, BD/rendimiento,
coste/escalado, higiene/observabilidad.

**Restricción de acceso:** el Railway CLI está OAuth-expirado. El trabajo se parte en:
- **Repo-side** (Claude, autónomo): configs, Dockerfile, automatización, docs.
- **Dashboard/CLI** (usuario tras `railway login`, o Claude en vivo cuando re-autentique):
  servicios nuevos, Redis, backups, autoescalado, env vars, plan.

---

## §1 · Estado actual (descubierto del repo)

- `railway.toml` (canónico-ish) + `railway.json` (legacy) **se contradicen**:
  - healthcheck: `/health` (.toml) vs `/api/system/health` (.json)
  - startCommand: `--workers 2` (.toml) vs sin workers (.json)
- `Dockerfile.railway`: Python 3.11-slim, `requirements-api-prod.txt`, uvicorn.
- API: `api.main:app`, FastAPI, 27 routers, healthcheck, restart ON_FAILURE x5,
  minInstances=1 / maxInstances=2.
- Postgres: pool SQLAlchemy 5+10 (`DB_POOL_SIZE`/`DB_MAX_OVERFLOW`),
  `pool_recycle=1800`, `pool_pre_ping=True`. Sin PgBouncer.
- `/scheduler/`: Celery (5 colas: ingesta/nlp/ollama/intelligence/mantenimiento),
  beat (ingesta horaria, Ollama 30min, healthcheck 5min, VACUUM semanal, briefings
  07:30), `worker_max_memory_per_child=1.5GB`. Requiere Redis. **No en Railway.**
- Migraciones Alembic, **sin automatización de deploy visible** (se corren a mano).
- Sin runbook Railway en `docs/`.

---

## §2 · Arquitectura objetivo

```
Railway project "Politeia"
├── api        · FastAPI (uvicorn) · existe → afinar
├── worker     · Celery worker (-Q ingesta,nlp,ollama,intelligence,mantenimiento) · NUEVO
├── beat       · Celery beat (cron scheduler) · NUEVO
├── redis      · broker + result backend (plugin Railway, private networking) · NUEVO
└── Postgres   · existe → pooling + backups
```

Los 3 servicios comparten el repo y `Dockerfile.railway` (mismo build, distinto
`startCommand`). Redis interno vía private networking (`redis.railway.internal`,
sin coste de egress).

---

## §3 · Cambios repo-side (Claude, autónomo)

### §3.1 · Config canónica (Dim 4)
- Eliminar `railway.json` (o reducirlo a no-op); `railway.toml` único canónico.
- Healthcheck consistente: `/health` (liveness simple) en todos.
- `startCommand` API: `gunicorn -k uvicorn.workers.UvicornWorker api.main:app
  --bind 0.0.0.0:$PORT --workers ${WEB_CONCURRENCY:-2} --timeout 60` (gunicorn
  gestiona workers + graceful restart mejor que uvicorn --workers en prod).
- Multi-servicio: documentar en `railway.toml` los 3 servicios (o un
  `railway.toml` por servicio si Railway lo requiere vía dashboard).

### §3.2 · Servicios Celery (Dim 1)
- `scheduler/worker-start.sh` y `scheduler/beat-start.sh` (comandos de arranque).
- Worker: `celery -A scheduler.celery_app worker -Q ingesta,nlp,ollama,intelligence,mantenimiento --concurrency=${CELERY_CONCURRENCY:-4} --max-memory-per-child=1500000`.
- Beat: `celery -A scheduler.celery_app beat --loglevel=info`.
- Healthcheck worker: `celery -A scheduler.celery_app inspect ping` (o un beat
  heartbeat a Postgres).
- `requirements-worker.txt` si el worker necesita deps que la API no (celery,
  redis, trafilatura, BERTopic) — separar del `requirements-api-prod.txt` ligero.

### §3.3 · BD / pooling (Dim 2)
- Pool por servicio vía env: API `DB_POOL_SIZE=5/overflow 10`; worker
  `DB_POOL_SIZE=2/overflow 4` por proceso (concurrency alta → pool pequeño por
  worker para no agotar Postgres). Documentar el cálculo: `total_conns ≈
  (api_instances × (pool+overflow)) + (worker_concurrency × (pool+overflow)) +
  beat`. Verificar < límite de Postgres.
- Documentar PgBouncer / pooling gestionado (transaction mode) para cuando la
  concurrencia crezca.

### §3.4 · Migraciones automáticas (Dim 4)
- `scripts/railway-release.sh`: `alembic upgrade head` idempotente + guard.
- Documentar como **release command** del servicio API en Railway (pre-deploy),
  o un servicio one-off. (La ejecución se configura en dashboard.)

### §3.5 · Runbook (Dim 4)
- `docs/RAILWAY.md`: arquitectura, servicios, env vars por servicio, cómo
  desplegar, cómo correr migraciones, healthchecks, backups, escalado, costes,
  troubleshooting (Celery no consume, Redis caído, pool agotado).

---

## §4 · Checklist dashboard (usuario / Claude en vivo tras login)

1. **Redis**: añadir plugin Redis al proyecto. Copiar `REDIS_URL` interno.
2. **Servicios nuevos**: crear `worker` y `beat` desde el mismo repo, con sus
   `startCommand` (§3.2) y env (`CELERY_BROKER_URL`/`CELERY_RESULT_BACKEND` =
   Redis interno, `DATABASE_URL` = Postgres interno, claves LLM).
3. **Postgres backups**: activar backups automáticos + retención.
4. **Pooling gestionado**: activar si el plan lo ofrece.
5. **Autoescalado API**: configurar por request/CPU; `minInstances` solo donde
   haga falta (beat=1 always-on, worker=1+, api=1+ con autoescalado).
6. **Release command**: `bash scripts/railway-release.sh` (migraciones) en el
   servicio API.
7. **Alertas/métricas**: activar notificaciones de fallo + revisar métricas
   RAM/CPU para right-sizing.
8. **Env vars**: confirmar todas las claves por servicio (no compartir secretos
   en chat; rotar si se compartieron).

---

## §5 · Sprints (ejecución autónoma repo-side)

| Sprint | Contenido | Acceso |
|--------|-----------|--------|
| **R1 · Higiene config** | railway.toml canónico, eliminar/neutralizar railway.json, healthcheck + gunicorn, alinear con repo | repo |
| **R2 · Servicios Celery** | worker/beat start scripts, requirements-worker, healthcheck worker, config multi-servicio documentada | repo |
| **R3 · BD + migraciones** | pool por servicio, release script alembic, doc PgBouncer | repo |
| **R4 · Runbook + checklist** | docs/RAILWAY.md completo + checklist dashboard accionable | repo |
| **R5 · En vivo** (tras `railway login`) | inspección real, crear Redis+worker+beat, backups, autoescalado, release command, deploy, smoke | dashboard/CLI |

R1-R4 autónomos ahora. R5 cuando el usuario re-autentique el CLI (o me dé token).

---

## §6 · Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Worker Celery dispara RAM (BERTopic/Ollama) | `max-memory-per-child` + concurrency baja en colas pesadas (ya en celery_app) + right-sizing del servicio |
| Pool DB agotado al sumar worker+api | Pool pequeño por proceso + cálculo documentado + PgBouncer si crece |
| Redis caído → pipeline parado | Healthcheck + restart policy + alerta |
| Cambiar startCommand rompe el deploy API actual | gunicorn probado en build local; rollback vía backup tags; R5 valida en vivo antes de confiar |
| Migraciones automáticas peligrosas | release script idempotente (`upgrade head` es seguro; nunca downgrade auto) |
| Sin login no se completa R5 | R1-R4 dejan todo listo; R5 es ejecutable en minutos cuando el CLI esté |

---

## §7 · Out of scope
- No tocar el frontend Vercel ni el deploy de Energía.
- No migrar Postgres fuera de Railway (decisión previa: se queda).
- No reescribir el pipeline Celery (ya existe); solo desplegarlo y afinarlo.
