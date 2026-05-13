import { BadgeSeverity, BadgeStatus } from "@/app/_components/workspace/badges";

const PARTY_COLORS: Record<string, string> = {
  PP:    "rgb(59 130 246)",
  PSOE:  "rgb(239 68 68)",
  Vox:   "rgb(22 163 74)",
  Sumar: "rgb(139 92 246)",
  Junts: "rgb(8 145 178)",
  ERC:   "rgb(245 158 11)",
  PNV:   "rgb(6 95 70)",
  Bildu: "rgb(132 204 22)",
};

export function CellPercentage({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const color = pct >= 40 ? "rgb(74 222 128)" : pct >= 25 ? "rgb(251 191 36)" : "rgb(248 113 113)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-slate-200">{pct.toFixed(1)}%</span>
    </div>
  );
}

export function CellSeats({ value }: { value: number }) {
  const v = Number(value) || 0;
  const majority = 176;
  const color =
    v >= majority ? "rgb(74 222 128)" :
    v >= majority * 0.4 ? "rgb(251 191 36)" :
    "rgb(203 213 225)";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>{v}</span>
      <span className="text-[10px] text-slate-500">esc.</span>
    </div>
  );
}

export function CellActor({ value }: { value: string }) {
  const partyColor = PARTY_COLORS[String(value)] ?? "rgb(148 163 184)";
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: `${partyColor}25`, color: partyColor }}
    >
      {String(value)}
    </span>
  );
}

export function CellTrend({ value }: { value: number }) {
  const v = Number(value) || 0;
  const sign = v > 0 ? "+" : "";
  const color = v > 0 ? "rgb(74 222 128)" : v < 0 ? "rgb(248 113 113)" : "rgb(148 163 184)";
  const arrow = v > 0 ? "↑" : v < 0 ? "↓" : "→";
  return (
    <span className="text-xs font-semibold tabular-nums" style={{ color }}>
      {arrow} {sign}{v.toFixed(1)}
    </span>
  );
}

export function CellSeverity({ value }: { value: string }) {
  return <BadgeSeverity value={value} />;
}

export function CellStatus({ value }: { value: string }) {
  return <BadgeStatus value={value} />;
}

export function CellTag({ value }: { value: string | string[] }) {
  const tags = Array.isArray(value) ? value : [String(value)];
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <CellActor key={tag} value={tag} />
      ))}
    </div>
  );
}

export function CellDate({ value }: { value: string }) {
  const d = value ? new Date(String(value)) : null;
  if (!d || isNaN(d.getTime())) return <span className="text-xs text-slate-500">—</span>;
  return (
    <span className="text-xs text-slate-300 tabular-nums">
      {d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
    </span>
  );
}
