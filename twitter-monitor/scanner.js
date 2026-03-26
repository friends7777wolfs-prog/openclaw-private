require('./load_env');
const axios = require('axios');
const fs = require('fs');
process.env.TWITTER_BEARER_TOKEN = (process.env.TWITTER_BEARER_TOKEN||"").replace(/[\r\n\t ]/g,"");
const path = require('path');

// BEARER moved to runtime
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5068943005';
const STATE_FILE = require('path').join(__dirname,'data/scanner_state.json');
const LEARNING_FILE = require('path').join(__dirname,'data/learning.json');
const SCAN_INTERVAL = 30 * 60 * 1000; // 30 דקות

// ═══ STATE MANAGEMENT ═══
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE)); }
  catch { return { lastIds: {}, scanCount: 0, signals: [] }; }
}
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

function loadLearning() {
  try { return JSON.parse(fs.readFileSync(LEARNING_FILE)); }
  catch { return { 
    winningPatterns: [], 
    losingPatterns: [],
    thresholds: { minConfidence: 60, minWeight: 6 },
    performance: []
  }; }
}
function saveLearning(l) { fs.writeFileSync(LEARNING_FILE, JSON.stringify(l, null, 2)); }

// ═══ FETCH TWEETS ═══
async function fetchTweets(userId, sinceId) {
  const params = {
    max_results: 5,
    'tweet.fields': 'created_at,text,public_metrics',
    exclude: 'retweets,replies'
  };
  if (sinceId) params.since_id = sinceId;
  
  const res = await axios.get(
    `https://api.twitter.com/2/users/${userId}/tweets`,
    { 
      headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN.trim()}` }, 
      params,
      validateStatus: s => s < 500
    }
  );
  if (res.status !== 200) return [];
  return res.data?.data || [];
}

// ═══ CLAUDE ANALYSIS ═══
async function analyzeTweets(tweets, influencer, learning) {
  const tweetTexts = tweets.map(t => `"${t.text}"`).join('\n');
  const patterns = learning.winningPatterns.slice(-5).join(', ') || 'none yet';
  
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `אתה מנתח tweets פיננסיים. החזר JSON בלבד:
{
  "signal": "BUY"|"SELL"|"HOLD"|"NONE",
  "asset": "NAS100"|"SP500"|"XAUUSD"|"BTCUSD"|"EURUSD"|"NONE",
  "confidence": 0-100,
  "urgency": "HIGH"|"MEDIUM"|"LOW",
  "reason": "עד 15 מילים",
  "pattern": "תיאור קצר של הדפוס"
}
דפוסים מנצחים בעבר: ${patterns}
משפיעים בעלי weight גבוה → confidence גבוה יותר`,
      messages: [{ role: 'user', content: 
        `Account: @${influencer.handle} (${influencer.cat}, weight:${influencer.weight})\nTweets:\n${tweetTexts}` 
      }]
    },
    { headers: {
      'x-api-key': ANTHROPIC,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }}
  );
  
  const raw = res.data.content[0].text;
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// ═══ INJECT SIGNAL ═══
async function injectSignal(signal, influencer) {
  try {
    const injector = require('./signal_injector_v2');
    await injector.inject({
      source: `twitter-${influencer.handle}`,
      asset: signal.asset,
      direction: signal.signal,
      confidence: signal.confidence,
      weight: influencer.weight,
      risk: Math.min(0.1 * influencer.weight / 10, 0.5), // max 0.5%
      comment: `@${influencer.handle}: ${signal.reason}`
    });
  } catch(e) { console.error("[fetch-err]", inf.handle, e.response?.status, e.response?.data?.title || e.message);
    console.error('[inject]', e.message);
  }
}

// ═══ TELEGRAM REPORT ═══
async function sendReport(scanResult, learning) {
  const { signals, scanned, newTweets, scanNum } = scanResult;
  
  const topSignals = signals
    .filter(s => s.signal !== 'NONE')
    .sort((a,b) => (b.confidence * b.weight) - (a.confidence * a.weight))
    .slice(0, 5);

  let msg = `🦞 <b>OpenClaw Scan #${scanNum}</b>\n`;
  msg += `📊 נסרקו: ${scanned} חשבונות | ${newTweets} ציוצים חדשים\n\n`;
  
  if (topSignals.length > 0) {
    msg += `<b>🎯 סיגנלים מובילים:</b>\n`;
    for (const s of topSignals) {
      const emoji = s.signal === 'BUY' ? '🟢' : s.signal === 'SELL' ? '🔴' : '🟡';
      msg += `${emoji} ${s.asset} ${s.signal} — @${s.handle} (${s.confidence}%)\n`;
      msg += `   └ ${s.reason}\n`;
    }
  } else {
    msg += `⚪ אין סיגנלים חזקים בסריקה זו\n`;
  }
  
  msg += `\n📈 <b>מה המערכת רוצה:</b>\n`;
  // סיכום מה להשקיע
  const byAsset = {};
  topSignals.forEach(s => {
    if (!byAsset[s.asset]) byAsset[s.asset] = { buy: 0, sell: 0 };
    if (s.signal === 'BUY') byAsset[s.asset].buy += s.confidence * s.weight;
    if (s.signal === 'SELL') byAsset[s.asset].sell += s.confidence * s.weight;
  });
  
  for (const [asset, votes] of Object.entries(byAsset)) {
    const dir = votes.buy > votes.sell ? '🟢 BUY' : '🔴 SELL';
    const strength = Math.max(votes.buy, votes.sell);
    msg += `  ${asset}: ${dir} (strength: ${strength})\n`;
  }
  
  msg += `\n🧠 Threshold: ${learning.thresholds.minConfidence}% | Scans: ${learning.performance.length}`;

  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID, text: msg, parse_mode: 'HTML'
  });
}

