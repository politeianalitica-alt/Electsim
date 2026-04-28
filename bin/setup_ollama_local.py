from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import httpx
from dotenv import dotenv_values, set_key


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"


def run(cmd: list[str], *, check: bool = True, timeout: int | None = None) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, timeout=timeout, check=False)
    if check and proc.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        )
    return proc


def ensure_ollama_installed() -> None:
    if shutil.which("ollama"):
        return
    if not shutil.which("brew"):
        raise RuntimeError("Ollama no está instalado y Homebrew no está disponible.")
    run(["brew", "install", "ollama"], timeout=1800)


def ensure_service_started() -> None:
    if shutil.which("brew"):
        run(["brew", "services", "start", "ollama"], check=False, timeout=120)
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            r = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
            if r.status_code == 200:
                return
        except httpx.HTTPError:
            time.sleep(1)
    raise RuntimeError("Ollama instalado pero no responde en http://localhost:11434")


def ensure_model(model: str) -> None:
    tags = httpx.get("http://localhost:11434/api/tags", timeout=10.0).json()
    names = {item.get("name") for item in tags.get("models", [])}
    if model in names:
        return
    run(["ollama", "pull", model], timeout=3600)


def configure_env(model: str) -> None:
    if not ENV_PATH.exists():
        example = ROOT / ".env.example"
        if example.exists():
            ENV_PATH.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
        else:
            ENV_PATH.write_text("", encoding="utf-8")
    set_key(str(ENV_PATH), "ELECTSIM_LLM_PROVIDER", "ollama")
    set_key(str(ENV_PATH), "ELECTSIM_BACK_MANAGER_PROVIDER", "ollama")
    set_key(str(ENV_PATH), "OLLAMA_BASE_URL", "http://localhost:11434")
    set_key(str(ENV_PATH), "ELECTSIM_OLLAMA_MODEL", model)


def smoke_test(model: str) -> dict[str, object]:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Responde solo OK"}],
        "stream": False,
        "options": {"temperature": 0},
    }
    response = httpx.post("http://localhost:11434/api/chat", json=payload, timeout=120.0)
    response.raise_for_status()
    data = response.json()
    return {
        "model": model,
        "reply": str(data.get("message", {}).get("content", "")).strip(),
        "env": {
            key: dotenv_values(ENV_PATH).get(key)
            for key in ("ELECTSIM_LLM_PROVIDER", "ELECTSIM_BACK_MANAGER_PROVIDER", "OLLAMA_BASE_URL", "ELECTSIM_OLLAMA_MODEL")
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Instala, arranca y verifica Ollama para Politeia local.")
    parser.add_argument("--model", default="llama3.2:3b")
    args = parser.parse_args(argv)

    ensure_ollama_installed()
    ensure_service_started()
    ensure_model(args.model)
    configure_env(args.model)
    print(json.dumps(smoke_test(args.model), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
