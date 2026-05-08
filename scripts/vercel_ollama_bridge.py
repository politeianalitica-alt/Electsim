#!/usr/bin/env python3
"""Expose the local ElectSim API + Ollama stack to the linked Vercel project.

The deployed Next.js app cannot call http://localhost on this Mac. This helper
starts the local backend, opens a public tunnel to it, and writes that tunnel URL
to Vercel as POLITEIA_API_URL.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
WEB_DIR = ROOT / "apps" / "web"
PYTHON = ROOT / ".venv" / "bin" / "python"
DEFAULT_MODEL = "politeia-brain:latest"
DEFAULT_EMBED_MODEL = "nomic-embed-text"


def log(message: str) -> None:
    print(f"[bridge] {message}", flush=True)


def run(cmd: list[str], *, cwd: Path = ROOT, env: dict[str, str] | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    log("$ " + " ".join(cmd))
    return subprocess.run(
        cmd,
        cwd=str(cwd),
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=check,
    )


def url_ok(url: str, timeout_s: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout_s) as resp:
            return 200 <= resp.status < 500
    except Exception:
        return False


def json_get(url: str, timeout_s: float = 5.0) -> dict:
    with urllib.request.urlopen(url, timeout=timeout_s) as resp:
        return json.loads(resp.read().decode("utf-8"))


def wait_url(url: str, *, label: str, timeout_s: int = 60) -> None:
    started = time.time()
    while time.time() - started < timeout_s:
        if url_ok(url):
            log(f"{label} OK: {url}")
            return
        time.sleep(1)
    raise RuntimeError(f"{label} no responde en {url}")


def spawn(cmd: list[str], *, cwd: Path = ROOT, env: dict[str, str] | None = None) -> subprocess.Popen[str]:
    log("$ " + " ".join(cmd))
    return subprocess.Popen(
        cmd,
        cwd=str(cwd),
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
    )


def terminate_all(processes: Iterable[subprocess.Popen[str]]) -> None:
    for proc in processes:
        if proc.poll() is None:
            proc.send_signal(signal.SIGTERM)
    time.sleep(1)
    for proc in processes:
        if proc.poll() is None:
            proc.kill()


def ensure_docker_postgres(skip: bool) -> None:
    if skip:
        return
    if not shutil.which("docker"):
        log("Docker no encontrado; salto Postgres Docker.")
        return
    try:
        run(["docker", "compose", "up", "-d", "postgres"], check=False)
    except Exception as exc:
        log(f"No se pudo arrancar Postgres con Docker Compose: {exc}")


def ensure_ollama(model: str, embed_model: str, pull: bool) -> subprocess.Popen[str] | None:
    if not shutil.which("ollama"):
        raise RuntimeError("Ollama no esta instalado o no esta en PATH.")

    proc: subprocess.Popen[str] | None = None
    if not url_ok("http://127.0.0.1:11434/api/tags"):
        proc = spawn(["ollama", "serve"])
        wait_url("http://127.0.0.1:11434/api/tags", label="Ollama", timeout_s=40)
    else:
        log("Ollama ya esta activo.")

    tags = json_get("http://127.0.0.1:11434/api/tags")
    installed = {m.get("name") for m in tags.get("models", [])}
    missing = [name for name in (model, embed_model) if name and name not in installed]
    if missing and pull:
        for name in missing:
            run(["ollama", "pull", name], check=True)
    elif missing:
        log("Modelos no encontrados: " + ", ".join(missing))
        log("Ejecuta con --pull-models o instala: " + " && ".join(f"ollama pull {m}" for m in missing))

    return proc


def start_api(port: int, frontend_url: str | None) -> subprocess.Popen[str] | None:
    health_url = f"http://127.0.0.1:{port}/health"
    if url_ok(health_url):
        log(f"API ya activa en {health_url}")
        return None

    if not PYTHON.exists():
        raise RuntimeError(f"No existe el Python del virtualenv: {PYTHON}")

    env = os.environ.copy()
    env.setdefault("ELECTSIM_LLM_PROVIDER", "ollama")
    env.setdefault("ELECTSIM_OLLAMA_MODEL", DEFAULT_MODEL)
    env.setdefault("ELECTSIM_OLLAMA_EMBEDDING_MODEL", DEFAULT_EMBED_MODEL)
    env.setdefault("ELECTSIM_AI_EMBEDDING_BACKEND", "ollama")
    if frontend_url:
        env["FRONTEND_URL"] = frontend_url

    proc = spawn(
        [
            str(PYTHON),
            "-m",
            "uvicorn",
            "api.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        env=env,
    )
    wait_url(health_url, label="ElectSim API", timeout_s=80)
    return proc


def start_tunnel(port: int) -> tuple[str, subprocess.Popen[str]]:
    if shutil.which("cloudflared"):
        proc = spawn(["cloudflared", "tunnel", "--url", f"http://127.0.0.1:{port}"])
        pattern = re.compile(r"https://[a-zA-Z0-9.-]+\.trycloudflare\.com")
    else:
        log("cloudflared no encontrado; uso localtunnel via npx como fallback.")
        proc = spawn(["npx", "-y", "localtunnel", "--port", str(port), "--local-host", "127.0.0.1"])
        pattern = re.compile(r"https://[a-zA-Z0-9.-]+\.loca\.lt")

    started = time.time()
    lines: list[str] = []
    assert proc.stdout is not None
    while time.time() - started < 90:
        line = proc.stdout.readline()
        if not line:
            if proc.poll() is not None:
                raise RuntimeError("El tunel termino antes de publicar URL:\n" + "".join(lines[-20:]))
            time.sleep(0.2)
            continue
        print(line, end="")
        lines.append(line)
        match = pattern.search(line)
        if match:
            tunnel_url = match.group(0).rstrip("/")
            wait_url(f"{tunnel_url}/health", label="Tunel API", timeout_s=60)
            return tunnel_url, proc
    raise RuntimeError("No pude detectar la URL publica del tunel.")


def vercel_env_set(name: str, value: str, targets: list[str]) -> None:
    if not (WEB_DIR / ".vercel" / "project.json").exists():
        raise RuntimeError("apps/web no esta vinculado a Vercel. Ejecuta primero: npx vercel link")

    for target in targets:
        run(["npx", "vercel", "env", "rm", name, target, "-y"], cwd=WEB_DIR, check=False)
        proc = subprocess.run(
            ["npx", "vercel", "env", "add", name, target],
            cwd=str(WEB_DIR),
            input=value + "\n",
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        print(proc.stdout)
        if proc.returncode != 0:
            raise RuntimeError(f"No pude actualizar {name} en Vercel ({target}).")


def deploy(prod: bool) -> None:
    cmd = ["npx", "vercel"]
    if prod:
        cmd.append("--prod")
    result = run(cmd, cwd=WEB_DIR, check=False)
    print(result.stdout)
    if result.returncode != 0:
        raise RuntimeError("El deploy de Vercel fallo.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Conecta Vercel online con la API local ElectSim + Ollama.")
    parser.add_argument("--port", type=int, default=8000, help="Puerto local de FastAPI.")
    parser.add_argument("--model", default=os.getenv("ELECTSIM_OLLAMA_MODEL", DEFAULT_MODEL))
    parser.add_argument("--embed-model", default=os.getenv("ELECTSIM_OLLAMA_EMBEDDING_MODEL", DEFAULT_EMBED_MODEL))
    parser.add_argument("--pull-models", action="store_true", help="Descarga modelos Ollama si faltan.")
    parser.add_argument("--no-docker", action="store_true", help="No intenta arrancar Postgres con Docker Compose.")
    parser.add_argument("--frontend-url", default=os.getenv("FRONTEND_URL"), help="URL publica del frontend para CORS local.")
    parser.add_argument("--vercel-env", action="store_true", help="Actualiza POLITEIA_API_URL en Vercel.")
    parser.add_argument("--targets", default="production,preview,development", help="Entornos Vercel separados por coma.")
    parser.add_argument("--deploy", action="store_true", help="Despliega en Vercel tras actualizar env.")
    parser.add_argument("--prod", action="store_true", help="Si --deploy, despliega a produccion.")
    args = parser.parse_args()

    processes: list[subprocess.Popen[str]] = []
    try:
        ensure_docker_postgres(args.no_docker)
        ollama_proc = ensure_ollama(args.model, args.embed_model, args.pull_models)
        if ollama_proc:
            processes.append(ollama_proc)

        api_proc = start_api(args.port, args.frontend_url)
        if api_proc:
            processes.append(api_proc)

        tunnel_url, tunnel_proc = start_tunnel(args.port)
        processes.append(tunnel_proc)

        log(f"URL publica API: {tunnel_url}")
        log(f"Estado IA: {tunnel_url}/ai/engine/status")

        if args.vercel_env:
            targets = [t.strip() for t in args.targets.split(",") if t.strip()]
            vercel_env_set("POLITEIA_API_URL", tunnel_url, targets)
            log("Vercel actualizado: POLITEIA_API_URL=" + tunnel_url)

        if args.deploy:
            deploy(args.prod)

        log("Bridge activo. Deja esta terminal abierta mientras uses Vercel online con Ollama local.")
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        log("Cerrando bridge...")
        return 0
    except Exception as exc:
        log(f"ERROR: {exc}")
        return 1
    finally:
        terminate_all(processes)


if __name__ == "__main__":
    raise SystemExit(main())
