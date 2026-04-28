from __future__ import annotations

from agents.backend_manager import BackendManagerAgent
from agents.git_amigos_indexer import GitAmigosIndex


def test_git_amigos_index_and_manager_chat(tmp_path):
    gits = tmp_path / "gits amigos"
    repo = gits / "ollama-politics-demo"
    repo.mkdir(parents=True)
    (repo / "README.md").write_text(
        "# Ollama politics demo\n\nRAG local con Ollama para analizar scrapers electorales y noticias del Congreso.",
        encoding="utf-8",
    )
    (repo / "agent.py").write_text(
        "def build_chatbot():\n    return 'chatbot local para backend politico y economia'\n",
        encoding="utf-8",
    )

    index = GitAmigosIndex(gits_root=gits, index_dir=tmp_path / "index")
    stats = index.build(max_files_per_repo=None)
    assert stats.repos_seen == 1
    assert stats.files_indexed == 2
    assert index.search("Ollama chatbot electoral")

    manager = BackendManagerAgent(provider="stub", gits_index=index, use_llm=False)
    answer = manager.chat("¿Qué puedo usar para un chatbot local electoral?", include_project_context=False)
    assert not answer.used_llm
    assert answer.citations
    assert "ollama-politics-demo" in answer.answer
