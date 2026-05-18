"use client"
/**
 * FichaTerritorialView · render de los 12 bloques de la ficha territorial.
 * Componente client porque hace fetch al route handler `/api/ficha/territorio/[cod]`.
 *
 * Diseño: cards apiladas, cada bloque con cabecera fija + cuerpo dinámico.
 * Si un bloque tiene `ok=false`, muestra "Datos no disponibles" en gris.
 * Sin emojis (regla del proyecto).
 */
import { useEffect, useState } from "react"
import { PiramidePoblacional, LineaEvolucion, Hemiciclo } from "./charts"

type Ficha = Record<string, any>

export default function FichaTerritorialView({ cod }: { cod: string }) {
  const [data, setData] = useState<Ficha | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fresh, setFresh] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/ficha/territorio/${encodeURIComponent(cod)}${fresh ? "?fresh=1" : ""}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j?.found && j?.ficha) {
          setData(j.ficha)
        } else {
          setError(j?.error || "ficha no disponible")
        }
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [cod, fresh])

  if (loading) return <SkeletonFicha />
  if (error) return <ErrorBox error={error} onRefresh={() => setFresh(true)} />
  if (!data) return null

  const hero = data.hero || {}
  const gob = data.gobierno || {}
  const elec = data.electoral || {}
  const eco = data.economia || {}
  const demo = data.demografia || {}
  const noticias = data.noticias || {}
  const agenda = data.agenda || {}
  const pleno = data.pleno || {}
  const empresas = data.empresas || {}
  const tercer = data.tercer_sector || {}
  const ai = data.analisis_ia || {}

  return (
    <article className="ficha-territorial">
      <BloqueHero hero={hero} completeness={data.completeness} />
      <BloqueGobierno gob={gob} />
      <BloqueElectoral elec={elec} />
      <BloqueEconomia eco={eco} />
      <BloqueDemografia demo={demo} />
      <BloqueNoticias noticias={noticias} />
      <BloqueAgenda agenda={agenda} />
      <BloquePleno pleno={pleno} />
      <BloqueMapa mapa={data.mapa || {}} hero={hero} />
      <BloqueEmpresas empresas={empresas} />
      <BloqueTercerSector ts={tercer} />
      <BloqueAnalisisIA ai={ai} />
      <Footer
        bloques_ok={data.bloques_ok || []}
        bloques_err={data.bloques_err || {}}
        onRebuild={() => setFresh(true)}
      />
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function CardWrapper({ title, ok, children, extra }: {
  title: string; ok?: boolean; children: any; extra?: string
}) {
  return (
    <section style={{
      background: "#fff", border: "1px solid #ECECEF", borderRadius: 14,
      padding: "18px 22px", marginBottom: 16,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #F0F0F2", paddingBottom: 10, marginBottom: 14,
      }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1d1d1f",
                    letterSpacing: "-0.01em" }}>{title}</h3>
        {extra && <span style={{ fontSize: 11, color: "#6e6e73" }}>{extra}</span>}
      </header>
      {ok === false
        ? <div style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic" }}>
            Datos no disponibles en este momento.
          </div>
        : children}
    </section>
  )
}

function Pill({ label, value, color = "#1F4E8C" }: {
  label: string; value: string | number; color?: string
}) {
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", padding: "8px 14px",
      borderRadius: 8, background: `${color}10`, border: `1px solid ${color}30`,
      minWidth: 110, marginRight: 8, marginBottom: 8,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                     textTransform: "uppercase", color }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f",
                     marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  )
}

function fmtNum(v: any): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "number") return v.toLocaleString("es-ES")
  return String(v)
}

function fmtEur(v: any): string {
  if (v === null || v === undefined || v === "") return "—"
  const n = typeof v === "number" ? v : parseFloat(String(v))
  if (Number.isNaN(n)) return "—"
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €"
}

function fmtPct(v: any): string {
  if (v === null || v === undefined || v === "") return "—"
  const n = typeof v === "number" ? v : parseFloat(String(v))
  if (Number.isNaN(n)) return "—"
  return n.toFixed(1) + "%"
}

// ─────────────────────────────────────────────────────────────────
// BLOQUE 0 · HERO
// ─────────────────────────────────────────────────────────────────

