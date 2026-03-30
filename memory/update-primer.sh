#!/bin/bash
# הרץ אחרי כל משימה: bash memory/update-primer.sh "מה הושלם" "מה הבא" "חסימות"

COMPLETED="${1:-לא צוין}"
NEXT="${2:-המשך מהקודם}"
BLOCKERS="${3:-אין}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

PRIMER="$(dirname "$0")/primer.md"

# עדכון שדות
sed -i "s|<!-- update: completed -->.*|<!-- update: completed -->|" "$PRIMER"
sed -i "/<!-- update: completed -->/{ n; s|.*|- ✅ $COMPLETED| }" "$PRIMER"

sed -i "/<!-- update: next_step -->/{ n; s|.*|- $NEXT| }" "$PRIMER"
sed -i "/<!-- update: blockers -->/{ n; s|.*|- $BLOCKERS| }" "$PRIMER"
sed -i "/<!-- update: timestamp -->/{ n; s|.*|$TIMESTAMP| }" "$PRIMER"

echo "✅ primer.md updated at $TIMESTAMP"
