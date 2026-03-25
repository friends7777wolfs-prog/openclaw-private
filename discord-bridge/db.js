const Database = require('better-sqlite3');
const path     = require('path');
const db       = new Database(path.join(__dirname, '../signal-tracker/signals.db'));

function saveSignal(channel, signalText, mt5Ticket = null) {
  const get = (key) => {
    const m = signalText.match(new RegExp(key + ':\\s*([^\\n]+)'));
    const v = m ? m[1].trim() : null;
    return v === 'N/A' ? null : v;
  };

  db.prepare(`
    INSERT INTO signals
      (channel, action_type, currency, entry_price, direction, tp1, tp2, sl, name, risk_per, raw_text, mt5_ticket)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    channel,
    get('Action_type'),
    get('Currency'),
    parseFloat(get('Entering price')) || null,
    get('Buy or Sell'),
    parseFloat(get('Take profit 1')) || null,
    parseFloat(get('Take profit 2')) || null,
    parseFloat(get('Stop loss'))     || null,
    get('Name'),
    get('Risk_per'),
    signalText,
    mt5Ticket
  );

  // עדכון סטטיסטיקות ערוץ
  db.prepare(`
    INSERT INTO channel_stats (channel, total_signals)
    VALUES (?, 1)
    ON CONFLICT(channel) DO UPDATE SET
      total_signals = total_signals + 1,
      updated_at = CURRENT_TIMESTAMP
  `).run(channel);

  console.log(`💾 נשמר ב-DB: ${channel}`);
}

function getChannelStats() {
  return db.prepare(`
    SELECT channel, total_signals, wins, losses,
           ROUND(CAST(wins AS FLOAT) / MAX(total_signals,1) * 100, 1) as win_rate,
           ROUND(total_pnl, 2) as total_pnl,
           ROUND(weight, 2) as weight
    FROM channel_stats
    ORDER BY win_rate DESC
  `).all();
}

module.exports = { saveSignal, getChannelStats };