function BloqueHero({ hero, completeness }: { hero: any; completeness?: number }) {
  return (
    <section style={{
      background: "linear-gradient(135deg, #1F4E8C 0%, #0F2A4F 100%)",
      color: "#fff", borderRadius: 16, padding: "28px 32px", marginBottom: 18,
      position: "relative", overflow: "hidden",
    }}>
      {hero.escudo_url && (
        <img src={hero.escudo_url} alt="" style={{
          position: "absolute", right: 24, top: 20, height: 96, width: "auto",
          objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
        }} />
      )}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                    textTransform: "uppercase", opacity: 0.7 }}>
        {hero.tipo || "Territorio"} {hero.codigo_ine && `· INE ${hero.codigo_ine}`}
      </div>
      <h1 style={{ margin: "4px 0 6px", fontSize: 34, fontWeight: 700,
                   letterSpacing: "-0.02em" }}>{hero.nombre || "—"}</h1>
      <div style={{ fontSize: 14, opacity: 0.85 }}>
        {hero.ccaa && `${hero.ccaa} · `}
        {hero.provincia && `Provincia: ${hero.provincia}`}
      </div>
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Pill label="Población" value={fmtNum(hero.poblacion)} color="#fff" />
        <Pill label="Superficie km²" value={fmtNum(hero.superficie_km2)} color="#fff" />
        <Pill label="Densidad hab/km²" value={fmtNum(hero.densidad_hab_km2)} color="#fff" />
        <Pill label="Renta media hogar" value={fmtEur(hero.renta_media_hogar)} color="#fff" />
      </div>
      {hero.alcalde_o_presidente && (
        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.92 }}>
          <strong>{hero.tipo === "ccaa" ? "Presidente:" : "Alcalde/sa:"}</strong>{" "}
          {hero.alcalde_o_presidente}
          {hero.partido_gobernante && <span style={{ opacity: 0.75 }}> · {hero.partido_gobernante}</span>}
        </div>
      )}
      {typeof completeness === "number" && (
        <div style={{ position: "absolute", bottom: 12, right: 16,
                      fontSize: 10, opacity: 0.6 }}>
          Completitud {Math.round((completeness || 0) * 100)}%
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// BLOQUE 1 · GOBIERNO
// ─────────────────────────────────────────────────────────────────

function BloqueGobierno({ gob }: { gob: any }) {
  const alcalde = gob.alcalde
  const hist = (gob.historico_alcaldes || []) as any[]
  return (
    <CardWrapper title="Gobierno y cargos" ok={gob.ok !== false}>
      {alcalde && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          {alcalde.foto_url && (
            <img src={alcalde.foto_url} alt="" style={{
              width: 64, height: 64, borderRadius: 32, objectFit: "cover",
              border: "2px solid #ECECEF",
            }} />
          )}
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{alcalde.nombre}</div>
            <div style={{ fontSize: 12, color: "#6e6e73" }}>
              {alcalde.cargo}{alcalde.partido && ` · ${alcalde.partido}`}
              {alcalde.fecha_inicio && ` · Desde ${alcalde.fecha_inicio.slice(0, 7)}`}
            </div>
          </div>
        </div>
      )}
      {hist.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600,
                            color: "#1F4E8C" }}>
            Histórico de gobierno ({hist.length})
          </summary>
          <ul style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
            {hist.slice(0, 20).map((h, i) => (
              <li key={i}>
                <strong>{h.nombre}</strong> · {h.partido || "—"} ·
                {" "}{h.fecha_inicio?.slice(0, 7) || "—"}
                {" → "}{h.fecha_fin?.slice(0, 7) || "presente"}
              </li>
            ))}
          </ul>
        </details>
      )}
      <FuentesFooter fuentes={gob.fuentes} />
    </CardWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────
// BLOQUE 2 · ELECTORAL
// ─────────────────────────────────────────────────────────────────

