# 🦞 OpenClaw — CLAUDE.md (Living Document)
> Last consolidated: 2026-03-30 09:56
> Run `bash memory/bootstrap.sh` at session start.

---

## 🖥️ Infrastructure
- **Server**: Google Cloud | IP: 34.31.6.152 | User: friends7777wolfs
- **Project root**: `~/OpenClawMaster/`
- **Env file**: `/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env` (ABSOLUTE PATH ONLY)
- **PM2 binary**: `~/OpenClawMaster/discord-bridge/node_modules/.bin/pm2`
- **Dashboard**: `http://34.31.6.152` (nginx, port 80)
- **Runtime**: Node.js 20, CommonJS (`require` not `import`)

---

## ⚙️ PM2 Processes
| ID | Name | Role | Interval |
|----|------|------|----------|
| 1 | reporter | Daily 21:00 + weekly Sun 09:00 | event |
| 2 | tg-userbot | 29 Telegram channels → signals | live |
| 4 | tg-bot | Interactive bot (owner: 792897455) | live |
| 6 | discord-bridge | 22 Discord channels → MT5 | live |
| 7 | intelligence | AI analysis, Claude Haiku | 60 min |
| 8 | self-improve | Auto-fix engine | 2 hours |
| 13 | swarm | 30 agents, 10 groups, 7/10 vote | 10 min |

---

## 🔀 Signal Pipeline
```
Discord/Telegram → keyword pre-filter → local parse (zero cost)
→ Claude Haiku fallback (short msgs <400 chars, strong keywords, max_tokens 150)
→ asset_detector.js {symbol, mt5}
→ risk_manager.js (0.5% default, 4.5% daily limit)
→ MetaAPI STREAMING → MT5
→ Telegram alert
```

---

## 📊 Trading — Critical Rules
- **MetaAPI**: STREAMING CONNECTION ONLY — RPC always times out
- **Orders**: Remove SL/TP from market order payload → set separately after fill
- **Price**: Fetch live price BEFORE placing order
- **MACD**: Auto 25% position reduction + SL→BreakEven on weak momentum
- **Demo balance**: ~$99,972 | Account: e7cf4bf5...

## 🗺️ Symbol Map
| Signal Input | MT5 Symbol |
|-------------|-----------|
| NAS100 / MNQ / NQ / USTEC | USTEC |
| SP500 / ES / US500 | US500 |
| GOLD / XAU / GC / XAUUSD | XAUUSD (range 1800–5500) |
| BTC | BTCUSD |
| GBPJPY, EURUSD, etc. | Direct (symbol_map.js) |

---

## 🤖 AI Cost Policy
| Task | Model | max_tokens |
|------|-------|-----------|
| Signal parsing | Haiku | 150 |
| Intelligence analysis | Haiku | 1000 |
| Complex strategy | Sonnet | 1000 |
| Self-improve decisions | Haiku | 500 |

---

## 🏪 E-Commerce
- **Shopify stores**: `neu8888tral.myshopify.com` (baby/maternity) | `pelegadolll.myshopify.com` (costumes)
- **Status**: Shopify API NOT yet wired into OpenClaw — pending
- **DSers**: Connected to AliExpress
- **PayPal**: New-account payment hold active

---

## 📱 Accounts & IDs
- Discord selfbot: `oriki555hila949`
- Telegram userbot: `Orikn555`
- Telegram bot owner chat ID: `792897455`
- Telegram group: `-5068943005`
- YouTube: COCOHAVANNA channel

---

## 🚧 Known Open Issues (update when resolved)
- [ ] SP500/NAS100 → "Trade disabled" on demo (expected fix: FTMO live account)
- [ ] Shopify API not connected to OpenClaw
- [ ] End-to-end real signal → live trade not confirmed
- [ ] YouTube OAuth refresh token missing
- [ ] Swarm agents: 0/30 responses (API credit check needed)
- [ ] GCP firewall port 3001 not open (diagnostic server)
- [ ] ~49 Twitter accounts Tier 3–6 not yet followed (rate limit)

---

## ❌ Anti-Patterns — Never Do These
- Never use RPC with MetaAPI (always Streaming)
- Never use relative path with dotenv (always absolute)
- Never include SL/TP in market order payload
- Never run multiple grammy Bot instances on same token → 409 conflict
- Never use `import` — always `require` (CommonJS)
- Never push secrets to GitHub without `.gitignore` cleanup first

---

## 📁 Key Files
```
discord-bridge/
  bridge.js         — main signal processor
  trader.js         — MT5 execution
  risk_manager.js   — dynamic weights
  asset_detector.js — {symbol, mt5} detection
  symbol_map.js     — full forex mapping
  macd_monitor.js   — MACD position management
intelligence/
  engine.js         — AI analyst
self-improve/
  engine.js         — auto-fix + Telegram approval
memory/
  primer.md         — active session state
  git-context.md    — last 5 commits + changed files
  hindsight.md      — learned patterns
  kb/trading.md     — trading knowledge base
  kb/infra.md       — infra knowledge base
  bootstrap.sh      — RUN AT SESSION START
  consolidate.sh    — run after major task
  update-primer.sh  — run after each task
  add-hindsight.sh  — log new lessons
```

---

## 🧠 Memory Architecture (5 Layers)
@memory/primer.md
@memory/git-context.md
@memory/hindsight.md
@memory/kb/trading.md
@memory/kb/infra.md

---

## 🔧 Useful Commands
```bash
cd ~/OpenClawMaster/discord-bridge
./node_modules/.bin/pm2 status
./node_modules/.bin/pm2 logs --lines 50
./node_modules/.bin/pm2 restart all
env $(cat /home/friends7777wolfs/OpenClawMaster/discord-bridge/.env | grep -v '^#' | xargs) ./node_modules/.bin/pm2 restart all
```
