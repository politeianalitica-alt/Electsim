#!/usr/bin/env node
/**
 * extract_dosieres_fixture.cjs
 *
 * Convierte `apps/visual-oscar/data/dosieres-fixture.ts` (8 MB de
 * literales TypeScript) en un JSON consumible por el script Python
 * `migrate_dossieres_to_unified.py`.
 *
 * Usa el compilador `typescript` que ya está instalado a nivel raíz
 * (devDependency, no añade dependencias nuevas) para transpilar
 * el módulo TS a CommonJS, lo carga vía require() y serializa
 * DOSIERES_FIXTURE a JSON.
 *
 * Uso:
 *   node scripts/extract_dosieres_fixture.cjs
 *   node scripts/extract_dosieres_fixture.cjs --out /tmp/dosieres.json
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');

// ─── CLI args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT_PATH =
  outIdx !== -1 && args[outIdx + 1]
    ? args[outIdx + 1]
    : path.join(os.tmpdir(), 'dosieres-fixture.json');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_TS = path.join(
  REPO_ROOT,
  'apps',
  'visual-oscar',
  'data',
  'dosieres-fixture.ts'
);

if (!fs.existsSync(FIXTURE_TS)) {
  console.error(`[extract] No existe el fixture en ${FIXTURE_TS}`);
  process.exit(1);
}

console.error(`[extract] Leyendo ${FIXTURE_TS}`);
const src = fs.readFileSync(FIXTURE_TS, 'utf8');

console.error(`[extract] Transpilando TS → CommonJS…`);
const transpiled = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const tempCjs = path.join(os.tmpdir(), `_dosieres-fixture-${process.pid}.cjs`);
fs.writeFileSync(tempCjs, transpiled, 'utf8');

let mod;
try {
  // require() acepta rutas absolutas; el módulo es autocontenido.
  // eslint-disable-next-line global-require
  mod = require(tempCjs);
} finally {
  try {
    fs.unlinkSync(tempCjs);
  } catch (_) {
    /* noop */
  }
}

const fixture = mod.DOSIERES_FIXTURE;
if (!Array.isArray(fixture)) {
  console.error(
    `[extract] DOSIERES_FIXTURE no es un array (typeof=${typeof fixture})`
  );
  process.exit(2);
}

console.error(`[extract] ${fixture.length} dossieres → ${OUT_PATH}`);
fs.writeFileSync(OUT_PATH, JSON.stringify(fixture, null, 2), 'utf8');
console.error(`[extract] OK`);
