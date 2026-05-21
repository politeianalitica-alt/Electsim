import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceCard, WsBadge } from "./workspace-card";
import type { WorkspaceDocument } from "@/types/workspace";

const KIND_LETTER: Record<string, string> = {
  briefing: "BR",
  memo: "MM",
 "crisis-note": "CR",
  analysis: "AN",
 "client-report": "CL",
  positioning: "PO",
 "talking-points": "TP",
};

const KIND_LABEL: Record<string, string> = {
  briefing: "Briefing",
  memo: "Memo",
 "crisis-note": "Nota de crisis",
  analysis: "Análisis",
 "client-report": "Informe cliente",
  positioning: "Posicionamiento",
 "talking-points": "Talking points",
};

const STATUS_COLOR: Record<string, string> = {
  draft: WS.ink3,
  review: WS.accent,
  published: WS.success,
  archived: WS.ink3,
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  review: "Revisión",
  published: "Publicado",
  archived: "Archivado",
};

interface DocumentCardProps {
  document: WorkspaceDocument;
  onClick?: () => void;
  variant?: "row" | "card";
}

export function DocumentCard({ document: doc, onClick, variant = "card" }: DocumentCardProps) {
  if (variant === "row") {
    return (
 <div
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px",
          cursor: onClick ? "pointer" : "default",
        }}
      >
 <div style={{
          width: 32, height: 32, borderRadius: 8, background: WS.surface2,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: WS.ink2, letterSpacing: "0.04em", flexShrink: 0,
        }}>
          {KIND_LETTER[doc.kind] ?? "DOC"}
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontSize: 13, fontWeight: 500, color: WS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.title}
 </div>
 <div style={{ fontSize: 11, color: WS.ink3, marginTop: 2 }}>
            {KIND_LABEL[doc.kind]} · {formatRelative(doc.updatedAt)}
            {doc.wordCount ? ` · ${doc.wordCount.toLocaleString("es")} palabras` : ""}
 </div>
 </div>
 <WsBadge label={STATUS_LABEL[doc.status]} color={STATUS_COLOR[doc.status]} />
 </div>
    );
  }

  return (
 <WorkspaceCard onClick={onClick} hoverable={!!onClick}>
 <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
 <div style={{
          width: 32, height: 32, borderRadius: 8, background: WS.surface2,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: WS.ink2, letterSpacing: "0.04em", flexShrink: 0,
        }}>
          {KIND_LETTER[doc.kind] ?? "DOC"}
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: WS.ink, marginBottom: 4, lineHeight: 1.3 }}>
            {doc.title}
 </div>
 <div style={{ fontSize: 11, color: WS.ink3, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {doc.summary}
 </div>
 </div>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
 <WsBadge label={KIND_LABEL[doc.kind]} color={WS.ink2} />
 <WsBadge label={STATUS_LABEL[doc.status]} color={STATUS_COLOR[doc.status]} />
 <div style={{ flex: 1 }} />
 <span style={{ fontSize: 10.5, color: WS.ink3 }}>
          {formatRelative(doc.updatedAt)}
 </span>
 </div>
 </WorkspaceCard>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffH = (Date.now() - d.getTime()) / 3600_000;
  if (diffH < 1) return "hace unos minutos";
  if (diffH < 24) return `hace ${Math.round(diffH)}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return "ayer";
  if (diffD < 7) return `hace ${diffD} días`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
