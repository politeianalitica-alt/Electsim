'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MODULES, moduleOfPath, itemOfPath } from './navigation'
import { recordModuleVisit } from '@/lib/home/modules-access'

export default function AppHeader() {
  const path = usePathname() || ''
  const activeModule = moduleOfPath(path)
  const activeItem = itemOfPath(path)
  const banner = activeItem?.banner
  const [menuOpen, setMenuOpen] = useState(false)
  const [wsOpen, setWsOpen] = useState(false)

  // Workspace unificado en el botón azul: Command Center + opciones del módulo
  // 'workspace' (Estudio, War Room, Toolbox, Cuaderno). Las dos ubicaciones
  // antiguas (pestaña de nav + botón) quedan fundidas aquí.
  const wsModule = MODULES.find(m => m.id === 'workspace')
  const wsOptions = [
    { label: 'Command Center · España 2026', href: '/workspaces/ws_espana_2026/overview' },
    { label: 'Mis workspaces', href: '/workspaces' },
    ...((wsModule?.items || []).filter(it => !it.hidden)),
  ]
  const wsActive = path.startsWith('/workspaces') || path === '/workspace' || path === '/operaciones'
    || (wsModule?.items || []).some(it => path === it.href || path.startsWith(it.href + '/'))

  // Registra la página visitada para el bloque "Recientes" del inicio.
  // Excluimos el propio inicio y el login (no son destinos de "volver a").
  useEffect(() => {
    if (!path || path === '/dashboard' || path === '/inicio' || path.startsWith('/login')) return
    const label = activeItem?.label || activeModule?.label
    const href = activeItem?.href || path
    if (label) recordModuleVisit(href, label)
  }, [path, activeItem, activeModule])

  // Cierra los menús al cambiar de ruta.
  useEffect(() => { setMenuOpen(false); setWsOpen(false) }, [path])

  return (
 <>
      {/* ── Barra de navegación ── */}
 <nav
        aria-label="Navegación principal"
        style={{
        position:'sticky',top:0,zIndex:50,height:44,
        background:'rgba(251,251,253,0.85)',
        backdropFilter:'saturate(180%) blur(20px)',
        WebkitBackdropFilter:'saturate(180%) blur(20px)',
        borderBottom:'1px solid rgba(0,0,0,0.06)',
      }}>
 <div className="ah-inner" style={{
          maxWidth:1600,margin:'0 auto',padding:'0 20px',
          display:'flex',alignItems:'center',height:'100%',
          fontFamily:'var(--font-text,-apple-system,system-ui)',
          fontSize:12,
        }}>
 <Link href="/dashboard" className="ah-logo" style={{display:'flex',alignItems:'center',gap:8,marginRight:28,textDecoration:'none',flexShrink:0,color:'#1F4E8C',fontWeight:600,fontFamily:'inherit',letterSpacing:'-0.01em'}}>
            {/* Icono Politeia Analítica — capitel jónico + barras · decorativo,
                aria-hidden porque el texto adyacente "POLITEIA ANALÍTICA" ya
                etiqueta el link · WCAG 1.1.1 */}
 <svg aria-hidden="true" width="20" height="18" viewBox="0 0 120 110" fill="currentColor">
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
            POLITEIA <span className="ah-logo-sub" style={{fontWeight:400,color:'#6e6e73',marginLeft:-4}}>ANALÍTICA</span>
 </Link>
 <div className="ah-tabs" style={{display:'flex',flex:1,height:'100%',justifyContent:'center',overflowX:'auto',scrollbarWidth:'none',minWidth:0}}>
            {MODULES.filter(m => !m.hideFromTopBar).map(m=>{
              const active = activeModule?.id === m.id
              // Tomamos el primer item NO oculto como destino del tab
              const dest = (m.items.find(it => !it.hidden) ?? m.items[0]).href
              return (
 <Link key={m.id} href={dest} style={{
                  display:'flex',alignItems:'center',padding:'0 10px',
                  whiteSpace:'nowrap',fontSize:12,
                  fontWeight:active?600:500,
                  color:active?'#1F4E8C':'#424245',
                  borderBottom:active?'2px solid #1F4E8C':'2px solid transparent',
                  textDecoration:'none',transition:'color 150ms',
                  fontFamily:'var(--font-text,-apple-system,system-ui)',
                }}>
                  {m.label}
 </Link>
              )
            })}
 </div>
 <div className="ah-right" style={{display:'flex',alignItems:'center',gap:12,flexShrink:0,marginLeft:12}}>
 <span className="ah-live" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'#6e6e73',fontWeight:500}}>
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
 <div style={{position:'relative',display:'inline-flex'}}>
 <button
              onClick={() => setWsOpen(o => !o)}
              aria-expanded={wsOpen}
              aria-haspopup="menu"
              style={{
              display:'inline-flex',alignItems:'center',gap:6,
              fontSize:12,fontWeight:600,letterSpacing:'-0.005em',
              color:'#fff',background:(wsActive||wsOpen)?'#0F2A4F':'#1F4E8C',
              padding:'5px 12px',borderRadius:999,border:'none',cursor:'pointer',
              boxShadow:'0 1px 2px rgba(31,78,140,0.25)',transition:'all 160ms',
              fontFamily:'inherit',
            }}>
 <svg aria-hidden="true" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                {/* Icono grid 2x2 = workspace · decorativo */}
 <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/>
 <rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/>
 <rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/>
 <rect x="9" y="9" width="5.5" height="5.5" rx="1"/>
 </svg>
              Workspace
 <svg aria-hidden="true" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{transform:wsOpen?'rotate(180deg)':'none',transition:'transform 160ms'}}>
 <polyline points="6 9 12 15 18 9"/>
 </svg>
 </button>
            {wsOpen && (
 <>
 <div onClick={() => setWsOpen(false)} style={{position:'fixed',inset:0,zIndex:60}} aria-hidden="true"/>
 <div role="menu" style={{
                position:'absolute',top:'calc(100% + 7px)',right:0,zIndex:61,minWidth:236,
                background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:12,
                boxShadow:'0 10px 34px rgba(0,0,0,0.18)',padding:6,
              }}>
                {wsOptions.map(o => {
                  const a = path === o.href || path.startsWith(o.href + '/')
                  return (
 <Link key={o.href} href={o.href} role="menuitem" onClick={() => setWsOpen(false)} style={{
                      display:'block',padding:'9px 12px',borderRadius:8,
                      fontSize:13,fontWeight:a?600:500,
                      color:a?'#1F4E8C':'#1d1d1f',
                      background:a?'rgba(31,78,140,0.08)':'transparent',
                      textDecoration:'none',
                    }}>{o.label}</Link>
                  )
                })}
 </div>
 </>
            )}
 </div>
 <Link href="/login" className="ah-salir" style={{fontSize:12,color:'#6e6e73',textDecoration:'none'}}>Salir</Link>
            {/* Botón de menú · solo visible en móvil (CSS .ah-burger) */}
 <button
              className="ah-burger"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
              style={{
                alignItems:'center',justifyContent:'center',width:34,height:30,
                background:menuOpen?'#1F4E8C':'#fff',color:menuOpen?'#fff':'#1F4E8C',
                border:'1px solid #1F4E8C33',borderRadius:8,cursor:'pointer',padding:0,
              }}>
 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {menuOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
 </svg>
 </button>
 </div>
 </div>
 </nav>

      {/* ── Menú desplegable móvil ── (se muestra al pulsar la hamburguesa) */}
      {menuOpen && (
 <div className="ah-menu" role="dialog" aria-label="Menú de navegación" style={{
          position:'fixed',top:44,left:0,right:0,zIndex:48,
          background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
          maxHeight:'calc(100vh - 44px)',overflowY:'auto',padding:'10px 12px 16px',
          fontFamily:'var(--font-text,-apple-system,system-ui)',
        }}>
 <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {MODULES.filter(m => !m.hideFromTopBar).map(m => {
              const dest = (m.items.find(it => !it.hidden) ?? m.items[0]).href
              const active = activeModule?.id === m.id
              return (
 <Link key={m.id} href={dest} onClick={() => setMenuOpen(false)} style={{
                  flex:'1 1 45%',minWidth:0,padding:'11px 12px',borderRadius:8,
                  fontSize:13,fontWeight:active?700:500,
                  color:active?'#1F4E8C':'#1d1d1f',
                  background:active?'rgba(31,78,140,0.10)':'#F5F5F7',
                  textDecoration:'none',
                }}>{m.label}</Link>
              )
            })}
 </div>
 <div style={{marginTop:12}}>
 <div style={{fontSize:10.5,fontWeight:700,letterSpacing:'0.08em',color:'#6e6e73',textTransform:'uppercase',padding:'2px 2px 7px'}}>Workspace</div>
 <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {wsOptions.map(o => (
 <Link key={o.href} href={o.href} onClick={() => setMenuOpen(false)} style={{flex:'1 1 45%',minWidth:0,padding:'10px 12px',borderRadius:8,fontSize:12.5,fontWeight:500,color:'#fff',background:'#1F4E8C',textDecoration:'none',textAlign:'center'}}>{o.label}</Link>
              ))}
 </div>
 </div>
 <div style={{display:'flex',gap:8,marginTop:10}}>
 <Link href="/login" onClick={() => setMenuOpen(false)} style={{flex:1,textAlign:'center',padding:'11px',borderRadius:8,background:'#F5F5F7',color:'#1d1d1f',fontWeight:600,fontSize:13,textDecoration:'none'}}>Salir</Link>
 </div>
 </div>
      )}

      {/* ── Subnav del módulo activo · solo si tiene 2+ items visibles ── */}
      {activeModule && activeModule.items.filter(it => !it.hidden).length > 1 && (
 <nav
          aria-label={`Subnavegación de ${activeModule.label}`}
          style={{
          position:'sticky',top:44,zIndex:49,height:38,
          background:'#fff',
          borderBottom:'1px solid rgba(0,0,0,0.06)',
        }}>
 <div className="ah-subnav-inner" style={{
            maxWidth:1600,margin:'0 auto',padding:'0 20px',
            display:'flex',alignItems:'center',height:'100%',gap:18,
            fontFamily:'var(--font-text,-apple-system,system-ui)',
          }}>
 <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6e6e73',flexShrink:0}}>
              {activeModule.label}
 </span>
 <div style={{display:'flex',gap:2,overflowX:'auto',scrollbarWidth:'none'}}>
              {activeModule.items.filter(it => !it.hidden).map(it=>{
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
 </nav>
      )}

      {/* ── Banner-hero del item (solo si la subpágina lo declara) ── */}
      {banner && (
 <div style={{ background:'#fbfbfd' }}>
 <div style={{ maxWidth:1600, margin:'0 auto', padding:'0 28px' }}>
 <section className="ah-banner" style={{
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
 <div className="ah-banner-metric" style={{
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
