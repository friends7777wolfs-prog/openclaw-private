require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const { Bot, InlineKeyboard } = require('grammy');
const Anthropic = require('@anthropic-ai/sdk');
const Database  = require('better-sqlite3');
const path      = require('path');

const bot       = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const db        = new Database(path.join(__dirname, '../signal-tracker/signals.db'));

// שיחות פעילות לזיכרון הקשר
const conversations = new Map();

// פורמט סיגנל מקיף
function formatSignal(signal, channel, tradeInfo = null) {
  const lines = signal.split('\n');
  const get   = (key) => {
    const l = lines.find(l => l.startsWith(key));
    return l ? l.split(':').slice(1).join(':').trim() : 'N/A';
  };

  const asset     = get('Currency');
  const action    = get('Action_type');
  const entry     = get('Entering price');
  const direction = get('Buy or Sell');
  const tp1       = get('Take profit 1');
  const tp2       = get('Take profit 2');
  const sl        = get('Stop loss');
  const name      = get('Name');
  const risk      = get('Risk_per');

  const emoji = direction === 'Buy' ? '🟢' : '🔴';
  const arrow = direction === 'Buy' ? '📈' : '📉';

  let text = `${emoji} *סיגנל מסחר חדש* ${arrow}\n`;
  text += `━━━━━━━━━━━━━━━\n`;
  text += `🎯 *נכס:* \`${asset}\`\n`;
  text += `📊 *כיוון:* ${action} (${direction})\n`;
  text += `💰 *כניסה:* \`${entry}\`\n`;

  if (tp1 !== 'N/A') text += `✅ *TP1:* \`${tp1}\`\n`;
  if (tp2 !== 'N/A') text += `✅ *TP2:* \`${tp2}\`\n`;
  if (sl  !== 'N/A') text += `🛑 *SL:* \`${sl}\`\n`;
  if (risk !== 'N/A') text += `⚠️ *סיכון:* ${risk}\n`;

  text += `📡 *מקור:* #${channel}\n`;
  text += `🕐 *זמן:* ${new Date().toLocaleTimeString('he-IL')}\n`;

  if (tradeInfo) {
    text += `━━━━━━━━━━━━━━━\n`;
    text += `✅ *עסקה נפתחה ב-MT5*\n`;
    text += `📦 *Lots:* ${tradeInfo.lots}\n`;
    text += `⚠️ *Risk:* ${tradeInfo.riskPct?.toFixed(2)}%\n`;
  }

  return text;
}

// תגובה חכמה לפי הקשר
async function smartReply(chatId, userMessage, context = '') {
  const history = conversations.get(chatId) || [];

  // קבלת נתונים עדכניים מה-DB
  const recentSignals = db.prepare(`
    SELECT channel, action_type, currency, direction, entry_price, result, pnl
    FROM signals ORDER BY created_at DESC LIMIT 20
  `).all();

  const channelStats = db.prepare(`
    SELECT channel, total_signals, wins, losses,
           ROUND(CAST(wins AS FLOAT)/MAX(total_signals,1)*100,1) as win_rate,
           ROUND(weight,2) as weight
    FROM channel_stats ORDER BY win_rate DESC LIMIT 10
  `).all();

  const todayPnl = db.prepare(`
    SELECT COALESCE(SUM(pnl),0) as total
    FROM signals WHERE date(created_at) = date('now')
  `).get();

  const { SYSTEM_PROMPT } = require('./bot_context');
const systemContext = `${SYSTEM_PROMPT}


אתה OpenClaw AI — עוזר מסחר חכם.
נתונים עדכניים:
- סיגנלים אחרונים: ${JSON.stringify(recentSignals.slice(0,5))}
- סטטיסטיקות ערוצים: ${JSON.stringify(channelStats.slice(0,5))}
- P&L היום: $${todayPnl?.total?.toFixed(2) || '0.00'}
${context}

ענה בעברית, תמציתי ומועיל. אם שואלים על סיגנל ספציפי — נתח אותו.
אם שואלים על ביצועים — תן נתונים מדויקים מה-DB.`;

  history.push({ role: 'user', content: userMessage });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemContext,
    messages: history
  });

  const reply = response.content[0].text;
  history.push({ role: 'assistant', content: reply });

  // שמירת היסטוריה (מקסימום 10 הודעות)
  conversations.set(chatId, history.slice(-10));

  return reply;
}

