# Trading Knowledge Base

## MetaAPI
- Account: e7cf4bf5... (demo, ~$100k)
- Connection: STREAMING ONLY — never RPC
- Market orders: no SL/TP inline, set separately after fill

## Symbol Map
| Signal | MT5 Symbol |
|--------|-----------|
| NAS100/MNQ/NQ | USTEC |
| SP500/ES | US500 |
| GOLD/XAU/GC | XAUUSD |
| BTC | BTCUSD |

## Risk
- Default: 0.5% per channel
- Range: 0.01%–1.5% dynamic by win rate
- Daily loss limit: 4.5%
- MACD trigger: 25% size cut + SL→BE
