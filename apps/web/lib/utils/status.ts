import type { DataMode } from "@/lib/types/status";

export function getModeLabel(mode: DataMode): string {
  const labels: Record<DataMode, string> = {
    real: "EN VIVO",
    demo: "DEMO",
    fallback: "FALLBACK",
    error: "ERROR",
  };
  return labels[mode] ?? "DESCONOCIDO";
}

export function getModeDescription(mode: DataMode): string {
  const descriptions: Record<DataMode, string> = {
    real: "Datos en tiempo real desde la fuente",
    demo: "Datos de ejemplo para demostración",
    fallback: "Datos de respaldo (fuente principal no disponible)",
    error: "Error al obtener datos",
  };
  return descriptions[mode] ?? "";
}

export function getModeClassName(mode: DataMode): string {
  const classes: Record<DataMode, string> = {
    real: "bg-green-500/10 border-green-500/30 text-green-400",
    demo: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    fallback: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
  };
  return classes[mode] ?? classes.fallback;
}

export function isNonRealMode(mode: DataMode): boolean {
  return mode !== "real";
}
