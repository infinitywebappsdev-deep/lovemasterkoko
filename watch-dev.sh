#!/bin/bash
# Watchdog: keeps the Next.js dev server on :3000 alive.
# Restarts it within ~10s if the process dies or the port goes dark.
cd "$(dirname "$0")"

while true; do
  if ss -ltn 2>/dev/null | grep -q ':3000'; then
    # Server is listening — also refresh the recorded pid if stale
    if [ ! -f dev.pid ] || ! kill -0 "$(cat dev.pid)" 2>/dev/null; then
      PID=$(ss -ltnp 2>/dev/null | grep ':3000' | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
      [ -n "$PID" ] && echo "$PID" > dev.pid
    fi
  else
    echo "[watch-dev] $(date '+%H:%M:%S') port 3000 dark — restarting next dev" >> dev.log
    nohup node node_modules/.bin/next dev -H 0.0.0.0 -p 3000 >> dev.log 2>&1 &
    echo $! > dev.pid
    sleep 5
  fi
  sleep 10
done
