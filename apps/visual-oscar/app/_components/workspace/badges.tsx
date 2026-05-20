import type { Priority } from "@/types/workspace";

const PRIORITY_STYLES: Record<Priority, { bg: string; fg: string; label: string }> = {
  critical: { bg: "rgb(239 68 68 / 0.15)",  fg: "rgb(248 113 113)", label: "Crítico" },
  high:     { bg: "rgb(245 158 11 / 0.15)", fg: "rgb(251 191 36)",  label: "Alto" },
  normal:   { bg: "rgb(99 102 241 / 0.15)", fg: "rgb(129 140 248)", label: "Normal" },
  low:      { bg: "rgb(100 116 139 / 0.2)", fg: "rgb(148 163 184)", label: "Bajo" },
};

export function BadgeSeverity({ value }: { value: Priority | string }) {
  const cfg = PRIORITY_STYLES[value as Priority] ?? PRIORITY_STYLES.low;
  return (
 <span
      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
 </span>
  );
}

export function BadgePriority({ value }: { value: Priority | string }) {
  return <BadgeSeverity value={value} />;
}

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  open:        { bg: "rgb(100 116 139 / 0.2)", fg: "rgb(148 163 184)", label: "Abierto" },
  monitoring:  { bg: "rgb(99 102 241 / 0.15)", fg: "rgb(129 140 248)", label: "Seguimiento" },
  closed:      { bg: "rgb(34 197 94 / 0.15)",  fg: "rgb(74 222 128)",  label: "Cerrado" },
  in_progress: { bg: "rgb(99 102 241 / 0.15)", fg: "rgb(129 140 248)", label: "En curso" },
  done:        { bg: "rgb(34 197 94 / 0.15)",  fg: "rgb(74 222 128)",  label: "Hecho" },
  pending:     { bg: "rgb(100 116 139 / 0.2)", fg: "rgb(148 163 184)", label: "Pendiente" },
  draft:       { bg: "rgb(100 116 139 / 0.2)", fg: "rgb(148 163 184)", label: "Borrador" },
  review:      { bg: "rgb(245 158 11 / 0.15)", fg: "rgb(251 191 36)",  label: "Revisión" },
  published:   { bg: "rgb(34 197 94 / 0.15)",  fg: "rgb(74 222 128)",  label: "Publicado" },
  active:      { bg: "rgb(34 197 94 / 0.15)",  fg: "rgb(74 222 128)",  label: "Activo" },
  paused:      { bg: "rgb(245 158 11 / 0.15)", fg: "rgb(251 191 36)",  label: "Pausado" },
  completed:   { bg: "rgb(99 102 241 / 0.15)", fg: "rgb(129 140 248)", label: "Completado" },
  blocked:     { bg: "rgb(239 68 68 / 0.15)",  fg: "rgb(248 113 113)", label: "Bloqueado" },
};

export function BadgeStatus({ value }: { value: string }) {
  const cfg = STATUS_STYLES[value] ?? { bg: "rgb(100 116 139 / 0.2)", fg: "rgb(148 163 184)", label: value };
  return (
 <span
      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
 </span>
  );
}
