from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_GITS_ROOT = _ROOT / "gits amigos"
DEFAULT_INDEX_DIR = _ROOT / "data" / "processed" / "git_amigos_knowledge"

SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".cache",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "__pycache__",
    "node_modules",
    "bower_components",
    ".venv",
    "venv",
    "env",
    "dist",
    "build",
    "target",
    ".next",
    ".nuxt",
    ".vite",
    "coverage",
    "htmlcov",
}

TEXT_SUFFIXES = {
    ".md",
    ".rst",
    ".txt",
    ".py",
    ".ipynb",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".json",
    ".jsonl",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".csv",
    ".tsv",
    ".sql",
    ".r",
    ".rmd",
    ".qmd",
    ".sh",
    ".dockerfile",
    ".html",
    ".htm",
    ".css",
}

PRIORITY_NAMES = {
    "readme",
    "readme.md",
    "readme.rst",
    "pyproject.toml",
    "package.json",
    "requirements.txt",
    "setup.py",
    "dockerfile",
    "docker-compose.yml",
    "mkdocs.yml",
    "catalog.yml",
}

DOMAIN_HINTS: dict[str, tuple[str, ...]] = {
    "llm_agents": ("llm", "rag", "agent", "ollama", "openai", "anthropic", "chatbot", "mcp", "langchain", "autogen"),
    "scraping_osint": ("scraper", "scrapy", "crawler", "osint", "rss", "newspaper", "spider", "recon"),
    "politica": ("congreso", "parliament", "senado", "electoral", "election", "partido", "voting", "manifesto"),
    "economia": ("econom", "finance", "openbb", "macro", "budget", "pib", "inflation", "trading"),
    "ontologia_kg": ("ontology", "rdf", "knowledge graph", "graph", "rdflib", "finkg", "ergk", "entity"),
    "datos_etl": ("etl", "airflow", "prefect", "dagster", "dbt", "datahub", "pipeline", "warehouse"),
    "geo": ("geo", "gis", "map", "kepler", "leaflet", "pysal", "spatial"),
    "nlp": ("nlp", "sentiment", "bert", "topic", "ner", "yake", "transformer"),
}

STOPWORDS = {
    "the",
    "and",
    "for",
    "from",
    "with",
    "that",
    "this",
    "you",
    "your",
    "are",
    "was",
    "were",
    "para",
    "con",
    "los",
    "las",
    "una",
    "uno",
    "del",
    "por",
    "que",
    "como",
    "repo",
    "repos",
    "github",
}


@dataclass(slots=True)
class RepoSummary:
    repo: str
    path: str
    file_count: int
    indexed_files: int
    skipped_files: int
    bytes_indexed: int
    domains: list[str]
    readme_excerpt: str
    priority_files: list[str]
    updated_at: str


@dataclass(slots=True)
class IndexedDocument:
    id: str
    repo: str
    path: str
    rel_path: str
    kind: str
    language: str
    size_bytes: int
    sha256: str
    title: str
    excerpt: str
    domains: list[str]
    indexed_at: str


@dataclass(slots=True)
class IndexedChunk:
    id: str
    document_id: str
    repo: str
    rel_path: str
    chunk_index: int
    text: str
    domains: list[str]
    tokens: list[str]


@dataclass(slots=True)
class IndexStats:
    repos_seen: int
    repos_indexed: int
    files_seen: int
    files_indexed: int
    files_skipped: int
    chunks: int
    bytes_indexed: int
    index_dir: str
    updated_at: str


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _strip_accents_light(value: str) -> str:
    return value.translate(str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN"))


def _norm(value: Any) -> str:
    return _strip_accents_light(str(value or "")).lower()


def tokenize(text: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-z0-9áéíóúüñ_./-]{3,}", _norm(text))
        if token not in STOPWORDS and not token.isdigit()
    ]


def _stable_id(*parts: Any) -> str:
    h = hashlib.sha256()
    for part in parts:
        h.update(str(part or "").encode("utf-8", errors="ignore"))
        h.update(b"\x1f")
    return h.hexdigest()[:24]


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _json_default(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, Path):
        return str(value)
    return str(value)


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(obj, dict):
                rows.append(obj)
    return rows


def _write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False, default=_json_default) + "\n")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=_json_default), encoding="utf-8")


def _is_probably_text(data: bytes) -> bool:
    if b"\x00" in data[:4096]:
        return False
    if not data:
        return False
    sample = data[:4096]
    control = sum(1 for b in sample if b < 9 or (13 < b < 32))
    return control / max(1, len(sample)) < 0.08


def _language_for(path: Path) -> str:
    suffix = path.suffix.lower()
    return {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".r": "r",
        ".sql": "sql",
        ".md": "markdown",
        ".rst": "rst",
        ".json": "json",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".csv": "csv",
        ".tsv": "tsv",
        ".ipynb": "notebook",
    }.get(suffix, suffix.lstrip(".") or path.name.lower())


