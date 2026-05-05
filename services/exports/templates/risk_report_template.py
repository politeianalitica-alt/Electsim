from __future__ import annotations

RISK_MD_TEMPLATE = """# Informe de Riesgos

**Fecha:** {{date}}
**Tenant:** {{tenant}}

---

## Resumen

{{summary}}

---

## Riesgos por severidad

### Críticos

{{critical}}

### Altos

{{high}}

### Medios

{{medium}}

### Bajos

{{low}}

---

## Recomendaciones de mitigación

{{mitigations}}

---

## Fuentes

{{sources}}

---

_Generado por POLITEIA Intelligence — {{generated_at}}_
"""

RISK_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Informe de Riesgos</title>
<style>
body{background:#080C14;color:#E2E8F0;font-family:-apple-system,Segoe UI,sans-serif;padding:40px;max-width:900px;margin:auto;}
h1{color:#00D4FF;border-bottom:2px solid #00D4FF;}
h2{color:#00D4FF;margin-top:28px;}
h3.critical{color:#EF4444;}
h3.high{color:#F59E0B;}
h3.medium{color:#FACC15;}
h3.low{color:#22C55E;}
section{border-left:3px solid #00D4FF;padding-left:16px;margin:18px 0;}
.meta{color:#94A3B8;font-size:13px;}
@media print{body{background:#fff;color:#000;}h1,h2{color:#0B3D91;}}
</style></head><body>
<h1>Informe de Riesgos</h1>
<p class="meta">Fecha: {{date}} | Tenant: {{tenant}}</p>
<section><h2>Resumen</h2>{{summary}}</section>
<section><h3 class="critical">Críticos</h3>{{critical}}</section>
<section><h3 class="high">Altos</h3>{{high}}</section>
<section><h3 class="medium">Medios</h3>{{medium}}</section>
<section><h3 class="low">Bajos</h3>{{low}}</section>
<section><h2>Mitigaciones</h2>{{mitigations}}</section>
<section><h2>Fuentes</h2>{{sources}}</section>
<p class="meta">Generado por POLITEIA — {{generated_at}}</p>
</body></html>
"""
