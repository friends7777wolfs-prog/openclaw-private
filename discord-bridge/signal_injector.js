require('dotenv').config({ path: '../.env' });

async function inject({ source, text, asset, direction }) {
  try {
    // לוג מקומי
    const fs = require('fs');
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      source, text, asset, direction
    }) + '\n';
    fs.appendFileSync('../logs/injected_signals.log', entry);

    // שלח לטלגרם
    const axios = require('axios');
    const emoji = direction === 'BUY' ? '🟢' : '🔴';
    const msg = `${emoji} <b>Twitter Signal</b>\n📌 ${asset} — ${direction}\n📝 ${text}`;
    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: process.env.TELEGRAM_CHAT_ID || '-5068943005',
      text: msg,
      parse_mode: 'HTML'
    });

    // העבר ל-trader.js (אותו pipeline של discord)
    const trader = require('./trader');
    await trader.executeTrade({
      symbol: asset,
      direction,
      source,
      risk: 0.3, // 0.3% לסיגנלים טוויטר — שמרני יותר
      comment: `trump-tweet`
    });

    console.log(`[injector] ✅ ${source} → ${asset} ${direction}`);
  } catch (e) {
    console.error('[injector] ❌', e.message);
  }
}

module.exports = { inject };
