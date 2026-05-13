import Link from "next/link";

export default function NewTablePage({ params }: { params: { workspaceId: string } }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-slate-100 mb-2">Nueva tabla</h1>
      <p className="text-sm text-slate-400 mb-6">
        El editor de creación se conecta en Sprint 16. De momento puedes usar los datasets demo.
      </p>
      <Link
        href={`/workspaces/${params.workspaceId}/tables`}
        className="inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
      >
        ← Volver a Tables
      </Link>
    </div>
  );
}
