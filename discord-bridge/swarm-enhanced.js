// swarm-enhanced.js — 10 groups × 10 analysts + 1 messenger each
require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Anthropic = require('@anthropic-ai/sdk');
const { Bot } = require('grammy');
const Database = require('better-sqlite3');
const { GROUP_PROMPTS } = require('./swarm-group-prompts');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const db = new Database('/home/friends7777wolfs/OpenClawMaster/discord-bridge/swarm.db');

// Init DB
db.exec(`
  CREATE TABLE IF NOT EXISTS swarm_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet TEXT, group_id INTEGER, agent_id INTEGER,
    analysis TEXT, timestamp INTEGER
  );
  CREATE TABLE IF NOT EXISTS swarm_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_hash TEXT, group_id INTEGER,
    vote TEXT, confidence REAL, timestamp INTEGER
  );
  CREATE TABLE IF NOT EXISTS messenger_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER, action TEXT, result TEXT, timestamp INTEGER
  );
`);

const AGENTS_PER_GROUP = 10;
const NUM_GROUPS = 10;
const VOTE_CYCLE_MS = 10 * 60 * 1000; // 10 min
const TELEGRAM_OWNER = '792897455';

// Telegram bot for alerts
const tgBot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Hash tweet for dedup
function hashTweet(tweet) {
  let h = 0;
  for (let i = 0; i < tweet.length; i++) {
    h = ((h << 5) - h) + tweet.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16);
}

// Fetch latest tweets from DB
function getLatestTweets(limit = 5) {
  try {
    const tweetDb = new Database('/home/friends7777wolfs/OpenClawMaster/discord-bridge/tweets.db');
    const rows = tweetDb.prepare('SELECT content, author FROM tweets ORDER BY created_at DESC LIMIT ?').all(limit);
    tweetDb.close();
    return rows;
  } catch(e) {
    return [{ content: 'AAPL looks strong. Breaking resistance. Volume increasing.', author: 'test' }];
  }
}

// Single agent analysis
async function runAgent(groupId, agentId, tweet, groupPrompt) {
  const systemPrompt = `${groupPrompt.role}

אתה סוכן מספר ${agentId + 1} מתוך 10 בקבוצת "${groupPrompt.name}".
${groupPrompt.task}

חשוב: ענה רק ב-JSON תקני. אין טקסט לפני או אחרי ה-JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: `ניתוח ציוץ: "${tweet}"` }],
      system: systemPrompt
    });
    const text = response.content[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    return { error: e.message, agent: agentId };
  }
}

// Messenger agent — fetches additional data or sends TG
async function messengerAgent(groupId, groupName, analyses, tweet) {
  const summary = analyses.slice(0, 3).map(a => JSON.stringify(a).substring(0, 200)).join('\n');
  
  const messengerPrompt = `אתה סוכן שליח (Messenger) של קבוצת "${groupName}".
הסוכנים האנליטיים שלך ביצעו ניתוח של הציוץ הבא:
ציוץ: "${tweet}"

סיכום ניתוחים (3 ראשונים):
${summary}

המשימה שלך:
1. קבע האם יש פעולה מיידית נדרשת (BUY/SELL/WATCH/NONE)
2. אם יש פעולה — נסח הודעת Telegram קצרה (עד 200 תווים) בעברית
3. ציין אם נדרש מידע נוסף (שם חברה, דוחות, etc.)

ענה ב-JSON: { "action": "BUY|SELL|WATCH|NONE", "confidence": 0-100, "telegram_msg": "...", "needs_more_data": "..." }`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: messengerPrompt }]
    });
    const text = response.content[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    return { action: 'NONE', confidence: 0, telegram_msg: '', needs_more_data: '' };
  }
}

// Run one full group cycle
async function runGroupCycle(groupId, tweet) {
  const groupPrompt = GROUP_PROMPTS[groupId];
  console.log(`[Swarm] Group ${groupId} (${groupPrompt.name}) analyzing tweet...`);

  // Run 10 agents in parallel (batches of 5 to avoid rate limits)
  const batch1 = await Promise.all(
    Array.from({ length: 5 }, (_, i) => runAgent(groupId, i, tweet, groupPrompt))
  );
  await new Promise(r => setTimeout(r, 1000));
  const batch2 = await Promise.all(
    Array.from({ length: 5 }, (_, i) => runAgent(groupId, i + 5, tweet, groupPrompt))
  );
  const allAnalyses = [...batch1, ...batch2];

  // Save to DB
  const tweetHash = hashTweet(tweet);
  const stmt = db.prepare('INSERT INTO swarm_sessions (tweet, group_id, agent_id, analysis, timestamp) VALUES (?,?,?,?,?)');
  allAnalyses.forEach((a, i) => {
    stmt.run(tweet.substring(0, 500), groupId, i, JSON.stringify(a), Date.now());
  });

  // Messenger agent
  const messengerResult = await messengerAgent(groupId, groupPrompt.name, allAnalyses, tweet);
  db.prepare('INSERT INTO messenger_actions (group_id, action, result, timestamp) VALUES (?,?,?,?)')
    .run(groupId, messengerResult.action, JSON.stringify(messengerResult), Date.now());

  // Send TG if action required
  if (messengerResult.action !== 'NONE' && messengerResult.confidence >= 70) {
    const msg = `🤖 [Swarm G${groupId}] ${groupPrompt.name}\n` +
      `📊 ${messengerResult.action} | ${messengerResult.confidence}% confidence\n` +
      `💬 ${messengerResult.telegram_msg}\n` +
      `📝 Tweet: "${tweet.substring(0, 100)}..."`;
    try {
      await tgBot.api.sendMessage(TELEGRAM_OWNER, msg);
    } catch(e) {
      console.log('[Swarm] TG send failed:', e.message);
    }
  }

  return { groupId, groupName: groupPrompt.name, action: messengerResult.action, confidence: messengerResult.confidence };
}

// Main cycle — all 10 groups
async function runSwarmCycle() {
  console.log('[Swarm Enhanced] Starting full 10-group cycle...');
  const tweets = getLatestTweets(5);
  
  for (const tweetRow of tweets) {
    const tweet = tweetRow.content || tweetRow;
    console.log(`[Swarm] Processing tweet: "${tweet.substring(0, 60)}..."`);
    
    // Run all 10 groups in parallel (2 batches of 5)
    const batch1 = await Promise.all(
      Array.from({ length: 5 }, (_, i) => runGroupCycle(i, tweet))
    );
    await new Promise(r => setTimeout(r, 2000));
    const batch2 = await Promise.all(
      Array.from({ length: 5 }, (_, i) => runGroupCycle(i + 5, tweet))
    );
    
    const results = [...batch1, ...batch2];
    const actionGroups = results.filter(r => r.action !== 'NONE' && r.confidence >= 70);
    
    if (actionGroups.length >= 5) {
      const summary = actionGroups.map(r => `${r.groupName}: ${r.action}(${r.confidence}%)`).join('\n');
      try {
        await tgBot.api.sendMessage(TELEGRAM_OWNER,
          `🚨 [SWARM CONSENSUS] ${actionGroups.length}/10 groups aligned!\n${summary}\n\nTweet: "${tweet.substring(0, 80)}..."`
        );
      } catch(e) {}
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log('[Swarm Enhanced] Cycle complete.');
}

// Start
console.log('[Swarm Enhanced] Starting: 10 groups × 10 agents + messenger. Cycle: 10 min');
runSwarmCycle();
setInterval(runSwarmCycle, VOTE_CYCLE_MS);
