# TAB 4 — Riesgo & Crisis Intelligence: Delivery Report

**Branch:** `tab-riesgo-crisis-intelligence`
**Date:** 2026-05-06
**Status:** ✅ Complete

## Objective

Transform `/riesgo` from a single-panel risk gauge (GLOBAL_RISK=67 hardcoded) into a professional 5-tab risk intelligence center.

## What Was Built

### Backend

| File | Description |
|------|-------------|
| `api/schemas/risk.py` | 14 rich models: RiskDimension, RiskSignal, CrisisSignal, EarlyWarningIndicator, RiskScenario, RiskTimelinePoint, RiskKpiItem, RiskOverviewResponse, RiskSignalsResponse, RiskAnalysisRequest/Response + legacy compat |
| `services/risk/__init__.py` | Package marker |
| `services/risk/risk_scoring.py` | Pure functions: score_signal (0.55*impact + 0.35*prob + velocity_bonus), severity_from_score, global_score_from_dimensions (weighted: legislative 18%, media 18%, coalition 15%, actors 12%, economic 12%, geopolitical 10%, system 8%, territorial 7%) |
| `services/risk/risk_fixtures.py` | 8 dimensions, 3 crisis signals, 5 signals, 6 early warning indicators, 3 scenarios, 8 timeline points, 30-day sparkline |
| `services/risk/risk_service.py` | get_overview, get_signals, analyze_risk — all with DB→fixtures fallback |
| `api/routers/risk.py` | 13 endpoints (replaces previous basic router) |

### Frontend

| File | Description |
|------|-------------|
| `apps/web/lib/types/risk_rich.ts` | 14 TypeScript interfaces + 7 type aliases |
| `apps/web/lib/api/endpoints.ts` | 12 new risk endpoint functions added |
| `apps/web/components/risk/` | 11 components: RiskGauge, RiskKpiBar, RiskSparkline, RiskDimensionGrid, RiskSignalList, RiskCrisisAlert, RiskEarlyWarning, RiskScenarioCard, RiskTimeline, RiskHeatmap, RiskBrainAnalysis |
| `apps/web/app/riesgo/page.tsx` | 5-tab console: Monitor / Señales / Escenarios / Timeline / Brain |

## API Endpoints (13 total)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/risk/overview-v2` | Full rich overview |
| GET | `/api/risk/dimensions` | 8 domain dimensions |
| GET | `/api/risk/signals` | Filtered signals list |
| GET | `/api/risk/crisis` | Active crisis signals |
| GET | `/api/risk/early-warnings` | Traffic-light indicators |
| GET | `/api/risk/spark` | 30-day sparkline |
| GET | `/api/risk/scenarios` | Risk scenarios |
| GET | `/api/risk/timeline` | Score timeline |
| GET | `/api/risk/heatmap` | Domain heatmap |
| GET | `/api/risk/kpis` | KPI metrics |
| POST | `/api/risk/analyze` | Brain LLM analysis |
| POST | `/api/risk/snapshot` | Save risk snapshot |
| GET | `/api/risk/overview` | Legacy compat |

## Risk Scoring Formula

```
base = 0.55 × impact + 0.35 × probability
velocity_bonus: surging+15, fast+10, moderate+5, slow+0
evidence_bonus: min(evidence_count // 5, 5)
final = (base + velocity_bonus + evidence_bonus) × confidence
```

## Domain Weights

| Domain | Weight |
|--------|--------|
| Legislative | 18% |
| Media | 18% |
| Coalition | 15% |
| Actors | 12% |
| Economic | 12% |
| Geopolitical | 10% |
| System | 8% |
| Territorial | 7% |

## Git Log (7 commits)

```
feat(riesgo): rich schema system — 14 models for risk intelligence
feat(riesgo): services layer — fixtures (8 dims, 3 crisis, 5 signals, 6 warnings) + scoring
feat(riesgo): 13 endpoints — overview-v2 + dimensions + signals + crisis + early-warnings + spark + scenarios + timeline + heatmap + kpis + analyze + snapshot + legacy
feat(riesgo): TS rich types + 12 new API endpoint functions
feat(riesgo): 11 React components — gauge, kpi-bar, sparkline, dimensions, signals, crisis-alert, early-warning, scenario, timeline, heatmap, brain
feat(riesgo): rewrite page — 5-tab console: monitor/señales/escenarios/timeline/brain + crisis alert
docs: tab-riesgo-crisis-intelligence delivery report
```

## Limitations / Sprint 6

- Scenarios and timeline serve demo data (no ETL yet)
- Geopolitical and territorial dimensions use estimated scores
- Snapshot storage uses local filesystem (upgrade to DB in Sprint 6)
- Cross-module signal aggregation pending full ETL pipeline
- No unit tests added (follow-up in Sprint 6)
