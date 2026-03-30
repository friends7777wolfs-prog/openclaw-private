require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Anthropic = require('/home/friends7777wolfs/OpenClawMaster/discord-bridge/node_modules/@anthropic-ai/sdk');
const Database = require('/home/friends7777wolfs/OpenClawMaster/discord-bridge/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const client = new Anthropic.default();
const db = new Database('/home/friends7777wolfs/OpenClawMaster/ceo-agent/ceo.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,
    score INTEGER DEFAULT 50,
    evaluation TEXT,
    motivation TEXT,
    evaluated_at TEXT DEFAULT (datetime('now')),
    is_powered_up INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS daily_champion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    reason TEXT,
    power_multiplier INTEGER DEFAULT 2,
    chosen_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ceo_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const AGENTS = [
  { name: 'discord-bridge', role: 'קורא ערוצי דיסקורד ומעבד סיגנלים' },
  { name: 'tg-userbot',     role: 'קורא ערוצי טלגרם ומעבד סיגנלים' },
  { name: 'tg-bot',         role: 'בוט טלגרם אינטראקטיבי' },
  { name: 'reporter',       role: 'יוצר דוחות יומיים ושבועיים' },
  { name: 'intelligence',   role: 'AI analyst מנתח סיגנלים' },
  { name: 'self-improve',   role: 'סורק לוגים ומתקן שגיאות' },
  { name: 'swarm',          role: 'נחיל 30 סוכני AI מקבלי החלטות' },
];

function getPM2Logs(agentName) {
  try {
    return execSync(
      `/home/friends7777wolfs/OpenClawMaster/discord-bridge/node_modules/.bin/pm2 logs ${agentName} --lines 40 --nostream 2>&1 | tail -40`,
      { encoding: 'utf8', timeout: 10000 }
    ).slice(-2500);
  } catch(e) {
    return `אין לוגים זמינים`;
  }
}

async function evaluateAgent(agent, logs) {
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 250,
    system: `אתה מנכ"ל AI של OpenClaw. העריכ סוכן לפי לוגים. החזר JSON בלבד ללא markdown:
{"score":0-100,"summary":"משפט הערכה בעברית","motivation":"מוטיבציה קצרה ומעוררת לסוכן בעברית"}`,
    messages: [{ role: 'user', content: `סוכן: ${agent.name}\nתפקיד: ${agent.role}\nלוגים:\n${logs}` }]
  });
  try {
    return JSON.parse(resp.content[0].text.replace(/```json|```/g,'').trim());
  } catch(e) {
    return { score: 50, summary: 'לא ניתן להעריך', motivation: 'המשך לתפקד מצוין!' };
  }
}

async function chooseDailyChampion(evaluations) {
  const today = new Date().toISOString().slice(0,10);
  const existing = db.prepare('SELECT * FROM daily_champion WHERE date=?').get(today);
  const champion = evaluations.sort((a,b) => b.score - a.score)[0];
  if (!existing) {
    db.prepare('INSERT INTO daily_champion (date,agent_name,reason,power_multiplier) VALUES (?,?,?,2)')
      .run(today, champion.name, champion.summary);
  }
  return champion;
}

async function runCEOCycle() {
  console.log('🏛️ CEO מתחיל הערכה...');
  const evaluations = [];
  const MOTIV_DIR = '/home/friends7777wolfs/OpenClawMaster/ceo-agent/motivations';

  for (const agent of AGENTS) {
    const logs = getPM2Logs(agent.name);
    const ev = await evaluateAgent(agent, logs);
    db.prepare('INSERT INTO agent_scores (agent_name,score,evaluation,motivation) VALUES (?,?,?,?)')
      .run(agent.name, ev.score, ev.summary, ev.motivation);
    fs.writeFileSync(
      path.join(MOTIV_DIR, `${agent.name}.json`),
      JSON.stringify({ motivation: ev.motivation, score: ev.score, ts: new Date().toISOString() }, null, 2)
    );
    evaluations.push({ name: agent.name, ...ev });
    console.log(`  ✅ ${agent.name}: ${ev.score}/100`);
  }

  const champion = await chooseDailyChampion(evaluations);
  const today = new Date().toISOString().slice(0,10);
  fs.writeFileSync(
    path.join(MOTIV_DIR, '_champion.json'),
    JSON.stringify({ date: today, champion: champion.name, score: champion.score, power: 2 }, null, 2)
  );
  return { evaluations, champion };
}

module.exports = { runCEOCycle, db, AGENTS };

if (require.main === module) {
  runCEOCycle()
    .then(() => { console.log('✅ הערכה הושלמה'); process.exit(0); })
    .catch(e => { console.error('CEO Error:', e.message); process.exit(1); });
}
