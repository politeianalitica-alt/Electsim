from __future__ import annotations

import argparse
import json
import logging
import os
import subprocess
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Generator

from dotenv import load_dotenv

from agents.git_amigos_indexer import GitAmigosIndex, tokenize
from agents.llm import get_llm_client
from agents.local_intelligence import get_local_store


_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")
logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ToolResult:
    tool: str
    output: Any


@dataclass(slots=True)
class ManagerChatResult:
    answer: str
    model: str
    provider: str
    used_llm: bool
    citations: list[dict[str, Any]]
    tool_results: list[ToolResult]


@dataclass(slots=True)
class ManagerContext:
    context: str
    citations: list[dict[str, Any]]
    tool_results: list[ToolResult]


@dataclass(slots=True)
class ManagerStreamResult:
    stream: Generator[str, None, None]
    model: str
    provider: str
    citations: list[dict[str, Any]]
    tool_results: list[ToolResult]


def _run_readonly(cmd: list[str], *, timeout_s: float = 20.0, max_chars: int = 6000) -> dict[str, Any]:
    try:
        proc = subprocess.run(
            cmd,
            cwd=_ROOT,
            text=True,
            capture_output=True,
            timeout=timeout_s,
            check=False,
        )
        output = (proc.stdout or "") + (("\n" + proc.stderr) if proc.stderr else "")
        return {"cmd": cmd, "returncode": proc.returncode, "output": output[:max_chars]}
    except Exception as exc:
        return {"cmd": cmd, "error": str(exc)}


