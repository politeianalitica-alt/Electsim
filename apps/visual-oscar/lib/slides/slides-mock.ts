import type { Slide } from "@/types/slides";

export function buildMockDeck(title: string): Slide[] {
  return [
    {
      id: "s1",
      layout: "title",
      title,
      subtitle: "Análisis político · contexto del workspace",
      author: "Equipo Politeia",
    },
    { id: "s2", layout: "section", title: "Contexto" },
    {
      id: "s3",
      layout: "content",
      title: "Situación general",
      bullets: [
 "Tensión legislativa creciente con socios externos al gobierno.",
 "CIS muestra desgaste contenido del partido gobernante (-2.3pp).",
 "Junts mantiene su posición ambigua, coherente con su patrón histórico.",
 "Ciclo mediático adverso en torno a vivienda y narrativa de crisis.",
      ],
    },
    {
      id: "s4",
      layout: "kpi",
      title: "Indicadores clave",
      kpis: [
        { label: "Riesgo reputacional", value: "62/100", hint: "+4 vs sem. anterior" },
        { label: "Cobertura adversa",   value: "38%",    hint: "estable" },
        { label: "Intención voto",      value: "29.1%",  hint: "-1.2pp" },
      ],
    },
    { id: "s5", layout: "section", title: "Implicaciones" },
    {
      id: "s6",
      layout: "two_column",
      title: "Oportunidades vs Riesgos",
      bullets: [
 "Ventana de 72h para abrir canal con Junts.",
 "Espacio narrativo en vivienda no ocupado.",
 "Tres CCAA dispuestas a alinearse en posición sectorial.",
      ],
      rightBullets: [
 "Cobertura adversa del Plan Vive concentrada en TVE.",
 "Riesgo de pacto erc-gobierno desplazando a otros socios.",
 "Acumulación de dossieres sin nota analítica integradora.",
      ],
    },
    {
      id: "s7",
      layout: "quote",
      quote: "La decisión más cara que podemos tomar esta semana es no decidir.",
      author: "Dirección · 2026-05-13",
    },
    {
      id: "s8",
      layout: "closing",
      title: "Recomendaciones",
      bullets: [
 "Activar Q&A defensivo TVE en próximas 24h.",
 "Reunión informal con portavoz Junts antes del jueves.",
 "Comunicado proactivo sobre Plan Vive antes del lunes.",
 "Convocatoria CCAA afines para sumar señal sectorial.",
      ],
    },
  ];
}
