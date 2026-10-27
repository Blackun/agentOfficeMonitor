#!/usr/bin/env bash
set -euo pipefail

# Agent Office Monitor - Podman Container Service Script
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="${IMAGE_NAME:-agent-office-monitor:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-agent-office-monitor}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-5173}"
URL="http://${HOST}:${PORT}"

AGY_HOST_DIR="${HOME}/.gemini/antigravity/brain"
CLAUDE_HOST_DIR="${HOME}/.claude/projects"
CONFIG_FILE="${APP_DIR}/.office-config.json"

is_running() {
  podman ps --filter "name=^${CONTAINER_NAME}$" --format "{{.Names}}" 2>/dev/null | grep -q "^${CONTAINER_NAME}$"
}

container_exists() {
  podman ps -a --filter "name=^${CONTAINER_NAME}$" --format "{{.Names}}" 2>/dev/null | grep -q "^${CONTAINER_NAME}$"
}

image_exists() {
  podman image exists "$IMAGE_NAME" 2>/dev/null
}

cmd_build() {
  echo "🐳 Podman 이미지를 빌드합니다 ($IMAGE_NAME)..."
  cd "$APP_DIR"
  podman build -t "$IMAGE_NAME" -f Containerfile .
  echo "✅ 이미지 빌드 완료: $IMAGE_NAME"
}

cmd_start() {
  local flag="${1:-}"

  if [[ "$flag" == "--build" ]] || [[ "$flag" == "-b" ]] || ! image_exists; then
    cmd_build
    if container_exists; then
      podman rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
    fi
  fi

  if is_running; then
    echo "✅ Podman 컨테이너($CONTAINER_NAME)가 이미 실행 중입니다! ($URL)"
    return 0
  fi

  if container_exists; then
    podman rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi

  # 호스트 로그 폴더 및 설정 파일 준비 (마운트 오류 방지)
  mkdir -p "$AGY_HOST_DIR" "$CLAUDE_HOST_DIR"
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo '{}' > "$CONFIG_FILE"
  fi

  echo "🚀 Podman 컨테이너($CONTAINER_NAME)를 시작합니다 ($URL)..."
  podman run -d \
    --name "$CONTAINER_NAME" \
    -p "${HOST}:${PORT}:5173" \
    -v "${AGY_HOST_DIR}:/root/.gemini/antigravity/brain:ro" \
    -v "${CLAUDE_HOST_DIR}:/root/.claude/projects:ro" \
    -v "${CONFIG_FILE}:/app/.office-config.json:rw" \
    "$IMAGE_NAME" >/dev/null

  echo "✅ Podman 컨테이너가 시작되었습니다!"
  echo "   • 컨테이너: $CONTAINER_NAME"
  echo "   • 이미지  : $IMAGE_NAME"
  echo "   • 접속 URL: $URL"
  echo "   • 마운트  : ~/.gemini/antigravity/brain (RO), ~/.claude/projects (RO)"
}

cmd_stop() {
  if container_exists; then
    echo "🛑 Podman 컨테이너($CONTAINER_NAME)를 종료 및 정리합니다..."
    podman rm -f "$CONTAINER_NAME" >/dev/null
    echo "✅ 컨테이너가 정상적으로 종료되었습니다."
  else
    echo "ℹ️  현재 실행 중인 $CONTAINER_NAME 컨테이너가 없습니다."
  fi
}

cmd_status() {
  if is_running; then
    echo "🟢 RUNNING -> $URL"
    podman ps --filter "name=^${CONTAINER_NAME}$"
  elif container_exists; then
    echo "🟡 STOPPED (컨테이너 존재)"
    podman ps -a --filter "name=^${CONTAINER_NAME}$"
  else
    echo "⚪ NOT RUNNING"
  fi
}

cmd_logs() {
  if container_exists; then
    podman logs -f "$CONTAINER_NAME"
  else
    echo "ℹ️  실행 중인 $CONTAINER_NAME 컨테이너가 없습니다."
  fi
}

ACTION="${1:-help}"
case "$ACTION" in
  build)
    cmd_build
    ;;
  start)
    cmd_start "${2:-}"
    ;;
  stop)
    cmd_stop
    ;;
  restart)
    cmd_stop
    cmd_start "${2:-}"
    ;;
  status)
    cmd_status
    ;;
  logs)
    cmd_logs
    ;;
  *)
    echo "사용법: ./office-monitor.sh {build|start|stop|restart|status|logs} [--build]"
    echo ""
    echo "명령어:"
    echo "  build            Podman 이미지($IMAGE_NAME) 빌드"
    echo "  start [--build]  Podman 컨테이너 시작 (이미지가 없거나 --build 지정 시 자동 빌드)"
    echo "  stop             실행 중인 Podman 컨테이너 중지 및 제거"
    echo "  restart [--build]컨테이너 재시작 (--build 지정 시 이미지 재빌드 포함)"
    echo "  status           Podman 컨테이너 상태 확인"
    echo "  logs             실시간 컨테이너 로그 보기"
    exit 1
    ;;
esac
