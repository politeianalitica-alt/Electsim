import { WS } from "@/lib/workspace/workspace-utils";
import { ViewIcon } from "./workspace-icons";
import type { WorkspaceView } from "@/types/workspace";

interface WorkspaceViewHeaderProps {
  view: WorkspaceView;
  title: string;
  description?: string;
  /** Etiqueta opcional encima del título (estilo: "INTELIGENCIA · Sección"). */
  eyebrow?: string;
  /** Insignia destacada al lado del título. */
  badge?: string;
  /** Acciones (botones, dropdowns) alineadas a la derecha. */
  actions?: React.ReactNode;
}

/**
 * WorkspaceViewHeader — cabecera unificada para cualquier vista del workspace.
 *
 * Sigue el patrón "Apple-clara" del resto del dashboard:
 *   · Eyebrow 10px uppercase ink-4 (categoría · subcategoría)
 *   · Título 28px display, peso 600, tracking -0.02em
 *   · Descripción 13px ink-3, max-width 880
 *   · Icono de vista (36px) discreto a la izquierda, sin sombra
 *   · Acciones alineadas a la derecha
 *
 * Esto reemplaza el header antiguo (20px sans, label sin eyebrow) y unifica
 * la jerarquía visual con /dashboard, /riesgo, /termometro y /mapa-actores.
 */
export function WorkspaceViewHeader({
  view,
  title,
  description,
  eyebrow,
  badge,
  actions,
}: WorkspaceViewHeaderProps) {
  return (
 <header
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 20,
        gap: 16,
      }}
    >
 <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0, flex: 1 }}>
 <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: WS.accentSubtle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 4,
          }}
        >
 <ViewIcon view={view} size={17} color={WS.accent} />
 </div>
 <div style={{ minWidth: 0, flex: 1 }}>
          {eyebrow && (
 <span
              style={{
                display: "block",
                fontSize: 10,
                color: WS.ink3,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
                fontFamily: WS.font,
              }}
            >
              {eyebrow}
 </span>
          )}
 <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
 <h1
              style={{
                fontFamily: WS.fontDisplay,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: eyebrow ? "4px 0 4px" : "0 0 4px",
                color: WS.ink,
                lineHeight: 1.15,
              }}
            >
              {title}
 </h1>
            {badge && (
 <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  background: WS.accentSubtle,
                  color: WS.accent,
                  padding: "3px 9px",
                  borderRadius: 99,
                  letterSpacing: "0.02em",
                  fontFamily: WS.font,
                }}
              >
                {badge}
 </span>
            )}
 </div>
          {description && (
 <p
              style={{
                margin: 0,
                fontSize: 13,
                color: WS.ink3,
                lineHeight: 1.45,
                maxWidth: 880,
                fontFamily: WS.font,
              }}
            >
              {description}
 </p>
          )}
 </div>
 </div>
      {actions && (
 <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          {actions}
 </div>
      )}
 </header>
  );
}
