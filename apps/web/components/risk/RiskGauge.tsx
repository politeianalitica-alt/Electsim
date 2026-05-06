interface RiskGaugeProps {
  score: number;
  level: string;
  trendDelta: number;
}

function gaugeColor(v: number) {
  if (v >= 75) return "#EF4444";
  if (v >= 50) return "#F59E0B";
  if (v >= 25) return "#3B82F6";
  return "#10B981";
}

function levelLabel(level: string) {
  if (level === "critical") return "CRÍTICO";
  if (level === "high") return "ALTO";
  if (level === "medium") return "MEDIO";
  return "BAJO";
}

export function RiskGauge({ score, level, trendDelta }: RiskGaugeProps) {
  const color = gaugeColor(score);
  const radius = 60;
  const circumference = Math.PI * radius;
  const arc = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-20 overflow-hidden">
        <svg width="144" height="80" viewBox="0 0 144 80">
          <path d="M12 72 A60 60 0 0 1 132 72" fill="none" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
          <path
            d="M12 72 A60 60 0 0 1 132 72"
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <div className="text-center">
            <div className="text-3xl font-black" style={{ color }}>{score}</div>
          </div>
        </div>
      </div>
      <div className="font-bold text-sm mt-1" style={{ color }}>{levelLabel(level)}</div>
      <div className={`text-[11px] mt-0.5 ${trendDelta > 0 ? "text-red1" : trendDelta < 0 ? "text-green1" : "text-text2"}`}>
        {trendDelta > 0 ? "▲" : trendDelta < 0 ? "▼" : "—"} {Math.abs(trendDelta)} pts esta semana
      </div>
    </div>
  );
}
