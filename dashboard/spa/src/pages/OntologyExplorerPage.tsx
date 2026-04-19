import { useEffect, useState } from "react";
import { getOntologyObject, listOntologyTypes } from "../api/client";

export function OntologyExplorerPage() {
  const [types, setTypes] = useState<{ name: string }[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [objectId, setObjectId] = useState("");
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    listOntologyTypes().then(setTypes).catch(console.error);
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
          setResult(await getOntologyObject(selectedType, objectId));
        }}
      >
        Cargar
      </button>
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </section>
  );
}
