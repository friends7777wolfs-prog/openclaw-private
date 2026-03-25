
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