def _kind_for(path: Path) -> str:
    name = path.name.lower()
    if name.startswith("readme"):
        return "readme"
    if name in PRIORITY_NAMES:
        return "config"
    if "docs" in {part.lower() for part in path.parts} or path.suffix.lower() in {".md", ".rst", ".txt"}:
        return "documentation"
    if path.suffix.lower() in {".csv", ".tsv", ".json", ".jsonl", ".parquet"}:
        return "data_or_metadata"
    return "source"


def _detect_domains(*texts: str) -> list[str]:
    text = _norm(" ".join(texts))
    scored: list[tuple[str, int]] = []
    for domain, hints in DOMAIN_HINTS.items():
        score = sum(text.count(_norm(hint)) for hint in hints)
        if score:
            scored.append((domain, score))
    scored.sort(key=lambda item: (-item[1], item[0]))
    return [domain for domain, _ in scored[:4]] or ["general"]


def _clean_text(text: str, *, max_chars: int) -> str:
    text = re.sub(r"<script.*?</script>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def _title_for(path: Path, text: str) -> str:
    for line in text.splitlines()[:20]:
        cleaned = line.strip().strip("#").strip()
        if 4 <= len(cleaned) <= 180:
            return cleaned
    return path.name


def _chunks(text: str, *, chunk_chars: int, overlap: int) -> list[str]:
    cleaned = text.strip()
    if not cleaned:
        return []
    out: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_chars)
        chunk = cleaned[start:end].strip()
        if chunk:
            out.append(chunk)
        if end >= len(cleaned):
            break
        start = max(0, end - overlap)
    return out


