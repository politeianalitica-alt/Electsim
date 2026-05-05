from __future__ import annotations

BRIEFING_MD_TEMPLATE = """# {{title}}

**Fecha:** {{date}}
**Tenant:** {{tenant}}
**Tipo:** Briefing matinal

---

## Resumen ejecutivo

{{summary}}

---

## Titulares clave

{{headlines}}

---

## Riesgos detectados

{{risks}}

---

## Oportunidades

{{opportunities}}

---

## Acciones recomendadas

{{actions}}

---

## Fuentes

{{sources}}

---

_Generado por POLITEIA Intelligence — {{generated_at}}_
"""

BRIEFING_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>{{title}}</title>
<style>
body{background:#080C14;color:#E2E8F0;font-family:-apple-system,Segoe UI,sans-serif;padding:40px;max-width:900px;margin:auto;}
h1{color:#00D4FF;border-bottom:2px solid #00D4FF;padding-bottom:8px;}
h2{color:#00D4FF;margin-top:32px;}
.meta{color:#94A3B8;font-size:13px;}
section{border-left:3px solid #00D4FF;padding-left:16px;margin:20px 0;}
@media print{body{background:#fff;color:#000;}h1,h2{color:#0B3D91;}}
</style>
</head>
<body>
<h1>{{title}}</h1>
<p class="meta">Fecha: {{date}} | Tenant: {{tenant}}</p>
<section><h2>Resumen ejecutivo</h2>{{summary}}</section>
<section><h2>Titulares</h2>{{headlines}}</section>
<section><h2>Riesgos</h2>{{risks}}</section>
<section><h2>Oportunidades</h2>{{opportunities}}</section>
<section><h2>Acciones</h2>{{actions}}</section>
<section><h2>Fuentes</h2>{{sources}}</section>
<p class="meta">Generado por POLITEIA Intelligence — {{generated_at}}</p>
</body></html>
"""
