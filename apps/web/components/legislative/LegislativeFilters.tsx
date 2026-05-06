import { Search } from "lucide-react";

interface Props {
  search: string;
  urgency: string;
  sector: string;
  jurisdiction: string;
  onSearch: (v: string) => void;
  onUrgency: (v: string) => void;
  onSector: (v: string) => void;
  onJurisdiction: (v: string) => void;
}

export function LegislativeFilters({ search, urgency, sector, jurisdiction, onSearch, onUrgency, onSector, onJurisdiction }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
        <input
          className="w-full bg-bg3 border border-border1 rounded-lg pl-8 pr-3 py-1.5 text-sm text-text1 focus:outline-none focus:border-cyan1 placeholder:text-muted"
          placeholder="Buscar iniciativa…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
      <select
        className="bg-bg3 border border-border1 rounded-lg px-2.5 py-1.5 text-sm text-text1 focus:outline-none focus:border-cyan1"
        value={urgency}
        onChange={e => onUrgency(e.target.value)}
      >
        <option value="">Todas las urgencias</option>
        <option value="critical">Crítico</option>
        <option value="high">Alto</option>
        <option value="medium">Medio</option>
        <option value="low">Bajo</option>
      </select>
      <select
        className="bg-bg3 border border-border1 rounded-lg px-2.5 py-1.5 text-sm text-text1 focus:outline-none focus:border-cyan1"
        value={sector}
        onChange={e => onSector(e.target.value)}
      >
        <option value="">Todos los sectores</option>
        <option value="banca">Banca</option>
        <option value="energia">Energía</option>
        <option value="inmobiliario">Inmobiliario</option>
        <option value="tecnologia">Tecnología</option>
        <option value="salud">Salud</option>
        <option value="defensa">Defensa</option>
        <option value="telecomunicaciones">Telecomunicaciones</option>
      </select>
      <select
        className="bg-bg3 border border-border1 rounded-lg px-2.5 py-1.5 text-sm text-text1 focus:outline-none focus:border-cyan1"
        value={jurisdiction}
        onChange={e => onJurisdiction(e.target.value)}
      >
        <option value="">Toda jurisdicción</option>
        <option value="congreso">Congreso</option>
        <option value="senado">Senado</option>
        <option value="boe">BOE</option>
        <option value="ue">UE</option>
      </select>
    </div>
  );
}
