# 🔍 Hindsight — Learned Patterns from Past Sessions

## ✅ What Works
- MetaAPI: Streaming only (RPC times out consistently)
- dotenv: MUST use absolute path `/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env`
- PM2 env: launch with `env $(cat .env | grep -v '^#' | xargs)` to pass vars
- Remove SL/TP from market orders (stale value rejection)
- Fetch live price BEFORE placing order
- NAS100 → USTEC on FTMO (not COMP)
- grammy not telegraf for Telegram bots

## ❌ Anti-Patterns (never repeat)
- Never use RPC connection to MetaAPI
- Never hardcode relative paths in dotenv
- Never run multiple grammy Bot instances on same token (409 conflict)
- Never add SL/TP in market order payload — set separately

## 💡 Behavior Tuning
- Cost: Haiku for parsing/analysis, Sonnet only for complex strategy
- max_tokens: keep aggressive (150 for signal parse, 1000 for strategy)
- Intervals: intelligence=60min, self-improve=2h, twitter-tier1=2min
- Responses: 3 full bash blocks, heredoc syntax, PM2 restart + log verify

## 📅 Session Log
- 2026-03-30 — Memory architecture initialized
