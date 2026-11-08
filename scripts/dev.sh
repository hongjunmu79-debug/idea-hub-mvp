#!/usr/bin/env bash
set -euo pipefail

if [[ -x ".venv/bin/uvicorn" ]]; then
  api_command=(".venv/bin/uvicorn")
else
  api_command=("python3" "-m" "uvicorn")
fi

"${api_command[@]}" server.app:app --reload --reload-dir server --host 0.0.0.0 --port 8000 &
wandernote_api_pid=$!
npm --prefix web run dev &
wandernote_web_pid=$!

cleanup() {
  kill "$wandernote_api_pid" "$wandernote_web_pid" 2>/dev/null || true
  wait "$wandernote_api_pid" "$wandernote_web_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait -n "$wandernote_api_pid" "$wandernote_web_pid"
