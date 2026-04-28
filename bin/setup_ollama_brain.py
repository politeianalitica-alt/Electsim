from __future__ import annotations

import argparse
import json
from pathlib import Path

import httpx
from dotenv import dotenv_values, set_key

from setup_ollama_local import ENV_PATH, ROOT, ensure_model, ensure_ollama_installed, ensure_service_started, run


DEFAULT_BASE_MODEL = "qwen2.5:7b"
DEFAULT_BRAIN_MODEL = "politeia-brain:latest"
DEFAULT_EMBEDDING_MODEL = "nomic-embed-text"
DEFAULT_MODELFILE = ROOT / "models" / "ollama" / "Modelfile.politeia-brain"


def create_brain_model(model: str, modelfile: Path) -> None:
    if not modelfile.exists():
        raise RuntimeError(f"No existe el Modelfile: {modelfile}")
    run(["ollama", "create", model, "-f", str(modelfile)], timeout=1800)


def configure_env(model: str, embedding_model: str, *, num_ctx: int, keep_alive: str) -> None:
    if not ENV_PATH.exists():
        example = ROOT / ".env.example"
        ENV_PATH.write_text(example.read_text(encoding="utf-8") if example.exists() else "", encoding="utf-8")
    set_key(str(ENV_PATH), "ELECTSIM_LLM_PROVIDER", "ollama")
    set_key(str(ENV_PATH), "ELECTSIM_BACK_MANAGER_PROVIDER", "ollama")
    set_key(str(ENV_PATH), "OLLAMA_BASE_URL", "http://localhost:11434")
    set_key(str(ENV_PATH), "ELECTSIM_OLLAMA_MODEL", model)
    set_key(str(ENV_PATH), "ELECTSIM_OLLAMA_NUM_CTX", str(num_ctx))
    set_key(str(ENV_PATH), "ELECTSIM_OLLAMA_NUM_PREDICT", "500")
    set_key(str(ENV_PATH), "ELECTSIM_BACK_MANAGER_MAX_TOKENS", "500")
    set_key(str(ENV_PATH), "ELECTSIM_OLLAMA_KEEP_ALIVE", keep_alive)
    set_key(str(ENV_PATH), "ELECTSIM_OLLAMA_TOP_P", "0.85")
    set_key(str(ENV_PATH), "ELECTSIM_OLLAMA_REPEAT_PENALTY", "1.08")
    set_key(str(ENV_PATH), "ELECTSIM_OLLAMA_EMBEDDING_MODEL", embedding_model)


def smoke_test(model: str, *, num_ctx: int, keep_alive: str) -> dict[str, object]:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Responde en una linea cual es tu funcion como gerente local de Politeia.",
            }
        ],
        "stream": False,
        "keep_alive": keep_alive,
        "options": {"temperature": 0, "num_ctx": num_ctx, "num_predict": 160},
    }
    response = httpx.post("http://localhost:11434/api/chat", json=payload, timeout=180.0)
    response.raise_for_status()
    data = response.json()
    keys = (
        "ELECTSIM_LLM_PROVIDER",
        "ELECTSIM_BACK_MANAGER_PROVIDER",
        "OLLAMA_BASE_URL",
        "ELECTSIM_OLLAMA_MODEL",
        "ELECTSIM_OLLAMA_NUM_CTX",
        "ELECTSIM_OLLAMA_KEEP_ALIVE",
        "ELECTSIM_OLLAMA_EMBEDDING_MODEL",
    )
    return {
        "model": model,
        "reply": str(data.get("message", {}).get("content", "")).strip(),
        "env": {key: dotenv_values(ENV_PATH).get(key) for key in keys},
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prepara Ollama como cerebro local de Politeia.")
    parser.add_argument("--base-model", default=DEFAULT_BASE_MODEL)
    parser.add_argument("--brain-model", default=DEFAULT_BRAIN_MODEL)
    parser.add_argument("--embedding-model", default=DEFAULT_EMBEDDING_MODEL)
    parser.add_argument("--modelfile", type=Path, default=DEFAULT_MODELFILE)
    parser.add_argument("--num-ctx", type=int, default=8192)
    parser.add_argument("--keep-alive", default="30m")
    parser.add_argument("--skip-pull", action="store_true")
    args = parser.parse_args(argv)

    ensure_ollama_installed()
    ensure_service_started()
    if not args.skip_pull:
        ensure_model(args.base_model)
        ensure_model(args.embedding_model)
    create_brain_model(args.brain_model, args.modelfile)
    configure_env(args.brain_model, args.embedding_model, num_ctx=args.num_ctx, keep_alive=args.keep_alive)
    print(json.dumps(smoke_test(args.brain_model, num_ctx=args.num_ctx, keep_alive=args.keep_alive), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
