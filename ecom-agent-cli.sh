#!/bin/bash
# OpenClaw E-Commerce Agent Manager

PM2="./discord-bridge/node_modules/.bin/pm2"
OUTPUT_DIR="/home/friends7777wolfs/OpenClawMaster/ecommerce-outputs"

case "$1" in
  status)
    echo "=== E-Commerce Agents Status ==="
    $PM2 describe ecom-agents | grep -E "status|pid|uptime|restarts"
    echo ""
    echo "=== Latest Outputs ==="
    ls -lt $OUTPUT_DIR/*.json 2>/dev/null | head -10
    ;;
  logs)
    $PM2 logs ecom-agents --lines 50
    ;;
  latest)
    echo "=== Latest Agent Results ==="
    for f in $(ls -t $OUTPUT_DIR/*.json 2>/dev/null | head -7); do
      echo "---"
      cat "$f" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Agent: {d[\"agentName\"]}')
print(f'Shop: {d[\"shop\"]}')
print(f'Time: {d[\"timestamp\"]}')
print(f'Preview: {d[\"result\"][:300]}...')
"
    done
    ;;
  force)
    echo "Force running all agents..."
    rm -f /home/friends7777wolfs/OpenClawMaster/ecommerce-agent-state.json
    $PM2 restart ecom-agents
    sleep 3
    $PM2 logs ecom-agents --lines 20 --nostream
    ;;
  *)
    echo "Usage: $0 {status|logs|latest|force}"
    ;;
esac
