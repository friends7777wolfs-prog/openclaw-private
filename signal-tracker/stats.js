const Database = require('better-sqlite3');
const db = new Database(__dirname + '/signals.db');

// שמירת סיגנל חדש
function saveSignal(signal) {
  const stmt = db.prepare(`
    INSERT INTO signals (channel, action_type, currency, entry_price, direction, tp1, tp2, sl, name, risk_per, raw_text)
    VALUES (@channel, @action_type, @currency, @entry_price, @direction, @tp1, @tp2, @sl, @name, @risk_per, @raw_text)
  `);
  const result = stmt.run(signal);

  // עדכון channel_stats
  db.prepare(`
    INSERT INTO channel_stats (channel, total_signals) VALUES (?, 1)
    ON CONFLICT(channel) DO UPDATE SET
      total_signals = total_signals + 1,
      updated_at = CURRENT_TIMESTAMP
  `).run(signal.channel);

  return result.lastInsertRowid;
}

// עדכון תוצאת סיגנל
function updateSignalResult(id, result, pnl) {
  db.prepare(`
    UPDATE signals SET status=?, result=?, pnl=? WHERE id=?
  `).run(result === 'win' ? 'closed' : 'closed', result, pnl, id);

  const signal = db.prepare('SELECT channel FROM signals WHERE id=?').get(id);
  if (!signal) return;

  db.prepare(`
    UPDATE channel_stats SET
      wins = wins + ?,
      losses = losses + ?,
      total_pnl = total_pnl + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE channel = ?
  `).run(
    result === 'win' ? 1 : 0,
    result === 'loss' ? 1 : 0,
    pnl,
    signal.channel
  );

  recalcWeights();
}

// חישוב משקולות אוטומטי
function recalcWeights() {
  const channels = db.prepare('SELECT * FROM channel_stats WHERE total_signals >= 3').all();
  if (channels.length === 0) return;

  channels.forEach(ch => {
    const winRate = ch.total_signals > 0 ? ch.wins / ch.total_signals : 0;
    const avgPnl  = ch.total_signals > 0 ? ch.total_pnl / ch.total_signals : 0;
    // משקל = 40% win rate + 60% avg PnL (מנורמל)
    const weight = Math.max(0.1, Math.min(3.0, (winRate * 0.4 + Math.max(0, avgPnl / 100) * 0.6)));
    db.prepare('UPDATE channel_stats SET weight=? WHERE channel=?').run(weight, ch.channel);
  });
}

// קבלת משקל ערוץ
function getChannelWeight(channel) {
  const row = db.prepare('SELECT weight FROM channel_stats WHERE channel=?').get(channel);
  return row ? row.weight : 1.0;
}

// דוח מלא
function getReport(days = 7) {
  const channels = db.prepare('SELECT * FROM channel_stats ORDER BY weight DESC').all();
  const recent   = db.prepare(`
    SELECT * FROM signals
    WHERE created_at >= datetime('now', '-${days} days')
    ORDER BY created_at DESC
  `).all();

  const wins   = recent.filter(s => s.result === 'win').length;
  const losses = recent.filter(s => s.result === 'loss').length;
  const totalPnl = recent.reduce((sum, s) => sum + (s.pnl || 0), 0);

  return { channels, recent, wins, losses, totalPnl };
}

module.exports = { saveSignal, updateSignalResult, getChannelWeight, getReport, recalcWeights };
