/**
 * GET /api/macro/pulso/releases
 *
 * Calendario de próximos releases macro relevantes (próximos 45 días).
 * Se construye a partir de un catálogo estático con la fecha tipo
 * (día del mes) y nombre del organismo. No incluye horas exactas.
 *
 * Para versión profesional se debería conectar a:
 *   - INE PEN-API (calendario oficial)
 *   - Eurostat release calendar JSON
 *   - IMF WEO release timeline
 * pero el patrón mensual recurrente cubre 90% del caso de uso.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

interface ReleaseTemplate {
  source: "INE" | "Eurostat" | "IMF" | "BCE" | "BdE";
  indicator: string;
  /** Día del mes (1-31). */
  dayOfMonth: number;
  /** Mes específico (1-12) si sólo trimestral/anual. */
  monthsOfYear?: number[];
  url: string;
  importance: "high" | "medium" | "low";
}

const RELEASES_CATALOG: ReleaseTemplate[] = [
  // INE mensuales
  {
    source: "INE",
    indicator: "IPC general adelantado",
    dayOfMonth: 13,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176802&menu=ultiDatos&idp=1254735976607",
    importance: "high",
  },
  {
    source: "INE",
    indicator: "IPC general definitivo",
    dayOfMonth: 14,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176802",
    importance: "high",
  },
  {
    source: "INE",
    indicator: "IPI Producción industrial",
    dayOfMonth: 9,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736143950",
    importance: "medium",
  },
  {
    source: "INE",
    indicator: "Comercio retail (Índice de comercio)",
    dayOfMonth: 28,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176901",
    importance: "medium",
  },
  {
    source: "INE",
    indicator: "Frontur turistas",
    dayOfMonth: 1,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176996",
    importance: "low",
  },
  // INE trimestrales
  {
    source: "INE",
    indicator: "Contabilidad Nacional Trimestral (avance)",
    dayOfMonth: 30,
    monthsOfYear: [1, 4, 7, 10],
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736164439",
    importance: "high",
  },
  {
    source: "INE",
    indicator: "EPA · Encuesta de Población Activa",
    dayOfMonth: 27,
    monthsOfYear: [1, 4, 7, 10],
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176918",
    importance: "high",
  },
  {
    source: "INE",
    indicator: "IPV · Índice Precio Vivienda",
    dayOfMonth: 9,
    monthsOfYear: [3, 6, 9, 12],
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736152838",
    importance: "medium",
  },
  {
    source: "INE",
    indicator: "ETCL · Coste laboral",
    dayOfMonth: 18,
    monthsOfYear: [3, 6, 9, 12],
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736045053",
    importance: "medium",
  },
  // Eurostat
  {
    source: "Eurostat",
    indicator: "HICP zona euro flash",
    dayOfMonth: 1,
    url: "https://ec.europa.eu/eurostat/web/hicp",
    importance: "high",
  },
  {
    source: "Eurostat",
    indicator: "PIB zona euro · avance",
    dayOfMonth: 30,
    monthsOfYear: [1, 4, 7, 10],
    url: "https://ec.europa.eu/eurostat/web/national-accounts/quarterly-national-accounts",
    importance: "high",
  },
  // BCE
  {
    source: "BCE",
    indicator: "Reunión Consejo Gobierno BCE",
    dayOfMonth: 14,
    monthsOfYear: [1, 3, 4, 6, 7, 9, 10, 12],
    url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
    importance: "high",
  },
  // IMF
  {
    source: "IMF",
    indicator: "WEO Update (proyecciones)",
    dayOfMonth: 22,
    monthsOfYear: [1, 4, 7, 10],
    url: "https://www.imf.org/en/Publications/WEO",
    importance: "high",
  },
  // BdE
  {
    source: "BdE",
    indicator: "Proyecciones macroeconómicas BdE",
    dayOfMonth: 15,
    monthsOfYear: [3, 6, 9, 12],
    url: "https://www.bde.es/wbe/es/publicaciones/analisis-economico-investigacion/proyecciones-macro/",
    importance: "high",
  },
  // ─── Sprint N17 · Nuevas fuentes wireadas (BdE webstat + Tesoro + AEMET + CIS) ──
  {
    source: "BdE",
    indicator: "EURIBOR mensual (1M/3M/6M/12M)",
    dayOfMonth: 1,
    url: "https://app.bde.es/webstat/api/catalogue/TI_1_1",
    importance: "medium",
  },
  {
    source: "BdE",
    indicator: "Boletín Estadístico · NPL banca + tipos hipotecas",
    dayOfMonth: 25,
    url: "https://www.bde.es/webbe/es/estadisticas/temas/Boletin-Estadistico.html",
    importance: "medium",
  },
  {
    source: "BdE",
    indicator: "Tesoro Público · boletín mensual deuda",
    dayOfMonth: 25,
    url: "https://www.tesoro.es/deuda-publica/boletin-mensual",
    importance: "medium",
  },
  {
    source: "INE",
    indicator: "Comercio Exterior · Aduanas",
    dayOfMonth: 22,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176855",
    importance: "medium",
  },
  {
    source: "INE",
    indicator: "EGATUR · gasto turistas no residentes",
    dayOfMonth: 3,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177002",
    importance: "low",
  },
  {
    source: "INE",
    indicator: "Cifras de negocio sector servicios (IASS)",
    dayOfMonth: 21,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176856",
    importance: "low",
  },
  {
    source: "INE",
    indicator: "Hipotecas constituidas (estadística mensual)",
    dayOfMonth: 27,
    url: "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177197",
    importance: "medium",
  },
  {
    source: "Eurostat",
    indicator: "PDE Notificación Déficit y Deuda (semestral)",
    dayOfMonth: 22,
    monthsOfYear: [4, 10],
    url: "https://ec.europa.eu/eurostat/web/government-finance-statistics",
    importance: "high",
  },
  {
    source: "Eurostat",
    indicator: "Cuentas Sectoriales · Balance Pagos trimestral",
    dayOfMonth: 22,
    monthsOfYear: [1, 4, 7, 10],
    url: "https://ec.europa.eu/eurostat/web/balance-of-payments",
    importance: "medium",
  },
  {
    source: "Eurostat",
    indicator: "Eurobarómetro Confianza Consumidor flash",
    dayOfMonth: 22,
    url: "https://ec.europa.eu/info/business-economy-euro/indicators-statistics/economic-databases/business-and-consumer-surveys_en",
    importance: "medium",
  },
  // CIS barómetro mensual (publica ~1º semana de cada mes)
  {
    source: "INE",
    indicator: "CIS Barómetro mensual (avance + microdato)",
    dayOfMonth: 5,
    url: "https://www.cis.es/cis/opencms/ES/index.html",
    importance: "low",
  },
];

