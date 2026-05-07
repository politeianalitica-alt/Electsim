"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { ModeBadge } from "@/components/status/mode-badge";
import { endpoints } from "@/lib/api/endpoints";
import type {
  LegislativeOverviewResponse,
  LegislativeItemsResponse,
  LegislativeItem,
  LegislativeItemDetail as ItemDetail,
} from "@/lib/types/legislative";
import {
  LegislativeKpiBar,
  LegislativeAlertBanner,
  LegislativeItemRow,
  LegislativeItemDetailPanel,
  LegislativeFilters,
  LegislativeCalendar,
  LegislativeBoeDiary,
  LegislativeHeatmap,
} from "@/components/legislative";

type TabId = "monitor" | "iniciativas" | "agenda" | "boe" | "heatmap";

const TABS: { id: TabId; label: string }[] = [
  { id: "monitor", label: "Monitor" },
  { id: "iniciativas", label: "Iniciativas" },
  { id: "agenda", label: "Agenda" },
  { id: "boe", label: "BOE" },
  { id: "heatmap", label: "Heatmap" },
];

const FALLBACK_KPIS = {
  active_initiatives: 187,
  approved_this_month: 23,
  critical_tramitation: 9,
  upcoming_votes: 14,
  mode: "fallback" as const,
};

export default function LegislativoPage() {
  const [activeTab, setActiveTab] = useState<TabId>("monitor");
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");

  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery<LegislativeOverviewResponse | null>({
    queryKey: ["legislative", "overview"],
    queryFn: () => endpoints.legislativeOverview().catch(() => null),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: false,
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery<LegislativeItemsResponse | null>({
    queryKey: ["legislative", "items", urgencyFilter, sectorFilter, jurisdictionFilter, search],
    queryFn: () => endpoints.legislativeItems({
      page: 1,
      page_size: 30,
      urgency: urgencyFilter || undefined,
      sector: sectorFilter || undefined,
      jurisdiction: jurisdictionFilter || undefined,
      search: search || undefined,
    }).catch(() => null),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const mode = overview?.mode ?? (overviewError ? "error" : "fallback");
  const kpis = overview?.kpis ?? FALLBACK_KPIS;
  const criticalItems = overview?.critical_items ?? [];
  const calendarItems = overview?.calendar_week ?? [];
  const boeItems = overview?.boe_today ?? [];
  const heatmap = overview?.heatmap ?? [];
  const listItems = itemsData?.items ?? criticalItems;

  function handleItemClick(item: LegislativeItem) {
    endpoints.legislativeItemDetail(item.id)
      .then(detail => setSelectedItem(detail))
      .catch(() => {
        setSelectedItem({
          ...item,
          full_title: item.title,
          summary: "",
          objetivos: [],
          timeline: [],
          sector_impacts: [],
          actor_positions: [],
          evidence: [],
          related_ids: [],
          analyst_note: "",
        });
      });
  }

  return (
    <div className="space-y-6">
      <header>
        <span className="label-cap">Inteligencia / Monitor Legislativo</span>
        <div className="flex items-center gap-3 mt-1">
          <Scale className="w-6 h-6 text-cyan1" />
          <h1 className="text-3xl font-bold text-text1">Monitor Legislativo & Regulatorio</h1>
          <ModeBadge
            mode={mode as "real" | "demo" | "fallback" | "error"}
            source={mode === "real" ? "congreso_api" : "fixtures"}
            message={mode === "real" ? "Datos en tiempo real" : "Datos de ejemplo"}
          />
        </div>
        <p className="text-text2 text-sm mt-1">
          Iniciativas en tramitación, agenda parlamentaria, publicaciones BOE y análisis de impacto sectorial.
        </p>
      </header>

      <LegislativeKpiBar kpis={kpis} isLoading={overviewLoading} />

      {criticalItems.length > 0 && <LegislativeAlertBanner items={criticalItems} />}

      <nav className="flex gap-1 border-b border-border1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition rounded-t-lg ${
              activeTab === t.id
                ? "text-cyan1 border-b-2 border-cyan1 bg-bg3/50"
                : "text-text2 hover:text-text1"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === "monitor" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <section className="premium-card">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-4 h-4 text-cyan1" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-text1">Iniciativas prioritarias</h2>
              </div>
              {overviewLoading ? (
                <div className="text-sm text-text2 text-center py-8">Cargando…</div>
              ) : (
                <ul className="space-y-3">
                  {criticalItems.slice(0, 6).map(item => (
                    <LegislativeItemRow key={item.id} item={item} onClick={handleItemClick} />
                  ))}
                </ul>
              )}
            </section>
          </div>
          <div>
            <LegislativeCalendar items={calendarItems} isLoading={overviewLoading} />
          </div>
        </div>
      )}

      {activeTab === "iniciativas" && (
        <div className="space-y-4">
          <LegislativeFilters
            search={search}
            urgency={urgencyFilter}
            sector={sectorFilter}
            jurisdiction={jurisdictionFilter}
            onSearch={setSearch}
            onUrgency={setUrgencyFilter}
            onSector={setSectorFilter}
            onJurisdiction={setJurisdictionFilter}
          />
          <section className="premium-card">
            {itemsLoading ? (
              <div className="text-sm text-text2 text-center py-8">Cargando iniciativas…</div>
            ) : (
              <>
                <div className="text-xs text-muted mb-3">{itemsData?.total ?? listItems.length} resultados</div>
                <ul className="space-y-3">
                  {listItems.map(item => (
                    <LegislativeItemRow key={item.id} item={item} onClick={handleItemClick} />
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}

      {activeTab === "agenda" && (
        <LegislativeCalendar items={calendarItems} isLoading={overviewLoading} />
      )}

      {activeTab === "boe" && (
        <LegislativeBoeDiary items={boeItems} isLoading={overviewLoading} />
      )}

      {activeTab === "heatmap" && (
        <LegislativeHeatmap cells={heatmap} />
      )}

      {selectedItem && (
        <LegislativeItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
