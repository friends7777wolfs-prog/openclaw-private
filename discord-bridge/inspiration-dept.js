const { loadLessons } = require('./reflection-core');
require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Anthropic = require('@anthropic-ai/sdk');
const { Bot } = require('grammy');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const OWNER_ID = 792897455;
const DB_FILE = '/home/friends7777wolfs/OpenClawMaster/discord-bridge/inspiration-db.json';

// ── DB helpers ─────────────────────────────────────────────────────────────
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { useCases: [], ideas: [], approved: [], built: [] }; }
}
function saveDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// ── AGENT 1: Scanner — סורק שימושים של Claude מ-Twitter/web ─────────────
async function agentScanner(db) {
  console.log('[INSP] Agent1:Scanner running...');
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 1500,
    messages: [{ role: 'user', content: `You are a research agent. List 8 real creative ways people have used Claude AI or trading bots to make money or automate businesses in 2025-2026. Focus on: arbitrage bots, prediction markets, dropshipping automation, content generation for shops, signal trading, e-commerce automation. Respond ONLY with JSON array: [{"title":"...","category":"trading|ecommerce|content|arbitrage","description":"...","potentialProfit":"high|medium|low","complexity":"low|medium|high"}]` }]
  });
  try {
    const text = res.content[0].text.replace(/```json|```/g, '').trim();
    const cases = JSON.parse(text);
    db.useCases = [...(db.useCases || []).slice(-20), ...cases];
    console.log(`[INSP] Scanner found ${cases.length} use cases`);
    return cases;
  } catch(e) { console.error('[INSP] Scanner parse error:', e.message); return []; }
}

// ── AGENT 2: Analyst — מנתח דפוסים ומה הכי רלוונטי ל-OpenClaw ───────────
async function agentAnalyst(db, useCases) {
  console.log('[INSP] Agent2:Analyst running...');
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 400,
    messages: [{ role: 'user', content: `You manage OpenClaw: an AI trading+dropshipping system on Google Cloud with MT5 trading, 2 Shopify stores, Telegram bots, YouTube channel, and a swarm of 30 AI agents. Analyze these use cases and pick the TOP 3 most relevant to expand OpenClaw:
${JSON.stringify(useCases.slice(0, 8))}
Respond ONLY with JSON: {"top3": [{"title":"...","why":"...","estimatedRevenue":"$X/month","timeToImplement":"X days"}]}` }]
  });
  try {
    const text = res.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text).top3 || [];
  } catch(e) { return []; }
}

// ── AGENT 3: Ideator — מייצר רעיונות מותאמים ל-OpenClaw ─────────────────
async function agentIdeator(db, topCases) {
  console.log('[INSP] Agent3:Ideator running...');
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 500,
    messages: [{ role: 'user', content: `Based on these winning use cases:
${JSON.stringify(topCases)}
Generate 5 NEW specific project ideas for OpenClaw to implement. Be creative and specific — real module names, what APIs to use, how it integrates with existing MT5/Shopify/Telegram infrastructure.
Respond ONLY with JSON array: [{"projectName":"...","module":"...","apis":["..."],"integration":"...","expectedROI":"...","priority":1-5}]` }]
  });
  try {
    const text = res.content[0].text.replace(/```json|```/g, '').trim();
    const ideas = JSON.parse(text);
    db.ideas = [...(db.ideas || []).slice(-30), ...ideas];
    return ideas;
  } catch(e) { return []; }
}

// ── AGENT 4: Evaluator — מדרג ומצביע על הפרוייקט הבא ────────────────────
async function agentEvaluator(db, ideas) {
  console.log('[INSP] Agent4:Evaluator running...');
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 300,
    messages: [{ role: 'user', content: `Score these project ideas for OpenClaw (1-10 each):
${JSON.stringify(ideas)}
Criteria: profit potential (40%), ease of integration (30%), time to implement (30%).
Respond ONLY with JSON: {"winner": {"projectName":"...","score":X,"reason":"...","buildNow":true}}` }]
  });
  try {
    const text = res.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);
    if (result.winner && result.winner.buildNow) {
      db.approved = [...(db.approved || []).slice(-10), result.winner];
    }
    return result.winner;
  } catch(e) { return null; }
}

// ── AGENT 5: Builder — יוצר scaffold לפרוייקט הזוכה ────────────────────
async function agentBuilder(winner) {
  console.log('[INSP] Agent5:Builder running for:', winner.projectName);
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 800,
    messages: [{ role: 'user', content: `Create a Node.js CommonJS scaffold file for this OpenClaw project:
Project: ${winner.projectName}
Module: ${winner.module}
APIs: ${winner.apis ? winner.apis.join(', ') : 'N/A'}
Integration: ${winner.integration}

Write a working skeleton with:
- require() statements
- dotenv absolute path
- main async function
- setInterval for automation
- Telegram bot notification to chat ID 792897455
- console.log with [${winner.module}] prefix
Keep it under 60 lines. No placeholders — real structure.` }]
  });
  const code = res.content[0].text;
  const filename = `/home/friends7777wolfs/OpenClawMaster/discord-bridge/${winner.module || 'new-project'}.js`;
  fs.writeFileSync(filename, code);
  console.log('[INSP] Builder created:', filename);
  return filename;
}

// ── MAIN PIPELINE ─────────────────────────────────────────────────────────
async function runInspirationDept() {
  console.log('\n🎨 [INSP] Inspiration Dept cycle starting...');
  const db = loadDB();

  try {
    const useCases = await agentScanner(db);
    if (!useCases.length) return;

    const topCases = await agentAnalyst(db, useCases);
    if (!topCases.length) return;

    const ideas = await agentIdeator(db, topCases);
    if (!ideas.length) return;

    const winner = await agentEvaluator(db, ideas);
    saveDB(db);

    if (!winner) return;

    // Build scaffold for winning idea
    const scaffoldFile = await agentBuilder(winner);

    // Report to Telegram
    const msg = `🎨 *מחלקת השראה — דוח מחזור*\n\n` +
      `🔍 *נסרקו:* ${useCases.length} שימושים\n` +
      `💡 *הוצעו:* ${ideas.length} רעיונות\n\n` +
      `🏆 *הזוכה:*\n` +
      `📌 ${winner.projectName}\n` +
      `⭐ ציון: ${winner.score}/10\n` +
      `💰 ROI: ${winner.expectedROI || 'לא ידוע'}\n` +
      `🧠 ${winner.reason}\n\n` +
      `✅ נוצר scaffold: \`${path.basename(scaffoldFile)}\`\n` +
      `הרץ: \`pm2 start ${path.basename(scaffoldFile)}\` להפעלה`;

    await bot.api.sendMessage(OWNER_ID, msg, { parse_mode: 'Markdown' });
    console.log('[INSP] ✅ Cycle complete. Winner:', winner.projectName);

  } catch(err) {
    console.error('[INSP] Pipeline error:', err.message);
  }
}

// Run every 6 hours
runInspirationDept();
setInterval(runInspirationDept, 6 * 60 * 60 * 1000);
console.log('[INSP] 🎨 Inspiration Department started — 5 agents active, cycle every 6h');
