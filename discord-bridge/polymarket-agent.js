require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Anthropic = require('@anthropic-ai/sdk');
const { Bot } = require('grammy');
const https = require('https');
const fs = require('fs');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const OWNER_ID = 792897455;
const SCAN_INTERVAL = 30 * 60 * 1000;
const MISMATCH_THRESHOLD = 0.08; // הורדנו מ-12% ל-8%
const OPPORTUNITIES_FILE = '/home/friends7777wolfs/OpenClawMaster/discord-bridge/poly-opps.json';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'OpenClaw/1.0' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse: ' + e.message + ' | raw: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extractPrice(market) {
  // Polymarket can return prices in multiple formats
  try {
    // Format 1: outcomePrices = ["0.72", "0.28"]
    if (market.outcomePrices && Array.isArray(market.outcomePrices)) {
      const p = parseFloat(market.outcomePrices[0]);
      if (!isNaN(p)) return p;
    }
    // Format 2: tokens array with price
    if (market.tokens && Array.isArray(market.tokens)) {
      const yes = market.tokens.find(t =>
        (t.outcome || '').toLowerCase() === 'yes' ||
        (t.token_id && market.tokens.indexOf(t) === 0)
      );
      if (yes && yes.price !== undefined) return parseFloat(yes.price);
    }
    // Format 3: bestBid / bestAsk midpoint
    if (market.bestBid !== undefined && market.bestAsk !== undefined) {
      return (parseFloat(market.bestBid) + parseFloat(market.bestAsk)) / 2;
    }
    // Format 4: price directly
    if (market.price !== undefined) return parseFloat(market.price);
  } catch(e) {}
  return null;
}

async function fetchTopMarkets() {
  // Try Gamma API first
  try {
    const data = await httpsGet(
      'https://gamma-api.polymarket.com/markets?closed=false&limit=30&order=volume&ascending=false'
    );
    const markets = Array.isArray(data) ? data : (data.data || data.markets || []);
    console.log(`[POLY] Gamma API: ${markets.length} markets, sample keys: ${Object.keys(markets[0] || {}).join(',').substring(0,120)}`);
    return markets;
  } catch(e) {
    console.log('[POLY] Gamma failed:', e.message, '— trying CLOB API...');
  }

  // Fallback: CLOB API
  const data = await httpsGet(
    'https://clob.polymarket.com/markets?limit=30&active=true'
  );
  const markets = Array.isArray(data) ? data : (data.data || []);
  console.log(`[POLY] CLOB API: ${markets.length} markets, sample keys: ${Object.keys(markets[0] || {}).join(',').substring(0,120)}`);
  return markets;
}

async function estimateProbability(market, marketProb) {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 150,
    messages: [{ role: 'user', content: `Polymarket prediction:
Q: "${(market.question || market.title || '').substring(0, 120)}"
Market YES price: ${(marketProb * 100).toFixed(1)}%
Volume: $${Math.round(market.volume || market.volumeNum || 0).toLocaleString()}

True probability of YES? Base rates + recent events.
JSON only: {"prob":0.XX,"confidence":"low|medium|high","signal":"buy|sell|hold","reason":"max 8 words"}` }]
  });
  try {
    return JSON.parse(res.content[0].text.replace(/```json|```/g, '').trim());
  } catch { return null; }
}

async function scanPolymarket() {
  const startTime = Date.now();
  console.log(`[POLY] 🔍 Scan ${new Date().toISOString()}`);

  let markets;
  try { markets = await fetchTopMarkets(); }
  catch(e) { console.error('[POLY] Fetch failed:', e.message); return; }

  if (!markets.length) { console.log('[POLY] 0 markets returned'); return; }

  // Debug: log first market structure
  const sample = markets[0];
  const samplePrice = extractPrice(sample);
  console.log(`[POLY] Sample market price extracted: ${samplePrice} | question: ${(sample.question || sample.title || '').substring(0, 60)}`);

  const opportunities = [];

  for (const market of markets.slice(0, 20)) {
    const question = market.question || market.title || '';
    if (!question) continue;

    const marketProb = extractPrice(market);
    if (marketProb === null || isNaN(marketProb)) continue;
    if (marketProb < 0.04 || marketProb > 0.96) continue;

    const vol = parseFloat(market.volume || market.volumeNum || market.liquidity || 0);
    if (vol < 2000) continue; // min $2k

    try {
      const analysis = await estimateProbability(market, marketProb);
      if (!analysis || analysis.signal === 'hold' || analysis.confidence === 'low') continue;

      const mismatch = Math.abs(analysis.prob - marketProb);
      if (mismatch < MISMATCH_THRESHOLD) continue;

      const direction = analysis.prob > marketProb ? '🟢 BUY YES' : '🔴 BUY NO';

      opportunities.push({
        time: new Date().toISOString(),
        question: question.substring(0, 100),
        marketProb: (marketProb * 100).toFixed(1) + '%',
        estimatedProb: (analysis.prob * 100).toFixed(1) + '%',
        edge: (mismatch * 100).toFixed(1) + '%',
        direction,
        estProfit: ((mismatch / marketProb) * 100).toFixed(0) + '%',
        volume: '$' + Math.round(vol).toLocaleString(),
        reason: analysis.reason,
        confidence: analysis.confidence
      });
    } catch(e) { /* skip */ }
  }

  // Save
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf8')); } catch {}
  fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify([...existing.slice(-100), ...opportunities], null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[POLY] Found ${opportunities.length} opportunities in ${elapsed}s (threshold: ${MISMATCH_THRESHOLD * 100}%)`);

  if (!opportunities.length) {
    console.log('[POLY] No mismatches above threshold');
    return;
  }

  opportunities.sort((a, b) => parseFloat(b.edge) - parseFloat(a.edge));

  let msg = `🎯 *Polymarket — ${opportunities.length} הזדמנויות*\n_${elapsed}s_\n\n`;
  for (const opp of opportunities.slice(0, 4)) {
    msg += `${opp.direction}\n`;
    msg += `📌 ${opp.question.substring(0, 55)}...\n`;
    msg += `💹 שוק: ${opp.marketProb} → אמיתי: ${opp.estimatedProb} | Edge: *${opp.edge}*\n`;
    msg += `💰 Vol: ${opp.volume} | ${opp.confidence}\n\n`;
  }
  msg += `🔗 polymarket.com`;

  await bot.api.sendMessage(OWNER_ID, msg, { parse_mode: 'Markdown' });
}

console.log('[POLY] 🎯 Polymarket Agent started (threshold: 8%)');
scanPolymarket();
setInterval(scanPolymarket, SCAN_INTERVAL);
