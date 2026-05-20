'use client'

type VelocidadLabel = 'acelerando' | 'creciendo' | 'estable' | 'decayendo'
type EmocionDominante = 'positiva' | 'negativa' | 'neutra'

interface NarrativeCluster {
  categoria: string
  n_articulos: number
  velocidad_7d: number
  velocidad_label: string
  emocion_dominante: string
  partidos_top: string[]
  recomendacion: string
}

interface NarrativePanelProps {
  clusters: NarrativeCluster[]
}

const VELOCIDAD_BG: Record<VelocidadLabel, string> = {
  acelerando: '#e74c3c',
  creciendo: '#e67e22',
  estable: '#95a5a6',
  decayendo: '#7fb3d3',
}

const EMOCION_COLOR: Record<EmocionDominante, string> = {
  positiva: '#27ae60',
  negativa: '#e74c3c',
  neutra: '#95a5a6',
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function NarrativePanel({ clusters }: NarrativePanelProps) {
  return (
 <div
      style={{
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
 <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#1d1d1f',
          letterSpacing: '-0.01em',
          marginBottom: 14,
        }}
      >
        Narrativas Activas
 </div>

 <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}
      >
        {clusters.map((cluster, i) => (
 <NarrativeCard key={`${cluster.categoria}-${i}`} cluster={cluster} />
        ))}
 </div>
 </div>
  )
}

function NarrativeCard({ cluster }: { cluster: NarrativeCluster }) {
  const velocidadBg = VELOCIDAD_BG[cluster.velocidad_label as VelocidadLabel] ?? '#95a5a6'
  const emocionColor = EMOCION_COLOR[cluster.emocion_dominante as EmocionDominante] ?? '#95a5a6'

  return (
 <div
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid #e8e8ed',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header row */}
 <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
 <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: '-0.01em',
          }}
        >
          {capitalize(cluster.categoria)}
 </span>
 <span
          style={{
            background: velocidadBg,
            color: '#ffffff',
            borderRadius: 20,
            padding: '2px 9px',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {cluster.velocidad_label}
 </span>
 </div>

      {/* Articles count + emotion */}
 <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
 <span
          style={{
            fontSize: 11.5,
            color: '#6e6e73',
          }}
        >
          {cluster.n_articulos.toLocaleString('es-ES')} artículos
 </span>
 <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11.5,
            fontWeight: 600,
            color: emocionColor,
            background: `${emocionColor}18`,
            borderRadius: 8,
            padding: '2px 7px',
          }}
        >
          {cluster.emocion_dominante}
 </span>
 </div>

      {/* Party chips */}
      {cluster.partidos_top.length > 0 && (
 <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
          }}
        >
          {cluster.partidos_top.map((partido) => (
 <span
              key={partido}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#1d1d1f',
                background: '#f5f5f7',
                borderRadius: 6,
                padding: '2px 8px',
                border: '1px solid #e8e8ed',
              }}
            >
              {partido}
 </span>
          ))}
 </div>
      )}

      {/* Recomendación */}
 <div
        style={{
          fontSize: 11.5,
          color: '#6e6e73',
          fontStyle: 'italic',
          lineHeight: 1.45,
          borderTop: '1px solid #f0f0f5',
          paddingTop: 8,
          marginTop: 2,
        }}
      >
        {cluster.recomendacion}
 </div>
 </div>
  )
}
