'use client'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface SentimentHeatmapProps {
  series: Array<Record<string, string | number>>
  entidades: string[]
}

const PARTY_COLORS: Record<string, string> = {
  PP: '#3498db',
  PSOE: '#e74c3c',
  VOX: '#2ecc71',
  Sumar: '#9b59b6',
}

function getPartyColor(entidad: string): string {
  return PARTY_COLORS[entidad] ?? '#95a5a6'
}

export default function SentimentHeatmap({
  series,
  entidades,
}: SentimentHeatmapProps) {
  const fechas = series.map((row) => String(row['fecha']))

  const traces = entidades.map((entidad) => ({
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: entidad,
    x: fechas,
    y: series.map((row) => {
      const val = row[entidad]
      return typeof val === 'number' ? val : null
    }),
    line: {
      color: getPartyColor(entidad),
      width: 2,
    },
  }))

  // Zero reference line shape
  const shapes = [
    {
      type: 'line' as const,
      x0: fechas[0] ?? '',
      x1: fechas[fechas.length - 1] ?? '',
      y0: 0,
      y1: 0,
      line: {
        color: '#1d1d1f',
        width: 1,
        dash: 'dash' as const,
      },
    },
  ]

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    height: 280,
    margin: { l: 40, r: 10, t: 30, b: 40 },
    title: {
      text: 'Sentimiento Diario por Partido',
      font: { size: 13, color: '#1d1d1f', family: '-apple-system, system-ui' },
      x: 0,
      xanchor: 'left' as const,
      pad: { l: 0 },
    },
    xaxis: {
      tickfont: { size: 10, color: '#6e6e73', family: '-apple-system, system-ui' },
      gridcolor: '#e8e8ed',
      showgrid: true,
    },
    yaxis: {
      range: [-1, 1],
      tickfont: { size: 10, color: '#6e6e73', family: '-apple-system, system-ui' },
      gridcolor: '#e8e8ed',
      showgrid: true,
      zeroline: false,
    },
    legend: {
      font: { size: 11, color: '#1d1d1f', family: '-apple-system, system-ui' },
      bgcolor: 'rgba(0,0,0,0)',
      orientation: 'h' as const,
      x: 0,
      y: -0.15,
    },
    shapes,
    font: { family: '-apple-system, system-ui' },
  }

  const config = {
    displayModeBar: false,
    responsive: true,
  }

  return (
 <div
      style={{
        background: '#ffffff',
        borderRadius: 22,
        padding: 20,
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
        border: '1px solid #e8e8ed',
        fontFamily: '-apple-system, system-ui, sans-serif',
      }}
    >
 <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%' }}
        useResizeHandler
      />
 </div>
  )
}
