'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MODULES, moduleOfPath, itemOfPath } from './navigation'

export default function AppHeader() {
  const path = usePathname() || ''
  const activeModule = moduleOfPath(path)
  const activeItem = itemOfPath(path)
  const banner = activeItem?.banner

  return (
    <>
      {/* ── Barra de navegación ── */}
      <nav style={{
        position:'sticky',top:0,zIndex:50,height:44,
        background:'rgba(251,251,253,0.85)',
        backdropFilter:'saturate(180%) blur(20px)',
        WebkitBackdropFilter:'saturate(180%) blur(20px)',
        borderBottom:'1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{
          maxWidth:1600,margin:'0 auto',padding:'0 20px',
          display:'flex',alignItems:'center',height:'100%',
          fontFamily:'var(--font-body,-apple-system,system-ui)',
          fontSize:12,
        }}>
          <Link href="/inicio" style={{display:'flex',alignItems:'center',gap:8,marginRight:28,textDecoration:'none',flexShrink:0,color:'#1F4E8C',fontWeight:600,fontFamily:'inherit',letterSpacing:'-0.01em'}}>
            {/* Icono Politeia Analítica — capitel jónico + barras */}
            <svg width="20" height="18" viewBox="0 0 120 110" fill="currentColor">
              <rect x="8" y="6" width="104" height="6" rx="1"/>
              <path d="M 8 14 Q 8 22, 18 22 Q 28 22, 28 14 L 28 24 L 92 24 L 92 14 Q 92 22, 102 22 Q 112 22, 112 14 Z"/>
              <circle cx="18" cy="18" r="3.5" fill="#fff"/>
              <circle cx="18" cy="18" r="2"/>
              <circle cx="102" cy="18" r="3.5" fill="#fff"/>
              <circle cx="102" cy="18" r="2"/>
              <rect x="14" y="28" width="92" height="4" rx="1"/>
              <rect x="26" y="58" width="18" height="44" rx="2"/>
              <rect x="52" y="48" width="18" height="54" rx="2"/>
              <rect x="78" y="38" width="18" height="64" rx="2"/>
            </svg>
            POLITEIA <span style={{fontWeight:400,color:'#6e6e73',marginLeft:-4}}>ANALÍTICA</span>
          </Link>
          <div style={{display:'flex',flex:1,height:'100%',justifyContent:'center'}}>
            {MODULES.map(m=>{
              const active = activeModule?.id === m.id
              const dest = m.items[0].href
              return (
                <Link key={m.id} href={dest} style={{
                  display:'flex',alignItems:'center',padding:'0 10px',
                  whiteSpace:'nowrap',fontSize:12,
                  fontWeight:active?600:500,
                  color:active?'#1F4E8C':'#424245',
                  borderBottom:active?'2px solid #1F4E8C':'2px solid transparent',
                  textDecoration:'none',transition:'color 150ms',
                  fontFamily:'var(--font-body,-apple-system,system-ui)',
                }}>
                  {m.label}
                </Link>
              )
            })}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0,marginLeft:12}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'#6e6e73',fontWeight:500}}>
              <span style={{
                width:5,height:5,borderRadius:'50%',background:'#2d8a39',
                boxShadow:'0 0 0 2px rgba(45,138,57,0.2)',flexShrink:0,
                animation:'pulseDot 2.4s ease-in-out infinite',
              }}/>
              Actualizado hace 2 min
            </span>
            <style>{`@keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
            {/* Botón Workspace — apunta al Command Center del workspace
                España 2026 (vista por defecto del workspace, donde están
                Morning Brief, Issues críticos, Acciones, Equipo y Foco).
                /operaciones (Centro de Operaciones del Analista) sigue
                accesible desde el módulo 'Operaciones' del nav. */}
            <Link href="/workspaces/ws_espana_2026/overview" style={{
              display:'inline-flex',alignItems:'center',gap:6,
              fontSize:12,fontWeight:600,letterSpacing:'-0.005em',
              color:'#fff',background:(path.startsWith('/workspaces')||path==='/workspace'||path==='/operaciones')?'#0F2A4F':'#1F4E8C',
              padding:'5px 12px',borderRadius:999,textDecoration:'none',
              boxShadow:'0 1px 2px rgba(31,78,140,0.25)',
              transition:'all 160ms',
            }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                {/* Icono grid 2x2 = workspace */}
                <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/>
                <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1"/>
                <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1"/>
                <rect x="9"   y="9"   width="5.5" height="5.5" rx="1"/>
              </svg>
              Workspace
            </Link>
            <Link href="/login" style={{fontSize:12,color:'#6e6e73',textDecoration:'none'}}>Salir</Link>
          </div>
        </div>
      </nav>

      {/* ── Subnav del módulo activo ── */}
      {activeModule && (
        <div style={{
          position:'sticky',top:44,zIndex:49,height:38,
          background:'#fff',
          borderBottom:'1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{
            maxWidth:1600,margin:'0 auto',padding:'0 20px',
            display:'flex',alignItems:'center',height:'100%',gap:18,
            fontFamily:'var(--font-body,-apple-system,system-ui)',
          }}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6e6e73',flexShrink:0}}>
              {activeModule.label}
            </span>
            <div style={{display:'flex',gap:2,overflowX:'auto',scrollbarWidth:'none'}}>
              {activeModule.items.map(it=>{
                const active = path === it.href
                return (
                  <Link key={it.href} href={it.href} style={{
                    display:'flex',alignItems:'center',padding:'6px 12px',
                    borderRadius:8,whiteSpace:'nowrap',
                    fontSize:12,fontWeight:active?600:500,
                    color:active?'#fff':'#3a3a3d',
                    background:active?'#1F4E8C':'transparent',
                    textDecoration:'none',transition:'all 150ms',
                  }}>{it.label}</Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Banner-hero del item (solo si la subpágina lo declara) ── */}
      {banner && (
        <div style={{ background:'#fbfbfd' }}>
          <div style={{ maxWidth:1600, margin:'0 auto', padding:'0 28px' }}>
            <section style={{
              background:`linear-gradient(135deg,${banner.colorFrom || '#0070D1'} 0%,${banner.colorTo || '#003d8a'} 100%)`,
              borderRadius:'0 0 24px 24px', padding:'40px 48px',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              gap:24, marginBottom:28, color:'#fff',
              transition:'background 200ms',
            }}>
              <div>
                <p style={{
                  fontSize:10.5, fontWeight:600, letterSpacing:'0.1em',
                  textTransform:'uppercase', opacity:0.65, margin:'0 0 8px',
                }}>{banner.eyebrow}</p>
                <h1 style={{
                  fontFamily:'var(--font-display,-apple-system,"Helvetica Neue",system-ui)',
                  fontWeight:700, fontSize:34, letterSpacing:'-0.024em',
                  lineHeight:1.1, margin:'0 0 6px',
                }}>
                  {banner.title}
                  {banner.titleItalic && <> <em style={{ fontWeight:300, fontStyle:'italic' }}>{banner.titleItalic}</em></>}
                </h1>
                {banner.subtitle && (
                  <p style={{ fontSize:13, opacity:0.65, margin:0 }}>{banner.subtitle}</p>
                )}
              </div>
              {banner.metric && (
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{
                    fontFamily:'var(--font-display,-apple-system,"Helvetica Neue",system-ui)',
                    fontWeight:700, fontSize:68, letterSpacing:'-0.05em',
                    lineHeight:1, display:'inline-flex', alignItems:'baseline',
                  }}>
                    {banner.metric}
                    {banner.metricSuffix && <span style={{ fontSize:34 }}>{banner.metricSuffix}</span>}
                  </div>
                  {banner.metricLabel && (
                    <div style={{ fontSize:12.5, opacity:0.65, marginTop:4 }}>{banner.metricLabel}</div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}
