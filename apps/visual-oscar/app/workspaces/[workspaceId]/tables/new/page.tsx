import Link from "next/link";

export default function NewTablePage({ params }: { params: { workspaceId: string } }) {
  return (
 <div className="mx-auto max-w-2xl">
 <h1 className="text-xl font-bold text-[#1d1d1f] mb-2">Nueva tabla</h1>
 <p className="text-sm text-[#6e6e73] mb-6">
        El editor de creación se conecta en Sprint 16. De momento puedes usar los datasets demo.
 </p>
 <Link
        href={`/workspaces/${params.workspaceId}/tables`}
        className="inline-block rounded-lg border border-[#e8e8ed] px-4 py-2 text-sm text-[#3a3a3d] hover:text-[#1d1d1f] transition-colors"
      >
        ← Volver a Tables
 </Link>
 </div>
  );
}
