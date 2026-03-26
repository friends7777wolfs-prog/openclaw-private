
# 🦞 OpenClaw — System Context for Claude

## מה המערכת

מערכת אוטומטית לניהול מסחר ודרופשיפינג עם AI.

שרת: Google Cloud | IP: 34.31.6.152 | User: friends7777wolfs

## Processes רצים (PM2)

- discord-bridge — קורא 22 ערוצי דיסקורד → סיגנלים → MT5

- tg-userbot — קורא 29 ערוצי טלגרם → אותו pipeline

- tg-bot — בוט טלגרם אינטראקטיבי (/stats /pnl /signals)

- reporter — דוח יומי 21:00 + שבועי ראשון 09:00

- intelligence — AI analyst, ניתוח כל 30 דקות

- self-improve — סריקה כל שעה, תיקונים אוטומטיים

## Pipeline סיגנלים

Discord/Telegram → Pre-filter keywords → Claude Haiku → Asset Detection → Risk Manager → MT5 via MetaAPI → Telegram alert

## Risk Management

- ברירת מחדל: 0.5% לערוץ חדש

- טווח: 0.01% - 1.5% לפי win rate

- daily limit: 4.5% הפסד יומי מקסימום

- MACD monitor: צמצום 25% + SL לBreakEven כשמומנטום נחלש

## Asset Mapping

- MNQ/NQ/USD@24000 → NAS100

- MGC/GC/XAUUSD → XAUUSD

- ES → SP500

- BTC → BTCUSD

## טלגרם

- Bot Token: ב-.env

- Chat ID קבוצה: -5068943005

- Userbot: Orikn555 (29 ערוצים)

## שירותים מחוברים

- MetaAPI: חשבון דמו MT5, Account ID: e7cf4bf5...

- Anthropic API: Claude Haiku לסיגנלים, Sonnet לאנליזה

- Discord selfbot: oriki555hila949 (22 ערוצים)

- Shopify: neu8888tral + pelegadolll

- YouTube: COCOHAVANNA channel

## קבצים חשובים

- discord-bridge/bridge.js — ראשי

- discord-bridge/trader.js — MT5 execution

- discord-bridge/risk_manager.js — משקולות

- discord-bridge/asset_detector.js — זיהוי נכסים

- discord-bridge/macd_monitor.js — MACD צמצום

- intelligence/engine.js — AI analyst

- self-improve/engine.js — שיפור עצמי

## בעיות ידועות

- Currency=USD צריך להיות מזוהה לפי מחיר

- MetaAPI לפעמים timeout בחיבור ראשוני

- dotenv טוען 0 vars בחלק מהמודולים

## פקודות שימושיות

