#!/usr/bin/env bash
set -euo pipefail

# One-command bootstrap launcher for Ollama CORS proxy.
# Priority: Go first, Python fallback.

PORT="${PORT:-8080}"

run_go_proxy() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  cat >"$tmp_dir/main.go" <<'GO'
package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
)

const ollamaURL = "http://localhost:11434/api/generate"
const ollamaModelsURL = "http://localhost:11434/api/tags"

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next(w, r)
	}
}

func proxyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	resp, err := http.Post(ollamaURL, "application/json", r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Ollama unreachable: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

func modelsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET allowed", http.StatusMethodNotAllowed)
		return
	}

	resp, err := http.Get(ollamaModelsURL)
	if err != nil {
		http.Error(w, fmt.Sprintf("Ollama unreachable: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/ollama", corsMiddleware(proxyHandler))
	mux.HandleFunc("/models", corsMiddleware(modelsHandler))

	addr := fmt.Sprintf(":%s", "__PORT__")
	fmt.Printf("CORS Proxy started on http://localhost%s\n", addr)
	fmt.Println("   Forwards /ollama -> http://localhost:11434/api/generate")
	fmt.Println("   Forwards /models -> http://localhost:11434/api/tags")
	fmt.Println("   Stop with Ctrl+C")

	log.Fatal(http.ListenAndServe(addr, mux))
}
GO

  sed -i "s/__PORT__/${PORT}/g" "$tmp_dir/main.go"
  echo "[proxy] Go detected. Starting Go proxy (priority) on port ${PORT}."
  exec go run "$tmp_dir/main.go"
}

run_python_proxy() {
  local py_bin="$1"
  echo "[proxy] ${py_bin} detected. Starting Python proxy on port ${PORT}."
  PORT="${PORT}" exec "$py_bin" - <<'PY'
from __future__ import annotations

import json
import os
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODELS_URL = "http://localhost:11434/api/tags"
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8080"))


class ProxyHandler(BaseHTTPRequestHandler):
    server_version = "OllamaProxy/1.0"

    def _set_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _write_json_error(self, status: HTTPStatus, message: str) -> None:
        payload = json.dumps({"error": message}).encode("utf-8")
        self.send_response(status)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self._set_cors_headers()
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/ollama":
            self._write_json_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)
        req = Request(
            OLLAMA_URL,
            data=body,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        self._forward_request(req)

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/models":
            self._write_json_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        req = Request(OLLAMA_MODELS_URL, method="GET")
        self._forward_request(req)

    def _forward_request(self, req: Request) -> None:
        try:
            with urlopen(req, timeout=30) as resp:
                response_body = resp.read()
                status_code = resp.status
                content_type = resp.headers.get("Content-Type", "application/json")

            self.send_response(status_code)
            self._set_cors_headers()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(response_body)))
            self.end_headers()
            self.wfile.write(response_body)
        except HTTPError as err:
            error_body = err.read() if hasattr(err, "read") else b""
            self.send_response(err.code)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(error_body)))
            self.end_headers()
            if error_body:
                self.wfile.write(error_body)
        except URLError as err:
            self._write_json_error(HTTPStatus.BAD_GATEWAY, f"Ollama unreachable: {err}")
        except Exception as err:  # pylint: disable=broad-except
            self._write_json_error(HTTPStatus.INTERNAL_SERVER_ERROR, f"Unexpected error: {err}")

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))


def main() -> None:
    print(f"CORS Proxy started on http://localhost:{PORT}")
    print("   Forwards /ollama -> http://localhost:11434/api/generate")
    print("   Forwards /models -> http://localhost:11434/api/tags")
    print("   Stop with Ctrl+C")

    server = ThreadingHTTPServer((HOST, PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping proxy...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
PY
}

if command -v go >/dev/null 2>&1; then
  run_go_proxy
fi

if command -v python3 >/dev/null 2>&1; then
  run_python_proxy python3
fi

if command -v python >/dev/null 2>&1; then
  run_python_proxy python
fi

echo "[proxy] Neither Go nor Python is installed."
echo "[proxy] Install one of these runtimes and run again."
exit 1
