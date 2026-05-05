# Bloque 12 — Dashboard, UX & Design System Core

## Objetivo
Crear una librería de componentes visuales reutilizables (`dashboard/ui/`) y wrappers de
dominio (`dashboard/components/`) que permitan a todos los módulos de ElectSim compartir
un lenguaje visual consistente. Sin redesign, sin romper `dashboard/shared.py`.

## Archivos creados

### dashboard/ui/ (15 módulos)

| Archivo | Contenido |
|---------|-----------|
| `tokens.py` | Re-exporta colores de shared.py + helpers get_severity_color/get_party_color/etc. |
| `badges.py` | severity_badge, confidence_badge, freshness_badge, source_badge, status_badge, demo_badge, risk_badge, verified_badge, module_badge, quality_badge, impact_badge, badge_row |
| `empty_states.py` | empty_state, no_data_state, error_state, loading_state, demo_state, stale_data_state, missing_dependency_state, coming_soon_state |
| `cards.py` | metric_card, signal_card, entity_card, document_card, scenario_card, source_card, alert_card, territory_card, narrative_card |
| `tables.py` | render_data_table (AgGrid fallback), render_ranked_table, render_entity_table, render_alert_table, render_source_table, render_quality_table |
| `charts.py` | line_chart_dark, area_chart_dark, bar_chart_dark, scatter_chart_dark, heatmap_dark, sankey_dark, gauge_chart, forecast_band_chart, tornado_chart |
| `maps.py` | render_choropleth_map, render_point_map, render_layered_map, render_territory_selector, render_map_empty_state |
| `graphs.py` | render_network_graph, render_actor_graph, render_lineage_graph, render_coalition_graph |
| `timelines.py` | render_event_timeline, render_legislative_timeline, render_risk_timeline, render_campaign_timeline, render_document_timeline, render_plotly_timeline |
| `evidence.py` | render_evidence_pack, render_citation_list, render_source_trace, render_confidence_panel, render_tools_used_panel |
| `layout.py` | page_shell, module_header, section (CM), sticky_sidebar_panel (CM), two/three/four_column_layout, kpi_row, tab_section, divider |
| `command_bar.py` | render_command_bar, render_action_toolbar, render_page_actions, render_breadcrumb |
| `filters.py` | date_range_filter, source_filter, severity_filter, territory_filter, sector_filter, actor_filter, module_filter, search_filter, confidence_filter, party_filter, render_filter_summary |
| `compare.py` | render_comparison_table, render_before_after, render_scenario_comparison, render_entity_comparison, render_territory_comparison, render_diff_highlight |
| `exports.py` | export_table_csv, export_table_json, export_view_markdown, export_chart_png, render_export_toolbar, register_visual_export |

### dashboard/components/ (9 módulos de dominio)

| Archivo | Funciones principales |
|---------|----------------------|
| `legislative_components.py` | render_legal_item_card, render_parliamentary_initiative_card, render_legislative_timeline, render_boe_summary_panel, render_legal_impact_matrix |
| `media_components.py` | render_media_item_card, render_narrative_cluster_card, render_actor_sentiment_panel, render_media_source_map, render_narrative_timeline |
| `risk_components.py` | render_risk_entity_card, render_risk_flags_panel, render_actor_graph_panel, render_risk_score_breakdown, render_identity_verification_panel |
| `economy_components.py` | render_macro_kpi_card, render_itpe_breakdown, render_forecast_band_chart, render_economic_signal_card, render_economic_vote_panel |
| `electoral_components.py` | render_nowcast_card, render_seat_projection_panel, render_hemicycle, render_coalition_matrix, render_soft_vote_panel |
| `campaign_components.py` | render_campaign_simulation_result, render_transfer_sankey |
| `territorial_components.py` | render_territory_profile_card, render_hot_territories_ranking, render_territorial_signal_card, render_territorial_layer_selector |
| `document_components.py` | render_document_card, render_document_chunks_panel, render_extracted_tables_panel, render_citation_panel, render_draft_report_panel |
| `simulation_components.py` | render_scenario_card, render_assumptions_panel, render_simulation_result_panel, render_scenario_comparison, render_sensitivity_tornado, render_causal_estimate_card |

### dashboard/services/
- `ui_state_core.py` — guardar_vista, cargar_vistas, cargar_vista, guardar_workspace_layout, cargar_workspace_layouts, registrar_widget, cargar_widgets_modulo, registrar_visual_export, cargar_exportaciones

### db/migrations/versions/
- `0049_ui_core.py` — 4 tablas: saved_views, dashboard_widgets, workspace_layouts, visual_exports. RLS en saved_views.

### tests/
- `test_ui_core.py` — 96 tests. TestTokens, TestBadges, TestEmptyStates, TestCards, TestTables, TestCharts, TestMaps, TestEvidence, TestUIStateCore, TestMigration0049Structure, TestComponentsImport, TestFilters, TestCompare, TestCommandBar, TestExports, TestLayoutFunctions

## Principios de diseño
- **Tokens, no hardcode**: Todos los colores vienen de `dashboard.ui.tokens` que re-exporta desde `dashboard.shared`
- **inline=True**: Todos los badges devuelven HTML str cuando `inline=True` (para componer en cards)
- **Fallback gracioso**: AgGrid → st.dataframe; Plotly → tabla; GeoJSON → ranking; DB → caché memoria
- **SyntaxError Python 3.11**: f-strings anidadas con comillas escapadas no compilan. Extraer a variable antes del f-string
- **RLS**: saved_views tiene `tenant_id` con política `tenant_isolation_saved_views`

## Tests: 96/96 passing