interface RenderedRelease {
  date: string; // ISO date
  source: string;
  indicator: string;
  url: string;
  importance: "high" | "medium" | "low";
  daysFromNow: number;
}

export async function GET(req: Request): Promise<NextResponse> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizonDays = 45;

  const releases: RenderedRelease[] = [];

  // Genera próximos 2 meses para cubrir 45 días desde templates estáticos
  for (let offset = 0; offset < 60; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dom = d.getDate();
    const month1 = d.getMonth() + 1;

    for (const tpl of RELEASES_CATALOG) {
      if (tpl.dayOfMonth !== dom) continue;
      if (tpl.monthsOfYear && !tpl.monthsOfYear.includes(month1)) continue;
      releases.push({
        date: d.toISOString().slice(0, 10),
        source: tpl.source,
        indicator: tpl.indicator,
        url: tpl.url,
        importance: tpl.importance,
        daysFromNow: offset,
      });
    }
    if (offset >= horizonDays && releases.length > 6) break;
  }

  // Sprint N18+N19 · Merge con calendarios REALES INE + Eurostat.
  // Best-effort: si los endpoints calendario responden, sus eventos se añaden
  // a los templates. Sustituye estimación heurística por datos oficiales.
  let ineLiveCount = 0;
  let eurostatLiveCount = 0;
  const baseUrl = req.url.split("/api/")[0];

  // INE PEN-API CALENDARIO
  try {
    const ineRes = await fetch(`${baseUrl}/api/ine/calendario?dias=${horizonDays}`, {
      next: { revalidate: 21600 },
    } as RequestInit);
    if (ineRes.ok) {
      const ineData = await ineRes.json();
      if (Array.isArray(ineData?.events)) {
        for (const e of ineData.events) {
          if (e.daysFromNow < 0 || e.daysFromNow > horizonDays) continue;
          releases.push({
            date: e.date,
            source: "INE",
            indicator: `[LIVE] ${e.indicator}`,
            url: e.url,
            importance: e.importance || "medium",
            daysFromNow: e.daysFromNow,
          });
          ineLiveCount++;
        }
      }
    }
  } catch {
    /* silent */
  }

  // Sprint N19 · Eurostat release calendar
  try {
    const euRes = await fetch(`${baseUrl}/api/eurostat/calendario?dias=${horizonDays}`, {
      next: { revalidate: 21600 },
    } as RequestInit);
    if (euRes.ok) {
      const euData = await euRes.json();
      if (Array.isArray(euData?.events)) {
        for (const e of euData.events) {
          if (e.daysFromNow < 0 || e.daysFromNow > horizonDays) continue;
          releases.push({
            date: e.date,
            source: "Eurostat",
            indicator: `[LIVE] ${e.indicator}`,
            url: e.url,
            importance: e.importance || "medium",
            daysFromNow: e.daysFromNow,
          });
          eurostatLiveCount++;
        }
      }
    }
  } catch {
    /* silent */
  }

  releases.sort((a, b) => a.daysFromNow - b.daysFromNow);

  return NextResponse.json(
    {
      ok: true,
      generated_at: today.toISOString(),
      horizon_days: horizonDays,
      total: releases.length,
      ine_live_events: ineLiveCount,
      eurostat_live_events: eurostatLiveCount,
      releases: releases.slice(0, 60),
      disclaimer:
        ineLiveCount + eurostatLiveCount > 0
          ? `Calendario · ${ineLiveCount} INE + ${eurostatLiveCount} Eurostat eventos en vivo + templates indicativos para BCE/IMF.`
          : "Calendario indicativo basado en cadencia mensual habitual (calendarios live no respondieron). Fechas exactas en Eurostat / IMF / BCE directly.",
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    }
  );
}
