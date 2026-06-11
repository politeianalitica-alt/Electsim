"use client";

import Link from "next/link";
import { WS } from "@/lib/workspace/workspace-utils";
import { inboxRepository } from "@/lib/inbox/inbox-repository";

const SOURCE_COLOR: Record<string, string> = {
  rss: "#1F4E8C",
  boe: "#7e57c2",
  google_alerts: "#26a69a",
  twitter: "#1d9bf0",
  newsletter: "#d97706",
};

export function InboxMiniWidget({ workspaceId }: { workspaceId: string }) {
  const items = inboxRepository.list(workspaceId).slice(0, 5);
  return (
 <div style={{
      background: WS.surface, border: `1px solid ${WS.border}`,
      borderRadius: 14, padding: 14, height: "100%",
      display: "flex", flexDirection: "column", gap: 8,
      fontFamily: WS.font,
    }}>
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <div style={{
          fontSize: 10.5, fontWeight: 700, color: WS.ink3,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Inbox · Top {items.length}
 </div>
 <Link href={`/workspaces/${workspaceId}/inbox`} style={{ fontSize: 11, color: WS.accent, textDecoration: "none", fontWeight: 600 }}>
          abrir →
 </Link>
 </div>
 <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map(it => (
 <Link
            key={it.id}
            href={`/workspaces/${workspaceId}/inbox`}
            style={{
              display: "grid", gridTemplateColumns: "32px 1fr 50px", gap: 10,
              padding: "8px 10px",
              background: WS.surface2, border: `1px solid ${WS.border}`,
              borderRadius: 10, textDecoration: "none", alignItems: "center",
            }}
          >
 <span style={{ fontSize: 15, fontWeight: 700, color: WS.accent, letterSpacing: "-0.04em" }}>
              {it.score}
 </span>
 <div style={{ minWidth: 0 }}>
 <div style={{
                fontSize: 11.5, fontWeight: 600, color: WS.ink,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {it.title}
 </div>
 <div style={{
                fontSize: 10.5, color: WS.ink3,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {it.origin}
 </div>
 </div>
 <span style={{
              fontSize: 9.5, fontWeight: 700,
              color: SOURCE_COLOR[it.source] ?? WS.ink3,
              textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right",
            }}>
              {it.source.replace("_", " ")}
 </span>
 </Link>
        ))}
 </div>
 </div>
  );
}
