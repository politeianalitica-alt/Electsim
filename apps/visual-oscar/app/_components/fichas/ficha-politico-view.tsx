"use client"
/**
 * FichaPoliticoView · render de los 12 bloques de la ficha de político.
 * Sin emojis. Patrón idéntico a FichaTerritorialView.
 */
import { useEffect, useState } from "react"
import { RadarTemas, LineaEvolucion } from "./charts"

type Ficha = Record<string, any>

export default function FichaPoliticoView({ id, nombre }: { id: string; nombre?: string }) {
  const [data, setData] = useState<Ficha | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fresh, setFresh] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const qs: string[] = []
    if (nombre) qs.push(`nombre=${encodeURIComponent(nombre)}`)
    if (fresh) qs.push("fresh=1")
    const url = `/api/ficha/politico/${encodeURIComponent(id)}${qs.length ? "?" + qs.join("&") : ""}`
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j?.found && j?.ficha) setData(j.ficha)
        else setError(j?.error || "ficha no disponible")
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [id, nombre, fresh])

  if (loading) return <Skeleton />
  if (error) return <ErrorBox error={error} onRefresh={() => setFresh(true)} />
  if (!data) return null

  const hero = data.hero || {}
  const tr = data.trayectoria || {}
  const ai_ = data.actividad_institucional || {}
  const pos = data.posicionamiento || {}
  const red = data.redes || {}
  const pm = data.presencia_mediatica || {}
  const cd = data.comunicacion_digital || {}
  const pat = data.patrimonio || {}
  const he = data.historico_electoral || {}
  const vc = data.vinculos_corporativos || {}
  const ag = data.agenda || {}
  const ai11 = data.analisis_ia || {}

  return (
    <article>
      <BloqueHeroPol hero={hero} completeness={data.completeness} />
      <BloqueTrayectoria tr={tr} />
      <BloqueActividad ai_={ai_} />
      <BloquePosicionamiento pos={pos} />
      <BloqueRedes red={red} />
      <BloquePresenciaMediatica pm={pm} />
      <BloqueComDigital cd={cd} />
      <BloquePatrimonio pat={pat} />
      <BloqueHistoricoElec he={he} />
      <BloqueVinculosCorp vc={vc} />
      <BloqueAgendaPol ag={ag} />
      <BloqueAnalisisIAPol ai={ai11} />
      <Footer
        bloques_ok={data.bloques_ok || []}
        bloques_err={data.bloques_err || {}}
        onRebuild={() => setFresh(true)}
      />
    </article>
  )
}

// ─── helpers ────────────────────────────────────────────────────

function Card({ title, ok, extra, children }: {
  title: string; ok?: boolean; extra?: string; children: any
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
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1d1d1f" }}>{title}</h3>
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
                     marginTop: 4 }}>{value}</span>
    </div>
  )
}

// ─── Bloques ────────────────────────────────────────────────────

function BloqueHeroPol({ hero, completeness }: { hero: any; completeness?: number }) {
  return (
    <section style={{
      background: "linear-gradient(135deg, #5B21B6 0%, #2E1065 100%)",
      color: "#fff", borderRadius: 16, padding: "28px 32px", marginBottom: 18,
      display: "flex", alignItems: "center", gap: 24,
    }}>
      {hero.foto_url && (
        <img src={hero.foto_url} alt="" style={{
          width: 120, height: 120, borderRadius: 60, objectFit: "cover",
          border: "3px solid rgba(255,255,255,0.3)",
        }} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                      textTransform: "uppercase", opacity: 0.7 }}>
          {hero.partido || "—"}{hero.wikidata_id && ` · ${hero.wikidata_id}`}
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: 32, fontWeight: 700 }}>
          {hero.nombre_completo || "—"}
        </h1>
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          {hero.cargo_actual}
          {hero.institucion && <span> · {hero.institucion}</span>}
        </div>
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {hero.edad && <Pill label="Edad" value={`${hero.edad}`} color="#fff" />}
          {hero.lugar_nacimiento && <Pill label="Origen" value={hero.lugar_nacimiento} color="#fff" />}
          {hero.anios_en_politica && <Pill label="Años política" value={`${hero.anios_en_politica}`} color="#fff" />}
          {typeof hero.score_influencia === "number" &&
            <Pill label="Influencia" value={`${hero.score_influencia.toFixed(0)}/100`} color="#fff" />}
        </div>
      </div>
      {typeof completeness === "number" && (
        <div style={{ position: "absolute", marginTop: 80, marginLeft: -80,
                      fontSize: 10, opacity: 0.6 }}>
          {Math.round((completeness || 0) * 100)}%
        </div>
      )}
    </section>
  )
}

