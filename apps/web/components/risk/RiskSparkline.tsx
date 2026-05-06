interface RiskSparklineProps {
  spark: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function RiskSparkline({ spark, color = "#F59E0B", height = 60, width = 300 }: RiskSparklineProps) {
  if (!spark.length) return null;
  const max = Math.max(...spark);
  const min = Math.min(...spark);
  const range = max - min || 1;
  const points = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {spark.map((v, i) => {
        const x = (i / (spark.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 8) - 4;
        return i === spark.length - 1 ? (
          <circle key={i} cx={x} cy={y} r={4} fill={color} />
        ) : null;
      })}
    </svg>
  );
}
