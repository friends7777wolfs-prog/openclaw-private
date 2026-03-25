require('./load_env');
const { Client } = require('discord.js-selfbot-v13');
const { Bot }    = require('grammy');
const Anthropic  = require('@anthropic-ai/sdk');
const { executeTrade }    = require('./trader');
const { monitorPositions } = require('./macd_monitor');

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

const SIGNAL_KEYWORDS = [
  'long','short','buy','sell','entry','enter','bos','score',
  'tp','sl','stop','profit','asset','close','momentum',
  'signal','alert','mnq','nq','es','eur','usd','btc','eth',
  'mgc','gold','xau','nas','sp5','gbp','jpy','aud','cad',
  'nzd','chf','silver','xag'
];

function mightBeSignal(content) {
  return SIGNAL_KEYWORDS.some(kw => content.toLowerCase().includes(kw));
}

function detectCurrency(content, channelName) {
  const pairs = [
    'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD',
    'USDCAD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD',
    'BTCUSD','ETHUSD','NAS100','SP500'
  ];
  const upper = (content + channelName).toUpperCase();
  for (const p of pairs) if (upper.includes(p)) return p;

  const map = {
    'MNQ':'MNQ','NQ':'NQ','ES':'ES','MGC':'MGC',
    'BTC':'BTC','ETH':'ETH','GC':'GC','CL':'USOIL'
  };
  for (const [k,v] of Object.entries(map)) if (upper.includes(k)) return v;

  if (channelName.toLowerCase().includes('nasdaq')) return 'MNQ';
  if (channelName.toLowerCase().includes('gold'))   return 'XAUUSD';
  if (channelName.toLowerCase().includes('forex'))  return 'EURUSD';
  return 'MNQ';
}

function tryParseScore(content, channelName) {
  const m = content.match(/SCORE:\s*([\d.]+)%\s*\|\s*([\d.]+)\s*\|\s*(\d{2}:\d{2}:\d{2})/);
  if (!m) return null;
  const isBuy  = content.includes('🟢') || content.includes('⬆️');
  const isSell = content.includes('🔴') || content.includes('⬇️');
  return `Action_type: ${isBuy?'Long':isSell?'Short':'N/A'}
Currency: ${detectCurrency(content, channelName)}
Entering price: ${m[2]}
Buy or Sell: ${isBuy?'Buy':isSell?'Sell':'Unknown'}
Take profit 1: N/A
Take profit 2: N/A
Stop loss: N/A
Name: ${channelName.includes('bos')?'BOS':channelName.includes('tape')?'Tape':'Signal'}
Risk_per: ${m[1]}%`;
}

function isUsefulSignal(parsed) {
  return parsed.match(/Entering price:\s*(?!N\/A)(\S+)/) &&
        (parsed.match(/Buy or Sell:\s*(?!N\/A)(Buy|Sell)/i) ||
         parsed.match(/Action_type:\s*(?!N\/A)(Long|Short|BOS)/i));
}

async function parseSignal(content, channelName) {
  const currency = detectCurrency(content, channelName);
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `האם זה סיגנל מסחר? אם כן מלא, חסר=N/A. אם לא: NOT_SIGNAL
הנכס כנראה: ${currency}

Action_type: 
Currency: 
Entering price: 
Buy or Sell: 
Take profit 1: 
Take profit 2: 
Stop loss: 
Name: 
Risk_per: 

הודעה: ${content}`
    }]
  });
  const result = response.content[0].text.trim();
  if (result === 'NOT_SIGNAL') return { type: 'skip' };
  if (!isUsefulSignal(result)) return { type: 'skip' };
  return { type: 'signal', text: result };
}

discord.on('ready', async () => {
  console.log(`✅ מחובר: ${discord.user.tag}`);
  console.log(`👂 ${watchedChannels.length} ערוצים`);

  // הפעלת MACD monitor כל דקה
  console.log('📊 MACD monitor מופעל — בדיקה כל 60 שניות');
  setInterval(() => monitorPositions(telegram), 60 * 1000);
});

discord.on('messageCreate', async (message) => {
  if (!message.content) return;
  if (!watchedChannels.includes(message.channelId)) return;
  if (!mightBeSignal(message.content)) return;
  if (isDuplicate(message.content)) return;

  const channel = message.channel?.name || 'unknown';
  const content = message.content;

  try {
    let signalText = tryParseScore(content, channel);
    if (signalText) signalText = enrichSignal(signalText, channel, content);
    if (!signalText) {
      const result = await parseSignal(content, channel);
      if (result.type === 'skip') return;
      signalText = result.text;
    }

    // טלגרם
    await telegram.api.sendMessage(process.env.TELEGRAM_CHAT_ID,
      `📊 *סיגנל | #${channel}*\n\n\`\`\`\n${signalText}\n\`\`\``,
      { parse_mode: 'Markdown' }
    );

    // MT5
    const trade = await executeTrade(signalText, channel);
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

  } catch (err) {
    console.error('❌', err.message);
  }
});

discord.login(process.env.DISCORD_TOKEN);

// Webhook לקבלת סיגנלים מ-Telegram Userbot
const http = require('http');
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/tg-signal') {
    res.writeHead(404); res.end(); return;
  }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { content, channel } = JSON.parse(body);
      console.log(`📩 Telegram signal: [${channel}] ${content.slice(0,60)}`);

      if (!mightBeSignal(content)) { res.writeHead(200); res.end('skip'); return; }
      if (isDuplicate(content))    { res.writeHead(200); res.end('dup');  return; }

      let signalText = tryParseScore(content, channel) || null;
      if (!signalText) {
        const result = await parseSignal(content, channel);
        if (result.type === 'skip') { res.writeHead(200); res.end('skip'); return; }
        signalText = result.text;
      }

      await telegram.api.sendMessage(process.env.TELEGRAM_CHAT_ID,
        `📊 *סיגנל TG | ${channel}*\n\n\`\`\`\n${signalText}\n\`\`\``,
        { parse_mode: 'Markdown' }
      );

      await executeTrade(signalText, channel);
      res.writeHead(200); res.end('ok');
    } catch(e) {
      console.error('❌ webhook:', e.message);
      res.writeHead(500); res.end();
    }
  });
});
server.listen(3001, () => console.log('🌐 Webhook פעיל על port 3001'));

// שמירה ב-Intelligence Engine
const { saveSignal: saveToIntel } = require('../intelligence/collector');
