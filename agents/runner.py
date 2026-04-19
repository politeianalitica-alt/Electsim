from __future__ import annotations

from dataclasses import dataclass
import json
import logging
import os
import uuid
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from agents.llm import AnthropicChatClient, OllamaClient, OpenAIChatClient, StubLLMClient
from agents.prompts import build_system_prompt, parse_chain_of_thought
from agents.rag_retriever import construir_extra_context

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class AgentTurnResult:
    session_id: str
    cluster_id: int
    perfil_id: int
    deliberation: str
    final_reply: str
    raw_assistant: str
    system_prompt: str


def load_perfil_por_cluster(engine: Engine, cluster_id: int) -> dict[str, Any] | None:
    sql = text(
        """
        SELECT *
        FROM perfiles_votante
        WHERE cluster_id = :cid
        LIMIT 1
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"cid": int(cluster_id)})
    if df.empty:
        return None
    return df.iloc[0].to_dict()


def build_context_aware_prompt(perfil: dict[str, Any], rag_engine: Engine | None) -> str:
    base = build_system_prompt(perfil)
    if rag_engine is None:
        return base
    try:
        extra = construir_extra_context(rag_engine, int(perfil.get("cluster_id") or 0))
        if not extra:
            return base
        return f"{base}\n\n--- CONTEXTO ACTUAL ---\n{extra}"
    except Exception as exc:
        logger.warning("RAG omitido: %s", exc)
        return base


def _json_dumps(payload: dict[str, Any] | None) -> str:
    try:
        return json.dumps(payload or {}, ensure_ascii=False)
    except Exception:
        return "{}"


def _persist_turn(
    engine: Engine,
    *,
    session_id: str,
    perfil_id: int,
    cluster_id: int,
    role: str,
    kind: str,
    content: str,
    modelo: str | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    sql = text(
        """
        INSERT INTO agent_memory_log
            (perfil_id, cluster_id, session_id, role, kind, content, metadata_json, modelo)
        VALUES
            (:perfil_id, :cluster_id, :session_id, :role, :kind, :content, :metadata_json, :modelo)
        """
    )
    with engine.begin() as conn:
        conn.execute(
            sql,
            {
                "perfil_id": int(perfil_id),
                "cluster_id": int(cluster_id),
                "session_id": session_id,
                "role": role,
                "kind": kind,
                "content": content,
                "metadata_json": _json_dumps(metadata),
                "modelo": modelo,
            },
        )


def _default_llm() -> Any:
    provider = os.environ.get("ELECTSIM_LLM_PROVIDER", "openai").strip().lower()
    if provider == "anthropic":
        return AnthropicChatClient()
    if provider == "ollama":
        return OllamaClient()
    if provider == "stub":
        return StubLLMClient()
    if os.environ.get("OPENAI_API_KEY"):
        return OpenAIChatClient()
    return StubLLMClient()


class VoterAgent:
    def __init__(self, *args: Any, llm: Any | None = None, **kwargs: Any) -> None:
        """Compatibilidad doble firma:
        - VoterAgent(engine, cluster_id, llm=...)
        - VoterAgent(cluster_id=..., engine=..., llm=...)
        """
        if len(args) >= 2 and isinstance(args[1], int):
            engine = args[0]
            cluster_id = int(args[1])
        else:
            engine = kwargs.get("engine")
            cluster_id = int(kwargs.get("cluster_id"))

        if engine is None:
            raise ValueError("Engine requerido")

        self.engine: Engine = engine
        self.cluster_id = cluster_id
        self.llm = llm or _default_llm()
        self.session_id = str(uuid.uuid4())
        self._history: list[dict[str, str]] = []
        self._max_history_turns = 6

        perfil = load_perfil_por_cluster(self.engine, self.cluster_id)
        if perfil is None:
            raise ValueError(f"No existe perfil para cluster_id={self.cluster_id}")
        self.perfil = perfil
        self.perfil_id = int(perfil.get("id") or 0)

    def reset_history(self) -> None:
        self._history = []

    def run_turn(
        self,
        user_content: str,
        *,
        persist: bool = True,
        rag_engine: Engine | None = None,
        use_history: bool = True,
        extra_context: str | None = None,
        temperature: float = 0.4,
        max_tokens: int = 1024,
    ) -> AgentTurnResult:
        system_prompt = build_context_aware_prompt(self.perfil, rag_engine)

        msg_user = str(user_content)
        if extra_context:
            msg_user = f"{msg_user}\n\nContexto adicional del usuario:\n{extra_context}"

        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        if use_history:
            messages += self._history[-self._max_history_turns * 2 :]
        messages.append({"role": "user", "content": msg_user})

        raw = str(self.llm.complete(messages, temperature=temperature, max_tokens=max_tokens))
        deliberation, final_reply = parse_chain_of_thought(raw)

        if use_history:
            self._history.append({"role": "user", "content": msg_user})
            self._history.append({"role": "assistant", "content": raw})

        result = AgentTurnResult(
            session_id=self.session_id,
            cluster_id=self.cluster_id,
            perfil_id=self.perfil_id,
            deliberation=deliberation,
            final_reply=final_reply,
            raw_assistant=raw,
            system_prompt=system_prompt,
        )

        if persist:
            modelo = getattr(self.llm, "modelo", None)
            # Mantener 4 inserts por compatibilidad con tests existentes
            sql = text(
                """
                INSERT INTO agent_memory_log
                    (perfil_id, cluster_id, session_id, role, kind, content, metadata_json, modelo)
                VALUES
                    (:perfil_id, :cluster_id, :session_id, :role, :kind, :content, :metadata_json, :modelo)
                """
            )
            with self.engine.begin() as conn:
                conn.execute(
                    sql,
                    {
                        "perfil_id": self.perfil_id,
                        "cluster_id": self.cluster_id,
                        "session_id": self.session_id,
                        "role": "user",
                        "kind": "turn",
                        "content": msg_user,
                        "metadata_json": _json_dumps({"temperature": temperature}),
                        "modelo": modelo,
                    },
                )
                conn.execute(
                    sql,
                    {
                        "perfil_id": self.perfil_id,
                        "cluster_id": self.cluster_id,
                        "session_id": self.session_id,
                        "role": "assistant",
                        "kind": "turn",
                        "content": raw,
                        "metadata_json": _json_dumps({}),
                        "modelo": modelo,
                    },
                )
                conn.execute(
                    sql,
                    {
                        "perfil_id": self.perfil_id,
                        "cluster_id": self.cluster_id,
                        "session_id": self.session_id,
                        "role": "assistant",
                        "kind": "deliberation",
                        "content": deliberation,
                        "metadata_json": _json_dumps({}),
                        "modelo": modelo,
                    },
                )
                conn.execute(
                    sql,
                    {
                        "perfil_id": self.perfil_id,
                        "cluster_id": self.cluster_id,
                        "session_id": self.session_id,
                        "role": "assistant",
                        "kind": "final_reply",
                        "content": final_reply,
                        "metadata_json": _json_dumps({}),
                        "modelo": modelo,
                    },
                )

        return result


def run_turn(
    engine: Engine,
    cluster_id: int,
    user_content: str,
    llm: Any | None = None,
    *,
    persist: bool = True,
    rag_engine: Engine | None = None,
    **kwargs: Any,
) -> AgentTurnResult:
    agent = VoterAgent(engine, cluster_id, llm=llm)
    return agent.run_turn(
        user_content,
        persist=persist,
        rag_engine=rag_engine,
        use_history=bool(kwargs.get("use_history", True)),
        extra_context=kwargs.get("extra_context"),
        temperature=float(kwargs.get("temperature", 0.4)),
        max_tokens=int(kwargs.get("max_tokens", 1024)),
    )
