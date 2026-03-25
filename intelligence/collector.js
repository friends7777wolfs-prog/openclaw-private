require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Database = require('better-sqlite3');
const db       = new Database('/home/friends7777wolfs/OpenClawMaster/intelligence/intelligence.db');

const ASSET_MAP = {
  'MNQ':'NAS100','NQ':'NAS100','NAS100':'NAS100',
  'MGC':'XAUUSD','GC':'XAUUSD','XAUUSD':'XAUUSD','GOLD':'XAUUSD',
  'ES':'SP500','SP500':'SP500',
  'BTC':'BTCUSD','BTCUSD':'BTCUSD',
  'ETH':'ETHUSD','ETHUSD':'ETHUSD',
  'EURUSD':'EURUSD','GBPUSD':'GBPUSD',
  'USDJPY':'USDJPY','XAGUSD':'XAGUSD'
};

function normalizeAsset(text) {
  const upper = text.toUpperCase();
  for (const [k,v] of Object.entries(ASSET_MAP))
    if (upper.includes(k)) return v;
  return null;
}

function saveSignal(source, channel, signalText) {
  const get = (key) => {
    const m = signalText.match(new RegExp(key + ':\\s*([^\\n]+)'));
    const v = m ? m[1].trim() : null;
    return v === 'N/A' || !v ? null : v;
  };

  const rawAsset  = get('Currency') || '';
  const asset     = normalizeAsset(rawAsset + ' ' + channel) || normalizeAsset(signalText);
  if (!asset) return null;

  const direction = get('Buy or Sell') || get('Action_type');
  const entry     = parseFloat(get('Entering price')) || null;
  const tp1       = parseFloat(get('Take profit 1')) || null;
  const sl        = parseFloat(get('Stop loss'))      || null;

  db.prepare(`
    INSERT INTO raw_signals (source, channel, asset, direction, entry_price, tp1, sl, raw_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(source, channel, asset, direction, entry, tp1, sl, signalText);

  console.log(`💾 נשמר: ${asset} ${direction} @ ${entry} [${channel}]`);
  return { asset, direction, entry };
}

function getRecentSignals(minutes = 30) {
  return db.prepare(`
    SELECT * FROM raw_signals
    WHERE created_at >= datetime('now', '-${minutes} minutes')
    ORDER BY created_at DESC
  `).all();
}

function getAssetFrequency(hours = 4) {
  return db.prepare(`
    SELECT asset,
           COUNT(*) as mentions,
           SUM(CASE WHEN direction IN ('Buy','Long') THEN 1 ELSE 0 END) as bulls,
           SUM(CASE WHEN direction IN ('Sell','Short') THEN 1 ELSE 0 END) as bears
    FROM raw_signals
    WHERE created_at >= datetime('now', '-${hours} hours')
    AND asset IS NOT NULL
    GROUP BY asset
    ORDER BY mentions DESC
    LIMIT 10
  `).all();
}

function getPatternStats(asset) {
  return db.prepare(`
    SELECT
      strftime('%H', created_at) as hour,
      strftime('%w', created_at) as dow,
      COUNT(*) as total,
      SUM(CASE WHEN direction IN ('Buy','Long') THEN 1 ELSE 0 END) as bulls,
      SUM(CASE WHEN direction IN ('Sell','Short') THEN 1 ELSE 0 END) as bears
    FROM raw_signals
    WHERE asset = ?
    GROUP BY hour, dow
    ORDER BY total DESC
    LIMIT 20
  `).all(asset);
}

module.exports = { saveSignal, getRecentSignals, getAssetFrequency, getPatternStats };
