require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
require('./load_env');
const { Bot }    = require('grammy');
const Database   = require('better-sqlite3');
const path       = require('path');
const cron       = require('node-cron');

const telegram = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const db       = new Database(path.join(__dirname, '../signal-tracker/signals.db'));

function buildReport(days, title) {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const signals = db.prepare(`
    SELECT * FROM signals WHERE created_at >= ? ORDER BY created_at DESC
  `).all(since);

  const channels = db.prepare(`
    SELECT channel,
           total_signals,
           wins,
           losses,
           ROUND(CAST(wins AS FLOAT)/MAX(total_signals,1)*100,1) as win_rate,
           ROUND(total_pnl,2) as total_pnl,
           ROUND(weight,3) as weight
    FROM channel_stats
    WHERE total_signals > 0
    ORDER BY win_rate DESC
    LIMIT 10
  `).all();

  const total    = signals.length;
  const wins     = signals.filter(s => s.result === 'win').length;
  const losses   = signals.filter(s => s.result === 'loss').length;
  const pending  = signals.filter(s => s.status === 'pending').length;
  const totalPnl = signals.reduce((s,r) => s + (r.pnl||0), 0);
  const winRate  = total > 0 ? ((wins/Math.max(wins+losses,1))*100).toFixed(1) : 'N/A';

  let text = `📊 *${title}*\n`;
  text += `━━━━━━━━━━━━━━━\n`;
  text += `📈 סיגנלים: ${total} | ✅ ${wins} | ❌ ${losses} | ⏳ ${pending}\n`;
  text += `🎯 Win Rate: ${winRate}%\n`;
  text += `💰 P&L: $${totalPnl.toFixed(2)}\n\n`;

  if (channels.length > 0) {
    text += `🏆 *דירוג ערוצים:*\n`;
    channels.slice(0,8).forEach((ch, i) => {
      const medal = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'][i] || '▫️';
      text += `${medal} \`${ch.channel.slice(0,20)}\`\n`;
      text += `   Win: ${ch.win_rate}% | משקל: ${ch.weight} | סיגנלים: ${ch.total_signals}\n`;
    });
  }

  return text;
}

// דוח יומי — כל יום ב-21:00
cron.schedule('0 21 * * *', async () => {
  const text = buildReport(1, `דוח יומי — ${new Date().toLocaleDateString('he-IL')}`);
  await telegram.api.sendMessage(process.env.TELEGRAM_CHAT_ID, text, { parse_mode: 'Markdown' });
  console.log('📨 דוח יומי נשלח');
});

// דוח שבועי — כל ראשון ב-09:00
cron.schedule('0 9 * * 1', async () => {
  const text = buildReport(7, 'דוח שבועי — OpenClaw');
  await telegram.api.sendMessage(process.env.TELEGRAM_CHAT_ID, text, { parse_mode: 'Markdown' });
  console.log('📨 דוח שבועי נשלח');
});

console.log('✅ Reporter פעיל | יומי 21:00 | שבועי ראשון 09:00');
module.exports = { buildReport };
