#!/bin/bash
# Poetry Tool — one-click dev startup

echo ""
echo " ========================================"
echo "  Poetry Tool (诗词填写工具)"
echo "  Server :3001  |  Frontend :5174"
echo " ========================================"
echo ""

DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping all services..."
  kill $SERVER_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "[1/2] Starting Express server on :3001 ..."
cd "$DIR/server"
node app.js &
SERVER_PID=$!

echo "[2/2] Starting Vite dev server on :5174 ..."
cd "$DIR/tool"
echo ""
echo "Open http://localhost:5174"
echo "Press Ctrl+C to stop"
echo ""

npm run dev

cleanup
