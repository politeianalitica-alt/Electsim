export function AgentThinkingIndicator() {
  return (
 <div className="flex items-center gap-2 px-4 py-3">
 <div className="flex gap-1">
        {[0, 1, 2].map(i => (
 <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[#c7c7cc] animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
 </div>
 <span className="text-[10px] text-[#6e6e73]">Politeia analizando…</span>
 </div>
  );
}
