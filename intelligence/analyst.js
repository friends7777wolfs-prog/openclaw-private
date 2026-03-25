require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Anthropic = require('@anthropic-ai/sdk');
const Database  = require('better-sqlite3');
const { getRecentSignals, getAssetFrequency, getPatternStats } = require('./collector');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const db        = new Database('/home/friends7777wolfs/OpenClawMaster/intelligence/intelligence.db');

async function analyzeMarket() {
  const signals   = getRecentSignals(30);
  const hotAssets = getAssetFrequency(4);

  if (signals.length === 0) return null;

  // בניית קונצנזוס לפי נכס
  const byAsset = {};
  for (const s of signals) {
    if (!s.asset) continue;
    if (!byAsset[s.asset]) byAsset[s.asset] = { bulls:0, bears:0, channels:new Set(), entries:[] };
    const isBull = ['buy','long'].includes((s.direction||'').toLowerCase());
    if (isBull) byAsset[s.asset].bulls++;
    else byAsset[s.asset].bears++;
    byAsset[s.asset].channels.add(s.channel);
    if (s.entry_price) byAsset[s.asset].entries.push(s.entry_price);
  }

  // בניית context לClaude
  let context = `נתוני שוק בזמן אמת מ-51 ערוצי מסחר:\n\n`;

  context += `📊 קונצנזוס לפי נכס (30 דקות אחרונות):\n`;
  for (const [asset, data] of Object.entries(byAsset)) {
    const total    = data.bulls + data.bears;
    const bullPct  = Math.round(data.bulls/total*100);
    const avgEntry = data.entries.length
      ? (data.entries.reduce((a,b)=>a+b,0)/data.entries.length).toFixed(2)
      : 'N/A';
    context += `${asset}: ${bullPct}% Bull | ${data.bulls}↑ ${data.bears}↓ | ${data.channels.size} ערוצים | כניסה ממוצעת: ${avgEntry}\n`;
  }

  context += `\n🔥 נכסים חמים (4 שעות):\n`;
  for (const a of hotAssets.slice(0,5)) {
    context += `${a.asset}: ${a.mentions} סיגנלים (${a.bulls}↑ ${a.bears}↓)\n`;
  }

  context += `\n📅 זמן נוכחי: ${new Date().toISOString()}\n`;
  context += `📈 סה"כ סיגנלים שנותחו: ${signals.length}\n`;

  // שאילת Claude Sonnet לניתוח עמוק
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `אתה אנליסט מסחר מקצועי. נתח את הנתונים הבאים ותן:

1. KEY INSIGHTS — 3-5 תובנות קריטיות
2. SENTIMENT — פחדני/ניטרלי/תאוותני לכל נכס חם
3. HOT ASSET — הנכס הכי מעניין כרגע ולמה
4. PATTERN — שעות/תנאים עם הזדמנות טובה
5. AI SIGNAL — אם יש קונצנזוס חזק (>65%) תן סיגנל בפורמט:
   SIGNAL: [נכס] [BUY/SELL] @ [מחיר] | TP1: [x] | TP2: [x] | SL: [x] | Confidence: [%]
   אחרת כתוב: NO_SIGNAL

ענה בעברית, תמציתי ומקצועי.

${context}`
    }]
  });

  const analysis = response.content[0].text;

  // שמירת קונצנזוס ב-DB
  for (const [asset, data] of Object.entries(byAsset)) {
    const total     = data.bulls + data.bears;
    const bullPct   = data.bulls / total;
    const direction = bullPct > 0.5 ? 'Buy' : 'Sell';
    const strength  = Math.abs(bullPct - 0.5) * 2;
    const avgEntry  = data.entries.length
      ? data.entries.reduce((a,b)=>a+b,0)/data.entries.length
      : null;

    db.prepare(`
      INSERT INTO consensus (asset, direction, strength, channel_count, avg_entry, sentiment)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(asset, direction, strength, data.channels.size, avgEntry,
           strength > 0.7 ? 'strong' : strength > 0.4 ? 'moderate' : 'weak');
  }

  return { analysis, byAsset, hotAssets };
}

// חילוץ סיגנל מהניתוח
function extractSignal(analysis) {
  const match = analysis.match(/SIGNAL:\s*(\w+)\s+(BUY|SELL)\s*@\s*([\d.]+)\s*\|\s*TP1:\s*([\d.]+)\s*\|\s*TP2:\s*([\d.]+)\s*\|\s*SL:\s*([\d.]+)\s*\|\s*Confidence:\s*([\d.]+)%/i);
  if (!match) return null;

  return {
    asset:      match[1],
    direction:  match[2],
    entry:      parseFloat(match[3]),
    tp1:        parseFloat(match[4]),
    tp2:        parseFloat(match[5]),
    sl:         parseFloat(match[6]),
    confidence: parseFloat(match[7])
  };
}

module.exports = { analyzeMarket, extractSignal };
