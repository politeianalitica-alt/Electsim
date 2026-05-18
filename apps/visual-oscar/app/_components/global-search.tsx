"use client"
/**
 * GlobalSearch · barra Cmd+K (Ctrl+K en Windows) accesible desde toda la app.
 *
 * Atajos:
 *   Cmd+K / Ctrl+K  · abre
 *   Esc             · cierra
 *   ↑ ↓             · navega
 *   Enter           · selecciona
 *
 * Llama a /api/search/global con debounce 200ms. Resultados tipados:
 * páginas, municipios, CCAA y políticos (autocomplete vía Wikipedia es).
 *
 * Sin emojis · sin librería externa (sin cmdk) · puro React.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type Resultado = {
  tipo: "municipio" | "politico" | "ccaa" | "pagina"
  titulo: string
  subtitulo?: string
  url: string
  rank: number
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Atajo teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Focus input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQ(""); setResultados([]); setSel(0) }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (q.length < 2) { setResultados([]); return }
    setLoading(true)
    const tid = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/global?q=${encodeURIComponent(q)}`)
        const j = await r.json()
        setResultados(j?.resultados || [])
        setSel(0)
      } catch {
        setResultados([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(tid)
  }, [q])

  // Navegación con flechas
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSel((s) => Math.min(s + 1, resultados.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSel((s) => Math.max(0, s - 1))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const r = resultados[sel]
        if (r) {
          setOpen(false)
          router.push(r.url)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, resultados, sel, router])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Buscar (Cmd+K)"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 10px", borderRadius: 6,
          background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)",
          color: "#6e6e73", fontSize: 12, cursor: "pointer",
          fontFamily: "var(--font-body)",
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>⌕</span>
        Buscar
        <kbd style={{
          fontSize: 10, padding: "1px 5px",
          background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 3, marginLeft: 6,
        }}>⌘K</kbd>
      </button>
    )
  }

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.4)",
        display: "flex", justifyContent: "center", paddingTop: "10vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12, width: "100%", maxWidth: 640,
          maxHeight: "70vh", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "14px 18px", borderBottom: "1px solid #ECECEF" }}>
          <span style={{ fontSize: 16, color: "#6e6e73" }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar municipios, políticos, páginas..."
            style={{
              flex: 1, border: "none", outline: "none", fontSize: 15,
              fontFamily: "var(--font-body)", color: "#1d1d1f",
            }}
          />
          {loading && <span style={{ fontSize: 11, color: "#9ca3af" }}>buscando...</span>}
          <kbd style={{
            fontSize: 10, padding: "2px 6px",
            background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 3, color: "#6e6e73",
          }}>Esc</kbd>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {q.length < 2 && (
            <div style={{ padding: 24, fontSize: 13, color: "#9ca3af" }}>
              Escribe al menos 2 caracteres para buscar.
              <br />
              <span style={{ fontSize: 11 }}>
                Páginas, municipios (8.132), CCAA, políticos (Wikipedia).
              </span>
            </div>
          )}
          {q.length >= 2 && resultados.length === 0 && !loading && (
            <div style={{ padding: 24, fontSize: 13, color: "#9ca3af" }}>
              Sin resultados para "<strong>{q}</strong>".
            </div>
          )}
          {resultados.map((r, i) => (
            <button
              key={`${r.tipo}-${r.url}`}
              onClick={() => {
                setOpen(false)
                router.push(r.url)
              }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 18px", border: "none",
                background: i === sel ? "#F0F4FA" : "transparent",
                cursor: "pointer", textAlign: "left",
                fontFamily: "var(--font-body)",
              }}
            >
              <Badge tipo={r.tipo} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f",
                              overflow: "hidden", textOverflow: "ellipsis",
                              whiteSpace: "nowrap" }}>
                  {r.titulo}
                </div>
                {r.subtitulo && (
                  <div style={{ fontSize: 11, color: "#6e6e73",
                                overflow: "hidden", textOverflow: "ellipsis",
                                whiteSpace: "nowrap" }}>
                    {r.subtitulo}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>↵</span>
            </button>
          ))}
        </div>

        <div style={{ padding: "8px 18px", borderTop: "1px solid #ECECEF",
                      fontSize: 11, color: "#9ca3af",
                      display: "flex", justifyContent: "space-between" }}>
          <span>
            <kbd style={kbdStyle}>↑</kbd>
            <kbd style={kbdStyle}>↓</kbd>
            navegar
            <kbd style={{ ...kbdStyle, marginLeft: 8 }}>↵</kbd>
            seleccionar
          </span>
          <span>{resultados.length} resultado(s)</span>
        </div>
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  fontSize: 10, padding: "1px 5px", marginRight: 4,
  background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 3, color: "#6e6e73",
}

function Badge({ tipo }: { tipo: Resultado["tipo"] }) {
  const colors: Record<Resultado["tipo"], { bg: string; fg: string; label: string }> = {
    municipio: { bg: "#E8F0FE", fg: "#1F4E8C", label: "MUN" },
    ccaa:      { bg: "#F0E8FE", fg: "#5B21B6", label: "CCAA" },
    politico:  { bg: "#FEE8E8", fg: "#DC2626", label: "POL" },
    pagina:    { bg: "#E8FEEC", fg: "#16A34A", label: "PAG" },
  }
  const c = colors[tipo]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 38, height: 22, borderRadius: 4, background: c.bg, color: c.fg,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
    }}>
      {c.label}
    </span>
  )
}