class BackendManagerAgent:
    """Gerente local del backend de Politeia.

    El agente usa tres fuentes:
    - índice persistente de `gits amigos`;
    - conocimiento local generado por `agents.local_intelligence`;
    - herramientas read-only sobre el backend actual.
    """

    def __init__(
        self,
        *,
        provider: str | None = None,
        gits_index: GitAmigosIndex | None = None,
        use_llm: bool = True,
    ) -> None:
        self.provider = (
            provider
            or os.environ.get("ELECTSIM_BACK_MANAGER_PROVIDER")
            or os.environ.get("ELECTSIM_LOCAL_AI_PROVIDER")
            or "ollama"
        ).strip().lower()
        self.gits_index = gits_index or GitAmigosIndex()
        self.local_store = get_local_store()
        self.use_llm = use_llm

    def chat(
        self,
        question: str,
        *,
        k: int = 10,
        repo: str | None = None,
        domain: str | None = None,
        include_project_context: bool = True,
    ) -> ManagerChatResult:
        prepared = self.prepare_context(
            question,
            k=k,
            repo=repo,
            domain=domain,
            include_project_context=include_project_context,
        )

        if self.use_llm:
            llm = self._call_llm(question, prepared.context)
            if llm:
                return ManagerChatResult(
                    answer=llm["answer"],
                    model=llm["model"],
                    provider=self.provider,
                    used_llm=True,
                    citations=prepared.citations,
                    tool_results=prepared.tool_results,
                )

        return ManagerChatResult(
            answer=self._heuristic_answer(question, prepared.citations, prepared.tool_results),
            model="local-manager-heuristic",
            provider=self.provider,
            used_llm=False,
            citations=prepared.citations,
            tool_results=prepared.tool_results,
        )

    def prepare_context(
        self,
        question: str,
        *,
        k: int = 10,
        repo: str | None = None,
        domain: str | None = None,
        include_project_context: bool = True,
    ) -> ManagerContext:
        retrieval_query = self._retrieval_query(question)
        inferred_domain = domain or self._infer_domain(question)
        citations = self.gits_index.search(retrieval_query, k=k, repo=repo, domain=inferred_domain)
        local_hits = self.local_store.search(question, k=5)
        tool_results = self._collect_tools(question, include_project_context=include_project_context)
        context = self._context_block(question, citations, local_hits, tool_results)
        return ManagerContext(
            context=context,
            citations=citations + [{"source": "local_ai", **hit} for hit in local_hits],
            tool_results=tool_results,
        )

    def stream_chat(
        self,
        question: str,
        *,
        k: int = 10,
        repo: str | None = None,
        domain: str | None = None,
        include_project_context: bool = True,
    ) -> ManagerStreamResult | None:
        if not self.use_llm or self.provider != "ollama":
            return None
        prepared = self.prepare_context(
            question,
            k=k,
            repo=repo,
            domain=domain,
            include_project_context=include_project_context,
        )
        try:
            from agents.ai_engine import get_ai_engine

            engine = get_ai_engine()
            if not engine.is_ollama_available():
                return None
            model = engine.resolve_ollama_model()
            messages = self._messages_for_context(prepared.context)
            return ManagerStreamResult(
                stream=engine.ollama_chat_stream(
                    messages[0]["content"],
                    messages[1]["content"],
                    model=model,
                    temperature=0.2,
                    max_tokens=_safe_int_env("ELECTSIM_BACK_MANAGER_MAX_TOKENS", 500),
                ),
                model=model,
                provider=self.provider,
                citations=prepared.citations,
                tool_results=prepared.tool_results,
            )
        except Exception as exc:
            logger.warning("Backend manager streaming no disponible: %s", exc)
            return None

    def status(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "llm": self._llm_status(),
            "gits_index": self.gits_index.summary(),
            "local_ai": self.local_store.ontology_summary(),
            "backend": self._backend_status(),
        }

    def _llm_status(self) -> dict[str, Any]:
        try:
            from agents.ai_engine import get_ai_engine

            engine_status = get_ai_engine().status()
        except Exception:
            engine_status = {}
        return {
            "provider": self.provider,
            "ollama_base_url": os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
            "ollama_model": engine_status.get("model") or os.environ.get("ELECTSIM_OLLAMA_MODEL", "qwen2.5:7b"),
            "ollama_num_ctx": _safe_int_env("ELECTSIM_OLLAMA_NUM_CTX", 8192),
            "ollama_keep_alive": os.environ.get("ELECTSIM_OLLAMA_KEEP_ALIVE", "30m"),
            "ollama_embedding_model": engine_status.get("embedding_model")
            or os.environ.get("ELECTSIM_OLLAMA_EMBEDDING_MODEL", "nomic-embed-text"),
            "engine": engine_status,
        }

    def reindex_gits(
        self,
        *,
        max_file_bytes: int = 750_000,
        max_chars_per_file: int = 80_000,
        max_files_per_repo: int | None = None,
        docs_only: bool = False,
    ) -> dict[str, Any]:
        stats = self.gits_index.build(
            max_file_bytes=max_file_bytes,
            max_chars_per_file=max_chars_per_file,
            max_files_per_repo=max_files_per_repo,
            include_source=not docs_only,
        )
        return asdict(stats)

    def _collect_tools(self, question: str, *, include_project_context: bool) -> list[ToolResult]:
        results = [ToolResult("manager_status", self._compact_status())]
        q = question.lower()
        if include_project_context:
            results.append(ToolResult("backend_status", self._backend_status()))
            rg = self._project_search(question)
            if rg.get("output"):
                results.append(ToolResult("project_rg", rg))
        if any(word in q for word in ("inventario", "repos", "repositorios", "gits amigos", "carpeta")):
            results.append(ToolResult("repo_inventory", self._compact_repo_inventory(limit=4)))
        return results

    def _backend_status(self) -> dict[str, Any]:
        return {
            "git_status": _run_readonly(["git", "status", "--short"], max_chars=5000),
            "api_routes": _run_readonly(["rg", "-n", "include_router|@router\\.|@app\\.", "api", "agents", "ontology"], max_chars=8000),
        }

    def _compact_status(self) -> dict[str, Any]:
        gits = self.gits_index.summary().get("manifest") or {}
        local = self.local_store.ontology_summary()
        return {
            "provider": self.provider,
            "gits_repos": gits.get("repos_indexed", 0),
            "gits_files": gits.get("files_indexed", 0),
            "gits_chunks": gits.get("chunks", 0),
            "local_documents": local.get("documents", 0),
            "local_nodes": local.get("nodes", 0),
        }

    def _compact_repo_inventory(self, *, limit: int) -> list[dict[str, Any]]:
        return [
            {
                "repo": row.get("repo"),
                "indexed_files": row.get("indexed_files"),
                "domains": row.get("domains"),
                "priority_files": (row.get("priority_files") or [])[:3],
                "readme_excerpt": str(row.get("readme_excerpt") or "")[:180],
            }
            for row in self.gits_index.repo_inventory(limit=limit)
        ]

    def _project_search(self, question: str) -> dict[str, Any]:
        tokens = [t for t in tokenize(question) if len(t) >= 4][:5]
        if not tokens:
            return {"output": ""}
        pattern = "|".join(tokens)
        return _run_readonly(
            ["rg", "-n", "-i", "--glob", "!data/**", "--glob", "!gits amigos/**", pattern, "api", "agents", "ontology", "etl", "pipelines"],
            timeout_s=15.0,
            max_chars=9000,
        )

    def _retrieval_query(self, question: str) -> str:
        q = question.lower()
        generic = {"gits", "amigos", "repo", "repos", "repositorios", "carpeta", "usar", "debo"}
        tokens = [token for token in tokenize(question) if token not in generic]
        expansions: list[str] = []
        has_domain_signal = any(
            word in q
            for word in (
                "scraper",
                "scraping",
                "crawler",
                "osint",
                "rss",
                "noticias",
                "ontologia",
                "ontología",
                "grafo",
                "economia",
                "economía",
                "economico",
                "económico",
                "macro",
                "finanzas",
                "politica",
                "política",
                "electoral",
                "congreso",
                "parlamento",
            )
        )
        if any(word in q for word in ("chatbot", "llm", "ollama", "openai", "anthropic", "rag", "gerente", "backend")) and not has_domain_signal:
            expansions.extend(["ollama", "openai", "anthropic", "rag", "chatbot", "agent", "backend", "tools", "local"])
        elif any(word in q for word in ("gerente", "backend")):
            expansions.extend(["backend", "pipeline", "tools", "local"])
        if any(word in q for word in ("scraper", "scraping", "crawler", "osint", "rss", "noticias")):
            expansions.extend(["scraper", "crawler", "osint", "rss", "news", "extractor", "pipeline"])
        if any(word in q for word in ("ontologia", "ontología", "grafo", "knowledge", "entidades")):
            expansions.extend(["knowledge", "graph", "ontology", "rdf", "entity", "memory"])
        if any(word in q for word in ("economia", "economía", "economico", "económico", "macro", "finanzas", "mercado")):
            expansions.extend(["economics", "finance", "macro", "openbb", "indicators", "data"])
        if any(word in q for word in ("politica", "política", "electoral", "congreso", "parlamento")):
            expansions.extend(["politics", "parliament", "congress", "election", "voting", "legislative"])
        merged = tokens + expansions
        return " ".join(dict.fromkeys(merged)) or question

    def _infer_domain(self, question: str) -> str | None:
        q = question.lower()
        matches: list[str] = []
        if any(word in q for word in ("scraper", "scraping", "crawler", "osint", "rss", "noticias")):
            matches.append("scraping_osint")
        if any(word in q for word in ("ontologia", "ontología", "grafo", "knowledge")):
            matches.append("ontologia_kg")
        if any(word in q for word in ("economia", "economía", "economico", "económico", "macro", "finanzas")):
            matches.append("economia")
        if any(word in q for word in ("politica", "política", "electoral", "congreso", "parlamento")):
            matches.append("politica")
        if any(word in q for word in ("chatbot", "llm", "ollama", "openai", "anthropic", "rag", "gerente", "backend")):
            matches.append("llm_agents")
        unique = list(dict.fromkeys(matches))
        if len(unique) == 1:
            return unique[0]
        return None

    def _context_block(
        self,
        question: str,
        citations: list[dict[str, Any]],
        local_hits: list[dict[str, Any]],
        tool_results: list[ToolResult],
    ) -> str:
        blocks = ["# Pregunta\n" + question]
        if citations:
            blocks.append(
                "# Evidencia de gits amigos\n"
                + "\n\n".join(
                    f"[{i}] repo={hit.get('repo')} file={hit.get('rel_path')} domains={hit.get('domains')}\n"
                    f"{str(hit.get('text') or '')[:520]}"
                    for i, hit in enumerate(citations[:4], start=1)
                )
            )
        if local_hits:
            blocks.append(
                "# Conocimiento local previo\n"
                + "\n".join(f"- {hit.get('title') or hit.get('source')}: {hit.get('summary')}" for hit in local_hits[:5])
            )
        if tool_results:
            blocks.append(
                "# Herramientas backend\n"
                + json.dumps([asdict(t) for t in tool_results], ensure_ascii=False, default=str)[:3500]
            )
        return "\n\n".join(blocks)

    def _messages_for_context(self, context: str) -> list[dict[str, str]]:
        return [
            {
                "role": "system",
                "content": (
                    "Eres Politeia Brain, la IA gerente local del backend y cerebro del dashboard. "
                    "Trabajas con Ollama/local por defecto y usas el contexto recuperado antes de razonar. "
                    "Tu funcion es analizar informacion electoral, politica, economica, social e institucional; "
                    "organizar ontologia; y decidir acciones tecnicas del backend/API/scrapers. "
                    "Separa hechos observados, inferencias y acciones. Cita repos, archivos o endpoints cuando aparezcan. "
                    "No inventes datos ni digas que has ejecutado cambios si solo tienes contexto. "
                    "No generes codigo si no se pide explicitamente; si mencionas codigo, rutas o endpoints, deben salir del contexto. "
                    "No generes enlaces, referencias finales ni URLs salvo que aparezcan literalmente en la evidencia."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"{context}\n\n"
                    "Produce una respuesta de gerente backend en menos de 350 palabras con estas secciones: "
                    "Diagnóstico operativo, Evidencia usada, Decisión, Siguientes acciones y Riesgos. "
                    "No incluyas código si no se pidió explícitamente."
                ),
            },
        ]

    def _call_llm(self, question: str, context: str) -> dict[str, str] | None:
        try:
            messages = self._messages_for_context(context)
            if self.provider == "ollama":
                from agents.ai_engine import get_ai_engine

                engine = get_ai_engine()
                if not engine.is_ollama_available():
                    return None
                model = engine.resolve_ollama_model()
                answer = engine.ollama_chat(
                    messages[0]["content"],
                    messages[1]["content"],
                    model=model,
                    temperature=0.2,
                    max_tokens=_safe_int_env("ELECTSIM_BACK_MANAGER_MAX_TOKENS", 500),
                )
                return {"answer": str(answer).strip(), "model": model}

            client = get_llm_client(self.provider)
            answer = client.complete(
                messages,
                temperature=0.2,
                max_tokens=_safe_int_env("ELECTSIM_BACK_MANAGER_MAX_TOKENS", 500),
                num_ctx=_safe_int_env("ELECTSIM_OLLAMA_NUM_CTX", 8192),
                top_p=0.85,
                repeat_penalty=1.08,
            )
            return {"answer": str(answer).strip(), "model": getattr(client, "modelo", self.provider)}
        except Exception as exc:
            logger.warning("Backend manager LLM no disponible: %s", exc)
            return None

    def _heuristic_answer(
        self,
        question: str,
        citations: list[dict[str, Any]],
        tool_results: list[ToolResult],
    ) -> str:
        lines = [
            "Gerente backend local sin LLM activo.",
            f"Proveedor configurado: `{self.provider}`. Si Ollama/OpenAI/Anthropic está disponible, este mismo endpoint usará el modelo.",
        ]
        if citations:
            repos = Counter(str(hit.get("repo")) for hit in citations)
            lines.append(f"Evidencia de `gits amigos`: {len(citations)} fragmentos; repos más relevantes: {', '.join(r for r, _ in repos.most_common(6))}.")
            for i, hit in enumerate(citations[:5], start=1):
                lines.append(f"[{i}] `{hit.get('repo')}/{hit.get('rel_path')}`: {str(hit.get('text'))[:260]}")
        local_hits = [hit for hit in citations if hit.get("source") == "local_ai"]
        if local_hits:
            lines.append(f"Conocimiento Politeia local: {len(local_hits)} documentos relacionados.")
        status = next((t.output for t in tool_results if t.tool == "manager_status"), {})
        if status:
            lines.append(
                f"Índice actual: {status.get('gits_repos', 0)} repos, {status.get('gits_files', 0)} archivos, "
                f"{status.get('gits_chunks', 0)} fragmentos."
            )
        lines.append("Decisión operativa: usar el índice de `gits amigos` como memoria técnica y el LLM solo como capa de razonamiento, no como almacenamiento.")
        return "\n".join(lines)


