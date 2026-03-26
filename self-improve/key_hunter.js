require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env', override: true });
const { Bot } = require('grammy');
const telegram = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

const NEEDED_KEYS = [
  { key: 'ELEVENLABS_API_KEY',   name: 'ElevenLabs (קריינות עברית)', url: 'https://elevenlabs.io/app/speech-synthesis → Profile → API Key', free: true },
  { key: 'OPENAI_API_KEY',       name: 'OpenAI GPT-4',               url: 'https://platform.openai.com/api-keys', free: false },
  { key: 'GEMINI_API_KEY',       name: 'Google Gemini',              url: 'https://aistudio.google.com/app/apikey', free: true },
  { key: 'BRAVE_API_KEY',        name: 'Brave Search API',           url: 'https://api.search.brave.com/register', free: true },
  { key: 'PERPLEXITY_API_KEY',   name: 'Perplexity AI',              url: 'https://www.perplexity.ai/settings/api', free: false },
  { key: 'FIRECRAWL_API_KEY',    name: 'Firecrawl (web scraping)',   url: 'https://firecrawl.dev → Dashboard → API Keys', free: true },
  { key: 'EMAIL_USER',           name: 'Gmail לדוחות',              url: 'Gmail → Settings → App Passwords', free: true },
  { key: 'YOUTUBE_CLIENT_SECRET',name: 'YouTube API',                url: 'https://console.cloud.google.com → APIs → YouTube Data API v3', free: true },
  { key: 'TIKTOK_API_KEY',       name: 'TikTok Shop API',            url: 'https://partner.tiktokshop.com → Apps → Create App', free: true },
  { key: 'EBAY_API_KEY',         name: 'eBay API',                   url: 'https://developer.ebay.com → My Account → Application Keys', free: true },
  { key: 'ETSY_API_KEY',         name: 'Etsy API',                   url: 'https://www.etsy.com/developers/register', free: true },
];

async function checkAndNotify() {
  const missing = NEEDED_KEYS.filter(k => !process.env[k.key]);
  const present = NEEDED_KEYS.filter(k => !!process.env[k.key]);

  let msg = `🔑 *דוח API Keys — OpenClaw*\n\n`;
  msg += `✅ *מחוברים (${present.length}):*\n`;
  present.forEach(k => msg += `  ✅ ${k.name}\n`);

  msg += `\n❌ *חסרים (${missing.length}):*\n`;
  missing.forEach(k => {
    msg += `\n🔴 *${k.name}* ${k.free ? '(חינם)' : '(בתשלום)'}\n`;
    msg += `📎 ${k.url}\n`;
    msg += `⌨️ לאחר קבלה הרץ:\n`;
    msg += `\`echo "${k.key}=VALUE" >> ~/OpenClawMaster/discord-bridge/.env\`\n`;
  });

  await telegram.api.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
  console.log(`✅ נשלח | חסרים: ${missing.length} | קיימים: ${present.length}`);
  process.exit(0);
}

checkAndNotify().catch(e => { console.error(e.message); process.exit(1); });
