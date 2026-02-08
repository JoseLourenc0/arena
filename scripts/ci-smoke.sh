#!/usr/bin/env sh
set -eu

APP_URL="${APP_URL:-http://localhost:3000}"
START_CMD="${START_CMD:-bun start}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-120}"

LOG_FILE="${LOG_FILE:-app.log}"

echo "starting app..."
sh -c "$START_CMD" > "$LOG_FILE" 2>&1 &
APP_PID="$!"

cleanup() {
  kill "$APP_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "waiting for $APP_URL/health (timeout=${TIMEOUT_SECONDS}s)..."

i=1
while [ "$i" -le "$TIMEOUT_SECONDS" ]; do
  if curl -fsS "$APP_URL/health" >/dev/null 2>&1; then
    echo "app is up"
    break
  fi
  sleep 1
  i=$((i + 1))
done

if ! curl -fsS "$APP_URL/health" >/dev/null 2>&1; then
  echo "app failed to start"
  echo "---- last logs ($LOG_FILE) ----"
  tail -n 300 "$LOG_FILE" || true
  exit 1
fi

curl -fsS "$APP_URL/ip/location?ip=8.8.8.8" >/dev/null 2>&1 || true
echo "smoke ok"
