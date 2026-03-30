#!/bin/bash
# הרץ: bash memory/consolidate.sh "שם המשימה שהושלמה"
# מבצע Memory Consolidation — מחליף CLAUDE.md בגרסה עדכנית

TASK="${1:-general update}"
DATE=$(date '+%Y-%m-%d %H:%M')

echo "🧠 Memory Consolidation: $TASK"
echo "📅 $DATE"

# גיבוי CLAUDE.md הקיים
cp ~/OpenClawMaster/CLAUDE.md ~/OpenClawMaster/memory/CLAUDE.md.bak

echo "✅ Backup saved to memory/CLAUDE.md.bak"
echo "🔄 Now run: bash memory/write-claude.sh"
