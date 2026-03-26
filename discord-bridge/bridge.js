require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env', override: true });
const { Client } = require('discord.js-selfbot-v13');
const { Bot }    = require('grammy');
const Anthropic  = require('@anthropic-ai/sdk');
const { executeTrade }     = require('./trader');
const { detectAsset }      = require('./asset_detector');
const { monitorPositions } = require('./macd_monitor');
const { saveSignal } = require('../intelligence/collector');

const discord   = new Client({ checkUpdate: false });
const telegram  = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const watchedChannels = process.env.DISCORD_CHANNEL_IDS
  ? process.env.DISCORD_CHANNEL_IDS.split(',').map(id => id.trim())
  : [];

// מניעת כפילויות
const recentMessages = new Map();
function isDuplicate(content) {
  const key = content.slice(0, 80).trim();
  const now = Date.now();
  if (recentMessages.has(key) && now - recentMessages.get(key) < 10000) return true;
  recentMessages.set(key, now);
  for (const [k,t] of recentMessages) if (now-t > 30000) recentMessages.delete(k);
  return false;
}

// keywords חזקים = סיגנל ברור
const STRONG_KEYWORDS = ['buy','sell','long','short','entry','enter','tp','sl','stop loss','take profit'];
const WEAK_KEYWORDS   = ['signal','alert','score','bos','momentum'];

function signalStrength(content) {
  const lower = content.toLowerCase();
  const strong = STRONG_KEYWORDS.filter(k => lower.includes(k)).length;
  const weak   = WEAK_KEYWORDS.filter(k => lower.includes(k)).length;
  return { strong, weak };
}

// פרסור מקומי — ללא Claude
function tryParseLocal(content, channelName) {
  // פורמט SCORE
  const scoreMatch = content.match(/SCORE:\s*([\d.]+)%\s*\|\s*([\d.]+)\s*\|\s*(\d{2}:\d{2}:\d{2})/);
  if (scoreMatch) {
    const isBuy  = content.includes('🟢') || content.includes('⬆️');
    const isSell = content.includes('🔴') || content.includes('⬇️');
    const asset  = detectAsset(content, channelName);
    if (!asset) return null;
    return `Action_type: ${isBuy?'Long':isSell?'Short':'N/A'}
Asset: ${asset.symbol}
Entering price: ${scoreMatch[2]}
Buy or Sell: ${isBuy?'Buy':isSell?'Sell':'Unknown'}
Take profit 1: N/A
Stop loss: N/A
Risk_per: ${scoreMatch[1]}%`;
  }

  // פורמט מובנה: Buy/Sell + מחיר
  const dirMatch  = content.match(/\b(buy|sell|long|short)\b/i);
  const priceMatch = content.match(/(?:entry|enter|price|@)\s*:?\s*([\d]{3,6}(?:\.\d+)?)/i);
  const tpMatch   = content.match(/(?:tp|take.?profit)\s*1?\s*:?\s*([\d]{3,6}(?:\.\d+)?)/i);
  const slMatch   = content.match(/(?:sl|stop.?loss)\s*:?\s*([\d]{3,6}(?:\.\d+)?)/i);
  const asset     = detectAsset(content, channelName);

  if (!dirMatch || !priceMatch || !asset) return null;

  const isBuy = /buy|long/i.test(dirMatch[1]);
  return `Asset: ${asset.symbol}
Buy or Sell: ${isBuy ? 'Buy' : 'Sell'}
Entering price: ${priceMatch[1]}
Take profit 1: ${tpMatch ? tpMatch[1] : 'N/A'}
Stop loss: ${slMatch ? slMatch[1] : 'N/A'}
Action_type: ${isBuy ? 'Long' : 'Short'}`;
}

function isUsefulSignal(parsed) {
  return parsed.match(/Entering price:\s*(?!N\/A)(\S+)/) &&
        (parsed.match(/Buy or Sell:\s*(Buy|Sell)/i) ||
         parsed.match(/Action_type:\s*(Long|Short)/i));
}

