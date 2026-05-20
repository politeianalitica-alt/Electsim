import type { CSSProperties, ReactNode } from "react";
import { WS } from "@/lib/workspace/workspace-utils";

interface WorkspaceCardProps {
  children: ReactNode;
  /** Color de acento del borde izquierdo (severidad, categoría, etc.). Opcional. */
  accent?: string;
  /** Padding interno. 'sm' = 12, 'md' = 16 (default), 'lg' = 20. */
  padding?: "sm" | "md" | "lg";
  /** Hover sutil (sube ligeramente y refuerza la sombra). Para listas clicables. */
  interactive?: boolean;
  /** Pasar clases adicionales si conviven con Tailwind. */
  className?: string;
  /** Overrides CSS puntuales. */
  style?: CSSProperties;
  /** onClick para tarjetas interactivas. */
  onClick?: () => void;
}

/**
 * WorkspaceCard — superficie unificada para todas las páginas del workspace.
 *
 * Sustituye el patrón antiguo dark theme (bg-slate-900 + border-slate-800)
 * por una tarjeta blanca + hairline neutra + radius 14 que encaja con el
 * resto de la plataforma (dashboard / riesgo / mapa-actores).
 *
 * Uso:
 * <WorkspaceCard>...</WorkspaceCard> // por defecto
 * <WorkspaceCard accent={WS.danger} padding="lg">...</WorkspaceCard>
 * <WorkspaceCard interactive onClick={...}>...</WorkspaceCard>
 */
export function WorkspaceCard({
  children,
  accent,
  padding = "md",
  interactive = false,
  className,
  style,
  onClick,
}: WorkspaceCardProps) {
  const padMap = { sm: 12, md: 16, lg: 20 } as const;

  return (
 <div
      onClick={onClick}
      className={className}
      style={{
        background: WS.surface,
        border: `1px solid ${WS.border}`,
        borderLeft: accent ? `3px solid ${accent}` : `1px solid ${WS.border}`,
        borderRadius: 14,
        padding: padMap[padding],
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
        cursor: onClick || interactive ? "pointer" : "default",
        ...(interactive && {
 ":hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
          },
        }),
        ...style,
      }}
      onMouseEnter={
        interactive
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
 "0 4px 14px rgba(0,0,0,0.07)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
            }
          : undefined
      }
      onMouseLeave={
        interactive
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
 "0 1px 2px rgba(0,0,0,0.04)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }
          : undefined
      }
    >
      {children}
 </div>
  );
}

/**
 * WorkspaceSection — agrupador con título sutil (12px uppercase ink-4 +
 * hairline inferior) para separar bloques dentro de una página.
 */
export function WorkspaceSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
 <section style={{ marginBottom: 28 }}>
 <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          paddingBottom: 8,
          marginBottom: 14,
          borderBottom: `1px solid ${WS.border}`,
        }}
      >
 <div>
 <div
            style={{
              fontSize: 10,
              color: WS.ink3,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              fontFamily: WS.font,
            }}
          >
            {title}
 </div>
          {description && (
 <p
              style={{
                margin: "4px 0 0",
                fontSize: 12.5,
                color: WS.ink3,
                lineHeight: 1.4,
                fontFamily: WS.font,
              }}
            >
              {description}
 </p>
          )}
 </div>
        {actions && (
 <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {actions}
 </div>
        )}
 </div>
      {children}
 </section>
  );
}
