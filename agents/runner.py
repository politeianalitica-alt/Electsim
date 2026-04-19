<<<<<<< HEAD
"""Agente votante sintético: carga perfil desde BD, CoT y registro en ``agent_memory_log``."""

from __future__ import annotations

import argparse
import logging
import os
import re
import uuid
from dataclasses import dataclass
from typing import Any, Mapping

import pandas as pd
from sqlalchemy import create_engine, text

from agents.llm import OpenAIChatClient, StubLLMClient
from agents.memory_log import insert_memory_entry
from agents.prompts import build_system_prompt
=======
from __future__ import annotations

import logging
import os
import uuid
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from agents.llm import (
    AnthropicChatClient,
    OllamaClient,
    OpenAIChatClient,
    StubLLMClient,
)
from agents.memory_log import log_memory_turn
from agents.prompts import build_system_prompt, parse_chain_of_thought
>>>>>>> 6fda6ff (agentes 1)
from agents.rag_retriever import construir_extra_context

logger = logging.getLogger(__name__)

<<<<<<< HEAD
_COT_DELIB = re.compile(
    r"###\s*Deliberación\s*(.*?)(?=###\s*Respuesta\s*final|\Z)",
    re.DOTALL | re.IGNORECASE,
)
_COT_FINAL = re.compile(
    r"###\s*Respuesta\s*final\s*(.*)\Z",
    re.DOTALL | re.IGNORECASE,
)


@dataclass
class AgentTurnResult:
    """Contrato de salida de un turno del agente."""

    session_id: str
    cluster_id: int
    perfil_id: int | None
    deliberation: str
    final_reply: str
    raw_assistant: str
    system_prompt: str


def build_context_aware_prompt(perfil: Mapping[str, Any], engine: Any | None = None) -> str:
    """
    Enriquece el system prompt con contexto RAG (macro + redes) si hay ``engine``.

    Si ``construir_extra_context`` falla o devuelve vacío, se usa solo el prompt base.
    """
    base = build_system_prompt(perfil)
    if engine is None:
        return base
    try:
        extra = construir_extra_context(engine, int(perfil["cluster_id"]))
    except Exception as exc:
        logger.warning("RAG omitido tras error en construir_extra_context: %s", exc)
        return base
    extra = (extra or "").strip()
    if not extra:
        return base
    return base + "\n\n--- CONTEXTO ACTUAL ---\n" + extra


def parse_chain_of_thought(text: str) -> tuple[str, str]:
    """Extrae deliberación y respuesta final del markdown del modelo."""
    t = (text or "").strip()
    m_d = _COT_DELIB.search(t)
    m_f = _COT_FINAL.search(t)
    deliberation = m_d.group(1).strip() if m_d else ""
    final_reply = m_f.group(1).strip() if m_f else t
    if not deliberation and not m_f:
        return "", t
    return deliberation, final_reply