\`\`\`bash

cd ~/OpenClawMaster/discord-bridge

./node_modules/.bin/pm2 status

./node_modules/.bin/pm2 logs --lines 30

./node_modules/.bin/pm2 restart all

\`\`\`


## מצב נוכחי — בעיות פתוחות
- dotenv טוען 0 vars ב-trader.js / macd_monitor.js / risk_manager.js (path בעיה)
- Currency=USD לא מומר נכון — צריך fallback לפי מחיר
- MetaAPI מתנתק לפעמים — אין retry logic
- self-improve: bot conflict (409) עם tg-bot על אותו token
- intelligence: לא מקבל נתוני win/loss מה-DB בזמן אמת

## סגנון תשובות מועדף
- תמיד 3 בלוקים בכל פעם
- כל בלוק מסתיים ב: echo "✅ בלוק X הצליח"
- קוד מלא — לא קטעים
- bash heredoc לכתיבת קבצים (cat > file << 'EOF')
- אחרי כל בלוק — הסבר קצר מה השתנה

## היסטוריית שיפורים שנעשו
- הוחלף discord.js-selfbot עם grammy + dotenv fixes
- נוסף asset_detector.js לזיהוי נכסים
- נוסף MACD monitor לצמצום פוזיציות
- נוסף risk_manager עם משקולות דינמיות
- נוסף intelligence engine עם Claude Sonnet
- נוסף self-improve engine עם אישורים בטלגרם
- הוחלף screen ב-PM2

## מבנה DB
- signal-tracker/signals.db — כל סיגנל + תוצאות
- signal-tracker/signals.db → channel_stats — win rate + weight
- intelligence/intelligence.db — קונצנזוס + AI signals
- self-improve/improvements.db — בעיות + תיקונים

## חשוב — סגנון קידוד
- Node.js 20 + CommonJS (require, לא import)
- PM2 local: ./node_modules/.bin/pm2
- Python 3.11 עם telethon
- better-sqlite3 (לא sqlite3)
- grammy (לא telegraf/node-telegram-bot-api)
- dotenv path תמיד: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env'

## הוראות קריטיות לClaude — חובה לפעול לפיהן

### סגנון תשובה — NON-NEGOTIABLE
1. תמיד 3 בלוקים מלאים בכל תשובה
2. כל בלוק = קוד bash מלא שאפשר להריץ מיד — לא הסברים
3. אסור לכתוב "מה לבדוק" — תבדוק בעצמך ותכתוב את הפתרון
4. אסור לשאול שאלות — תניח הנחות סבירות ותקדם
5. כל בלוק מסתיים ב: echo "✅ בלוק X הצליח"
6. קוד חייב להיות מלא — לא קטעים, לא pseudocode
7. אחרי 3 בלוקים — כתוב מה הבלוקים הבאים יכסו

### דוגמה לבלוק תקין:
\`\`\`bash
cat > ~/OpenClawMaster/discord-bridge/trader.js << 'EOF'
[קוד מלא של הקובץ]

## הוראות קריטיות לClaude — חובה לפעול לפיהן

### סגנון תשובה — NON-NEGOTIABLE
1. תמיד 3 בלוקים מלאים בכל תשובה
2. כל בלוק = קוד bash מלא שאפשר להריץ מיד — לא הסברים
3. אסור לכתוב "מה לבדוק" — תבדוק בעצמך ותכתוב את הפתרון
4. אסור לשאול שאלות — תניח הנחות סבירות ותקדם
5. כל בלוק מסתיים ב: echo "✅ בלוק X הצליח"
6. קוד חייב להיות מלא — לא קטעים, לא pseudocode
7. אחרי 3 בלוקים — כתוב מה הבלוקים הבאים יכסו

### דוגמה לבלוק תקין:
\`\`\`bash
cat > ~/OpenClawMaster/discord-bridge/trader.js << 'EOF'
[קוד מלא של הקובץ]

## דוגמה מושלמת לתגובה נכונה

כשאני שולח קישור זה ואומר "תן לי 3 בלוקים לתיקון X":

### תגובה נכונה:
\`\`\`bash
## 🧱 בלוק 1 — [שם]
cat > ~/OpenClawMaster/discord-bridge/FILE.js << 'EOF'
[קוד מלא]

## ❌ דוגמה לתשובה גרועה שקיבלתי — אסור לחזור עליה

Claude נתן לי את זה — זה לא מקובל:
- קטעי קוד קצרים עם הסבר ("יתרון: ...")
- הצעות ללא קוד מלא
- // comment במקום קוד אמיתי
- "ניתן לאחד..." במקום לאחד בפועל

## ✅ התגובה הנכונה היא תמיד:

\`\`\`bash
## 🧱 בלוק 1 — [שם קונקרטי]
cat > ~/OpenClawMaster/[path]/[file].js << 'FILEOF'
[קוד מלא ועובד — לא קטעים]
FILEOF
cd ~/OpenClawMaster/discord-bridge
./node_modules/.bin/pm2 restart [process] --update-env
sleep 3
./node_modules/.bin/pm2 logs [process] --lines 5 --nostream
echo "✅ בלוק 1 הצליח"
\`\`\`

## חוק אחד בלבד:
אם הבלוק לא ניתן להרצה מיידית בטרמינל — הוא לא תקין.
