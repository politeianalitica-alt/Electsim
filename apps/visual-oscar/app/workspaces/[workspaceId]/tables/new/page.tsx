import Link from "next/link";
import TableCsvImport from "../_components/TableCsvImport";

export default function NewTablePage({ params }: { params: { workspaceId: string } }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-[#1d1d1f] mb-2">Nueva tabla</h1>
      <p className="text-sm text-[#6e6e73] mb-6">
        Importa un CSV o TSV (separado por comas, punto y coma o tabuladores).
        Detectamos las columnas y el tipo de cada una automáticamente.
      </p>

      <TableCsvImport workspaceId={params.workspaceId} />

      <div className="mt-8 pt-4 border-t border-[#f0f0f2]">
        <Link
          href={`/workspaces/${params.workspaceId}/tables`}
          className="inline-block text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
        >
          ← Volver a Tablas
        </Link>
      </div>
    </div>
  );
}
