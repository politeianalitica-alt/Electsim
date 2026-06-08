'use client'
/**
 * <ViviendaStub /> · Vivienda v3 · Sprint V1
 *
 * Stub honesto para las sub-tabs cuyo contenido llega en sprints posteriores
 * (V5-V10). Muestra título, qué va a contener y un placeholder claro. No
 * inventa datos.
 *
 * Cuando una sub-tab está lista, su `ViviendaXxxView.tsx` deja de delegar en
 * este stub.
 */
import Link from 'next/link'

interface Props {
  glyph: string
  titulo: string
  subtitulo: string
  proximamente: string[]
  sprint: string
}

export function ViviendaStub({ glyph, titulo, subtitulo, proximamente, sprint }: Props) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 18,
        padding: '36px 40px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 28, color: '#DB2777' }}>{glyph}</span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {titulo}
        </h2>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.06em',
            padding: '3px 10px',
            background: '#FCE7F3',
            color: '#9D174D',
            borderRadius: 999,
            textTransform: 'uppercase',
          }}
        >
          {sprint}
        </span>
      </div>
      <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 22px', maxWidth: 760, lineHeight: 1.5 }}>{subtitulo}</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        {proximamente.map((p, i) => (
          <div
            key={i}
            style={{
              padding: '14px 16px',
              background: '#FAFAFA',
              borderRadius: 12,
              border: '1px solid #ECECEF',
              borderLeft: '3px solid #DB2777',
              fontSize: 12,
              color: '#3a3a3d',
              lineHeight: 1.5,
            }}
          >
            {p}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '14px 16px',
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
          fontSize: 12,
          color: '#166534',
          lineHeight: 1.5,
        }}
      >
        Esta sub-pestaña se completa en {sprint}. Mientras tanto, los datos en
        vivo del IPV, compraventas e IPVA se pueden ver en{' '}
        <Link href="/sector-vivienda?vv=global" style={{ color: '#166534', fontWeight: 700 }}>
          Visión Global
        </Link>
        .
      </div>
    </section>
  )
}

// ─── Vistas de sub-tab que delegan en el stub ─────────────────────

export function ViviendaPreciosView() {
  return (
    <ViviendaStub
      glyph="⬡"
      sprint="Sprint V5"
      titulo="Precios"
      subtitulo="Vista profunda de precios. Combina IPV, IPVA, índice real BdE deflactado, comparativa Eurostat y esfuerzo financiero por CCAA para responder: ¿están subiendo los precios donde más duele?"
      proximamente={[
        'IPV histórico 10 años · serie completa + var anual + interpretación',
        'IPV desagregado por CCAA · heatmap',
        'BdE precio real deflactado (tabla 25.10) vs nominal',
        'Eurostat HOUSE_PRICE_INDEX · España vs UE-27 / grupo de pares',
        'Esfuerzo financiero por CCAA (precio/renta) usando INE renta CCAA',
        'Bubble chart precio m² vs alquiler m² por capital de provincia',
        'Drill-down provincia · ranking + histórico 5 años',
      ]}
    />
  )
}

export function ViviendaMercadoView() {
  return (
    <ViviendaStub
      glyph="⊞"
      sprint="Sprint V6"
      titulo="Mercado y Transmisiones"
      subtitulo="Vista del flujo del mercado. Cuántas operaciones se firman, con qué financiación, dónde y con qué calidad regulatoria. Cruce de fuentes notariales, registrales y catastrales."
      proximamente={[
        'Compraventas mensuales (libre / protegida / nueva / usada) — INE ETDP',
        'Hipotecas firmadas · nº, importe medio, tipo medio — INE op. 25172',
        'Transmisiones por CCAA — INE op. 25173',
        'Registradores · estadística trimestral LIVE + % compradores extranjeros',
        'Catastro lookup · input RC o coordenadas → ficha inmueble',
        'Visados de obra y fin de obra (INE ECCS) · pipeline residencial',
        'Stock vivienda vacía / segunda residencia (censo)',
      ]}
    />
  )
}

export function ViviendaAlquilerView() {
  return (
    <ViviendaStub
      glyph="◑"
      sprint="Sprint V7"
      titulo="Alquiler y Zonas Tensionadas"
      subtitulo="Estado del alquiler en España y aplicación territorial de la Ley 12/2023 (zonas de mercado residencial tensionado, IRAV, limitación de actualizaciones, gran tenedor)."
      proximamente={[
        'IPVA general + variación anual (10 años) — INE',
        'IPVA por CCAA · heatmap',
        'Cost overburden (% hogares > 40% renta) — Eurostat ilc_mdho06',
        'Mapa ZMT declaradas · estado de implantación por CCAA (Ley 12/2023)',
        'SIMA Cataluña · índice de precios de referencia',
        'Lanzamientos por arrendamiento — CGPJ',
        'Tabla viva de regulación CCAA con link al boletín oficial',
      ]}
    />
  )
}

export function ViviendaPoliticaView() {
  return (
    <ViviendaStub
      glyph="⊟"
      sprint="Sprint V8"
      titulo="Política y Programas"
      subtitulo="Mapa de las políticas públicas que afectan al sector: presupuesto, ejes, ejecución por CCAA. Cruza Plan Estatal, NextGen, PERTE Vivienda y convocatorias BDNS abiertas."
      proximamente={[
        'Plan Estatal de Vivienda 2022-2025 · presupuesto, ejes, ejecución por CCAA',
        'PRTR Componente 2 · NextGen rehabilitación · % ejecución',
        'PERTE Vivienda · estado por CCAA',
        'BDNS · ayudas vivienda LIVE (cruce con /api/tercer-sector/oportunidades)',
        'Calendario de hitos normativos (Ley 12/2023, IRAV, bono joven…)',
        'Vivienda protegida construida histórica · ES vs UE (AVS + Eurostat)',
        'FinanciadoresActivos del sector vivienda (reuso de Tercer Sector)',
      ]}
    />
  )
}

export function ViviendaTuristicaView() {
  return (
    <ViviendaStub
      glyph="◐"
      sprint="Sprint V10"
      titulo="Vivienda turística"
      subtitulo="Impacto del alquiler turístico sobre el mercado residencial. Tasas, regulación por CCAA y datos de plataformas declarados vía DSA."
      proximamente={[
        'Viviendas de uso turístico declaradas — INE EOH + registros CCAA',
        'DSA Transparency · listings count Booking y Airbnb España',
        'Tabla viva de regulación CCAA (Barcelona, Mallorca, Sevilla…)',
        'Tasa turística por CCAA / municipio',
        'Mapa de competencia VUT vs alquiler residencial',
      ]}
    />
  )
}

export function ViviendaSostenibilidadView() {
  return (
    <ViviendaStub
      glyph="✦"
      sprint="Sprint V10"
      titulo="Sostenibilidad y rehabilitación"
      subtitulo="Eficiencia energética del parque residencial. Cruza IDAE, fondos NextGen de rehabilitación y emisiones de bonos verdes inmobiliarios."
      proximamente={[
        'Certificados energéticos IDAE · distribución A-G por CCAA',
        'Fondos NextGen rehabilitación · ejecución por CCAA',
        '510k actuaciones declaradas PRTR · seguimiento',
        'Bonos verdes inmobiliario · CNMV emisiones',
        'Taxonomía UE · DNSH cumplimiento vivienda',
      ]}
    />
  )
}
