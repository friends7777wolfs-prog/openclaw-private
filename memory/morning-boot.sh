#!/bin/bash
echo "🌅 OpenClaw Morning Boot — $(date '+%Y-%m-%d %H:%M')"
cd ~/OpenClawMaster

bash memory/gen-git-context.sh

echo ""
echo "═══════════════════ CLAUDE.md Status ═══════════════════"
head -5 CLAUDE.md
echo "..."
grep -E "^\- \[" CLAUDE.md | head -10   # open issues
echo "═══════════════════════════════════════════════════════"
echo ""