// פקודות בוט

bot.command('start', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  await ctx.reply(
    '🦞 *OpenClaw Bot מחובר!*\n\n' +
    'מה אני יכול לעשות:\n' +
    '📊 /stats — סטטיסטיקות ערוצים\n' +
    '💰 /pnl — P&L היום\n' +
    '📈 /signals — סיגנלים אחרונים\n' +
    '🏆 /top — ערוצים הכי טובים\n' +
    '❓ שאל אותי כל שאלה על המסחר!',
    { parse_mode: 'Markdown' }
  );
});

bot.command('stats', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  const stats = db.prepare(`
    SELECT channel, total_signals, wins, losses,
           ROUND(CAST(wins AS FLOAT)/MAX(total_signals,1)*100,1) as win_rate,
           ROUND(weight,2) as weight
    FROM channel_stats WHERE total_signals > 0
    ORDER BY win_rate DESC LIMIT 10
  `).all();

  let text = '📊 *סטטיסטיקות ערוצים*\n━━━━━━━━━━━━━━━\n';
  stats.forEach((s, i) => {
    const medal = ['🥇','🥈','🥉'][i] || '▫️';
    text += `${medal} \`${s.channel.slice(0,18)}\`\n`;
    text += `   Win: ${s.win_rate}% | משקל: ${s.weight} | סיגנלים: ${s.total_signals}\n`;
  });

  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.command('pnl', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  const today = db.prepare(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN result='win' THEN 1 ELSE 0 END) as wins,
           SUM(CASE WHEN result='loss' THEN 1 ELSE 0 END) as losses,
           ROUND(COALESCE(SUM(pnl),0),2) as total_pnl
    FROM signals WHERE date(created_at) = date('now')
  `).get();

  const text = `💰 *P&L היום*\n━━━━━━━━━━━━━━━\n` +
    `📈 סיגנלים: ${today.total}\n` +
    `✅ ניצחונות: ${today.wins}\n` +
    `❌ הפסדים: ${today.losses}\n` +
    `💵 P&L: $${today.total_pnl}`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.command('signals', async (ctx) => {
  const signals = db.prepare(`
    SELECT channel, currency, direction, entry_price, result, created_at
    FROM signals ORDER BY created_at DESC LIMIT 8
  `).all();

  let text = '📈 *סיגנלים אחרונים*\n━━━━━━━━━━━━━━━\n';
  signals.forEach(s => {
    const emoji = s.direction === 'Buy' ? '🟢' : '🔴';
    const result = s.result === 'win' ? '✅' : s.result === 'loss' ? '❌' : '⏳';
    text += `${emoji} ${s.currency} | ${s.entry_price} ${result}\n`;
    text += `   📡 ${s.channel?.slice(0,20)}\n`;
  });

  await ctx.reply(text, { parse_mode: 'Markdown' });
});

bot.command('top', async (ctx) => {
  const reply = await smartReply(ctx.chat.id, 'תן לי את 5 הערוצים הטובים ביותר עם ניתוח קצר');
  await ctx.reply(reply, { parse_mode: 'Markdown' });
});

// תגובה לכל הודעה רגילה
bot.on('message:text', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  try {
    await ctx.replyWithChatAction('typing');
    const reply = await smartReply(ctx.chat.id, text);
    await ctx.reply(reply, { parse_mode: 'Markdown' });
  } catch(e) {
    console.error('❌ bot reply:', e.message);
    await ctx.reply('מצטער, הייתה שגיאה. נסה שוב.');
  }
});

bot.start();
console.log('✅ Telegram Bot אינטראקטיבי פעיל');

module.exports = { formatSignal, bot };

// הרשאות מלאות — Owner commands
bot.command('help', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  await ctx.reply(`🦞 *OpenClaw — פקודות מלאות*

📊 *סטטוס:*
/status — סטטוס כל הsystems
/logs — לוגים אחרונים
/pnl — רווח/הפסד היום
/stats — סטטיסטיקות ערוצים

⚙️ *שליטה:*
/restart [process] — הפעלה מחדש
/stop [process] — עצירה
/start_all — הפעלת הכל

🔧 *קוד:*
/run [קוד] — הרצת bash command
/fix [תיאור] — Claude מתקן בעיה
/deploy — git push + restart all

📈 *מסחר:*
/trades — עסקאות פתוחות
/close_all — סגירת כל העסקאות
/risk [%] — שינוי רמת סיכון

💬 *שאל כל שאלה בשפה חופשית!*`, 
  { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  const { execSync } = require('child_process');
  const pm2 = execSync('cd /home/friends7777wolfs/OpenClawMaster/discord-bridge && ./node_modules/.bin/pm2 jlist').toString();
  const processes = JSON.parse(pm2);
  let msg = '🖥 *סטטוס OpenClaw:*\n\n';
  processes.forEach(p => {
    const icon = p.pm2_env.status === 'online' ? '✅' : '❌';
    msg += `${icon} ${p.name} | ${p.pm2_env.status} | 🔄 ${p.pm2_env.restart_time}x | 💾 ${Math.round(p.monit?.memory/1024/1024)}MB\n`;
  });
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('run', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  const { execSync } = require('child_process');
  const cmd = ctx.message.text.replace('/run ', '');
  try {
    const output = execSync(cmd, { timeout: 10000 }).toString();
    await ctx.reply(`\`\`\`\n${output.slice(0,3000)}\n\`\`\``, { parse_mode: 'Markdown' });
  } catch(e) {
    await ctx.reply(`❌ ${e.message.slice(0,500)}`);
  }
});

