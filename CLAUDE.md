# 🦞 OpenClaw — System Context for Claude

## מה המערכת
מערכת אוטומטית לניהול מסחר ודרופשיפינג עם AI.
שרת: Google Cloud | IP: 34.31.6.152 | User: friends7777wolfs


## עדכונים 26.03.2026
- signal_parser.js: נוצר — תומך ב-3 פורמטים (Trade Alert / bold markdown / EliteAlgo)  
- symbol_map.js: נוסף MGC1/GC1→XAUUSD, MNQ1/NQ1→NAS100, ES1/MES1→SP500
- bridge.js: מחובר ל-signal_parser, guards על null, stack trace
- macd_monitor.js: monitorPositions מושבת זמנית (getHistoricalCandles הוסר מ-SDK)
- diag_server.js (port 3001): סטטוס/לוגים/עסקאות — צריך firewall tag
- ערוץ 1419103927504212019 הוסר
## בעיות פתוחות  
- null reading [1]: בחקירה — stack trace נוסף
- NAS100/SP500: Trade disabled בחשבון דמו
- macd_monitor: צריך תחליף ל-getHistoricalCandles
- diag-server firewall: צריך gcloud auth

## Processes רצים (PM2)
- discord-bridge (6) — קורא 22 ערוצי דיסקורד → סיגנלים → MT5
- tg-userbot (2) — קורא 29 ערוצי טלגרם → אותו pipeline
- tg-bot (4) — בוט טלגרם אינטראקטיבי
- reporter (1) — דוח יומי 21:00
- intelligence (7) — AI analyst כל 30 דקות
- self-improve (8) — סריקה כל שעה

## עדכונים אחרונים
- symbol_map.js: NAS100→COMP, SP500→SP500, EURUSD→EURUSD + כל הפורקס
- asset_detector.js: תוקן — תומך בפורקס, word boundary, מחזיר {symbol, mt5}
- trader.js: מחובר ל-toMT5Symbol + Streaming connection + live price לפני עסקה
- MetaAPI: משתמש ב-METAAPI_TOKEN / METAAPI_ACCOUNT_ID
- חיבור: Streaming בלבד (RPC timeout)
- עסקת test: נפתחה ונסגרה בהצלחה ב-EURUSD
- balance: $99,972.38

## בעיות פתוחות
- tg-bot הפסיק לשלוח הודעות — לא נבדק
- Shopify — לא מחובר
- אינדקסים (SP500/NAS100) — Trade disabled בחשבון הדמו הנוכחי

## Pipeline
Discord/Telegram → asset_detector → risk_manager → trader.js → MT5 → Telegram alert

## קבצים חשובים
- discord-bridge/bridge.js
- discord-bridge/trader.js
- discord-bridge/risk_manager.js
- discord-bridge/asset_detector.js
- discord-bridge/symbol_map.js ← חדש
- discord-bridge/macd_monitor.js
- intelligence/engine.js
- self-improve/engine.js

## פקודות שימושיות
\`\`\`bash
cd ~/OpenClawMaster/discord-bridge
./node_modules/.bin/pm2 status
./node_modules/.bin/pm2 logs --lines 30
./node_modules/.bin/pm2 restart all
\`\`\`
