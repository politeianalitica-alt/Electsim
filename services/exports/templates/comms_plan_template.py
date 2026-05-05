from __future__ import annotations

COMMS_MD_TEMPLATE = """# Plan de Comunicación

**Fecha:** {{date}}
**Tenant:** {{tenant}}
**Campaña:** {{campaign}}

---

## Objetivos

{{objectives}}

---

## Audiencias

{{audiences}}

---

## Mensajes clave

{{key_messages}}

---

## Canales

{{channels}}

---

## Calendario

{{calendar}}

---

## Métricas

{{metrics}}

---

## Aprobaciones requeridas

{{approvals}}

---

_Generado por POLITEIA Intelligence — {{generated_at}}_
"""

COMMS_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Plan de Comunicación</title>
<style>
body{background:#080C14;color:#E2E8F0;font-family:-apple-system,Segoe UI,sans-serif;padding:40px;max-width:900px;margin:auto;}
h1{color:#00D4FF;border-bottom:2px solid #00D4FF;}
h2{color:#00D4FF;margin-top:28px;}
section{border-left:3px solid #00D4FF;padding-left:16px;margin:18px 0;}
.meta{color:#94A3B8;font-size:13px;}
@media print{body{background:#fff;color:#000;}h1,h2{color:#0B3D91;}}
</style></head><body>
<h1>Plan de Comunicación: {{campaign}}</h1>
<p class="meta">Fecha: {{date}} | Tenant: {{tenant}}</p>
<section><h2>Objetivos</h2>{{objectives}}</section>
<section><h2>Audiencias</h2>{{audiences}}</section>
<section><h2>Mensajes clave</h2>{{key_messages}}</section>
<section><h2>Canales</h2>{{channels}}</section>
<section><h2>Calendario</h2>{{calendar}}</section>
<section><h2>Métricas</h2>{{metrics}}</section>
<section><h2>Aprobaciones</h2>{{approvals}}</section>
<p class="meta">Generado por POLITEIA — {{generated_at}}</p>
</body></html>
"""
