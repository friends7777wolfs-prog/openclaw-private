require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
function escapeHtml(t) { return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
const cron       = require('node-cron');
const { Bot }    = require('grammy');
const nodemailer = require('nodemailer');
const { analyzeMarket, extractSignal } = require('./analyst');
const Database   = require('better-sqlite3');
const db         = new Database('/home/friends7777wolfs/OpenClawMaster/intelligence/intelligence.db');

const telegram = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

// שליחת ניתוח לטלגרם
async function sendAnalysis() {
  try {
    console.log('🧠 מנתח שוק...');
    const result = await analyzeMarket();
    if (!result) {
      console.log('⏭️ אין מספיק נתונים');
      return;
    }

    const { analysis, hotAssets } = result;

    // שליחת ניתוח
    const msg = `🧠 *OpenClaw Intelligence*\n_${new Date().toLocaleTimeString('he-IL')}_\n\n${analysis}`;

    // חלוקה לחלקים אם ארוך מדי
    const chunks = msg.match(/[\s\S]{1,4000}/g) || [msg];
    for (const chunk of chunks) {
      await telegram.api.sendMessage(CHAT_ID, escapeHtml(chunk), { parse_mode: 'HTML' });
    }

    // בדיקת סיגנל AI
    const signal = extractSignal(analysis);
    if (signal && signal.confidence >= 70) {
      console.log(`🎯 AI Signal: ${signal.asset} ${signal.direction} @ ${signal.entry}`);

      // שמירה ב-DB
      db.prepare(`
        INSERT INTO ai_signals (asset, direction, entry_price, tp1, tp2, sl, confidence, reasoning, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AI')
      `).run(signal.asset, signal.direction, signal.entry, signal.tp1, signal.tp2, signal.sl, signal.confidence, analysis.slice(0,500));

      // שליחה לbridge לביצוע ב-MT5
      const http = require('http');
      const body = JSON.stringify({
        content: `Action_type: ${signal.direction === 'BUY' ? 'Long' : 'Short'}
Currency: ${signal.asset}
Entering price: ${signal.entry}
Buy or Sell: ${signal.direction === 'BUY' ? 'Buy' : 'Sell'}
Take profit 1: ${signal.tp1}
Take profit 2: ${signal.tp2}
Stop loss: ${signal.sl}
Name: AI-Consensus
Risk_per: ${signal.confidence}%`,
        channel: 'AI-Intelligence',
        source: 'ai'
      });

      const req = http.request({
        hostname: 'localhost', port: 3000,
        path: '/tg-signal', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
      });
      req.write(body);
      req.end();
    }

    console.log('✅ ניתוח נשלח');
  } catch (err) {
    console.error('❌ שגיאת ניתוח:', err.message);
  }
}

// שליחת מייל
async function sendEmail(subject, text) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to:   process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject,
    text
  });
  console.log('📧 מייל נשלח');
}

// דוח מייל כל 12 שעות
async function sendEmailReport() {
  try {
    const result = await analyzeMarket();
    if (!result) return;
    await sendEmail(
      `OpenClaw Intelligence Report — ${new Date().toLocaleDateString('he-IL')}`,
      result.analysis.replace(/\*/g, '').replace(/_/g, '')
    );
  } catch(e) { console.error('❌ מייל:', e.message); }
}

// לוח זמנים
cron.schedule('*/30 * * * *', sendAnalysis);           // כל 30 דקות
cron.schedule('0 8,20 * * *', sendEmailReport);        // מייל 08:00 + 20:00

console.log('🧠 Intelligence Engine פעיל');
console.log('📊 ניתוח כל 30 דקות');
console.log('📧 מייל 08:00 + 20:00');

// ניתוח מיידי בהפעלה
setTimeout(sendAnalysis, 5000);
