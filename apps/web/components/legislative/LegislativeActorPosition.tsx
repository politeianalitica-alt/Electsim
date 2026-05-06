import type { ActorLegislativePosition } from "@/lib/types/legislative";
import { Users } from "lucide-react";

const POSITION_BADGE: Record<string, string> = {
  favor: "badge-green",
  contra: "badge-red",
  abstencion: "badge-amber",
  neutro: "badge-blue",
  pendiente: "badge-blue",
};

const POSITION_LABEL: Record<string, string> = {
  favor: "A favor", contra: "En contra", abstencion: "Abstención", neutro: "Neutro", pendiente: "Pendiente",
};

interface Props {
  positions: ActorLegislativePosition[];
}

export function LegislativeActorPosition({ positions }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Posiciones de actores</h3>
      </div>
      {positions.map((p, i) => (
        <div key={i} className="p-3 rounded-lg border border-border1 flex items-start gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: p.party_color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-text1">{p.actor_name}</span>
              <span className={`badge ${POSITION_BADGE[p.position] ?? "badge-blue"} shrink-0`}>
                {POSITION_LABEL[p.position] ?? p.position}
              </span>
            </div>
            {p.statement && (
              <p className="text-xs text-text2 leading-relaxed italic">"{p.statement}"</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