class GitAmigosIndex:
    def __init__(
        self,
        gits_root: str | Path | None = None,
        index_dir: str | Path | None = None,
    ) -> None:
        self.gits_root = Path(gits_root or os.environ.get("ELECTSIM_GITS_AMIGOS_ROOT", DEFAULT_GITS_ROOT)).expanduser()
        self.index_dir = Path(index_dir or os.environ.get("ELECTSIM_GITS_INDEX", DEFAULT_INDEX_DIR)).expanduser()
        if not self.gits_root.is_absolute():
            self.gits_root = (_ROOT / self.gits_root).resolve()
        if not self.index_dir.is_absolute():
            self.index_dir = (_ROOT / self.index_dir).resolve()
        self.repos_path = self.index_dir / "repositories.jsonl"
        self.documents_path = self.index_dir / "documents.jsonl"
        self.chunks_path = self.index_dir / "chunks.jsonl"
        self.manifest_path = self.index_dir / "manifest.json"
        self.index_dir.mkdir(parents=True, exist_ok=True)

    def iter_repos(self) -> list[Path]:
        if not self.gits_root.exists():
            raise FileNotFoundError(f"No existe gits amigos: {self.gits_root}")
        return sorted(p for p in self.gits_root.iterdir() if p.is_dir())

    def build(
        self,
        *,
        max_file_bytes: int = 750_000,
        max_chars_per_file: int = 80_000,
        chunk_chars: int = 1800,
        overlap: int = 180,
        max_files_per_repo: int | None = None,
        include_source: bool = True,
    ) -> IndexStats:
        repos = self.iter_repos()
        repo_rows: list[dict[str, Any]] = []
        doc_rows: list[dict[str, Any]] = []
        chunk_rows: list[dict[str, Any]] = []
        files_seen = 0
        files_indexed = 0
        files_skipped = 0
        bytes_indexed = 0
        now = _now_iso()

        for repo in repos:
            repo_file_count = 0
            repo_indexed = 0
            repo_skipped = 0
            repo_bytes = 0
            priority_files: list[str] = []
            readme_excerpt = ""
            repo_domain_counter: Counter[str] = Counter()

            for file_path in self._candidate_files(repo, include_source=include_source):
                files_seen += 1
                repo_file_count += 1
                if max_files_per_repo is not None and repo_indexed >= max_files_per_repo:
                    files_skipped += 1
                    repo_skipped += 1
                    continue

                rel_path = str(file_path.relative_to(repo))
                try:
                    stat = file_path.stat()
                except OSError:
                    files_skipped += 1
                    repo_skipped += 1
                    continue
                if stat.st_size <= 0 or stat.st_size > max_file_bytes:
                    files_skipped += 1
                    repo_skipped += 1
                    continue

                try:
                    data = file_path.read_bytes()
                except OSError:
                    files_skipped += 1
                    repo_skipped += 1
                    continue
                if not _is_probably_text(data):
                    files_skipped += 1
                    repo_skipped += 1
                    continue

                text = data.decode("utf-8", errors="ignore")
                if file_path.suffix.lower() == ".ipynb":
                    text = self._notebook_to_text(text)
                cleaned = _clean_text(text, max_chars=max_chars_per_file)
                if len(cleaned) < 20:
                    files_skipped += 1
                    repo_skipped += 1
                    continue

                domains = _detect_domains(repo.name, rel_path, cleaned[:8000])
                repo_domain_counter.update(domains)
                doc_id = _stable_id(repo.name, rel_path, _sha256_bytes(data))
                title = _title_for(file_path, text)
                doc = IndexedDocument(
                    id=doc_id,
                    repo=repo.name,
                    path=str(file_path),
                    rel_path=rel_path,
                    kind=_kind_for(file_path),
                    language=_language_for(file_path),
                    size_bytes=stat.st_size,
                    sha256=_sha256_bytes(data),
                    title=title,
                    excerpt=cleaned[:600],
                    domains=domains,
                    indexed_at=now,
                )
                doc_rows.append(asdict(doc))
                for idx, chunk_text in enumerate(_chunks(cleaned, chunk_chars=chunk_chars, overlap=overlap)):
                    toks = tokenize(f"{repo.name} {rel_path} {title} {chunk_text}")
                    chunk_rows.append(
                        asdict(
                            IndexedChunk(
                                id=_stable_id(doc_id, idx, chunk_text[:200]),
                                document_id=doc_id,
                                repo=repo.name,
                                rel_path=rel_path,
                                chunk_index=idx,
                                text=chunk_text,
                                domains=domains,
                                tokens=toks,
                            )
                        )
                    )

                if file_path.name.lower().startswith("readme") and not readme_excerpt:
                    readme_excerpt = cleaned[:1000]
                if file_path.name.lower() in PRIORITY_NAMES or file_path.name.lower().startswith("readme"):
                    priority_files.append(rel_path)

                files_indexed += 1
                repo_indexed += 1
                bytes_indexed += stat.st_size
                repo_bytes += stat.st_size

            top_domains = [name for name, _ in repo_domain_counter.most_common(5)] or _detect_domains(repo.name)
            repo_rows.append(
                asdict(
                    RepoSummary(
                        repo=repo.name,
                        path=str(repo),
                        file_count=repo_file_count,
                        indexed_files=repo_indexed,
                        skipped_files=repo_skipped,
                        bytes_indexed=repo_bytes,
                        domains=top_domains,
                        readme_excerpt=readme_excerpt,
                        priority_files=priority_files[:20],
                        updated_at=now,
                    )
                )
            )

        stats = IndexStats(
            repos_seen=len(repos),
            repos_indexed=sum(1 for row in repo_rows if int(row["indexed_files"]) > 0),
            files_seen=files_seen,
            files_indexed=files_indexed,
            files_skipped=files_skipped,
            chunks=len(chunk_rows),
            bytes_indexed=bytes_indexed,
            index_dir=str(self.index_dir),
            updated_at=now,
        )
        _write_jsonl(self.repos_path, repo_rows)
        _write_jsonl(self.documents_path, doc_rows)
        _write_jsonl(self.chunks_path, chunk_rows)
        _write_json(self.manifest_path, asdict(stats))
        return stats

    def summary(self) -> dict[str, Any]:
        manifest = {}
        if self.manifest_path.exists():
            try:
                manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                manifest = {}
        repos = _read_jsonl(self.repos_path)
        domains = Counter(domain for repo in repos for domain in (repo.get("domains") or []))
        top_repos = sorted(repos, key=lambda row: int(row.get("indexed_files") or 0), reverse=True)[:15]
        return {
            "gits_root": str(self.gits_root),
            "index_dir": str(self.index_dir),
            "manifest": manifest,
            "domains": dict(domains.most_common()),
            "top_repos": [
                {
                    "repo": row.get("repo"),
                    "indexed_files": row.get("indexed_files"),
                    "domains": row.get("domains"),
                    "priority_files": row.get("priority_files", [])[:5],
                }
                for row in top_repos
            ],
        }

    def search(self, query: str, *, k: int = 8, domain: str | None = None, repo: str | None = None) -> list[dict[str, Any]]:
        chunks = _read_jsonl(self.chunks_path)
        if domain:
            chunks = [chunk for chunk in chunks if domain in (chunk.get("domains") or [])]
        if repo:
            needle = _norm(repo)
            chunks = [chunk for chunk in chunks if needle in _norm(chunk.get("repo", ""))]
        q_tokens = tokenize(query)
        if not q_tokens or not chunks:
            return []

        total = len(chunks)
        doc_freq: Counter[str] = Counter()
        for chunk in chunks:
            doc_freq.update(set(chunk.get("tokens") or tokenize(chunk.get("text", ""))))

        scored: list[tuple[float, dict[str, Any]]] = []
        for chunk in chunks:
            tokens = chunk.get("tokens") or tokenize(chunk.get("text", ""))
            counts = Counter(tokens)
            score = 0.0
            for token in q_tokens:
                tf = counts.get(token, 0)
                if not tf:
                    continue
                idf = math.log((1 + total) / (1 + doc_freq.get(token, 0))) + 1.0
                score += (1.0 + math.log(tf)) * idf
            if score <= 0:
                continue
            text = str(chunk.get("text", ""))
            scored.append(
                (
                    score,
                    {
                        "score": round(score, 4),
                        "repo": chunk.get("repo"),
                        "rel_path": chunk.get("rel_path"),
                        "chunk_index": chunk.get("chunk_index"),
                        "domains": chunk.get("domains") or [],
                        "text": text[:1200],
                    },
                )
            )
        scored.sort(key=lambda item: item[0], reverse=True)
        return [row for _, row in scored[: max(1, int(k))]]

    def repo_inventory(self, *, domain: str | None = None, limit: int = 80) -> list[dict[str, Any]]:
        repos = _read_jsonl(self.repos_path)
        if domain:
            repos = [repo for repo in repos if domain in (repo.get("domains") or [])]
        repos.sort(key=lambda row: (int(row.get("indexed_files") or 0), int(row.get("bytes_indexed") or 0)), reverse=True)
        return repos[:limit]

    def _candidate_files(self, repo: Path, *, include_source: bool) -> Iterable[Path]:
        for dirpath, dirnames, filenames in os.walk(repo):
            dirnames[:] = [
                name
                for name in dirnames
                if name not in SKIP_DIRS and not name.startswith(".tox") and not name.startswith(".eggs")
            ]
            current = Path(dirpath)
            for filename in sorted(filenames):
                path = current / filename
                lower = filename.lower()
                suffix = path.suffix.lower()
                if lower in PRIORITY_NAMES or lower.startswith("readme"):
                    yield path
                    continue
                if not include_source and suffix not in {".md", ".rst", ".txt", ".json", ".yaml", ".yml", ".toml"}:
                    continue
                if suffix in TEXT_SUFFIXES:
                    yield path

    def _notebook_to_text(self, raw: str) -> str:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return raw
        parts: list[str] = []
        for cell in data.get("cells", []) if isinstance(data, dict) else []:
            if not isinstance(cell, dict):
                continue
            source = cell.get("source", "")
            if isinstance(source, list):
                source = "".join(str(x) for x in source)
            parts.append(str(source))
        return "\n\n".join(parts) or raw