bot.command('restart', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  const { execSync } = require('child_process');
  const process_name = ctx.message.text.replace('/restart ', '').trim() || 'all';
  try {
    execSync(`cd /home/friends7777wolfs/OpenClawMaster/discord-bridge && ./node_modules/.bin/pm2 restart ${process_name} --update-env`);
    await ctx.reply(`✅ ${process_name} הופעל מחדש`);
  } catch(e) {
    await ctx.reply(`❌ ${e.message}`);
  }
});

bot.command('deploy', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  const { execSync } = require('child_process');
  try {
    execSync('cd /home/friends7777wolfs/OpenClawMaster && git add . && git commit -m "Auto deploy" && git push origin main');
    execSync('cd /home/friends7777wolfs/OpenClawMaster/discord-bridge && ./node_modules/.bin/pm2 restart all --update-env');
    await ctx.reply('✅ Deploy הצליח — כל הprocesses הופעלו מחדש');
  } catch(e) {
    await ctx.reply(`❌ ${e.message.slice(0,500)}`);
  }
});

bot.command('logs', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  const { execSync } = require('child_process');
  const process_name = ctx.message.text.replace('/logs', '').trim() || '';
  try {
    const logs = execSync(`cd /home/friends7777wolfs/OpenClawMaster/discord-bridge && ./node_modules/.bin/pm2 logs ${process_name} --lines 20 --nostream 2>/dev/null | tail -20`).toString();
    await ctx.reply(`\`\`\`\n${logs.slice(0,3000)}\n\`\`\``, { parse_mode: 'Markdown' });
  } catch(e) {
    await ctx.reply(`❌ ${e.message}`);
  }
});

// תמיכה בתמונות — ניתוח גרפים
bot.on('message:photo', async (ctx) => {
  if (ctx.from?.id !== 792897455) return;
  try {
    await ctx.replyWithChatAction('typing');
    const photo   = ctx.message.photo[ctx.message.photo.length - 1];
    const caption = ctx.message.caption || 'נתח את התמונה הזו בהקשר מסחרי';
    const reply   = await smartReply(ctx.chat.id, `[תמונה נשלחה] ${caption}`);
    await ctx.reply(reply, { parse_mode: 'Markdown' });
  } catch(e) {
    await ctx.reply(`❌ ${e.message}`);
  }
});
