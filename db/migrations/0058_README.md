# Migration 0058 · canonical_media

Sprint 0+1 Prensa: expand `article` + crear 4 tablas vacías que llenarán los
Sprints 2/3/4.

## Qué cambia

### ALTER TABLE article (12 nuevas columnas)
- `is_noise`, `noise_reason`
- `is_duplicate`, `duplicate_of`
- `processing_status`, `failed_step`
- `ingested_at`, `raw_tags` (JSONB)
- `quality_score`, `framing`
- `entities` (JSONB), `canonical_url` (UNIQUE NOT NULL)

Más 4 índices: `idx_article_processing_status`, `idx_article_ingested_at`,
`idx_article_is_noise` (partial WHERE FALSE), `idx_article_quality_score`.

### CREATE TABLE x4
- `narratives` — Sprint 4 narrative detection
- `entity_metrics` — Sprint 3 ProminenceScore
- `pipeline_metrics` — Sprint 2 telemetría de ingesta
- `topic_prominence_history` — Sprint 2 cron 15min

Cada tabla con sus índices secundarios sobre columnas de filtro frecuente.

## Backfill

`canonical_url` se rellena desde `url` antes de aplicar el `UNIQUE NOT NULL`.
Si tu data tiene duplicados en `url`, el `ADD CONSTRAINT` fallará. Resolver
duplicados antes (ver §IV.7 del spec si hay dudas).

## Aplicación manual (NO automatizar)

Esta migración NO se aplica automáticamente desde CI/Vercel build. La
aplicación es manual y secuencial:

### 1. Staging primero

```bash
# desde la raíz del repo, con DATABASE_URL apuntando a staging
psql "$DATABASE_URL" -f db/migrations/0058_canonical_media.sql
```

Verificar:

```bash
psql "$DATABASE_URL" -c "\d article"            | grep -E "canonical_url|is_noise|quality_score|entities"
psql "$DATABASE_URL" -c "\d narratives"            | head -5
psql "$DATABASE_URL" -c "\d entity_metrics"        | head -5
psql "$DATABASE_URL" -c "\d pipeline_metrics"      | head -5
psql "$DATABASE_URL" -c "\d topic_prominence_history" | head -5
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM article WHERE canonical_url IS NULL;"
```

Expected: 12 columnas nuevas en `article`, las 4 tablas existen, 0 filas con
`canonical_url IS NULL` post-backfill.

### 2. Test downgrade (opcional, en staging)

```bash
psql "$DATABASE_URL" -f db/migrations/0058_canonical_media_downgrade.sql
psql "$DATABASE_URL" -c "\dt narratives"        # debe decir "Did not find any"
# y re-aplicar up para dejar el staging consistente
psql "$DATABASE_URL" -f db/migrations/0058_canonical_media.sql
```

### 3. Producción durante ventana de mantenimiento

Mismo comando, con `DATABASE_URL` apuntando a producción. La migración es
idempotente (`IF NOT EXISTS`) y el backfill se ejecuta dentro de la
transacción, así que reintentos seguros si falla la red.

## Idempotencia

- `CREATE EXTENSION IF NOT EXISTS pgcrypto`
- `ADD COLUMN IF NOT EXISTS` x12
- `CREATE INDEX IF NOT EXISTS` x todos
- `CREATE TABLE IF NOT EXISTS` x4
- `ADD CONSTRAINT` dentro de `DO $$ ... IF NOT EXISTS ... $$`

Re-ejecutar la migración es no-op tras la primera aplicación exitosa.

## Tests

Stub en `apps/visual-oscar/tests/db/migration-0058.test.ts` documentado para
ejecución en staging con `DATABASE_URL`. En local (sin DB) hace `process.exit(0)`.

## Rollback

`0058_canonical_media_downgrade.sql` — destruye las 4 tablas nuevas + 12
columnas. Solo para staging/dev. En prod usar ventana de mantenimiento y
backup previo.
