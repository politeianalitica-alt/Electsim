from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import text

from agents.runner import VoterAgent


DEFAULT_EVAL_PROMPTS = [
    "¿Cuál es el principal problema de España hoy y por qué?",
    "Valora una propuesta de bajar impuestos y recortar gasto público.",
    "¿Qué mensaje de campaña te resulta más creíble en economía?",
]


def run_agent_eval(engine, cluster_id: int, prompts: list[str] | None = None, tenant_id: str = "default") -> dict[str, Any]:
    prompts = prompts or DEFAULT_EVAL_PROMPTS
    agent = VoterAgent(engine, cluster_id)
    rows: list[dict[str, Any]] = []
    for prompt in prompts:
        result = agent.run_turn(prompt, persist=False, use_history=False)
        rows.append({"prompt": prompt, "final_reply": result.final_reply, "deliberation_len": len(result.deliberation)})

    coherence = sum(1 for r in rows if len(str(r["final_reply"]).strip()) > 3) / max(len(rows), 1)
    payload = {
        "cluster_id": cluster_id,
        "n_prompts": len(rows),
        "coherence_score": round(coherence, 4),
        "details": rows,
        "created_at": datetime.utcnow().isoformat(),
    }
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO agent_eval_run
                  (cluster_id, tenant_id, n_prompts, coherence_score, detalle_json, created_at)
                VALUES
                  (:cluster_id, :tenant_id, :n_prompts, :coherence_score, :detalle_json, NOW())
                """
            ),
            {
                "cluster_id": cluster_id,
                "tenant_id": tenant_id,
                "n_prompts": len(rows),
                "coherence_score": coherence,
                "detalle_json": json.dumps(payload, ensure_ascii=False),
            },
        )
    return payload
