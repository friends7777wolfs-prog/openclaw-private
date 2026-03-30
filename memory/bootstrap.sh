#!/bin/bash
cd ~/OpenClawMaster

echo "🚀 OpenClaw Memory Bootstrap..."

# רענון git context
bash memory/gen-git-context.sh

# הדפס summary
echo ""
echo "═══════════════════════════════════"
echo "📋 PRIMER:"
grep -A1 "next_step\|completed\|blockers" memory/primer.md | grep -v "update:" | grep -v "^--$"
echo ""
echo "🔀 GIT:"
head -15 memory/git-context.md | tail -10
echo "═══════════════════════════════════"
echo "✅ Memory loaded. Claude is context-aware."