function BloqueTrayectoria({ tr }: { tr: any }) {
  const cargos = (tr.cargos_publicos || []) as any[]
  return (
    <Card
      title="Trayectoria política"
      ok={cargos.length > 0 || tr.ok !== false}
      extra={`${cargos.length} cargos · ${tr.evolucion_carrera || "—"}`}
    >
      <ol style={{ listStyle: "none", padding: 0, margin: 0,
                   borderLeft: "2px solid #ECECEF" }}>
        {cargos.slice(0, 12).map((c, i) => (
          <li key={i} style={{ paddingLeft: 16, marginBottom: 10, position: "relative" }}>
            <span style={{
              position: "absolute", left: -7, top: 4, width: 12, height: 12,
              borderRadius: 6, border: "2px solid #fff",
              background: nivelColor(c.nivel_territorial),
            }} />
            <div style={{ fontSize: 13, fontWeight: 700 }}>{c.cargo}</div>
            <div style={{ fontSize: 11, color: "#6e6e73" }}>
              {c.institucion && `${c.institucion} · `}
              {c.fecha_inicio?.slice(0, 7) || "—"}
              {" → "}{c.es_actual ? "presente" : (c.fecha_fin?.slice(0, 7) || "—")}
              {c.nivel_territorial && ` · ${c.nivel_territorial}`}
            </div>
          </li>
        ))}
      </ol>
      <Fuentes f={tr.fuentes} />
    </Card>
  )
}

function nivelColor(nivel: string) {
  return ({
    local: "#16A34A", autonomico: "#EAB308",
    nacional: "#DC2626", europeo: "#1F4E8C",
  } as any)[nivel] || "#6e6e73"
}

function BloqueActividad({ ai_ }: { ai_: any }) {
  return (
    <Card title="Actividad institucional" ok={ai_.ok !== false}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <Pill label="Intervenciones año" value={ai_.n_intervenciones_anio || 0} />
        <Pill label="Preguntas orales" value={ai_.n_preguntas_orales || 0} />
        <Pill label="Preguntas escritas" value={ai_.n_preguntas_escritas || 0} />
        <Pill label="Proposiciones ley" value={ai_.n_proposiciones_ley || 0} />
        <Pill label="Mociones" value={ai_.n_mociones || 0} />
        <Pill label="Asistencia" value={`${(ai_.asistencia_pct || 0).toFixed?.(0) || "—"}%`}
              color="#16A34A" />
      </div>
      <Fuentes f={ai_.fuentes} />
    </Card>
  )
}

function BloquePosicionamiento({ pos }: { pos: any }) {
  // Build radar ejes desde los 3 ejes ideológicos + temas dominantes
  const ejes: Array<{ nombre: string; valor: number }> = []
  if (typeof pos.eje_izq_der === "number") {
    // Convertimos -1..1 → 0..1 (0 = izquierda extrema, 1 = derecha extrema)
    ejes.push({ nombre: "Izq → Dcha", valor: (pos.eje_izq_der + 1) / 2 })
  }
  if (typeof pos.eje_lib_aut === "number") {
    ejes.push({ nombre: "Lib → Aut", valor: (pos.eje_lib_aut + 1) / 2 })
  }
  if (typeof pos.eje_centro_periferia === "number") {
    ejes.push({ nombre: "Centro → Per.", valor: (pos.eje_centro_periferia + 1) / 2 })
  }
  if (typeof pos.fidelidad_partido_pct === "number") {
    ejes.push({ nombre: "Fidelidad", valor: pos.fidelidad_partido_pct / 100 })
  }
  for (const t of (pos.temas_dominantes || []).slice(0, 4)) {
    if (t.tema && typeof t.peso_pct === "number") {
      ejes.push({ nombre: String(t.tema).slice(0, 12), valor: t.peso_pct / 100 })
    }
  }
  return (
    <Card title="Posicionamiento ideológico" ok={pos.ok !== false}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {typeof pos.eje_izq_der === "number" &&
          <Pill label="Eje izq-dcha" value={pos.eje_izq_der.toFixed(2)}
                color={pos.eje_izq_der < 0 ? "#1F4E8C" : "#DC2626"} />}
        {typeof pos.eje_lib_aut === "number" &&
          <Pill label="Eje lib-aut" value={pos.eje_lib_aut.toFixed(2)} color="#7C3AED" />}
        {typeof pos.fidelidad_partido_pct === "number" &&
          <Pill label="Fidelidad partido" value={`${pos.fidelidad_partido_pct.toFixed(0)}%`} color="#16A34A" />}
      </div>
      {ejes.length >= 3 && (
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
          <RadarTemas ejes={ejes} />
        </div>
      )}
      <Fuentes f={pos.fuentes} />
    </Card>
  )
}