def get_backend_manager(provider: str | None = None, *, use_llm: bool = True) -> BackendManagerAgent:
    return BackendManagerAgent(provider=provider, use_llm=use_llm)


def _safe_int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _cmd_chat(args: argparse.Namespace) -> None:
    manager = get_backend_manager(args.provider, use_llm=not args.no_llm)
    result = manager.chat(args.question, k=args.k, repo=args.repo, domain=args.domain)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2, default=str))


def _cmd_status(args: argparse.Namespace) -> None:
    manager = get_backend_manager(args.provider, use_llm=False)
    print(json.dumps(manager.status(), ensure_ascii=False, indent=2, default=str))


def _cmd_reindex(args: argparse.Namespace) -> None:
    manager = get_backend_manager(args.provider, use_llm=False)
    result = manager.reindex_gits(
        max_file_bytes=args.max_file_bytes,
        max_chars_per_file=args.max_chars_per_file,
        max_files_per_repo=args.max_files_per_repo,
        docs_only=args.docs_only,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="IA gerente local del backend de Politeia.")
    parser.add_argument("--provider", default=None, help="ollama, openai, anthropic o stub.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_chat = sub.add_parser("chat")
    p_chat.add_argument("question")
    p_chat.add_argument("-k", type=int, default=10)
    p_chat.add_argument("--repo", default=None)
    p_chat.add_argument("--domain", default=None)
    p_chat.add_argument("--no-llm", action="store_true")
    p_chat.set_defaults(func=_cmd_chat)

    p_status = sub.add_parser("status")
    p_status.set_defaults(func=_cmd_status)

    p_reindex = sub.add_parser("reindex-gits")
    p_reindex.add_argument("--max-file-bytes", type=int, default=750_000)
    p_reindex.add_argument("--max-chars-per-file", type=int, default=80_000)
    p_reindex.add_argument("--max-files-per-repo", type=int, default=None)
    p_reindex.add_argument("--docs-only", action="store_true")
    p_reindex.set_defaults(func=_cmd_reindex)

    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
