"use client"
/**
 * MapaTerritorio · choropleth ligero con react-simple-maps + d3-geo.
 *
 * Carga el TopoJSON/GeoJSON de provincias o municipios españoles desde un
 * endpoint público y pinta el territorio del foco resaltado.
 *
 * Sin Leaflet · sin tiles raster · puro SVG. Carga ~150KB GeoJSON
 * España (provincias) la primera vez, después es <50KB ssr-cacheable.
 *
 * Props:
 *   geojsonUrl   · URL del GeoJSON (TopoJSON convertido a GeoJSON via D3 worker)
 *   foco         · {tipo: 'municipio'|'provincia'|'ccaa', cod, nombre}
 *   capaActiva   · 'renta'|'voto'|'densidad'|'envejecimiento' (futuro · pinta colores)
 *
 * El componente es resiliente: si el GeoJSON no carga, muestra placeholder
 * con coordenadas. Si lib no está, fallback estático.
 */
import { useEffect, useMemo, useState } from "react"

type Foco = {
  tipo: "municipio" | "provincia" | "ccaa"
  cod?: string
  nombre?: string
  lat?: number
  lon?: number
}

// GeoJSON públicos · CartoDB tiene una colección estable
const GEOJSON_PROVINCIAS_ES =
  "https://raw.githubusercontent.com/codeforspain/spain-geojson/master/provincias-spain.geojson"
const GEOJSON_CCAA_ES =
  "https://raw.githubusercontent.com/codeforspain/spain-geojson/master/ccaa-spain.geojson"

export default function MapaTerritorio({
  foco,
  capa = "renta",
}: {
  foco: Foco
  capa?: "renta" | "voto" | "densidad" | "envejecimiento"
}) {
  const [geo, setGeo] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [Lib, setLib] = useState<any | null>(null)

  // Dynamic import react-simple-maps · SSR-safe
  useEffect(() => {
    let cancelled = false
    import("react-simple-maps")
      .then((mod) => !cancelled && setLib(mod))
      .catch((e) => !cancelled && setError(`react-simple-maps no disponible: ${String(e)}`))
    return () => { cancelled = true }
  }, [])

  // Fetch GeoJSON según foco
  useEffect(() => {
    let cancelled = false
    const url = foco.tipo === "ccaa" ? GEOJSON_CCAA_ES : GEOJSON_PROVINCIAS_ES
    setGeo(null)
    setError(null)
    fetch(url, { cache: "force-cache" })
      .then((r) => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((j) => !cancelled && setGeo(j))
      .catch((e) => !cancelled && setError(`GeoJSON: ${String(e)}`))
    return () => { cancelled = true }
  }, [foco.tipo])

  // Identifica feature destacada
  const focoKey = useMemo(() => normalize(foco.nombre || ""), [foco.nombre])

  if (error) {
    return (
      <div style={{ padding: 14, background: "#FAFAFB",
                    border: "1px solid #ECECEF", borderRadius: 10,
                    fontSize: 12, color: "#6e6e73" }}>
        Mapa no disponible: {error}
        {(foco.lat && foco.lon) && (
          <div style={{ marginTop: 6 }}>
            Coordenadas: {foco.lat.toFixed(3)}, {foco.lon.toFixed(3)}
          </div>
        )}
      </div>
    )
  }

  if (!Lib || !geo) {
    return (
      <div style={{ background: "#F5F5F7", height: 280, borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#9ca3af" }}>
        Cargando mapa...
      </div>
    )
  }

  const { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } = Lib
  const projection = "geoMercator"
  // Centrar en España aproximadamente
  const centroEspana: [number, number] = [-3.7, 40.3]
  const scale = foco.tipo === "ccaa" ? 1500 : (foco.tipo === "provincia" ? 1800 : 2200)

  return (
    <div style={{ width: "100%", maxWidth: 720,
                  background: "#fff", border: "1px solid #ECECEF",
                  borderRadius: 10, overflow: "hidden" }}>
      <ComposableMap
        projection={projection}
        projectionConfig={{ center: centroEspana, scale }}
        style={{ width: "100%", height: 360 }}
      >
        <ZoomableGroup minZoom={1} maxZoom={5}>
          <Geographies geography={geo}>
            {({ geographies }: any) =>
              geographies.map((g: any) => {
                const name = String(
                  g.properties?.nombre || g.properties?.NAMEUNIT ||
                  g.properties?.name || "",
                )
                const isFoco = focoKey && normalize(name).includes(focoKey)
                return (
                  <Geography
                    key={g.rsmKey}
                    geography={g}
                    style={{
                      default: {
                        fill: isFoco ? "#1F4E8C" : "#E5E7EB",
                        stroke: "#fff",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      hover: {
                        fill: isFoco ? "#0F2A4F" : "#D1D5DB",
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: { fill: "#5B21B6", outline: "none" },
                    }}
                  >
                    <title>{name}</title>
                  </Geography>
                )
              })
            }
          </Geographies>
          {foco.lat && foco.lon && (
            <Marker coordinates={[foco.lon, foco.lat]}>
              <circle r={6} fill="#DC2626" stroke="#fff" strokeWidth={2} />
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>
      <div style={{ padding: "8px 14px", fontSize: 11, color: "#6e6e73",
                    borderTop: "1px solid #F0F0F2", display: "flex",
                    justifyContent: "space-between" }}>
        <span>
          Capa: <strong>{capa}</strong>
          {" · "}Foco: <strong>{foco.nombre || "—"}</strong>
        </span>
        <span style={{ opacity: 0.6 }}>OpenStreetMap · spain-geojson</span>
      </div>
    </div>
  )
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}
