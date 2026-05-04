"""
Pipeline CLI — Politeia Brain Core.

Uso:
    python -m pipelines.brain_core --index legal
    python -m pipelines.brain_core --index media
    python -m pipelines.brain_core --index all
    python -m pipelines.brain_core --status
    python -m pipelines.brain_core --test-query "qué ha salido hoy en el BOE"
"""
from __future__ import annotations

import argparse
import logging
import sys
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("pipelines.brain_core")


def cmd_index(source: str) -> int:
    """Indexa documentos en el vector store."""
    try:
        from agents.brain.rag_indexer import (
            index_legal_items, index_parliamentary_initiatives,
            index_media_items, index_narrative_clusters, index_all,
        )
        if source == "legal":
            n = index_legal_items()
            logger.info("legal_items indexados: %d", n)
        elif source == "parliament":
            n = index_parliamentary_initiatives()
            logger.info("parliamentary_initiatives indexados: %d", n)
        elif source == "media":
            n = index_media_items()
            logger.info("media_items indexados: %d", n)
        elif source == "narratives":
            n = index_narrative_clusters()
            logger.info("narrative_clusters indexados: %d", n)
        elif source == "all":
            result = index_all()
            logger.info("index_all: %s — total %d", result, sum(result.values()))
        else:
            logger.error("Fuente desconocida: %s", source)
            return 1
        return 0
    except Exception as exc:
        logger.error("cmd_index error: %s", exc)
        return 1


def cmd_status() -> int:
    """Muestra estado del Brain: LLM, RAG, datos."""
    try:
        from agents.tools.system_tools import get_ai_status, get_rag_status, get_data_health
        import json

        print("\n=== Politeia Brain Status ===\n")
        ai = get_ai_status()
        print("LLM Gateway:")
        print(f"  Ollama: {'✅' if ai.get('ollama_available') else '❌'} {ai.get('ollama_model', '—')}")
        print(f"  Embeddings: {ai.get('embedding_model', '—')}")
        print(f"  Chroma: {'✅' if ai.get('chroma_available') else '❌'} ({ai.get('chroma_count', 0):,} docs)")
        print(f"  LiteLLM: {'habilitado' if ai.get('litellm_enabled') else 'deshabilitado'}")
        print(f"  Claude: {'disponible' if ai.get('claude_available') else 'no configurado'}")

        rag = get_rag_status()
        print(f"\nRAG Indexer:")
        print(f"  Chroma docs: {rag.get('chroma_count', 0):,}")
        print(f"  Colecciones: {', '.join(rag.get('collections', []))}")

        health = get_data_health()
        print("\nData Health:")
        for table, info in health.items():
            if table.startswith("_"):
                continue
            exists = "✅" if info.get("exists") else "❌"
            count = info.get("count", 0)
            last = info.get("last_updated", "—")
            print(f"  {exists} {table}: {count:,} registros · último: {last}")

        return 0
    except Exception as exc:
        logger.error("cmd_status error: %s", exc)
        return 1


def cmd_test_query(query: str) -> int:
    """Prueba el RAG con una consulta real."""
    try:
        from agents.brain.rag_indexer import semantic_search
        print(f"\n=== Test Query: '{query}' ===\n")
        results = semantic_search(query, k=5)
        if not results:
            print("Sin resultados. ¿El RAG está indexado? Ejecuta: --index all")
            return 0
        for i, ev in enumerate(results, 1):
            score = f"{ev.score:.3f}" if ev.score is not None else "—"
            print(f"{i}. [{ev.object_type}] {ev.title[:60]}  (score={score})")
            print(f"   Fuente: {ev.source}  Dominio: {ev.domain}")
            print(f"   Snippet: {ev.snippet[:100]}\n")
        return 0
    except Exception as exc:
        logger.error("cmd_test_query error: %s", exc)
        return 1


def cmd_test_agent(agent_name: str, task: str) -> int:
    """Prueba un agente específico."""
    try:
        from agents.brain.agent_runner import get_runner
        from agents.brain.schemas import AgentRunRequest
        runner = get_runner()
        req = AgentRunRequest(agent_name=agent_name, task=task, mode="fast")
        result = runner.run(req)
        print(f"\n=== AgentRun: {agent_name} ===")
        print(f"Status: {result.status}")
        print(f"Modelo: {result.model_used} ({result.provider})")
        print(f"Confianza: {result.confidence:.2f}")
        print(f"Latencia: {result.latency_ms}ms")
        print(f"Fuentes: {result.evidence_pack.n_sources}")
        print(f"\nRespuesta:\n{result.answer}")
        return 0
    except Exception as exc:
        logger.error("cmd_test_agent error: %s", exc)
        return 1


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m pipelines.brain_core",
        description="Politeia Brain Core CLI",
    )
    p.add_argument(
        "--index",
        choices=["legal", "parliament", "media", "narratives", "all"],
        help="Indexar documentos en el vector store",
    )
    p.add_argument("--status", action="store_true", help="Mostrar estado del Brain")
    p.add_argument("--test-query", metavar="QUERY", help="Probar búsqueda RAG")
    p.add_argument("--test-agent", nargs=2, metavar=("AGENT", "TASK"), help="Probar un agente")
    return p


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.index:
        return cmd_index(args.index)
    if args.status:
        return cmd_status()
    if args.test_query:
        return cmd_test_query(args.test_query)
    if args.test_agent:
        return cmd_test_agent(args.test_agent[0], args.test_agent[1])

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
