"""Conectores globales · Sprint 3.

  - wikidata_sparql        · Grafo de actores políticos/corporativos (sin key)
  - bris_corporate         · EU Corporate Registers (BRIS · sin key)
  - sec_edgar              · SEC EDGAR Full-Text Search (sin key)
  - our_world_in_data      · 3.000+ datasets desarrollo/salud/democracia (sin key)
  - ess_social_survey      · European Social Survey valores políticos (sin key)
  - parltrack              · Tracking parlamento europeo vía data.europa.eu (sin key)
  - open_exchange_rates    · FX cross-rates (key opcional)
  - open_contracting       · OCDS licitaciones globales (sin key)
  - nasdaq_data_link       · Nasdaq Data Link (antes Quandl) · key obligatoria

Patrón común a todos:
  - is_available() → bool
  - Cache TTL en memoria
  - httpx con timeout
  - Falla cerrado · sin key/red devuelve [] o None sin crash
"""
