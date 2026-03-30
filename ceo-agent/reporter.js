require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Anthropic = require('/home/friends7777wolfs/OpenClawMaster/discord-bridge/node_modules/@anthropic-ai/sdk');
const Database = require('/home/friends7777wolfs/OpenClawMaster/discord-bridge/node_modules/better-sqlite3');
const { Bot } = require('/home/friends7777wolfs/OpenClawMaster/discord-bridge/node_modules/grammy');
const { runCEOCycle } = require('./engine.js');

const client = new Anthropic.default();
const db = new Database('/home/friends7777wolfs/OpenClawMaster/ceo-agent/ceo.db');
const OWNER_CHAT_ID = 792897455;

let bot;
function getBot() {
  if (!bot) bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
  return bot;
}

async function generateReport(evaluations, champion) {
  const scores = evaluations.map(e => `• ${e.name}: ${e.score}/100 — ${e.summary}`).join('\n');
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    system: `אתה מנכ"ל AI של OpenClaw. כתוב דוח קצר ומקצועי בעברית לאורי והראל — המנהלים העליונים.
כלול: סטטוס כללי, בעיות בולטות, הישגים, המלצה אחת. ישיר ותמציתי.`,
    messages: [{ role: 'user', content: `ביצועים:\n${scores}\nאלוף: ${champion.name} (${champion.score}/100) — ${champion.summary}` }]
  });
  return resp.content[0].text;
}

async function runReport() {
  console.log(`[${new Date().toISOString()}] 📊 מפעיל מחזור CEO...`);
  try {
    const { evaluations, champion } = await runCEOCycle();
    const report = await generateReport(evaluations, champion);
    const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    const today = new Date().toISOString().slice(0,10);
    const champ = db.prepare('SELECT * FROM daily_champion WHERE date=?').get(today);

    const avgScore = Math.round(evaluations.reduce((s,e) => s+e.score, 0) / evaluations.length);
    const top3 = evaluations.sort((a,b)=>b.score-a.score).slice(0,3).map(e=>`${e.name} ${e.score}/100`).join(' | ');

    const msg =
      `🏛️ *דוח מנכ"ל OpenClaw*\n` +
      `⏰ ${now}\n` +
      `📈 ממוצע מערכת: *${avgScore}/100*\n\n` +
      `${report}\n\n` +
      `🏆 *טופ 3:* ${top3}\n\n` +
      `👑 *אלוף היום:* ${champ?.agent_name || champion.name}\n` +
      `⚡ *כוח כפול פעיל* — טוקנים x2, עדיפות בהצבעות\n\n` +
      `_📬 הדוח הבא בעוד 4 שעות_`;

    await getBot().api.sendMessage(OWNER_CHAT_ID, msg, { parse_mode: 'Markdown' });
    db.prepare('INSERT INTO ceo_reports (report) VALUES (?)').run(report);
    console.log('✅ דוח נשלח');
  } catch(e) {
    console.error('Reporter Error:', e.message);
  }
}

// הרצה ראשונה מיידית
runReport();
// כל 4 שעות
setInterval(runReport, 4 * 60 * 60 * 1000);
