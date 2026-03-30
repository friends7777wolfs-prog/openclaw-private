require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Anthropic = require('@anthropic-ai/sdk');
const { Bot } = require('grammy');
const fs = require('fs');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const OWNER_ID = 792897455;
const ORACLE_DB = '/home/friends7777wolfs/OpenClawMaster/discord-bridge/oracle-db.json';
const MAX_REFLECTION_ROUNDS = 3;
const CONVERGENCE_THRESHOLD = 0.82; // 82% confidence = accept

// ── DB ─────────────────────────────────────────────────────────────────────
function loadDB() {
  try { return JSON.parse(fs.readFileSync(ORACLE_DB, 'utf8')); }
  catch { return { predictions: [], accuracy: [], selfImprovements: [], systemPromptVersion: 1 }; }
}
function saveDB(db) { fs.writeFileSync(ORACLE_DB, JSON.stringify(db, null, 2)); }

// ── DYNAMIC SYSTEM PROMPT (משתפר עם כל מחזור) ─────────────────────────────
function buildWorkerPrompt(db) {
  const recentAccuracy = db.accuracy.slice(-10);
  const winRate = recentAccuracy.length
    ? (recentAccuracy.filter(a => a.correct).length / recentAccuracy.length * 100).toFixed(0)
    : 'unknown';
  const pastMistakes = db.selfImprovements.slice(-3).map(s => s.lesson).join('; ');

  return `You are Oracle, an elite prediction engine for Polymarket.
Win rate so far: ${winRate}%.
Past mistakes to avoid: ${pastMistakes || 'none yet — learn as you go'}.
Version: ${db.systemPromptVersion}

Rules:
1. Reason step by step — base rates, recent news sentiment, market microstructure
2. Always output a probability between 0.05 and 0.95
3. Higher confidence only when multiple signals align
4. Never hallucinate — say "uncertain" if you lack data
5. Factor in: time decay, political risk, liquidity

Output ONLY JSON: {
  "probability": 0.XX,
  "confidence": 0.XX,
  "reasoning": ["step1","step2","step3"],
  "signals": ["signal1","signal2"],
  "riskFactors": ["risk1","risk2"],
  "timeHorizon": "Xdays"
}`;
}

// ── WORKER: generates raw prediction ──────────────────────────────────────
async function workerPredict(market, db, previousFeedback = null) {
  const feedbackSection = previousFeedback
    ? `\nGrader feedback from last attempt: ${previousFeedback}\nFix these issues in your new prediction.`
    : '';

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: buildWorkerPrompt(db),
    messages: [{ role: 'user', content: `Predict YES probability for:
"${market.question}"
Current market price: ${market.marketProb}
Volume: ${market.volume}
Closes: ${market.endDate || 'unknown'}
${feedbackSection}` }]
  });

  try {
    return JSON.parse(res.content[0].text.replace(/```json|```/g, '').trim());
  } catch(e) {
    return { probability: 0.5, confidence: 0.3, reasoning: ['parse error'], signals: [], riskFactors: [], timeHorizon: '?' };
  }
}

