from __future__ import annotations

DOSSIER_MD_TEMPLATE = """# Dossier: {{name}}

**Fecha:** {{date}}
**Tenant:** {{tenant}}

---

## Biografía

{{biography}}

---

## Trayectoria

{{trajectory}}

---

## Posicionamiento

{{positioning}}

---

## Red de relaciones

{{network}}

---

## Mensajes recientes

{{messages}}

---

## Riesgos reputacionales

{{risks}}

---

## Fuentes

{{sources}}

---

_Generado por POLITEIA Intelligence — {{generated_at}}_
"""

DOSSIER_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Dossier {{name}}</title>
<style>
body{background:#080C14;color:#E2E8F0;font-family:-apple-system,Segoe UI,sans-serif;padding:40px;max-width:900px;margin:auto;}
h1{color:#00D4FF;border-bottom:2px solid #00D4FF;}
h2{color:#00D4FF;margin-top:28px;}
section{border-left:3px solid #00D4FF;padding-left:16px;margin:18px 0;}
.meta{color:#94A3B8;font-size:13px;}
@media print{body{background:#fff;color:#000;}h1,h2{color:#0B3D91;}}
</style></head><body>
<h1>Dossier: {{name}}</h1>
<p class="meta">Fecha: {{date}} | Tenant: {{tenant}}</p>
<section><h2>Biografía</h2>{{biography}}</section>
<section><h2>Trayectoria</h2>{{trajectory}}</section>
<section><h2>Posicionamiento</h2>{{positioning}}</section>
<section><h2>Red</h2>{{network}}</section>
<section><h2>Mensajes</h2>{{messages}}</section>
<section><h2>Riesgos</h2>{{risks}}</section>
<section><h2>Fuentes</h2>{{sources}}</section>
<p class="meta">Generado por POLITEIA — {{generated_at}}</p>
</body></html>
"""
