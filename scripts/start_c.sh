#!/usr/bin/env bash
# Starts the backend (FastAPI/uvicorn) and frontend (Vite) dev servers.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
mkdir -p "$RUN_DIR"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

# --- Backend ---
if is_running "$BACKEND_PID_FILE"; then
  echo "Backend already running (PID $(cat "$BACKEND_PID_FILE"))"
else
  cd "$ROOT_DIR/backend"

  if [[ ! -d "$ROOT_DIR/.venv" ]]; then
    # pydantic-core (a FastAPI dep) fails to build from source on Python 3.14+
    # (PyO3 caps out at 3.13), so prefer the newest compatible interpreter.
    PYTHON_BIN=""
    for candidate in python3.13 python3.12 python3.11 python3; do
      if command -v "$candidate" >/dev/null 2>&1; then
        ver="$("$candidate" -c 'import sys; print(sys.version_info[:2])')"
        major="$("$candidate" -c 'import sys; print(sys.version_info[0])')"
        minor="$("$candidate" -c 'import sys; print(sys.version_info[1])')"
        if [[ "$major" -eq 3 && "$minor" -le 13 ]]; then
          PYTHON_BIN="$candidate"
          break
        fi
      fi
    done
    if [[ -z "$PYTHON_BIN" ]]; then
      echo "No compatible Python (<=3.13) found. Install one, e.g. 'brew install python@3.12'." >&2
      exit 1
    fi
    echo "Creating virtualenv with $PYTHON_BIN..."
    "$PYTHON_BIN" -m venv "$ROOT_DIR/.venv"
  fi
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.venv/bin/activate"

  if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing backend dependencies..."
    pip install -q -r requirements-dev.txt
  fi

  if [[ ! -f "$ROOT_DIR/.env" && -f "$ROOT_DIR/.env.example" ]]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  fi

  echo "Starting backend..."
  nohup uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 \
    > "$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
  deactivate
  cd "$ROOT_DIR"
  echo "Backend started (PID $(cat "$BACKEND_PID_FILE")) — http://127.0.0.1:8000/api/docs"
fi

# --- Frontend ---
if is_running "$FRONTEND_PID_FILE"; then
  echo "Frontend already running (PID $(cat "$FRONTEND_PID_FILE"))"
else
  cd "$ROOT_DIR/frontend"

  if [[ ! -d node_modules ]]; then
    echo "Installing frontend dependencies..."
    npm install
  fi

  echo "Starting frontend..."
  nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  cd "$ROOT_DIR"
  echo "Frontend started (PID $(cat "$FRONTEND_PID_FILE")) — http://127.0.0.1:5173"
fi

echo "Logs: $BACKEND_LOG , $FRONTEND_LOG"
