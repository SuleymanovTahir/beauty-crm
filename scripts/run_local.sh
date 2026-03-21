#!/usr/bin/env bash

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-crm}"

BACKEND_WORKERS="${BACKEND_WORKERS:-1}"
BACKEND_THREAD_POOL_WORKERS="${BACKEND_THREAD_POOL_WORKERS:-8}"
BACKEND_RELOAD="${BACKEND_RELOAD:-false}"

declare -a PIDS=()
declare -i CLEANUP_DONE=0

print_usage() {
  cat <<EOF
Usage:
  bash ${ROOT_DIR}/scripts/run_local.sh [crm]

Modes:
  crm   Start only crm backend + crm frontend

Optional env overrides:
  BACKEND_WORKERS=${BACKEND_WORKERS}
  BACKEND_THREAD_POOL_WORKERS=${BACKEND_THREAD_POOL_WORKERS}
  BACKEND_RELOAD=${BACKEND_RELOAD}
EOF
}

cleanup() {
  local status="${1:-0}"

  if [[ "${CLEANUP_DONE}" -eq 1 ]]; then
    return
  fi

  CLEANUP_DONE=1
  trap - INT TERM EXIT

  if [[ "${#PIDS[@]}" -gt 0 ]]; then
    echo "[run_local] stopping ${#PIDS[@]} process(es)"
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi

  exit "${status}"
}

trap 'cleanup 130' INT TERM
trap 'cleanup $?' EXIT

start_backend() {
  local label="$1"
  local dir="$2"

  if [[ ! -f "${dir}/venv/bin/activate" ]]; then
    echo "[run_local] missing venv: ${dir}/venv/bin/activate" >&2
    cleanup 1
  fi

  echo "[run_local] starting ${label}"
  (
    cd "${dir}" || exit 1
    # shellcheck disable=SC1091
    source venv/bin/activate
    export BACKEND_WORKERS
    export BACKEND_THREAD_POOL_WORKERS
    export BACKEND_RELOAD
    exec python3 main.py
  ) &
  PIDS+=("$!")
}

start_frontend() {
  local label="$1"
  local dir="$2"

  if [[ ! -f "${dir}/package.json" ]]; then
    echo "[run_local] missing package.json: ${dir}/package.json" >&2
    cleanup 1
  fi

  echo "[run_local] starting ${label}"
  (
    cd "${dir}" || exit 1
    exec npm run dev
  ) &
  PIDS+=("$!")
}

start_crm() {
  start_backend "crm-backend" "${ROOT_DIR}/crm/backend"
  start_frontend "crm-frontend" "${ROOT_DIR}/crm/frontend"
}

case "${MODE}" in
  all|site|crm)
    if [[ "${MODE}" != "crm" ]]; then
      echo "[run_local] mode '${MODE}' is deprecated, switching to 'crm'"
    fi
    MODE="crm"
    start_crm
    ;;
  help|--help|-h)
    print_usage
    cleanup 0
    ;;
  *)
    echo "[run_local] unknown mode: ${MODE}" >&2
    print_usage >&2
    cleanup 1
    ;;
esac

echo "[run_local] mode=${MODE}"
echo "[run_local] BACKEND_WORKERS=${BACKEND_WORKERS} BACKEND_THREAD_POOL_WORKERS=${BACKEND_THREAD_POOL_WORKERS} BACKEND_RELOAD=${BACKEND_RELOAD}"
echo "[run_local] press Ctrl+C to stop all started processes"

wait