def _cmd_build(args: argparse.Namespace) -> None:
    idx = GitAmigosIndex(args.gits_root, args.index_dir)
    stats = idx.build(
        max_file_bytes=args.max_file_bytes,
        max_chars_per_file=args.max_chars_per_file,
        chunk_chars=args.chunk_chars,
        overlap=args.overlap,
        max_files_per_repo=args.max_files_per_repo,
        include_source=not args.docs_only,
    )
    print(json.dumps(asdict(stats), ensure_ascii=False, indent=2))


def _cmd_search(args: argparse.Namespace) -> None:
    idx = GitAmigosIndex(args.gits_root, args.index_dir)
    print(json.dumps(idx.search(args.query, k=args.k, domain=args.domain, repo=args.repo), ensure_ascii=False, indent=2))


def _cmd_summary(args: argparse.Namespace) -> None:
    idx = GitAmigosIndex(args.gits_root, args.index_dir)
    print(json.dumps(idx.summary(), ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Indexa y consulta la carpeta local `gits amigos`.")
    parser.add_argument("--gits-root", default=None)
    parser.add_argument("--index-dir", default=None)
    sub = parser.add_subparsers(dest="command", required=True)

    p_build = sub.add_parser("build")
    p_build.add_argument("--max-file-bytes", type=int, default=750_000)
    p_build.add_argument("--max-chars-per-file", type=int, default=80_000)
    p_build.add_argument("--chunk-chars", type=int, default=1800)
    p_build.add_argument("--overlap", type=int, default=180)
    p_build.add_argument("--max-files-per-repo", type=int, default=None)
    p_build.add_argument("--docs-only", action="store_true")
    p_build.set_defaults(func=_cmd_build)

    p_search = sub.add_parser("search")
    p_search.add_argument("query")
    p_search.add_argument("-k", type=int, default=8)
    p_search.add_argument("--domain", default=None)
    p_search.add_argument("--repo", default=None)
    p_search.set_defaults(func=_cmd_search)

    p_summary = sub.add_parser("summary")
    p_summary.set_defaults(func=_cmd_summary)

    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
