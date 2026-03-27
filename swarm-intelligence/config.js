const path = require('path');
const fs = require('fs');

const envPaths = [
  '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env',
  path.join(__dirname, '..', 'discord-bridge', '.env'),
  path.join(__dirname, '..', '.env')
];

let loaded = false;
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p, override: true });
    const k = process.env.ANTHROPIC_API_KEY;
    if (k && k !== 'YOUR_KEY_HERE' && k.startsWith('sk-')) {
      console.log(`📂 Key from: ${p}`);
      loaded = true;
      break;
    }
  }
}

if (!loaded) {
  const baseDir = '/home/friends7777wolfs/OpenClawMaster';
  try {
    const dirs = fs.readdirSync(baseDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    for (const dir of dirs) {
      try {
        const content = fs.readFileSync(path.join(baseDir, dir, '.env'), 'utf8');
        const match = content.match(/ANTHROPIC_API_KEY=["']?(sk-[^\s"']+)/);
        if (match) { process.env.ANTHROPIC_API_KEY = match[1]; loaded = true; break; }
      } catch(e) {}
    }
  } catch(e) {}
}

const key = process.env.ANTHROPIC_API_KEY;
if (!key || !key.startsWith('sk-')) console.error('❌ No valid ANTHROPIC_API_KEY!');
else console.log(`🔑 Key: ${key.substring(0,12)}...${key.substring(key.length-4)}`);

module.exports = {
  ANTHROPIC_API_KEY: key,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '-5068943005',
  SWARM: {
    GROUPS: 10,
    AGENTS_PER_GROUP: 3,          // was 10 → 30 total instead of 100
    VOTE_INTERVAL_MS: 10*60*1000, // was 5min → 10min
    CONSENSUS_THRESHOLD: 0.7,
    MIN_CONFIDENCE: 0.6,
    MAX_CONCURRENT_API: 3,        // was 5 → less parallel
    MODEL: 'claude-haiku-4-5-20251001',
  },
  ASSETS: ['XAUUSD','NAS100','EURUSD','GBPUSD','USDJPY','BTCUSD'],
  GROUP_TYPES: [
    { id:'trend_followers', name:'Trend Followers', prompt:'You are a TREND FOLLOWING analyst. Focus on: MA crossovers (20/50/200 EMA), higher highs/lows, ADX strength, price vs key MAs. Only signal when trend is CLEAR and STRONG.' },
    { id:'momentum_hunters', name:'Momentum Hunters', prompt:'You are a MOMENTUM analyst. Focus on: RSI divergences, MACD histogram acceleration, volume spikes, ROC analysis. Signal when momentum shifts decisively.' },
    { id:'support_resistance', name:'Support/Resistance', prompt:'You are a S/R analyst. Focus on: key horizontal levels, round numbers, prev day/week H/L, pivot points, Fibonacci. Signal when price reacts at critical level.' },
    { id:'scalpers', name:'Quick Scalpers', prompt:'You are a SCALP analyst. Focus on: 1-5min setups, order flow, pin bars/engulfing, tight R:R 1:1.5 min. Signal only high-prob quick entries.' },
    { id:'contrarians', name:'Contrarians', prompt:'You are a CONTRARIAN analyst. Focus on: extreme sentiment, overextended moves, panic selling=buy, euphoria=sell. Signal when crowd is likely wrong.' },
    { id:'pattern_recognizers', name:'Pattern Recognizers', prompt:'You are a CHART PATTERN analyst. Focus on: H&S, double/triple tops/bottoms, flags/pennants/wedges, breakout confirmation. Signal when textbook pattern completes.' },
    { id:'volatility_analysts', name:'Volatility Analysts', prompt:'You are a VOLATILITY analyst. Focus on: BB squeezes, ATR vs historical, VIX correlation, breakout probability after low vol. Signal when vol regime shifts.' },
    { id:'correlation_analysts', name:'Correlation Analysts', prompt:'You are a CORRELATION analyst. Focus on: DXY vs gold, yields vs equity, oil vs CAD, risk-on/off regime. Signal when correlations confirm a move.' },
    { id:'news_sentiment', name:'News & Sentiment', prompt:'You are a NEWS/SENTIMENT analyst. Focus on: breaking news impact, Twitter sentiment shift, econ calendar positioning, central bank rhetoric. Signal when news creates edge.' },
    { id:'risk_managers', name:'Risk Guardians', prompt:'You are a RISK MANAGEMENT analyst. Focus on: market environment safety, drawdown risk, position sizing, time-of-day liquidity. Vote AGAINST trades with poor R:R or bad timing.' }
  ]
};
