const cache = new Map();
const TTL   = 5 * 60 * 1000; // 5 דקות

function get(symbol) {
  const entry = cache.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL) { cache.delete(symbol); return null; }
  return entry.candles;
}

function set(symbol, candles) {
  cache.set(symbol, { candles, timestamp: Date.now() });
}

module.exports = { get, set };
