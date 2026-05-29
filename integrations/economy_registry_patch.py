"""Patch del registry de integraciones para añadir las 16 fuentes económicas.

Sprint 0 · se llama `patch_registry()` durante el startup de la aplicación
para registrar las 11 fuentes con API key + 5 fuentes públicas.

No modifica `integrations/registry.py`; solo añade entradas al diccionario
`INTEGRATION_REGISTRY`.
"""
from __future__ import annotations

from integrations.registry import (
    INTEGRATION_REGISTRY,
    IntegrationInfo,
    IntegrationStatus,
)


ECONOMY_INTEGRATIONS: dict[str, IntegrationInfo] = {
    # ─── Fuentes con API key (status not_configured hasta env var presente) ───
    "fred": IntegrationInfo(
        id="fred",
        name="FRED · Federal Reserve",
        description=(
            "Series macroeconómicas EE.UU. + tipos de interés internacionales "
            "(yields ES vs DE para prima de riesgo)."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="FRED_API_KEY",
    ),
    "esios": IntegrationInfo(
        id="esios",
        name="ESIOS · Red Eléctrica de España",
        description=(
            "Precio spot mercado eléctrico, demanda peninsular, mix de generación "
            "(eólica, solar, nuclear)."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="ESIOS_API_TOKEN",
    ),
    "finnhub": IntegrationInfo(
        id="finnhub",
        name="Finnhub",
        description=(
            "Cotizaciones tiempo real IBEX-35 (Santander, BBVA, Iberdrola, "
            "Telefónica…) + calendario económico."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="FINNHUB_API_KEY",
    ),
    "wto": IntegrationInfo(
        id="wto",
        name="WTO Timeseries",
        description=(
            "Series anuales OMC: comercio total, por socio, aranceles aplicados "
            "España."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="WTO_API_KEY",
    ),
    "comtrade": IntegrationInfo(
        id="comtrade",
        name="UN Comtrade",
        description=(
            "Comercio bilateral ES-mundo por capítulo HS (auto, agro, "
            "industria)."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="UNCOMTRADE_API_KEY",
    ),
    "portwatch": IntegrationInfo(
        id="portwatch",
        name="PortWatch · IMF",
        description=(
            "Congestión + actividad puertos top España (Valencia, Barcelona, "
            "Algeciras, Bilbao, Las Palmas)."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="PORTWATCH_API_KEY",
    ),
    "ember": IntegrationInfo(
        id="ember",
        name="Ember Energy",
        description=(
            "Mix energético + intensidad carbono + precio EU ETS · series "
            "mensuales por país."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="EMBER_API_KEY",
    ),
    "nasdaq_data_link": IntegrationInfo(
        id="nasdaq_data_link",
        name="Nasdaq Data Link",
        description=(
            "Datasets premium (heredero Quandl): commodities, fixed income, "
            "alternative data."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="NASDAQ_DATA_LINK_KEY",
    ),
    "alpha_vantage": IntegrationInfo(
        id="alpha_vantage",
        name="Alpha Vantage",
        description=(
            "Cotizaciones equity, forex y commodities con histórico extenso · "
            "tier gratuito."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="ALPHA_VANTAGE_KEY",
    ),
    "iati": IntegrationInfo(
        id="iati",
        name="IATI · International Aid Transparency",
        description=(
            "Datos de cooperación al desarrollo (AOD) ejecutada por España y "
            "otros donantes."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="IATI_API_KEY",
    ),
    "newsapi": IntegrationInfo(
        id="newsapi",
        name="NewsAPI · Economía",
        description=(
            "Titulares económicos españoles agregados (PIB, IPC, paro, prima "
            "de riesgo, BCE)."
        ),
        status=IntegrationStatus.not_configured,
        env_var_required="NEWSAPI_KEY",
    ),
    # ─── Fuentes públicas (sin key · status connected siempre) ───
    "ine": IntegrationInfo(
        id="ine",
        name="INE · Instituto Nacional de Estadística",
        description=(
            "Series oficiales INE Tempus3: IPC, EPA, PIB trimestral, ICC, "
            "Producción Industrial."
        ),
        status=IntegrationStatus.connected,
        env_var_required="",
    ),
    "ecb": IntegrationInfo(
        id="ecb",
        name="BCE · ECB SDMX-JSON",
        description=(
            "Tipos de refinanciación BCE, Euribor 3M, agregados monetarios "
            "Eurozona."
        ),
        status=IntegrationStatus.connected,
        env_var_required="",
    ),
    "eurostat": IntegrationInfo(
        id="eurostat",
        name="Eurostat",
        description=(
            "Comparativas macro UE5 (ES, DE, FR, IT, PT): PIB, HICP, "
            "desempleo."
        ),
        status=IntegrationStatus.connected,
        env_var_required="",
    ),
    "seg_social": IntegrationInfo(
        id="seg_social",
        name="Seguridad Social · Afiliados",
        description=(
            "Serie de afiliados a la Seguridad Social vía INE Tempus3 "
            "(IDA 25066)."
        ),
        status=IntegrationStatus.connected,
        env_var_required="",
    ),
    "gdelt_economy": IntegrationInfo(
        id="gdelt_economy",
        name="GDELT · Narrativa económica",
        description=(
            "Tono y volumen GDELT DOC v2 para 8 queries económicas España "
            "(inflación, paro, prima, aranceles…)."
        ),
        status=IntegrationStatus.connected,
        env_var_required="",
    ),
}


def patch_registry() -> None:
    """Añade las 16 integraciones económicas al registry global.

    Debe llamarse durante el startup de la aplicación (FastAPI lifespan o
    `@app.on_event("startup")`).
    """
    INTEGRATION_REGISTRY.update(ECONOMY_INTEGRATIONS)
