#!/bin/bash
# שימוש: bash memory/add-hindsight.sh "works" "גילינו ש-X עובד כי Y"
# או:     bash memory/add-hindsight.sh "anti" "אל תעשה X כי Y"

TYPE="${1:-session}"
LESSON="${2:-no lesson provided}"
DATE=$(date '+%Y-%m-%d')
FILE="$(dirname "$0")/hindsight.md"

case "$TYPE" in
  works)  echo "- ✅ [$DATE] $LESSON" >> "$FILE" ;;
  anti)   echo "- ❌ [$DATE] $LESSON" >> "$FILE" ;;
  tune)   echo "- 💡 [$DATE] $LESSON" >> "$FILE" ;;
  *)      echo "- 📅 [$DATE] $LESSON" >> "$FILE" ;;
esac

echo "✅ hindsight updated: [$TYPE] $LESSON"
