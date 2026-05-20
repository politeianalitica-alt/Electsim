"use client";

import type { DocBlock } from "@/types/docs";

// Editor mínimo basado en bloques. Se usa como fallback cuando BlockNote no
// está disponible o como pre-render mientras carga. Renderiza los bloques
// estructurados como elementos editables individualmente para preservar la
// estructura de la plantilla sin necesidad del editor pesado completo.
//
// Sprint 4 baseline: render funcional con autosave en el hook. Cuando se
// instale @blocknote/* y se haga build, este componente se podrá sustituir
// por el editor BlockNote real.
interface PoliteiBlockEditorProps {
  initialBlocks?: DocBlock[];
  onChange?: (blocks: DocBlock[]) => void;
  editable?: boolean;
}

export function PoliteiBlockEditor({
  initialBlocks = [],
  onChange,
  editable = true,
}: PoliteiBlockEditorProps) {
  function updateBlock(idx: number, content: unknown) {
    if (!onChange) return;
    const next = initialBlocks.map((b, i) =>
      i === idx ? { ...b, content } : b
    );
    onChange(next);
  }

  return (
 <div className="min-h-[600px] space-y-4 font-sans">
      {initialBlocks.map((block, idx) => (
 <BlockRenderer
          key={block.id ?? idx}
          block={block}
          editable={editable}
          onChange={(content) => updateBlock(idx, content)}
        />
      ))}
      {initialBlocks.length === 0 && (
 <p className="text-sm text-slate-500">
          Selecciona una plantilla o empieza a escribir.
 </p>
      )}
 </div>
  );
}

function BlockRenderer({
  block,
  editable,
  onChange,
}: {
  block: DocBlock;
  editable: boolean;
  onChange: (content: string) => void;
}) {
  const text = String(block.content ?? "");

  if (block.type === "heading") {
    const level = Number(block.props?.level ?? 2);
    const size = level === 1 ? "text-3xl" : level === 2 ? "text-xl" : "text-lg";
    return (
 <div
        className={`font-bold text-slate-100 ${size} outline-none`}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={e => onChange(e.currentTarget.textContent ?? "")}
      >
        {text}
 </div>
    );
  }

  if (block.type === "callout") {
    const variant = String(block.props?.variant ?? "info");
    const colors: Record<string, string> = {
      info: "border-l-indigo-500 bg-indigo-500/10 text-indigo-100",
      warning: "border-l-amber-500 bg-amber-500/10 text-amber-100",
      danger: "border-l-red-500 bg-red-500/10 text-red-100",
    };
    return (
 <div
        className={`rounded border-l-4 px-3 py-2 text-sm ${colors[variant] ?? colors.info} outline-none`}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={e => onChange(e.currentTarget.textContent ?? "")}
      >
        {text}
 </div>
    );
  }

  if (block.type === "context-block") {
    return <ContextBlockRenderer block={block} />;
  }

  if (block.type === "bullet") {
    return (
 <div className="flex gap-2 text-sm text-slate-200">
 <span className="text-slate-500">•</span>
 <div
          className="flex-1 outline-none"
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={e => onChange(e.currentTarget.textContent ?? "")}
        >
          {text}
 </div>
 </div>
    );
  }

  if (block.type === "numbered") {
    return (
 <div className="flex gap-2 text-sm text-slate-200">
 <span className="text-slate-500">›</span>
 <div
          className="flex-1 outline-none"
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={e => onChange(e.currentTarget.textContent ?? "")}
        >
          {text}
 </div>
 </div>
    );
  }

  return (
 <div
      className="text-sm text-slate-200 leading-relaxed outline-none"
      contentEditable={editable}
      suppressContentEditableWarning
      onBlur={e => onChange(e.currentTarget.textContent ?? "")}
    >
      {text}
 </div>
  );
}

function ContextBlockRenderer({ block }: { block: DocBlock }) {
  const source = String(block.props?.source ?? "issues");
  const label =
    source === "issues" ? "Issues del workspace" :
    source === "actions" ? "Próximas acciones" :
    source === "opportunities" ? "Oportunidades del radar" :
 "Contexto del workspace";

  return (
 <div className="my-2 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3">
 <div className="mb-2 flex items-center gap-2">
 <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
          {label}
 </span>
 <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300">
          sincronizado
 </span>
 </div>
 <p className="text-[11px] text-slate-400">
        Datos del workspace se renderizan aquí en tiempo real.
 </p>
 </div>
  );
}
