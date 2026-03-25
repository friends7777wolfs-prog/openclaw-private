require('dotenv').config();
const cron  = require('node-cron');
const { Bot } = require('grammy');
const { getReport } = require('./stats');

const telegram = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

function buildReport(days, title) {
  const { channels, wins, losses, totalPnl } = getReport(days);
  const total    = wins + losses;
  const winRate  = total > 0 ? ((wins / total) * 100).toFixed(1) : 'N/A';

  let text = `📊 *${title}*\n`;
  text += `━━━━━━━━━━━━━━━\n`;
  text += `✅ ניצחונות: ${wins} | ❌ הפסדים: ${losses}\n`;
  text += `🎯 אחוז הצלחה: ${winRate}%\n`;
  text += `💰 P&L כולל: ${totalPnl.toFixed(2)}\n\n`;
  text += `📡 *דירוג ערוצים:*\n`;

  channels.forEach((ch, i) => {
    const wr = ch.total_signals > 0
      ? ((ch.wins / ch.total_signals) * 100).toFixed(0)
      : 0;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
    text += `${medal} #${ch.channel}\n`;
    text += `   Win: ${wr}% | משקל: ${ch.weight?.toFixed(2)} | סיגנלים: ${ch.total_signals}\n`;
  });

  return text;
}

// דוח יומי — כל יום ב-20:00
cron.schedule('0 20 * * *', async () => {
  const text = buildReport(1, 'דוח יומי — OpenClaw Signals');
  await telegram.api.sendMessage(CHAT_ID, text, { parse_mode: 'Markdown' });
  console.log('📨 דוח יומי נשלח');
});

// דוח שבועי — כל ראשון ב-09:00
cron.schedule('0 9 * * 1', async () => {
  const text = buildReport(7, 'דוח שבועי — OpenClaw Signals');
  await telegram.api.sendMessage(CHAT_ID, text, { parse_mode: 'Markdown' });
  console.log('📨 דוח שבועי נשלח');
});

console.log('✅ Reporter פעיל — דוח יומי 20:00, שבועי ראשון 09:00');
