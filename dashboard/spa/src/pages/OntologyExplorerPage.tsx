import { useEffect, useState } from "react";
import { getOntologyObject, listOntologyTypes } from "../api/client";

export function OntologyExplorerPage() {
  const [types, setTypes] = useState<{ name: string }[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [objectId, setObjectId] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOntologyTypes()
      .then((rows) => {
        setTypes(rows);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error cargando tipos");
      });
  }, []);

  return (
    <section>
      <h2>Ontology Explorer</h2>
      <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
        <option value="">Selecciona tipo</option>
        {types.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
      <input value={objectId} onChange={(e) => setObjectId(e.target.value)} placeholder="ID" />
      <button
        onClick={async () => {
          if (!selectedType || !objectId) return;
          try {
            setResult(await getOntologyObject(selectedType, objectId));
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Error cargando objeto");
          }
        }}
      >
        Cargar
      </button>
      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </section>
  );
}
