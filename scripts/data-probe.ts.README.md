# Sprint W.1 · Probe usage

## Ejecución (opciones)

### Opción A · contra dev server local

```bash
cd apps/visual-oscar
npm run dev          # en una terminal
# en otra terminal, desde la raíz del repo:
npx tsx scripts/data-probe.ts
```

Salida en:
- `scripts/data-probe-output.json` (resultado bruto)
- `docs/audits/YYYY-MM-DD_macro_freshness_report.md` (markdown)

### Opción B · contra producción con auth bypass

Para que la sonda pueda llamar a producción sin login:

1. En `middleware.ts`, añadir excepción de auth para `/api/macro/probe-internal`.
2. Crear `/api/macro/probe-internal/route.ts` que itere los 277 indicadores
   internamente con `fetchPulsoIndicator()` y devuelva JSON resumido.
3. Llamarlo con `curl -H 'X-Probe-Token: <secret>'`.

(Pendiente para Sprint W.5 — monitorización continua.)

## Lectura del reporte

El reporte agrupa indicadores en 4 buckets:
- `fresh`  · OK · panel se renderiza con datos al día
- `stale`  · OK · pero el último punto excede la ventana de frescura para su cadencia
- `empty`  · endpoint 200 OK pero `series: []` · parser desfasado o sin datos
- `error`  · endpoint !ok, HTML, o lanza · indicador 100% roto

Tras correrlo, los items en `error` y `empty` son los candidatos al Sprint W.3
(refresco por familia).
