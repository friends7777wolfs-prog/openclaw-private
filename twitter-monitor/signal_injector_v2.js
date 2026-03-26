require('./load_env');
const axios = require('axios');
const fs = require('fs');
const mt5 = require('./mt5_executor');

async function inject({ source, asset, direction, confidence, weight, risk, comment }) {
  // לוג
  const entry = JSON.stringify({ ts: new Date().toISOString(), source, asset, direction, confidence, weight, risk, comment }) + '\n';
  fs.mkdirSync('../logs', { recursive: true });
  fs.appendFileSync('../logs/twitter_signals.log', entry);

  // ═══ MT5 TRADE ═══
  let tradeResult = null;
  try {
    tradeResult = await mt5.executeTrade({
      asset, direction,
      riskPercent: risk,
      comment: `@${source}: ${comment}`.substring(0, 25)
    });
  } catch(e) {
    console.error('[MT5 error]', e.response?.data || e.message);
  }

  // ═══ TELEGRAM ═══
  const emoji = direction === 'BUY' ? '🟢' : '🔴';
  const tradeStr = tradeResult?.orderId 
    ? `✅ Order: ${tradeResult.orderId}` 
    : '⚠️ Trade failed';
  
  await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: process.env.TELEGRAM_CHAT_ID || '-5068943005',
    text: `${emoji} <b>Twitter → MT5</b>\n📌 ${asset} ${direction} (${risk}% risk)\n👤 ${source}\n💬 ${comment}\n📊 Confidence: ${confidence}% | Weight: ${weight}\n${tradeStr}`,
    parse_mode: 'HTML'
  }).catch(() => {});
}

module.exports = { inject };