function BloqueElectoral({ elec }: { elec: any }) {
  const muni = (elec.municipales || []) as any[]
  const gen = (elec.generales || []) as any[]
  const tieneDatos = muni.length > 0 || gen.length > 0
  return (
    <CardWrapper
      title="Histórico electoral"
      ok={tieneDatos}
      extra={`${muni.length} municipales · ${gen.length} generales`}
    >
      {muni.length > 0 && (
        <>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: "6px 0 10px" }}>
            Últimas elecciones municipales
          </h4>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ECECEF" }}>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Fecha</th>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Partido ganador</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>Votos</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>%</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>Particip.</th>
              </tr>
            </thead>
            <tbody>
              {muni.slice(0, 8).map((m, i) => {
                const rs = (m.resultados || []).sort((a: any, b: any) => (b.votos || 0) - (a.votos || 0))
                const top = rs[0] || {}
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #F5F5F7" }}>
                    <td style={{ padding: "6px 8px" }}>{m.fecha}</td>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>{top.partido || "—"}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtNum(top.votos)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtPct(top.porcentaje)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmtPct(m.participacion_pct)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
      <FuentesFooter fuentes={elec.fuentes} />
    </CardWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────
// BLOQUE 3 · ECONOMÍA
// ─────────────────────────────────────────────────────────────────

function BloqueEconomia({ eco }: { eco: any }) {
  const hayDatos = eco.renta_media_hogar || eco.tasa_desempleo_pct
  return (
    <CardWrapper title="Situación económica" ok={!!hayDatos || eco.ok !== false}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Pill label="Renta media hogar" value={fmtEur(eco.renta_media_hogar)} />
        <Pill label="Tasa desempleo" value={fmtPct(eco.tasa_desempleo_pct)} color="#DC2626" />
        {eco.precio_vivienda_m2 && <Pill label="Precio €/m²" value={fmtEur(eco.precio_vivienda_m2)} />}
        {eco.deuda_per_capita && <Pill label="Deuda per cápita" value={fmtEur(eco.deuda_per_capita)} />}
      </div>
      {eco.evolucion_renta_5y?.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 12, color: "#6e6e73" }}>
          Evolución renta últimos años: {(eco.evolucion_renta_5y || [])
            .map((p: any) => `${p.anio}: ${fmtEur(p.valor)}`)
            .join(" · ")}
        </div>
      )}
      <FuentesFooter fuentes={eco.fuentes} />
    </CardWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────
// BLOQUE 4 · DEMOGRAFÍA
// ─────────────────────────────────────────────────────────────────

function BloqueDemografia({ demo }: { demo: any }) {
  const piramide = (demo.piramide || []) as any[]
  const evol = (demo.evolucion_poblacion || []) as any[]
  return (
    <CardWrapper title="Demografía y sociedad" ok={demo.ok !== false}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Pill label="Población total" value={fmtNum(demo.poblacion_total)} />
        <Pill label="Tasa natalidad" value={fmtPct(demo.tasa_natalidad)} color="#16A34A" />
        <Pill label="Tasa mortalidad" value={fmtPct(demo.tasa_mortalidad)} color="#DC2626" />
        <Pill label="Índice envejecimiento" value={fmtNum(demo.indice_envejecimiento)} color="#7C3AED" />
        <Pill label="Tasa dependencia" value={fmtPct(demo.tasa_dependencia)} />
        {demo.pct_extranjeros && <Pill label="% extranjeros" value={fmtPct(demo.pct_extranjeros)} />}
      </div>
      {piramide.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f",
                        marginBottom: 6 }}>Pirámide poblacional</div>
          <PiramidePoblacional tramos={piramide} />
        </div>
      )}
      {evol.length > 1 && (
        <div style={{ marginTop: 14 }}>
          <LineaEvolucion serie={evol} label="Evolución de población"
                          color="#1F4E8C" />
        </div>
      )}
      <FuentesFooter fuentes={demo.fuentes} />
    </CardWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────
// BLOQUE 5 · NOTICIAS
// ─────────────────────────────────────────────────────────────────

function BloqueNoticias({ noticias }: { noticias: any }) {
  const items = (noticias.noticias || []) as any[]
  const narrativas = (noticias.narrativas || []) as any[]
  return (
    <CardWrapper
      title="Noticias y narrativas"
      ok={items.length > 0 || noticias.ok !== false}
      extra={`Últimos ${noticias.ventana_dias || 30} días · ${items.length} artículos`}
    >
      {narrativas.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>Narrativas detectadas</h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {narrativas.slice(0, 5).map((n, i) => (
              <li key={i}>
                <strong>{n.nombre}</strong>
                {n.fuerza && ` (${Math.round((n.fuerza || 0) * 100)}%)`}
                {n.descripcion && <span style={{ color: "#6e6e73" }}> — {n.descripcion}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <h4 style={{ fontSize: 13, fontWeight: 700, margin: "8px 0 6px" }}>Últimos titulares</h4>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 13 }}>
        {items.slice(0, 12).map((n, i) => (
          <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid #F5F5F7" }}>
            <a href={n.url} target="_blank" rel="noreferrer"
               style={{ color: "#1F4E8C", textDecoration: "none", fontWeight: 600 }}>
              {n.titulo}
            </a>
            <div style={{ fontSize: 11, color: "#6e6e73", marginTop: 2 }}>
              {n.medio}{n.linea_editorial && ` · ${n.linea_editorial}`}
              {n.fecha && ` · ${n.fecha.slice(0, 10)}`}
            </div>
          </li>
        ))}
      </ul>
      <FuentesFooter fuentes={noticias.fuentes} />
    </CardWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────
// BLOQUES SIMPLES (Agenda, Pleno, Mapa, Empresas, TercerSector)
// ─────────────────────────────────────────────────────────────────

function BloqueAgenda({ agenda }: { agenda: any }) {
  const plenos = agenda.plenos_proximos || []
  const eventos = agenda.eventos_oficiales || []
  return (
    <CardWrapper
      title="Agenda y calendario"
      ok={plenos.length > 0 || eventos.length > 0}
    >
      {plenos.length > 0 ? (
        <ul style={{ fontSize: 13 }}>
          {plenos.slice(0, 5).map((e: any, i: number) => (
            <li key={i}>{e.fecha} — {e.titulo}</li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Próximos plenos y eventos en cuanto se conecten las agendas oficiales.
        </div>
      )}
      <FuentesFooter fuentes={agenda.fuentes} />
    </CardWrapper>
  )
}

function BloquePleno({ pleno }: { pleno: any }) {
  const comp = (pleno.composicion || []) as any[]
  // Normalizar para Hemiciclo: necesita {partido, escanos, color?}
  const hemiData = comp
    .filter((c: any) => c.escanos && Number(c.escanos) > 0)
    .map((c: any) => ({ partido: String(c.partido || ""), escanos: Number(c.escanos) }))
  return (
    <CardWrapper title="Pleno / parlamento" ok={comp.length > 0}>
      {hemiData.length > 0 ? (
        <Hemiciclo composicion={hemiData} />
      ) : comp.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {comp.map((c: any, i: number) => (
            <Pill key={i} label={c.partido} value={`${c.escanos || 0}`} />
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Composición pendiente · se calcula desde el último resultado electoral.
        </div>
      )}
      <FuentesFooter fuentes={pleno.fuentes} />
    </CardWrapper>
  )
}

function BloqueMapa({ mapa, hero }: { mapa: any; hero: any }) {
  return (
    <CardWrapper title="Mapa interactivo" ok={mapa.ok !== false}>
      <div style={{ fontSize: 13, color: "#6e6e73" }}>
        Capas disponibles cuando se conecten los geo-datos:
        {" "}{(mapa.capas_disponibles || []).join(", ") || "—"}
      </div>
      {hero.coordenadas?.lat && (
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
          Coords: {hero.coordenadas.lat}, {hero.coordenadas.lon}
        </div>
      )}
      <FuentesFooter fuentes={mapa.fuentes} />
    </CardWrapper>
  )
}

function BloqueEmpresas({ empresas }: { empresas: any }) {
  const tops = (empresas.top_empresas || []) as any[]
  return (
    <CardWrapper title="Tejido empresarial" ok={tops.length > 0}>
      {tops.length > 0 ? (
        <ul style={{ fontSize: 13 }}>
          {tops.slice(0, 10).map((e: any, i: number) => (
            <li key={i}>{e.nombre} · {e.sector} · {fmtNum(e.empleados)} empleados</li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Top empresas pendiente · requiere conector SABI/DIRCE.
        </div>
      )}
      <FuentesFooter fuentes={empresas.fuentes} />
    </CardWrapper>
  )
}

function BloqueTercerSector({ ts }: { ts: any }) {
  return (
    <CardWrapper title="Tercer sector y cultura" ok={ts.ok !== false}>
      <div style={{ fontSize: 13, color: "#6e6e73" }}>
        ONGs registradas: {fmtNum(ts.ongs_total)} · BICs: {fmtNum((ts.bics || []).length)}
      </div>
      <FuentesFooter fuentes={ts.fuentes} />
    </CardWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────
// BLOQUE 11 · ANÁLISIS IA
// ─────────────────────────────────────────────────────────────────

function BloqueAnalisisIA({ ai }: { ai: any }) {
  return (
    <CardWrapper title="Análisis IA integrado" ok={ai.ok !== false}
                  extra={ai.tokens_used ? `${ai.tokens_used} tokens` : ""}>
      {ai.resumen_ejecutivo && (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#1d1d1f",
                    background: "#FAFAFB", padding: "12px 14px",
                    borderRadius: 8, borderLeft: "3px solid #5B21B6",
                    marginTop: 0 }}>
          {ai.resumen_ejecutivo}
        </p>
      )}
      {typeof ai.score_estabilidad === "number" && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          <strong>Score de estabilidad:</strong>{" "}
          {ai.score_estabilidad.toFixed(1)} / 10
        </div>
      )}
      {ai.riesgos?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong style={{ fontSize: 13 }}>Riesgos detectados:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 18, fontSize: 13 }}>
            {ai.riesgos.slice(0, 5).map((r: string, i: number) => (<li key={i}>{r}</li>))}
          </ul>
        </div>
      )}
      {ai.oportunidades?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <strong style={{ fontSize: 13 }}>Watch list:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 18, fontSize: 13 }}>
            {ai.oportunidades.slice(0, 5).map((r: string, i: number) => (<li key={i}>{r}</li>))}
          </ul>
        </div>
      )}
      <FuentesFooter fuentes={ai.fuentes} />
    </CardWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────
// Footer/Misc
// ─────────────────────────────────────────────────────────────────

function FuentesFooter({ fuentes }: { fuentes: any[] }) {
  if (!fuentes || fuentes.length === 0) return null
  return (
    <div style={{ marginTop: 14, fontSize: 11, color: "#9ca3af" }}>
      Fuentes: {fuentes.map((f: any, i: number) => (
        <span key={i}>
          {i > 0 && " · "}
          {f.url ? (
            <a href={f.url} target="_blank" rel="noreferrer"
               style={{ color: "#9ca3af" }}>{f.nombre || f.tipo}</a>
          ) : (f.nombre || f.tipo)}
        </span>
      ))}
    </div>
  )
}

function Footer({ bloques_ok, bloques_err, onRebuild }: {
  bloques_ok: string[]; bloques_err: Record<string, string>; onRebuild: () => void
}) {
  const errs = Object.entries(bloques_err || {})
  return (
    <footer style={{ marginTop: 20, padding: "14px 16px",
                     background: "#F5F5F7", borderRadius: 10,
                     fontSize: 11, color: "#6e6e73" }}>
      Bloques OK: {bloques_ok.join(", ") || "ninguno"}
      {errs.length > 0 && (
        <div style={{ marginTop: 6, color: "#b45309" }}>
          Bloques con error: {errs.map(([k, v]) => `${k} (${v.split(":")[0]})`).join(", ")}
        </div>
      )}
      <button onClick={onRebuild} style={{
        marginTop: 10, padding: "6px 12px", fontSize: 11, fontWeight: 600,
        background: "#1F4E8C", color: "#fff", border: "none",
        borderRadius: 6, cursor: "pointer",
      }}>Forzar reconstrucción</button>
    </footer>
  )
}

function SkeletonFicha() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#F5F5F7", borderRadius: 16, height: 180, marginBottom: 14 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: "#F5F5F7", borderRadius: 12, height: 120,
                              marginBottom: 12 }} />
      ))}
    </div>
  )
}

function ErrorBox({ error, onRefresh }: { error: string; onRefresh: () => void }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "#b45309" }}>
      <p>No se pudo cargar la ficha: {error}</p>
      <button onClick={onRefresh} style={{
        padding: "8px 14px", fontSize: 12, fontWeight: 600,
        background: "#1F4E8C", color: "#fff", border: "none", borderRadius: 6,
        cursor: "pointer",
      }}>Reintentar (fresh)</button>
    </div>
  )
}
