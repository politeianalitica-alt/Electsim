"use client";

import Link from "next/link";
import { crmRepository } from "@/lib/crm/crm-repository";
import { STANCE_CONFIG, PARTY_CONFIG } from "@/lib/crm/crm-config";

export default function CrmMatrixPage({ params }: { params: { workspaceId: string } }) {
  const actors = crmRepository.listActors(params.workspaceId);
  const issues = crmRepository.getIssues();

  return (
    <div>
      <div className="mb-4">
        <Link href={`/workspaces/${params.workspaceId}/crm`} className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]">
          ← CRM
        </Link>
        <h1 className="text-lg font-bold text-[#1d1d1f] mt-1">Matriz de posiciones</h1>
        <p className="text-xs text-[#6e6e73]">
          {actors.length} actores × {issues.length} issues
        </p>
      </div>

      <div className="overflow-auto rounded-xl border border-[#e8e8ed] bg-white">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-[#6e6e73] border-b border-r border-[#e8e8ed] min-w-[200px]">
                Actor
              </th>
              {issues.map(issue => (
                <th
                  key={issue.id}
                  className="px-2 py-2 text-center text-[#6e6e73] border-b border-[#e8e8ed] min-w-[120px] max-w-[140px]"
                >
                  <span className="block text-[10px] leading-tight">{issue.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actors.map(actor => {
              const partyConfig = actor.party ? PARTY_CONFIG[actor.party] : null;
              return (
                <tr key={actor.id} className="hover:bg-white/50 transition-colors">
                  <td className="sticky left-0 z-10 bg-[#fbfbfd] border-b border-r border-[#e8e8ed] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: `${actor.avatarColor}25`, color: actor.avatarColor }}
                      >
                        {actor.avatarInitials}
                      </div>
                      <div>
                        <span className="font-medium text-[#1d1d1f]">{actor.displayName}</span>
                        {partyConfig && actor.party && (
                          <span
                            className="ml-1 text-[9px] font-bold"
                            style={{ color: partyConfig.color }}
                          >
                            {actor.party}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  {issues.map(issue => {
                    const pos = actor.positions.find(p => p.issueId === issue.id);
                    const stance = pos?.stance ?? "unknown";
                    const config = STANCE_CONFIG[stance];
                    return (
                      <td
                        key={issue.id}
                        className="border-b border-[#e8e8ed] px-2 py-2 text-center cursor-pointer hover:bg-[#f5f5f7]/60 transition-colors"
                        title={`${actor.displayName} — ${config.label}`}
                      >
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: `${config.color}15`, color: config.color }}
                        >
                          {config.short}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
