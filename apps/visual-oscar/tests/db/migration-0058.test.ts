/**
 * Migration 0058 canonical_media · validation tests
 *
 * REQUIRES: DATABASE_URL env var pointing to a Postgres with `article` + `medios_config` tables.
 * NOT executed in local dev (no DB). Run in staging:
 *
 *   DATABASE_URL=postgresql://... node --experimental-strip-types --no-warnings tests/db/migration-0058.test.ts
 *
 * Tests:
 *   1. Migration applies cleanly (no errors)
 *   2. Tables narratives, entity_metrics, pipeline_metrics, topic_prominence_history exist
 *   3. article has new columns canonical_url (NOT NULL UNIQUE), is_noise, processing_status, etc.
 *   4. Downgrade reverses cleanly
 *   5. Backfill: canonical_url = url for all existing rows
 */
import assert from 'node:assert/strict'

if (!process.env.DATABASE_URL) {
  console.log('SKIP: DATABASE_URL not set. Migration 0058 tests require staging DB.')
  process.exit(0)
}

// TODO Sprint 1.1+: implement when DB available in CI
console.log('TODO: implement when CI has staging DATABASE_URL')

// Reference the import so TypeScript doesn't complain about unused.
void assert