// Claude רק כ-fallback — הודעות קצרות בלבד
async function parseWithClaude(content, channelName) {
  // חסוך: דלג אם הטקסט ארוך (לא סיגנל) או חלש מדי
  if (content.length > 400) return { type: 'skip' };
  const { strong } = signalStrength(content);
  if (strong < 1) return { type: 'skip' };

  const asset = detectAsset(content, channelName);
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `סיגנל מסחר? אם לא: NOT_SIGNAL. אם כן מלא (חסר=N/A):
Asset: ${asset?.symbol || '?'}
Buy or Sell: 
Entering price: 
Take profit 1: 
Stop loss: 
Action_type: 
---
${content.slice(0, 300)}`
    }]
  });
  const text = response.content[0].text.trim();
  if (text.startsWith('NOT_SIGNAL')) return { type: 'skip' };
  if (!isUsefulSignal(text)) return { type: 'skip' };
  return { type: 'signal', text };
}

async function handleSignal(content, channelName, serverName) {
  try { saveSignal(serverName||'tg', channelName, content); } catch(e) {}
  if (isDuplicate(content)) return;
  const { strong, weak } = signalStrength(content);
  if (strong === 0 && weak === 0) return; // לא רלוונטי בכלל

  // נסה פרסור מקומי קודם — בחינם
  let signalText = tryParseLocal(content, channelName);

  // fallback ל-Claude רק אם יש keywords חזקים ופרסור מקומי נכשל
  if (!signalText && strong >= 1) {
    const result = await parseWithClaude(content, channelName);
    if (result.type === 'skip') return;
    signalText = result.text;
  }

  if (!signalText) return;

  // שלח לטלגרם
  await telegram.api.sendMessage(process.env.TELEGRAM_CHAT_ID,
    `📊 *סיגנל | ${serverName} #${channelName}*\n\`\`\`\n${signalText}\n\`\`\``,
    { parse_mode: 'Markdown' }
  );

  // פתח עסקה
  const trade = await executeTrade(signalText, channelName);
  if (trade && !trade.blocked) {
    await telegram.api.sendMessage(process.env.TELEGRAM_CHAT_ID,
      `✅ *עסקה נפתחה*\n🎯 ${trade.asset?.mt5} | ${trade.lots} lots\n⚠️ Risk: ${trade.riskPct?.toFixed(2)}% | SL: ${trade.sl}`,
      { parse_mode: 'Markdown' }
    );
  } else if (trade?.blocked) {
    await telegram.api.sendMessage(process.env.TELEGRAM_CHAT_ID,
      `🛑 *נחסמה*\n${trade.reason}`, { parse_mode: 'Markdown' }
    );
  }
}

discord.on('ready', () => {
  console.log(`✅ מחובר: ${discord.user.tag}`);
  console.log(`👂 ${watchedChannels.length} ערוצים`);
  setInterval(() => monitorPositions(telegram), 60 * 1000);
});

discord.on('messageCreate', async (message) => {
  if (!message.content) return;
  if (!watchedChannels.includes(message.channelId)) return;
  const server  = message.guild?.name   || 'Unknown';
  const channel = message.channel?.name || 'unknown';
  try {
    await handleSignal(message.content, channel, server);
  } catch (err) {
    console.error('❌ bridge:', err.message);
  }
});

discord.login(process.env.DISCORD_TOKEN);

// Webhook מ-Telegram Userbot
const http = require('http');
const webhookServer = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/tg-signal') {
    res.writeHead(404); res.end(); return;
  }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { content, channel } = JSON.parse(body);
      if (!content) { res.writeHead(400); res.end(); return; }
      await handleSignal(content, channel || 'tg', 'Telegram');
      res.writeHead(200); res.end('ok');
    } catch (e) {
      console.error('❌ webhook:', e.message);
      res.writeHead(500); res.end();
    }
  });
});
webhookServer.listen(3000, () => console.log('🌐 Webhook :3000'));
