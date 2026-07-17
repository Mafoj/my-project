#!/usr/bin/env bash
# Stops the backend and frontend dev servers started by start_c.sh.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

stop_process() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$name is not running (no PID file)"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"

  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null
    for _ in $(seq 1 10); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.5
    done
    if kill -0 "$pid" 2>/dev/null; then
      echo "$name (PID $pid) did not stop in time, sending SIGKILL"
      kill -9 "$pid" 2>/dev/null
    fi
    echo "$name (PID $pid) stopped"
  else
    echo "$name PID file present but process not running"
  fi

  rm -f "$pid_file"
}

stop_process "Backend" "$BACKEND_PID_FILE"
stop_process "Frontend" "$FRONTEND_PID_FILE"
