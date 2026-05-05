# Política de Evidencias

## Principio

> Ninguna afirmación analítica pública sin evidencia verificable.

## Tipos de contenido y requisitos

| Tipo | Objeto | Evidencia | Noción |
|------|--------|-----------|--------|
| press_note | content_asset | Obligatoria | Afirmación pública formal |
| speech | content_asset | Obligatoria | Discurso político |
| thread | content_asset | Obligatoria | Hilo viral público |
| linkedin_post | content_asset | Recomendada | Red social profesional |
| newsletter | content_asset | Recomendada | Comunicación masiva |
| email | content_asset | Recomendada | Comunicación directa |
| q_and_a | content_asset | Recomendada | Argumentario interno |
| analysis | brain_response | Obligatoria | Análisis analítico |
| forecast | brain_response | Obligatoria | Predicción |
| summary | brain_response | Recomendada | Resumen |

## Guardrails automáticos

Ver `core/evidence_policy.py`:
- `detect_quantitative_claims(text)` → detecta % y cifras
- `validate_claims_against_evidence(text, evidence_ids)` → cruza

Ver `communications/comms_guardrails.py`:
- `check_content_risks(content)` → detecta 8 tipos de riesgo
- `run_full_guardrail_check(asset)` → check completo

## Flujo

```
Texto generado
    ↓
detect_quantitative_claims() → lista afirmaciones
    ↓
validate_evidence_ids(evidence_ids) → validar IDs
    ↓
if claims && !evidence → warning o blocked
    ↓
ContentRiskCheck con flags: claim_without_evidence, overconfident_forecast, ...
```
