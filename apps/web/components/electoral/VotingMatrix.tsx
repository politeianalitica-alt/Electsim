import type { VotingRecord } from "@/lib/types/electoral";

const PARTY_COLORS: Record<string, string> = {
  PP: "#1F77FF",
  PSOE: "#E03A3E",
  VOX: "#5BC035",
  Sumar: "#D81E5B",
  Junts: "#00C2A8",
  ERC: "#F4B400",
  Bildu: "#A4D65E",
  PNV: "#1D8042",
  BNG: "#7AC143",
  Otros: "#94A3B8",
};

function voteCell(vote: string | undefined) {
  if (vote === "S") {
    return (
      <span className="badge badge-green text-[10px] font-bold">S</span>
    );
  }
  if (vote === "N") {
    return <span className="badge badge-red text-[10px] font-bold">N</span>;
  }
  if (vote === "A") {
    return (
      <span className="badge badge-amber text-[10px] font-bold">A</span>
    );
  }
  return <span className="text-muted text-[10px]">—</span>;
}

export function VotingMatrix({
  records,
  parties,
}: {
  records: VotingRecord[];
  parties: string[];
}) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted py-4">
        No hay registros de votación
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border1">
            <th className="text-left py-2 pr-3 text-muted font-medium whitespace-nowrap min-w-[140px]">
              Iniciativa
            </th>
            {parties.map((p) => (
              <th key={p} className="py-2 px-2 text-center whitespace-nowrap">
                <span
                  className="font-bold text-[11px]"
                  style={{ color: PARTY_COLORS[p] ?? "#94A3B8" }}
                >
                  {p}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr
              key={r.id}
              className="border-b border-border1/40 hover:bg-bg3/50 transition"
            >
              <td className="py-2 pr-3 text-text1 max-w-[200px]">
                <div className="truncate" title={r.topic}>
                  {r.topic}
                </div>
                {r.date && (
                  <div className="text-[10px] text-muted">{r.date}</div>
                )}
              </td>
              {parties.map((p) => (
                <td key={p} className="py-2 px-2 text-center">
                  {voteCell(r.votes[p])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
