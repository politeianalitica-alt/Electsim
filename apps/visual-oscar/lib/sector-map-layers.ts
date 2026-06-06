// Capas del mapa OSINT útiles por sector. Las claves son exactamente las del
// estado activeLayers del mapa (OsirisDashboard), que lee ?layers=a,b,c de la URL.

export const SECTOR_MAP_LAYERS: Record<string, string[]> = {
  energia: ["power_solar", "power_wind", "power_hydro", "power_nuclear", "power_coal", "power_gas", "power_oil", "oilgas", "pipelines", "refineries", "lng_terminals", "nuclear_plants", "dams"],
  defensa: ["military", "military_bases", "alliances", "milspend", "nukes", "conflict_zones", "frontline", "war_ukraine", "war_gaza", "war_iran", "fabs"],
  telecom: ["ixps", "cable_landings", "submarine_cables", "datacenters", "mobile_coverage", "net_shutdowns", "satellites"],
  infraestructuras: ["critical_infra", "infrastructure", "pipelines", "railways", "airports", "maritime", "port_container", "dams", "datacenters", "submarine_cables"],
  agro: ["agriculture", "rainfall", "sea_state", "deforestation", "oilgas"],
  banca: ["ixps", "datacenters", "sanctions", "corruption", "gdp_pc", "econ_blocs"],
  farma: ["air_quality", "hdi", "gdp_pc", "regime", "sanctions"],
  vivienda: ["gdp_pc", "hdi", "sea_state", "rainfall"],
  turismo: ["airports", "flights", "maritime", "ship_passenger", "port_commercial", "conflict_zones", "sea_state", "air_quality"],
  "tercer-sector": ["refugee_camps", "conflict_zones", "war_sudan", "war_congo", "war_sahel", "gdacs", "deforestation", "hdi"],
  // Vista de inicio: situación mundial (conflictos, guerras, desastres, sanciones)
  inicio: ["conflict_zones", "war_ukraine", "war_gaza", "war_iran", "war_sudan", "gdacs", "sanctions", "alliances"],
};

/** URL del mapa OSINT con las capas del sector preactivadas y una vista global. */
export function sectorMapHref(sector: string): string {
  const layers = SECTOR_MAP_LAYERS[sector];
  if (!layers || layers.length === 0) return "/osint-global";
  return `/osint-global?layers=${layers.join(",")}&lat=25&lon=8&zoom=2.2`;
}
