require('./load_env');
const Database = require('better-sqlite3');
const path     = require('path');
const db       = new Database(path.join(__dirname, '../signal-tracker/signals.db'));

// הגדרות סיכון
const RISK_CONFIG = {
  defaultRisk:  0.5,   // % ברירת מחדל לערוץ חדש
  minRisk:      0.01,  // % מינימום
  maxRisk:      1.5,   // % מקסימום
  dailyMaxLoss: 4.5,   // % הפסד יומי מקסימום
};

// קבלת הפסד יומי נוכחי
function getDailyLoss(accountBalance) {
  const today = new Date().toISOString().split('T')[0];
  const row = db.prepare(`
    SELECT COALESCE(SUM(pnl), 0) as total_pnl
    FROM signals
    WHERE date(created_at) = ? AND pnl < 0
  `).get(today);

  const lossAmount = Math.abs(row.total_pnl || 0);
  return (lossAmount / accountBalance) * 100;
}

// בדיקה אם מותר לפתוח עסקה חדשה
function canTrade(accountBalance) {
  const dailyLoss = getDailyLoss(accountBalance);
  if (dailyLoss >= RISK_CONFIG.dailyMaxLoss) {
    console.log(`🛑 DAILY LIMIT: ${dailyLoss.toFixed(2)}% הפסד היום — נעצרים`);
    return { allowed: false, reason: `הפסד יומי ${dailyLoss.toFixed(2)}% מתוך ${RISK_CONFIG.dailyMaxLoss}%` };
  }
  return { allowed: true, dailyLoss };
}

// קבלת משקל ערוץ
function getChannelRisk(channel) {
  const row = db.prepare(`
    SELECT total_signals, wins, losses, weight
    FROM channel_stats WHERE channel = ?
  `).get(channel);

  if (!row || row.total_signals < 5) {
    // ערוץ חדש — 0.5% זהיר
    return RISK_CONFIG.defaultRisk;
  }

  // חישוב משקל לפי win rate + PnL
  const winRate = row.wins / row.total_signals;
  const weight  = row.weight || 1.0;

  // המרת weight ל-%
  let riskPct = RISK_CONFIG.defaultRisk * weight;

  // גבולות
  riskPct = Math.max(RISK_CONFIG.minRisk, Math.min(RISK_CONFIG.maxRisk, riskPct));

  console.log(`📊 ערוץ ${channel}: win=${(winRate*100).toFixed(0)}% weight=${weight.toFixed(2)} risk=${riskPct.toFixed(2)}%`);
  return riskPct;
}

// עדכון תוצאת עסקה + חישוב משקל מחדש
function updateTradeResult(channel, pnl, accountBalance) {
  const isWin = pnl > 0;

  // עדכון signal האחרון של הערוץ
  db.prepare(`
    UPDATE signals SET pnl = ?, result = ?, status = 'closed'
    WHERE channel = ? AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1
  `).run(pnl, isWin ? 'win' : 'loss', channel);

  // עדכון channel_stats
  db.prepare(`
    UPDATE channel_stats SET
      wins   = wins + ?,
      losses = losses + ?,
      total_pnl = total_pnl + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE channel = ?
  `).run(isWin ? 1 : 0, isWin ? 0 : 1, pnl, channel);

  // חישוב משקל חדש
  recalcWeight(channel);
}

function recalcWeight(channel) {
  const row = db.prepare('SELECT * FROM channel_stats WHERE channel = ?').get(channel);
  if (!row || row.total_signals < 3) return;

  const winRate = row.wins / row.total_signals;
  const avgPnl  = row.total_pnl / row.total_signals;

  // משקל: win rate שוקל 60%, avg PnL שוקל 40%
  const normalizedPnl = Math.tanh(avgPnl / 100); // בין -1 ל-1
  const weight = Math.max(0.02, Math.min(3.0,
    (winRate * 0.6 + (normalizedPnl + 1) / 2 * 0.4) * 2
  ));

  db.prepare('UPDATE channel_stats SET weight = ? WHERE channel = ?').run(weight, channel);
  console.log(`⚖️ משקל חדש ל-${channel}: ${weight.toFixed(3)}`);
}

function getDailyReport(accountBalance) {
  const today = new Date().toISOString().split('T')[0];
  const signals = db.prepare(`
    SELECT channel, result, pnl FROM signals
    WHERE date(created_at) = ?
  `).all(today);

  const totalPnl  = signals.reduce((s, r) => s + (r.pnl || 0), 0);
  const wins      = signals.filter(r => r.result === 'win').length;
  const losses    = signals.filter(r => r.result === 'loss').length;
  const dailyLoss = getDailyLoss(accountBalance);

  return { signals: signals.length, wins, losses, totalPnl, dailyLoss };
}

module.exports = { canTrade, getChannelRisk, updateTradeResult, getDailyReport, RISK_CONFIG };
