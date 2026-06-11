import type { CSSProperties } from "react";
import type { WorkspaceView } from "@/types/workspace";

interface IconProps {
  size?: number;
  style?: CSSProperties;
  color?: string;
}

function icon(path: string) {
  return function WsIcon({ size = 14, style, color = "currentColor" }: IconProps) {
    return (
 <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={style} aria-hidden>
        {path.split("|").map((d, i) => (
 <path key={i} d={d} fill={color} />
        ))}
 </svg>
    );
  };
}

function iconStroke(paths: string) {
  return function WsIcon({ size = 14, style, color = "currentColor" }: IconProps) {
    return (
 <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
        {paths.split("|").map((d, i) => (
 <path key={i} d={d} />
        ))}
 </svg>
    );
  };
}

export const IconOverview = icon(
 "M1 1h6v6H1V1z|M9 1h6v6H9V1z|M1 9h6v6H1V9z|M9 9h6v6H9V9z"
);

export const IconDocs = iconStroke(
 "M4 1h8l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z|M9 1v4h4|M5.5 8h5|M5.5 11h3"
);

export const IconTables = iconStroke(
 "M1 4h14|M1 8h14|M1 12h14|M5 1v14|M11 1v14|M2 1h12a1 1 0 011 1v12a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z"
);

export const IconCanvas = iconStroke(
 "M3 8a2 2 0 100-4 2 2 0 000 4z|M13 5a2 2 0 100-4 2 2 0 000 4z|M13 15a2 2 0 100-4 2 2 0 000 4z|M5 7l6-2|M5 9l6 4"
);

export const IconResearch = iconStroke(
 "M7 13A6 6 0 107 1a6 6 0 000 12z|M15 15l-4-4"
);

export const IconProjects = iconStroke(
 "M1 2h4v12H1V2z|M6 2h4v8H6V2z|M11 2h4v5h-4V2z"
);

export const IconAutomations = icon(
 "M8.5 1l1.5 4h4l-3.3 2.4L12 12l-3.5-2.5L5 12l1.3-4.6L3 5h4L8.5 1z"
);

export const IconKnowledge = iconStroke(
 "M3 1h7l5 5v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z|M9 1v6h5|M5 10h6|M5 13h4"
);

export const IconReporting = iconStroke(
 "M2 12l3-4 3 2 3-5 3 3|M1 15h14|M1 1h14v11H1V1z"
);

export const IconTerminal = iconStroke(
 "M2 2h12a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z|M4 6l3 2-3 2|M9 10h3"
);

export const IconRadar = iconStroke(
 "M8 1a7 7 0 100 14 7 7 0 000-14z|M8 4a4 4 0 100 8 4 4 0 000-8z|M8 8l5-3"
);

export const IconInbox = iconStroke(
 "M2 9l2-6h8l2 6|M2 9h4l1 2h2l1-2h4|M2 9v5a1 1 0 001 1h10a1 1 0 001-1V9"
);

export const IconSlides = iconStroke(
 "M2 3h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z|M5 14l3-2 3 2"
);

export const IconSimulator = iconStroke(
 "M3 2v12h10|M5 11l3-4 2 2 3-5|M3 14l3-3 2 2 4-5"
);

export const IconChevronRight = iconStroke("M6 3l5 5-5 5");
export const IconChevronLeft  = iconStroke("M10 3L5 8l5 5");
export const IconChevronDown  = iconStroke("M3 6l5 5 5-5");
export const IconClose        = iconStroke("M4 4l8 8|M12 4l-8 8");
export const IconPlus         = iconStroke("M8 2v12|M2 8h12");
export const IconPin          = iconStroke("M9 2l-1 4h4l-2 4H6L4 6h4L7 2h2z|M8 10v4");
export const IconSettings     = iconStroke("M8 10a2 2 0 100-4 2 2 0 000 4z|M13.7 8a6 6 0 01-.1.9l2 1.6-1 1.8-2.3-.8a6 6 0 01-1.6.9l-.3 2.6h-2l-.4-2.6a6 6 0 01-1.5-.9L4.2 12.3l-1-1.8 2-1.6A6 6 0 015 8c0-.3 0-.6.1-.9L3.2 5.5l1-1.8 2.3.8a6 6 0 011.6-.9L8.4 1h2l.3 2.6a6 6 0 011.6.9l2.3-.8 1 1.8-2 1.6c.1.3.1.6.1.9z");
export const IconUser         = iconStroke("M8 8a3 3 0 100-6 3 3 0 000 6z|M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6");
export const IconAgent        = iconStroke("M8 1a4 4 0 014 4v1h1a1 1 0 011 1v3a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1h1V5a4 4 0 014-4z|M6 12v1a2 2 0 004 0v-1|M6 8h.01|M10 8h.01");
export const IconBack         = iconStroke("M10 3L5 8l5 5|M5 8h9");
export const IconCommand      = iconStroke("M5 5h6M5 11h6|M5 5v6|M11 5v6");
export const IconPanelRight   = iconStroke("M10 1h4a1 1 0 011 1v12a1 1 0 01-1 1h-4M10 1v14M1 1h9|M1 6h2|M1 10h3");
export const IconAlertCircle  = iconStroke("M8 1a7 7 0 100 14A7 7 0 008 1z|M8 5v3|M8 10h.01");
export const IconCalendar     = iconStroke("M1 4h14v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4z|M1 8h14|M5 1v3|M11 1v3");
export const IconCheckSquare  = iconStroke("M6 8l2 2 3-3|M3 1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z");
export const IconZap          = icon("M9 1L3 9h5l-1 6 6-8H8L9 1z");
export const IconSend         = iconStroke("M14 2L2 7l5 2 2 5 5-12z|M9 9l5-7");
// Cama: capas apiladas — narrativas/macroargumentos superpuestos
export const IconCama         = iconStroke("M8 1l7 4-7 4-7-4 7-4z|M1 9l7 4 7-4|M1 12l7 3 7-3");
// Preinformes: documento con check — borrador validable
export const IconPreinformes  = iconStroke("M3 1h7l3 3v11H3V1z|M10 1v3h3|M5.5 9l2 2 3-3.5");

export type WsIconName = WorkspaceView;


export function ViewIcon({ view, size = 14, color }: { view: string; size?: number; color?: string }) {
  const props = { size, color };
  switch (view) {
    case "overview":    return <IconOverview {...props} />;
    case "docs":        return <IconDocs {...props} />;
    case "tables":      return <IconTables {...props} />;
    case "canvas":      return <IconCanvas {...props} />;
    case "research":    return <IconResearch {...props} />;
    case "projects":    return <IconProjects {...props} />;
    case "automations": return <IconAutomations {...props} />;
    case "knowledge":   return <IconKnowledge {...props} />;
    case "radar":       return <IconRadar {...props} />;
    case "inbox":       return <IconInbox {...props} />;
    case "slides":      return <IconSlides {...props} />;
    case "simulator":   return <IconSimulator {...props} />;
    case "reporting":   return <IconReporting {...props} />;
    case "terminal":    return <IconTerminal {...props} />;
    case "cama":        return <IconCama {...props} />;
    case "preinformes": return <IconPreinformes {...props} />;
    default:            return <IconOverview {...props} />;
  }
}
