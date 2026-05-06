interface HeatmapCell {
  domain: string;
  label: string;
  score: number;
  severity: string;
  trend: string;
}

function cellColor(score: number) {
  const alpha = 0.15 + (score / 100) * 0.6;
  if (score >= 75) return `rgba(239, 68, 68, ${alpha})`;
  if (score >= 50) return `rgba(245, 158, 11, ${alpha})`;
  if (score >= 25) return `rgba(59, 130, 246, ${alpha})`;
  return `rgba(16, 185, 129, ${alpha})`;
}

export function RiskHeatmap({ cells }: { cells: HeatmapCell[] }) {
  if (!cells.length) {
    return <p className="text-sm text-muted text-center py-4">Sin datos de heatmap.</p>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cells.map(c => (
        <div
          key={c.domain}
          className="p-3 rounded-lg border border-border1 text-center"
          style={{ backgroundColor: cellColor(c.score) }}
        >
          <div className="text-[10px] text-text2 uppercase tracking-wider mb-1">{c.label}</div>
          <div className="text-xl font-black text-text1">{c.score}</div>
          <div className="text-[10px] text-muted mt-0.5">{c.trend}</div>
        </div>
      ))}
    </div>
  );
}
