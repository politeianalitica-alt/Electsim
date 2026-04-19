import { useState } from "react";
import { executeAction } from "../api/client";

export function ScenarioBuilderPage() {
  const [partidoId, setPartidoId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tema, setTema] = useState("economia");
  const [result, setResult] = useState<unknown>(null);

  return (
    <section>
      <h2>Scenario Builder</h2>
      <input value={partidoId} onChange={(e) => setPartidoId(e.target.value)} placeholder="Partido ID" />
      <input value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Mensaje" />
      <select value={tema} onChange={(e) => setTema(e.target.value)}>
        <option value="economia">Economia</option>
        <option value="sanidad">Sanidad</option>
        <option value="territorio">Territorio</option>
      </select>
      <button
        onClick={async () => {
          const data = await executeAction("simulate_campaign", {
            object_type: "Partido",
            object_id: partidoId,
            mensaje,
            tema,
          });
          setResult(data);
        }}
      >
        Simular campaña
      </button>
      <button
        onClick={async () => {
          const data = await executeAction("compute_nowcast", {});
          setResult(data);
        }}
      >
        Recalcular nowcast
      </button>
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </section>
  );
}