def load_perfil_por_cluster(engine, cluster_id: int) -> dict[str, Any] | None:
    """Lee una fila de ``perfiles_votante`` por ``cluster_id``."""
    sql = text(
        """
        SELECT id, cluster_id, label, n_respondentes, peso_demografico_pct,
               edad_media, ideologia_media, distribucion_voto_json, descripcion_perfil_llm
        FROM perfiles_votante WHERE cluster_id = :cid LIMIT 1
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"cid": cluster_id})
    if df.empty:
        return None
    return df.iloc[0].to_dict()


class VoterAgent:
    """Agente ligado a un perfil de votante (por ``cluster_id``)."""

    def __init__(self, engine, cluster_id: int, llm: Any | None = None) -> None:
        self.engine = engine
        self.cluster_id = cluster_id
        self._perfil = load_perfil_por_cluster(engine, cluster_id)
        if self._perfil is None:
            raise ValueError(f"No existe perfiles_votante.cluster_id={cluster_id}")
        self.llm = llm if llm is not None else _default_llm_client()
        self.system_prompt = build_system_prompt(self._perfil)

    @property
    def perfil_id(self) -> int | None:
        pid = self._perfil.get("id")
        return int(pid) if pid is not None else None

    def run_turn(
        self,
        user_message: str,
        *,
        session_id: str | None = None,
        extra_context: str | None = None,
        persist: bool = True,
        temperature: float = 0.4,
        rag_engine: Any | None = None,
    ) -> AgentTurnResult:
        """
        Ejecuta un turno: system + user (opcional contexto RAG) → LLM → parse CoT → log en BD.

        ``extra_context`` añade texto al mensaje de usuario; ``rag_engine`` activa RAG en el system prompt.
        """
        sid = session_id or str(uuid.uuid4())
        if rag_engine is not None:
            system_used = build_context_aware_prompt(self._perfil, rag_engine)
        else:
            system_used = self.system_prompt

        user_parts = [user_message.strip()]
        if extra_context and extra_context.strip():
            user_parts.insert(
                0,
                "Contexto reciente (noticias / datos; úsalo solo si encaja con tu perfil):\n"
                + extra_context.strip(),
            )
        user_content = "\n\n".join(user_parts)

        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_used},
            {"role": "user", "content": user_content},
        ]

        modelo = getattr(self.llm, "modelo", getattr(self.llm, "model", "unknown"))
        raw = self.llm.complete(messages, temperature=temperature)
        deliberation, final_reply = parse_chain_of_thought(raw)

        if persist:
            insert_memory_entry(
                self.engine,
                session_id=sid,
                role="system",
                kind="system_prompt",
                content=system_used,
                perfil_id=self.perfil_id,
                cluster_id=self.cluster_id,
                modelo=str(modelo),
            )
            insert_memory_entry(
                self.engine,
                session_id=sid,
                role="user",
                kind="turn",
                content=user_content,
                perfil_id=self.perfil_id,
                cluster_id=self.cluster_id,
                modelo=str(modelo),
            )
            insert_memory_entry(
                self.engine,
                session_id=sid,
                role="assistant",
                kind="deliberation",
                content=deliberation or raw,
                perfil_id=self.perfil_id,
                cluster_id=self.cluster_id,
                modelo=str(modelo),
            )
            insert_memory_entry(
                self.engine,
                session_id=sid,
                role="assistant",
                kind="turn",
                content=final_reply,
                perfil_id=self.perfil_id,
                cluster_id=self.cluster_id,
                modelo=str(modelo),
                metadata={"raw_length": len(raw)},
            )

        return AgentTurnResult(
            session_id=sid,
            cluster_id=self.cluster_id,
            perfil_id=self.perfil_id,
            deliberation=deliberation,
            final_reply=final_reply,
            raw_assistant=raw,
            system_prompt=system_used,
        )


def _default_llm_client() -> Any:
    if os.environ.get("OPENAI_API_KEY"):
        return OpenAIChatClient()
    logger.warning("OPENAI_API_KEY ausente; usando StubLLMClient")
=======

class VoterAgent:
    """Agente sintético por cluster de votante."""

    def __init__(
        self,
        cluster_id: int,
        engine: Engine,
        llm: Any | None = None,
        *,
        session_id: str | None = None,
        persist: bool = True,
        usar_rag: bool = True,
    ) -> None:
        self.cluster_id = int(cluster_id)
        self.engine = engine
        self.llm = llm or _build_default_llm()
        self.session_id = session_id or str(uuid.uuid4())
        self.persist = bool(persist)
        self.usar_rag = bool(usar_rag)

        self._history: list[dict[str, str]] = []
        self._max_history_turns: int = 6

        self.perfil = self._load_profile()
        self.system_prompt = build_system_prompt(self.perfil)

    def _load_profile(self) -> dict[str, Any]:
        sql = text(
            """
            SELECT *
            FROM perfiles_votante
            WHERE cluster_id = :cid
            LIMIT 1
            """
        )
        try:
            with self.engine.connect() as conn:
                df = pd.read_sql(sql, conn, params={"cid": self.cluster_id})
            if not df.empty:
                return df.iloc[0].to_dict()
        except Exception as exc:
            logger.warning("No se pudo cargar perfil cluster_id=%s: %s", self.cluster_id, exc)
        return {
            "cluster_id": self.cluster_id,
            "label": f"Cluster {self.cluster_id}",
            "descripcion_perfil_llm": "",
            "ideologia_media": None,
            "edad_media": None,
        }

    def _system_with_optional_rag(self, use_rag: bool) -> str:
        if not use_rag:
            return self.system_prompt
        extra = construir_extra_context(self.engine, self.cluster_id)
        if not extra:
            return self.system_prompt
        return f"{self.system_prompt}\n\n---\n\nContexto adicional (RAG):\n{extra}"

    def reset_history(self) -> None:
        """Limpia historial conversacional en memoria del agente."""
        self._history = []

    def run_turn(
        self,
        user_content: str,
        *,
        temperature: float = 0.4,
        max_tokens: int = 1024,
        persist: bool | None = None,
        use_rag: bool | None = None,
        use_history: bool = True,
        **_: Any,
    ) -> dict[str, Any]:
        """Ejecuta un turno user->assistant.

        `use_history=False` fuerza modo stateless (comportamiento clásico).
        """
        persist_used = self.persist if persist is None else bool(persist)
        rag_used = self.usar_rag if use_rag is None else bool(use_rag)
        system_used = self._system_with_optional_rag(rag_used)

        messages: list[dict[str, str]] = [{"role": "system", "content": system_used}]
        if use_history:
            messages += self._history[-self._max_history_turns * 2 :]
        messages.append({"role": "user", "content": str(user_content)})

        raw = self.llm.complete(messages, temperature=temperature, max_tokens=max_tokens)
        parsed = parse_chain_of_thought(str(raw))

        if use_history:
            self._history.append({"role": "user", "content": str(user_content)})
            self._history.append({"role": "assistant", "content": str(raw)})

        if persist_used:
            modelo = getattr(self.llm, "modelo", None)
            log_memory_turn(
                self.engine,
                session_id=self.session_id,
                cluster_id=self.cluster_id,
                role="user",
                kind="turn",
                content=str(user_content),
                metadata={"use_rag": rag_used},
                modelo=modelo,
            )
            log_memory_turn(
                self.engine,
                session_id=self.session_id,
                cluster_id=self.cluster_id,
                role="assistant",
                kind="turn",
                content=str(raw),
                metadata={
                    "respuesta_parseada": parsed.get("respuesta", ""),
                    "razonamiento": parsed.get("razonamiento", ""),
                    "use_rag": rag_used,
                },
                modelo=modelo,
            )

        return {
            "cluster_id": self.cluster_id,
            "session_id": self.session_id,
            "modelo": getattr(self.llm, "modelo", "unknown"),
            "raw": str(raw),
            "razonamiento": parsed.get("razonamiento", ""),
            "respuesta": parsed.get("respuesta", "NS/NC"),
            "messages": messages,
            "used_rag": rag_used,
        }


def _build_default_llm() -> Any:
    provider = os.environ.get("ELECTSIM_LLM_PROVIDER", "openai").strip().lower()
    if provider == "anthropic":
        return AnthropicChatClient()
    if provider == "ollama":
        return OllamaClient()
    if provider == "stub":
        return StubLLMClient()

    if os.environ.get("OPENAI_API_KEY"):
        return OpenAIChatClient()
    if os.environ.get("ANTHROPIC_API_KEY") and provider == "anthropic":
        return AnthropicChatClient()
    if provider == "ollama":
        return OllamaClient()
>>>>>>> 6fda6ff (agentes 1)
    return StubLLMClient()


def run_turn(
<<<<<<< HEAD
    engine,
    cluster_id: int,
    user_message: str,
    *,
    llm: Any | None = None,
    persist: bool = True,
    extra_context: str | None = None,
    rag_engine: Any | None = None,
) -> AgentTurnResult:
    """Atajo funcional: instancia ``VoterAgent`` y un turno."""
    agent = VoterAgent(engine, cluster_id, llm=llm)
    return agent.run_turn(
        user_message, persist=persist, extra_context=extra_context, rag_engine=rag_engine
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Agente votante sintético (un turno)")
    parser.add_argument("cluster_id", type=int, help="cluster_id en perfiles_votante")
    parser.add_argument("mensaje", type=str, help="Pregunta o estímulo para el agente")
    parser.add_argument("--no-persist", action="store_true", help="No escribir en agent_memory_log")
    parser.add_argument(
        "--no-rag",
        action="store_true",
        help="No enriquecer el system prompt con RAG (macro + redes)",
    )
    args = parser.parse_args()
    engine = create_engine(os.environ["DATABASE_URL"])
    agent = VoterAgent(engine, args.cluster_id)
    rag_engine = None if args.no_rag else engine
    out = agent.run_turn(args.mensaje, persist=not args.no_persist, rag_engine=rag_engine)
    print("--- Deliberación ---")
    print(out.deliberation or "(vacío)")
    print("--- Respuesta final ---")
    print(out.final_reply)
    print("session_id:", out.session_id)


if __name__ == "__main__":
    main()
=======
    cluster_id: int,
    user_content: str,
    engine: Engine,
    llm: Any | None = None,
    *,
    session_id: str | None = None,
    persist: bool = True,
    usar_rag: bool = True,
    **kwargs: Any,
) -> dict[str, Any]:
    """API funcional compatible para un único turno."""
    agent = VoterAgent(
        cluster_id=cluster_id,
        engine=engine,
        llm=llm,
        session_id=session_id,
        persist=persist,
        usar_rag=usar_rag,
    )
    return agent.run_turn(
        user_content,
        persist=persist,
        use_rag=usar_rag,
        use_history=bool(kwargs.get("use_history", True)),
        temperature=float(kwargs.get("temperature", 0.4)),
        max_tokens=int(kwargs.get("max_tokens", 1024)),
    )


if __name__ == "__main__":  # pragma: no cover
    import argparse
    from sqlalchemy import create_engine

    parser = argparse.ArgumentParser(description="Turno único de VoterAgent")
    parser.add_argument("cluster_id", type=int)
    parser.add_argument("mensaje", type=str)
    parser.add_argument("--no-persist", action="store_true")
    parser.add_argument("--no-rag", action="store_true")
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL no definida")

    eng = create_engine(db_url, pool_pre_ping=True)
    out = run_turn(
        cluster_id=args.cluster_id,
        user_content=args.mensaje,
        engine=eng,
        persist=not args.no_persist,
        usar_rag=not args.no_rag,
    )
    print(out["respuesta"])
>>>>>>> 6fda6ff (agentes 1)
