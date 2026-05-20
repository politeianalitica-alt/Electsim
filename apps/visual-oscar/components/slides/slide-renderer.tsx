"use client";

import { WS } from "@/lib/workspace/workspace-utils";
import type { Slide } from "@/types/slides";

/**
 * Renderiza un slide. Soporta dos modos: `card` (vista miniatura/edición) y
 * `present` (vista a pantalla completa con tipografía grande).
 */
export function SlideRenderer({
  slide,
  index,
  total,
  mode = "card",
  accent = WS.accent,
}: {
  slide: Slide;
  index: number;
  total: number;
  mode?: "card" | "present";
  accent?: string;
}) {
  const isPresent = mode === "present";

  const wrap: React.CSSProperties = {
    aspectRatio: "16 / 9",
    background: "#ffffff",
    border: isPresent ? "none" : `1px solid ${WS.border}`,
    borderRadius: isPresent ? 0 : 14,
    padding: isPresent ? "8% 9%" : "6% 7%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: isPresent ? 28 : 14,
    fontFamily: WS.fontDisplay,
    color: WS.ink,
    overflow: "hidden",
    position: "relative",
    width: "100%",
    height: isPresent ? "100%" : "auto",
  };

  // Branding chip top-right (solo cards)
  const brand = !isPresent && (
 <div style={{
      position: "absolute",
      top: 14, right: 16,
      fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
      color: WS.ink3, textTransform: "uppercase",
    }}>
      POLITEIA · {index + 1}/{total}
 </div>
  );

  // Page number footer presentation mode
  const footer = isPresent && (
 <div style={{
      position: "absolute", bottom: 32, left: 0, right: 0,
      display: "flex", justifyContent: "space-between", padding: "0 6%",
      fontSize: 13, color: WS.ink3, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
 <span>Politeia · Workspace</span>
 <span>{index + 1} / {total}</span>
 </div>
  );

  const titleStyle: React.CSSProperties = {
    fontSize: isPresent ? "clamp(38px, 5vw, 64px)" : 26,
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: "-0.03em",
    color: WS.ink,
    margin: 0,
  };

  const subStyle: React.CSSProperties = {
    fontSize: isPresent ? "clamp(18px, 1.8vw, 26px)" : 14,
    color: WS.ink3,
    margin: 0,
    fontWeight: 400,
    lineHeight: 1.4,
  };

  const bulletStyle = (s = 1): React.CSSProperties => ({
    fontSize: isPresent ? `clamp(${18 * s}px, ${1.5 * s}vw, ${22 * s}px)` : 13,
    lineHeight: 1.5,
    color: WS.ink2,
    marginBottom: isPresent ? 14 : 5,
    display: "flex",
    gap: isPresent ? 14 : 8,
    alignItems: "flex-start",
  });

  function Bullet({ text }: { text: string }) {
    return (
 <div style={bulletStyle()}>
 <span style={{
          flexShrink: 0,
          width: isPresent ? 8 : 5, height: isPresent ? 8 : 5,
          borderRadius: 99, background: accent,
          marginTop: isPresent ? 16 : 7,
        }} />
 <span>{text}</span>
 </div>
    );
  }

  switch (slide.layout) {
    case "title":
      return (
 <div style={wrap}>
          {brand}
 <div style={{
            width: isPresent ? 50 : 28, height: isPresent ? 4 : 3, background: accent,
            marginBottom: isPresent ? 18 : 8, borderRadius: 99,
          }} />
 <h1 style={titleStyle}>{slide.title}</h1>
          {slide.subtitle && <p style={subStyle}>{slide.subtitle}</p>}
          {slide.author && (
 <div style={{
              fontSize: isPresent ? 14 : 11, color: WS.ink3, marginTop: isPresent ? 30 : 12,
              textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em",
            }}>
              {slide.author}
 </div>
          )}
          {footer}
 </div>
      );

    case "section":
      return (
 <div style={{ ...wrap, justifyContent: "center", alignItems: "flex-start", background: WS.surface2 }}>
          {brand}
 <div style={{
            fontSize: isPresent ? 16 : 11, color: accent, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: isPresent ? 18 : 6,
          }}>
            Sección · {String(index + 1).padStart(2, "0")}
 </div>
 <h2 style={{ ...titleStyle, fontSize: isPresent ? "clamp(48px, 6vw, 80px)" : 30 }}>
            {slide.title}
 </h2>
          {footer}
 </div>
      );

    case "kpi":
      return (
 <div style={wrap}>
          {brand}
          {slide.title && <h2 style={titleStyle}>{slide.title}</h2>}
 <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min((slide.kpis ?? []).length, 4)}, 1fr)`,
            gap: isPresent ? 32 : 14,
            marginTop: isPresent ? 16 : 4,
          }}>
            {(slide.kpis ?? []).map((k, i) => (
 <div key={i}>
 <div style={{
                  fontSize: isPresent ? "clamp(40px, 5.5vw, 64px)" : 28,
                  fontWeight: 700, color: accent, lineHeight: 1.0,
                  letterSpacing: "-0.04em", marginBottom: 4,
                }}>
                  {k.value}
 </div>
 <div style={{
                  fontSize: isPresent ? 14 : 10, fontWeight: 700, color: WS.ink2,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {k.label}
 </div>
                {k.hint && (
 <div style={{ fontSize: isPresent ? 14 : 11, color: WS.ink3, marginTop: 4 }}>
                    {k.hint}
 </div>
                )}
 </div>
            ))}
 </div>
          {footer}
 </div>
      );

    case "content":
      return (
 <div style={wrap}>
          {brand}
          {slide.title && <h2 style={titleStyle}>{slide.title}</h2>}
          {slide.subtitle && <p style={subStyle}>{slide.subtitle}</p>}
 <div style={{ marginTop: isPresent ? 18 : 6 }}>
            {(slide.bullets ?? []).map((b, i) => <Bullet key={i} text={b} />)}
 </div>
          {footer}
 </div>
      );

    case "two_column":
      return (
 <div style={wrap}>
          {brand}
          {slide.title && <h2 style={titleStyle}>{slide.title}</h2>}
 <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: isPresent ? 48 : 18,
            marginTop: isPresent ? 18 : 6,
          }}>
 <div>{(slide.bullets ?? []).map((b, i) => <Bullet key={i} text={b} />)}</div>
 <div>{(slide.rightBullets ?? []).map((b, i) => <Bullet key={i} text={b} />)}</div>
 </div>
          {footer}
 </div>
      );

    case "quote":
      return (
 <div style={{ ...wrap, justifyContent: "center" }}>
          {brand}
 <div style={{
            fontSize: isPresent ? "clamp(28px, 3.5vw, 44px)" : 18,
            fontFamily: "'New York', Charter, Georgia, serif",
            fontStyle: "italic", lineHeight: 1.35, color: WS.ink, fontWeight: 400,
            maxWidth: "90%",
          }}>
            «{slide.quote}»
 </div>
          {slide.author && (
 <div style={{
              fontSize: isPresent ? 14 : 11, color: WS.ink3, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              marginTop: isPresent ? 28 : 10,
            }}>
              — {slide.author}
 </div>
          )}
          {footer}
 </div>
      );

    case "closing":
      return (
 <div style={wrap}>
          {brand}
 <div style={{
            fontSize: isPresent ? 16 : 11, color: accent, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase",
          }}>
            Cierre
 </div>
          {slide.title && <h2 style={titleStyle}>{slide.title}</h2>}
 <div style={{ marginTop: isPresent ? 18 : 6 }}>
            {(slide.bullets ?? []).map((b, i) => <Bullet key={i} text={b} />)}
 </div>
          {footer}
 </div>
      );

    default:
      return (
 <div style={wrap}>
          {brand}
 <p style={{ color: WS.ink3 }}>Layout no soportado: {slide.layout}</p>
 </div>
      );
  }
}