function BloqueRedes({ red }: { red: any }) {
  const rs = (red.relaciones || []) as any[]
  return (
    <Card title="Redes y relaciones" ok={rs.length > 0 || red.ok !== false}>
      {rs.length > 0 ? (
        <table style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ECECEF" }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Actor</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Tipo</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Fuerza</th>
            </tr>
          </thead>
          <tbody>
            {rs.slice(0, 10).map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F5F5F7" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{r.nombre}</td>
                <td style={{ padding: "6px 8px" }}>{r.tipo}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{(r.fuerza || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Sin relaciones registradas aún en el grafo del cerebro.
        </div>
      )}
      <Fuentes f={red.fuentes} />
    </Card>
  )
}

function BloquePresenciaMediatica({ pm }: { pm: any }) {
  const noticias = (pm.noticias_30d || []) as any[]
  const narrativas = (pm.narrativas_sobre_el || []) as any[]
  return (
    <Card
      title="Presencia mediática"
      ok={noticias.length > 0 || pm.ok !== false}
      extra={`${noticias.length} en 30d · tendencia ${pm.tendencia_visibilidad || "—"}`}
    >
      {narrativas.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 13 }}>Narrativas sobre él/ella:</strong>
          <ul style={{ paddingLeft: 18, fontSize: 13 }}>
            {narrativas.slice(0, 4).map((n, i) => (
              <li key={i}><strong>{n.nombre}</strong> · {n.descripcion}</li>
            ))}
          </ul>
        </div>
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13 }}>
        {noticias.slice(0, 12).map((n, i) => (
          <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid #F5F5F7" }}>
            <a href={n.url} target="_blank" rel="noreferrer"
               style={{ color: "#1F4E8C", textDecoration: "none", fontWeight: 600 }}>{n.titulo}</a>
            <div style={{ fontSize: 11, color: "#6e6e73" }}>
              {n.medio} · {n.linea_editorial} · {n.fecha?.slice(0, 10)}
            </div>
          </li>
        ))}
      </ul>
      <Fuentes f={pm.fuentes} />
    </Card>
  )
}

function BloqueComDigital({ cd }: { cd: any }) {
  const perfiles = (cd.perfiles || []) as any[]
  return (
    <Card title="Comunicación digital" ok={perfiles.length > 0 || cd.ok !== false}>
      {perfiles.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {perfiles.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noreferrer" style={{
              display: "block", padding: "10px 14px", borderRadius: 8,
              background: "#FAFAFB", border: "1px solid #ECECEF",
              textDecoration: "none", color: "#1d1d1f", minWidth: 140,
            }}>
              <div style={{ fontSize: 11, color: "#6e6e73",
                            fontWeight: 600, letterSpacing: "0.04em" }}>{p.plataforma}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>@{p.handle}</div>
              {p.followers && <div style={{ fontSize: 11, color: "#6e6e73" }}>
                {p.followers.toLocaleString("es-ES")} seguidores
              </div>}
            </a>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Sin handles oficiales registrados.
        </div>
      )}
      <Fuentes f={cd.fuentes} />
    </Card>
  )
}

function BloquePatrimonio({ pat }: { pat: any }) {
  return (
    <Card title="Patrimonio y transparencia" ok={pat.ok !== false}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {pat.patrimonio_bruto_eur && <Pill label="Patrimonio bruto" value={`${pat.patrimonio_bruto_eur.toLocaleString("es-ES")} €`} />}
        {pat.salario_anual_oficial_eur && <Pill label="Salario anual" value={`${pat.salario_anual_oficial_eur.toLocaleString("es-ES")} €`} />}
        {pat.badge_transparencia && (
          <Pill label="Transparencia" value={pat.badge_transparencia}
                color={pat.badge_transparencia === "verde" ? "#16A34A" :
                       pat.badge_transparencia === "rojo" ? "#DC2626" : "#EAB308"} />
        )}
      </div>
      {pat.alerta_ia && (
        <div style={{ marginTop: 10, padding: 10, background: "#FEF2F2",
                      border: "1px solid #FCA5A5", borderRadius: 6,
                      fontSize: 12, color: "#991B1B" }}>
          Alerta IA: {pat.alerta_ia}
        </div>
      )}
      <Fuentes f={pat.fuentes} />
    </Card>
  )
}

function BloqueHistoricoElec({ he }: { he: any }) {
  const cands = (he.candidaturas || []) as any[]
  return (
    <Card title="Histórico electoral personal" ok={cands.length > 0}>
      {cands.length > 0 ? (
        <table style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ECECEF" }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Fecha</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Tipo</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Distrito</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Pos.</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {cands.slice(0, 10).map((c, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F5F5F7" }}>
                <td style={{ padding: "6px 8px" }}>{c.fecha}</td>
                <td style={{ padding: "6px 8px" }}>{c.tipo_eleccion}</td>
                <td style={{ padding: "6px 8px" }}>{c.distrito}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{c.posicion_lista}</td>
                <td style={{ padding: "6px 8px" }}>{c.resultado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Sin candidaturas registradas en BD.
        </div>
      )}
      <Fuentes f={he.fuentes} />
    </Card>
  )
}

