import { WS } from "@/lib/workspace/workspace-utils";
import { ViewIcon } from "./workspace-icons";
import type { WorkspaceView } from "@/types/workspace";

interface WorkspaceEmptyStateProps {
  view: WorkspaceView;
  title: string;
  description: string;
  /** Etiqueta opcional uppercase encima del título (estilo "Workspace · Sección"). */
  eyebrow?: string;
  cta?: string;
  onCta?: () => void;
}

export function WorkspaceEmptyState({ view, title, description, eyebrow, cta, onCta }: WorkspaceEmptyStateProps) {
  return (
 <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      flex: 1, padding: "64px 24px", textAlign: "center",
      minHeight: 360,
    }}>
 <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: WS.surface2,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
      }}>
 <ViewIcon view={view} size={28} color={WS.ink3} />
 </div>
      {eyebrow && (
 <div style={{
          fontSize: 10, color: WS.ink3, textTransform: "uppercase",
          letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6,
          fontFamily: WS.font,
        }}>
          {eyebrow}
 </div>
      )}
 <div style={{ fontSize: 16, fontWeight: 600, color: WS.ink, marginBottom: 8, letterSpacing: "-0.01em" }}>
        {title}
 </div>
 <div style={{ fontSize: 13, color: WS.ink3, lineHeight: 1.5, maxWidth: 320 }}>
        {description}
 </div>
      {cta && (
 <button
          onClick={onCta}
          style={{
            marginTop: 24,
            padding: "8px 20px",
            background: WS.accent,
            border: "none", borderRadius: 9,
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: WS.font,
          }}
        >
          {cta}
 </button>
      )}
 </div>
  );
}