// ═══ SELF IMPROVE ═══
async function selfImprove(signals, learning) {
  // שמור patterns מנצחים
  const highConfidence = signals.filter(s => 
    s.signal !== 'NONE' && s.confidence >= 75
  );
  
  for (const s of highConfidence) {
    if (s.pattern && !learning.winningPatterns.includes(s.pattern)) {
      learning.winningPatterns.push(s.pattern);
      if (learning.winningPatterns.length > 20) learning.winningPatterns.shift();
    }
  }
  
  // שמור performance
  learning.performance.push({
    ts: new Date().toISOString(),
    signalCount: signals.filter(s => s.signal !== 'NONE').length,
    avgConfidence: signals.reduce((a,b) => a + (b.confidence||0), 0) / signals.length
  });
  
  // התאם threshold דינמית
  const recent = learning.performance.slice(-10);
  const avgSignals = recent.reduce((a,b) => a + b.signalCount, 0) / recent.length;
  
  if (avgSignals > 20) {
    learning.thresholds.minConfidence = Math.min(80, learning.thresholds.minConfidence + 2);
    console.log('[learn] יותר מדי סיגנלים — העלה threshold ל-' + learning.thresholds.minConfidence);
  } else if (avgSignals < 3) {
    learning.thresholds.minConfidence = Math.max(50, learning.thresholds.minConfidence - 2);
    console.log('[learn] מעט מדי סיגנלים — הורד threshold ל-' + learning.thresholds.minConfidence);
  }
  
  saveLearning(learning);
}

// ═══ MAIN SCAN ═══
async function runScan() {
  const influencers = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/influencers.json')));
  const state = loadState();
  const learning = loadLearning();
  state.scanCount++;
  
  console.log(`\n[scan #${state.scanCount}] מתחיל — ${influencers.length} משפיעים`);
  const allSignals = [];
  let totalTweets = 0;
  let scanned = 0;

  for (const inf of influencers) {
    if (inf.weight < learning.thresholds.minWeight) continue;
    
    try {
      const tweets = await fetchTweets(inf.id, state.lastIds[inf.id]);
      if (tweets.length === 0) { scanned++; continue; }
      
      state.lastIds[inf.id] = tweets[0].id;
      totalTweets += tweets.length;
      
      const analysis = await analyzeTweets(tweets, inf, learning);
      allSignals.push({ ...analysis, handle: inf.handle, weight: inf.weight });
      
      // הזרק סיגנלים חזקים מיד
      if (analysis.signal !== 'NONE' && 
          analysis.confidence >= learning.thresholds.minConfidence &&
          analysis.urgency === 'HIGH') {
        await injectSignal(analysis, inf);
        console.log(`[🚨 URGENT] @${inf.handle}: ${analysis.asset} ${analysis.signal} ${analysis.confidence}%`);
      }
      
      scanned++;
      await new Promise(r => setTimeout(r, 300)); // rate limit
    } catch(e) { console.error("[fetch-err]", inf.handle, e.response?.status, e.response?.data?.title || e.message);
      // skip על שגיאות
    }
  }

  saveState(state);
  
  // דוח + self-improve
  await sendReport({ signals: allSignals, scanned, newTweets: totalTweets, scanNum: state.scanCount }, learning);
  await selfImprove(allSignals, learning);
  
  console.log(`[scan #${state.scanCount}] ✅ הסתיים | ${scanned} נסרקו | ${totalTweets} ציוצים | ${allSignals.filter(s=>s.signal!=='NONE').length} סיגנלים`);
}

// ═══ START ═══
console.log('[scanner] 🚀 מתחיל — סריקה כל 30 דקות');
runScan().catch(console.error);
setInterval(() => runScan().catch(console.error), SCAN_INTERVAL);
