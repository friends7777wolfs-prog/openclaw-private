#!/bin/bash
cd ~/OpenClawMaster
OUT="memory/git-context.md"

echo "# 🔀 Git Context (auto-generated $(date '+%Y-%m-%d %H:%M'))" > "$OUT"
echo "" >> "$OUT"

echo "## Branch" >> "$OUT"
git rev-parse --abbrev-ref HEAD 2>/dev/null >> "$OUT" || echo "unknown" >> "$OUT"

echo "" >> "$OUT"
echo "## Last 5 Commits" >> "$OUT"
git log --oneline -5 2>/dev/null >> "$OUT" || echo "(no commits)" >> "$OUT"

echo "" >> "$OUT"
echo "## Recently Changed Files (last 3 commits)" >> "$OUT"
git diff --name-only HEAD~3 HEAD 2>/dev/null >> "$OUT" || echo "(none)" >> "$OUT"

echo "" >> "$OUT"
echo "## Uncommitted Changes" >> "$OUT"
git status --short 2>/dev/null >> "$OUT" || echo "(clean)" >> "$OUT"

echo "✅ git-context.md refreshed"
