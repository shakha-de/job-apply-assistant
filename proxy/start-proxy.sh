#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

run_go() {
  if command -v go >/dev/null 2>&1; then
    echo "[proxy] Go detected. Starting Go proxy (priority)."
    exec go run main.go
  fi
}

run_python() {
  if command -v python3 >/dev/null 2>&1; then
    echo "[proxy] Python3 detected. Starting Python proxy."
    exec python3 main.py
  fi

  if command -v python >/dev/null 2>&1; then
    echo "[proxy] Python detected. Starting Python proxy."
    exec python main.py
  fi
}

run_go
run_python

echo "[proxy] Neither Go nor Python is installed."
echo "[proxy] Install one of these runtimes to start the proxy server."
exit 1
