from __future__ import annotations

ELECTORAL_MD_TEMPLATE = """# Snapshot Electoral

**Fecha:** {{date}}
**Tenant:** {{tenant}}
**Circunscripción:** {{constituency}}

---

## Resumen del nowcast

{{summary}}

---

## Partidos y estimación de escaños

{{parties}}

---

## Bloques

{{blocks}}

---

## Escenarios de coalición

{{coalitions}}

---

## Trasvases relevantes

{{transfers}}

---

## Incertidumbre y supuestos

{{assumptions}}

---

## Fuentes

{{sources}}

---

_Generado por POLITEIA Intelligence — {{generated_at}}_
"""

ELECTORAL_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Snapshot Electoral</title>
<style>
body{background:#080C14;color:#E2E8F0;font-family:-apple-system,Segoe UI,sans-serif;padding:40px;max-width:900px;margin:auto;}
h1{color:#00D4FF;border-bottom:2px solid #00D4FF;}
h2{color:#00D4FF;margin-top:28px;}
section{border-left:3px solid #00D4FF;padding-left:16px;margin:18px 0;}
table{border-collapse:collapse;width:100%;}
th,td{border:1px solid #1F2937;padding:6px 10px;text-align:left;}
th{background:#0F172A;color:#00D4FF;}
.meta{color:#94A3B8;font-size:13px;}
@media print{body{background:#fff;color:#000;}h1,h2{color:#0B3D91;}}
</style></head><body>
<h1>Snapshot Electoral: {{constituency}}</h1>
<p class="meta">Fecha: {{date}} | Tenant: {{tenant}}</p>
<section><h2>Resumen</h2>{{summary}}</section>
<section><h2>Partidos</h2>{{parties}}</section>
<section><h2>Bloques</h2>{{blocks}}</section>
<section><h2>Coaliciones</h2>{{coalitions}}</section>
<section><h2>Trasvases</h2>{{transfers}}</section>
<section><h2>Supuestos</h2>{{assumptions}}</section>
<section><h2>Fuentes</h2>{{sources}}</section>
<p class="meta">Generado por POLITEIA — {{generated_at}}</p>
</body></html>
"""
