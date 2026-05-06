import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, opts: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat("es-ES", opts).format(value);
}

export function formatDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat("es-ES", opts).format(date);
}

export function formatRelative(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.round(hr / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(date);
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDelta(value: number, format: "pp" | "pct" | "abs" = "pp"): string {
  const sign = value > 0 ? "+" : "";
  if (format === "pp") return `${sign}${value.toFixed(1)}pp`;
  if (format === "pct") return `${sign}${value.toFixed(1)}%`;
  return `${sign}${value.toFixed(0)}`;
}

export function timeAgo(d: string | Date): string {
  return formatRelative(d);
}

export const partyColor = (party: string): string => {
  const map: Record<string, string> = {
    PP: "#009FDB", PSOE: "#E30613", VOX: "#63BE21",
    SUMAR: "#E4007C", PODEMOS: "#6A2E74", JUNTS: "#00AEEF",
    PNV: "#007A3D", ERC: "#F4B20A", "EH BILDU": "#A9C55A",
    BNG: "#73C6E0", CC: "#FFCB00", UPN: "#003A8C"
  };
  return map[party.toUpperCase()] || "#94A3B8";
};

export function severityColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "high") return "#EF4444";
  if (s === "medium" || s === "elevated") return "#F59E0B";
  if (s === "low" || s === "info") return "#3B82F6";
  return "#10B981";
}
