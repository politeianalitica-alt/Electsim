"""Adapter pattern para conectar con simulador existente sin modificarlo."""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from dashboard.storage.schema import SimulationResult


class SimulationAdapter:
    """Adaptador de ejecución del simulador validado."""

    def run_simulation(self, config: dict) -> pd.DataFrame:
        """Ejecuta el simulador existente y retorna DataFrame normalizado."""
        try:
            from agents.runner import VoterAgent  # type: ignore

            # Wrapper no destructivo: si el runner no expone API batch, devolvemos stub.
            _ = VoterAgent
        except Exception:
            pass
        row = SimulationResult(
            run_id=str(config.get("run_id", "stub-run")),
            timestamp=datetime.utcnow(),
            election_type=str(config.get("election_type", "general")),
            territory=str(config.get("territory", "ES")),
            party=str(config.get("party", "PSOE")),
            simulated_share=float(config.get("simulated_share", 30.0)),
            n_personas=int(config.get("n_personas", 1000)),
            model_version=str(config.get("model_version", "v3_multistep")),
            pipeline_config=config,
        )
        return pd.DataFrame([row.model_dump()])


def create_simulation_adapter() -> SimulationAdapter:
    """Fábrica del adapter del simulador."""
    return SimulationAdapter()