function BloqueVinculosCorp({ vc }: { vc: any }) {
  const emps = (vc.empresas_vinculadas || []) as any[]
  return (
    <Card title="Vínculos corporativos" ok={emps.length > 0}>
      {emps.length > 0 ? (
        <ul style={{ fontSize: 13 }}>
          {emps.slice(0, 10).map((e, i) => (
            <li key={i}>{e.nombre} · {e.sector} · {e.relacion}</li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Sin vínculos corporativos registrados.
        </div>
      )}
      <Fuentes f={vc.fuentes} />
    </Card>
  )
}

function BloqueAgendaPol({ ag }: { ag: any }) {
  const acts = (ag.actos_publicos || []) as any[]
  return (
    <Card title="Agenda" ok={acts.length > 0}>
      {acts.length > 0 ? (
        <ul style={{ fontSize: 13 }}>
          {acts.slice(0, 6).map((a, i) => (
            <li key={i}>{a.fecha} · {a.titulo}</li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Agenda pendiente de conectar con fuentes oficiales.
        </div>
      )}
      <Fuentes f={ag.fuentes} />
    </Card>
  )
}

function BloqueAnalisisIAPol({ ai }: { ai: any }) {
  return (
    <Card title="Análisis IA de perfil" ok={ai.ok !== false}
          extra={ai.tokens_used ? `${ai.tokens_used} tokens` : ""}>
      {ai.perfil_ejecutivo && (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#1d1d1f",
                    background: "#FAFAFB", padding: "12px 14px",
                    borderRadius: 8, borderLeft: "3px solid #5B21B6",
                    marginTop: 0 }}>
          {ai.perfil_ejecutivo}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {typeof ai.riesgo_reputacional === "number" &&
          <Pill label="Riesgo reputacional" value={`${ai.riesgo_reputacional.toFixed(1)} / 10`}
                color="#DC2626" />}
        {ai.proyeccion &&
          <Pill label="Proyección"
                value={ai.proyeccion}
                color={ai.proyeccion === "ascenso" ? "#16A34A" :
                       ai.proyeccion === "declive" ? "#DC2626" : "#6e6e73"} />}
      </div>
      {ai.fortalezas?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong style={{ fontSize: 13 }}>Fortalezas:</strong>
          <ul style={{ paddingLeft: 18, fontSize: 13 }}>
            {ai.fortalezas.slice(0, 5).map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
      {ai.debilidades?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <strong style={{ fontSize: 13 }}>Debilidades:</strong>
          <ul style={{ paddingLeft: 18, fontSize: 13 }}>
            {ai.debilidades.slice(0, 5).map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
      <Fuentes f={ai.fuentes} />
    </Card>
  )
}

function Fuentes({ f }: { f: any[] }) {
  if (!f || f.length === 0) return null
  return (
    <div style={{ marginTop: 14, fontSize: 11, color: "#9ca3af" }}>
      Fuentes: {f.map((x, i) => (
        <span key={i}>{i > 0 && " · "}{x.url ?
          <a href={x.url} target="_blank" rel="noreferrer" style={{ color: "#9ca3af" }}>{x.nombre || x.tipo}</a>
          : (x.nombre || x.tipo)}</span>
      ))}
    </div>
  )
}

function Footer({ bloques_ok, bloques_err, onRebuild }: {
  bloques_ok: string[]; bloques_err: Record<string, string>; onRebuild: () => void
}) {
  return (
    <footer style={{ marginTop: 20, padding: "14px 16px",
                     background: "#F5F5F7", borderRadius: 10,
                     fontSize: 11, color: "#6e6e73" }}>
      Bloques OK: {bloques_ok.join(", ") || "ninguno"}
      <button onClick={onRebuild} style={{
        marginLeft: 12, padding: "6px 12px", fontSize: 11, fontWeight: 600,
        background: "#5B21B6", color: "#fff", border: "none",
        borderRadius: 6, cursor: "pointer",
      }}>Forzar reconstrucción</button>
    </footer>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: "#F5F5F7", borderRadius: 16, height: 180, marginBottom: 14 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: "#F5F5F7", borderRadius: 12, height: 120, marginBottom: 12 }} />
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
        background: "#5B21B6", color: "#fff", border: "none", borderRadius: 6,
      }}>Reintentar (fresh)</button>
    </div>
  )
}