// ── GRADER: evaluates prediction quality ──────────────────────────────────
async function graderEvaluate(market, prediction, round) {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are a strict Grader for prediction markets.
Evaluate this prediction for: "${market.question}"

Prediction: ${JSON.stringify(prediction)}

Grade against these HARD criteria (each 0-1):
1. reasoning_depth: Are ≥3 concrete reasoning steps provided? (not vague)
2. signal_quality: Are signals specific and verifiable?
3. calibration: Is confidence realistic given reasoning strength?
4. risk_awareness: Are real risks identified?
5. time_sensitivity: Is time horizon addressed?

PASS threshold: avg ≥ 0.75 AND confidence ≤ 0.92 (overconfidence = fail)
Round: ${round}/${MAX_REFLECTION_ROUNDS}

Respond ONLY JSON: {
  "scores": {"reasoning_depth":0.X,"signal_quality":0.X,"calibration":0.X,"risk_awareness":0.X,"time_sensitivity":0.X},
  "avgScore": 0.XX,
  "passed": true/false,
  "feedback": "specific what to fix",
  "fatalFlaw": "or null"
}` }]
  });

  try {
    return JSON.parse(res.content[0].text.replace(/```json|```/g, '').trim());
  } catch(e) {
    return { avgScore: 0.5, passed: false, feedback: 'parse error', fatalFlaw: null };
  }
}

// ── OBSERVER: ensures convergence, extracts learnings ─────────────────────
async function observerConverge(market, rounds) {
  const roundSummary = rounds.map((r, i) =>
    `Round ${i+1}: prob=${r.prediction.probability}, conf=${r.prediction.confidence}, score=${r.grade.avgScore}`
  ).join('\n');

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    messages: [{ role: 'user', content: `You are Observer — a meta-agent that decides if a Reflection loop truly converged.
Market: "${market.question}"

Reflection rounds:
${roundSummary}

Final prediction: ${JSON.stringify(rounds[rounds.length-1].prediction)}

Assess:
1. Did the prediction GENUINELY improve across rounds or just spin?
2. Is the final probability well-justified?
3. What is the LESSON learned for future predictions?
4. Is this worth acting on?

Respond ONLY JSON: {
  "genuinelyConverged": true/false,
  "finalProbability": 0.XX,
  "finalConfidence": 0.XX,
  "actionable": true/false,
  "lesson": "one sentence for future self-improvement",
  "observerVerdict": "accept|reject|flag"
}` }]
  });

  try {
    return JSON.parse(res.content[0].text.replace(/```json|```/g, '').trim());
  } catch(e) {
    return { genuinelyConverged: false, finalProbability: 0.5, finalConfidence: 0.3, actionable: false, lesson: '', observerVerdict: 'reject' };
  }
}

// ── REFLECTION LOOP: Worker → Grader → Observer ────────────────────────────
async function reflectionLoop(market, db) {
  console.log(`[ORACLE] 🔄 Reflection loop: "${market.question.substring(0, 50)}..."`);
  const rounds = [];
  let feedback = null;

  for (let round = 1; round <= MAX_REFLECTION_ROUNDS; round++) {
    console.log(`[ORACLE]   Round ${round}/${MAX_REFLECTION_ROUNDS}`);

    const prediction = await workerPredict(market, db, feedback);
    const grade = await graderEvaluate(market, prediction, round);

    rounds.push({ round, prediction, grade });
    console.log(`[ORACLE]   Score: ${grade.avgScore?.toFixed(2)} | Passed: ${grade.passed}`);

    if (grade.passed && prediction.confidence >= CONVERGENCE_THRESHOLD) {
      console.log(`[ORACLE]   ✅ Early convergence at round ${round}`);
      break;
    }
    feedback = grade.feedback;
  }

  // Observer final verdict
  const verdict = await observerConverge(market, rounds);
  console.log(`[ORACLE]   Observer: ${verdict.observerVerdict} | Converged: ${verdict.genuinelyConverged}`);

  // Self-improvement: save lesson
  if (verdict.lesson) {
    db.selfImprovements.push({
      time: new Date().toISOString(),
      market: market.question.substring(0, 60),
      lesson: verdict.lesson,
      rounds: rounds.length
    });
    if (db.selfImprovements.length > 50) db.selfImprovements = db.selfImprovements.slice(-50);
    db.systemPromptVersion++;
  }

  return { rounds, verdict, market };
}

// ── MAIN ORACLE SCAN ───────────────────────────────────────────────────────
async function runOracle() {
  console.log('\n🔮 [ORACLE] Scan starting...');
  const db = loadDB();

  // Read latest Polymarket opportunities
  const polyFile = '/home/friends7777wolfs/OpenClawMaster/discord-bridge/poly-opps.json';
  if (!fs.existsSync(polyFile)) {
    console.log('[ORACLE] No polymarket data yet — waiting for polymarket-agent');
    return;
  }

  const opps = JSON.parse(fs.readFileSync(polyFile, 'utf8'));
  const recent = opps.slice(-8); // top 8 most recent opportunities
  if (!recent.length) { console.log('[ORACLE] No recent opportunities'); return; }

  const results = [];
  for (const opp of recent.slice(0, 3)) { // max 3 per cycle to save tokens
    try {
      const result = await reflectionLoop(opp, db);
      results.push(result);
    } catch(e) {
      console.error('[ORACLE] Loop error:', e.message);
    }
  }

  saveDB(db);

  // Build Telegram report
  const actionable = results.filter(r => r.verdict.actionable && r.verdict.observerVerdict === 'accept');
  let msg = `🔮 *Oracle — חיזוי עתיד v${db.systemPromptVersion}*\n`;
  msg += `📊 ${results.length} ניתוחים | ${db.selfImprovements.length} שיפורים מצטברים\n\n`;

  for (const r of actionable.slice(0, 3)) {
    const prob = (r.verdict.finalProbability * 100).toFixed(0);
    const conf = (r.verdict.finalConfidence * 100).toFixed(0);
    const rounds = r.rounds.length;
    msg += `✅ *ACTIONABLE*\n`;
    msg += `❓ ${r.market.question.substring(0, 60)}...\n`;
    msg += `🎯 חיזוי: *${prob}%* YES | ביטחון: ${conf}%\n`;
    msg += `🔄 מחזורי Reflection: ${rounds}\n`;
    msg += `📖 שוק: ${r.market.marketProb}\n\n`;
  }

  if (!actionable.length) msg += '⏳ אין הזדמנויות actionable כרגע — ממשיך ללמוד\n';

  const latestLesson = db.selfImprovements.slice(-1)[0];
  if (latestLesson) msg += `\n🧠 *תובנה אחרונה:*\n_${latestLesson.lesson}_`;

  await bot.api.sendMessage(OWNER_ID, msg, { parse_mode: 'Markdown' });
  console.log('[ORACLE] ✅ Done. Actionable:', actionable.length);
}

// Every 45 minutes (offset from polymarket 30min scan)
setTimeout(() => {
  runOracle();
  setInterval(runOracle, 45 * 60 * 1000);
}, 5 * 60 * 1000); // first run after 5 min delay

console.log('[ORACLE] 🔮 Oracle Agent started — Worker→Grader→Observer loop active');
