const { toMT5Symbol } = require('./symbol_map');

const ASSET_MAP = {
  // אינדקסים
  'MNQ': 'NAS100', 'NQ': 'NAS100', 'NAS100': 'NAS100', 'USD@24000': 'NAS100',
  'MGC': 'XAUUSD', 'GC': 'XAUUSD', 'XAUUSD': 'XAUUSD', 'GOLD': 'XAUUSD',
  'ES': 'SP500', 'SP500': 'SP500', 'MES': 'SP500',
  'BTC': 'BTCUSD', 'BTCUSD': 'BTCUSD', 'ETH': 'ETHUSD', 'ETHUSD': 'ETHUSD',
  'US30': 'US30', 'DOW': 'US30',
  // פורקס
  'EURUSD': 'EURUSD', 'GBPUSD': 'GBPUSD', 'USDJPY': 'USDJPY',
  'USDCHF': 'USDCHF', 'AUDUSD': 'AUDUSD', 'NZDUSD': 'NZDUSD',
  'USDCAD': 'USDCAD', 'EURGBP': 'EURGBP', 'EURJPY': 'EURJPY',
  'GBPJPY': 'GBPJPY', 'EURAUD': 'EURAUD', 'GBPAUD': 'GBPAUD',
  'AUDCAD': 'AUDCAD', 'AUDCHF': 'AUDCHF', 'CADCHF': 'CADCHF',
  'CADJPY': 'CADJPY', 'CHFJPY': 'CHFJPY', 'EURCHF': 'EURCHF',
  'EURNZD': 'EURNZD', 'GBPCAD': 'GBPCAD', 'GBPCHF': 'GBPCHF',
  'GBPNZD': 'GBPNZD', 'NZDCAD': 'NZDCAD', 'NZDCHF': 'NZDCHF',
  'NZDJPY': 'NZDJPY', 'AUDNZD': 'AUDNZD', 'AUDJPY': 'AUDJPY',
  'XAGUSD': 'XAGUSD', 'SILVER': 'XAGUSD',
};

const PRICE_RANGES = {
  'NAS100': [15000, 25000],
  'XAUUSD': [1800, 5500],
  'SP500':  [3000, 6000],
  'BTCUSD': [20000, 120000],
};

const cache = new Map();
const CACHE_MAX = 500;

function detectAsset(text, channelName) {
  const key = text.slice(0, 80);
  if (cache.has(key)) return cache.get(key);

  const upper = text.toUpperCase();

  // חפש לפי Asset: שדה קודם
  const assetField = upper.match(/ASSET:\s*([A-Z0-9@]+)/);
  if (assetField) {
    const sym = assetField[1];
    if (ASSET_MAP[sym]) {
      const result = makeResult(ASSET_MAP[sym]);
      cache.set(key, result);
      return result;
    }
  }

  // חפש לפי מילות מפתח
  for (const [sym, asset] of Object.entries(ASSET_MAP)) {
    // וודא שזה מילה שלמה (לא "ES" בתוך "Entering price")
    const regex = new RegExp('\\b' + sym + '\\b');
    if (regex.test(upper)) {
      const result = makeResult(asset);
      cache.set(key, result);
      return result;
    }
  }

  // fallback לפי טווח מחיר
  const prices = [...text.matchAll(/\b(\d{4,6}(?:\.\d+)?)\b/g)].map(m => parseFloat(m[1]));
  for (const price of prices) {
    for (const [asset, [min, max]] of Object.entries(PRICE_RANGES)) {
      if (price >= min && price <= max) {
        const result = makeResult(asset);
        cache.set(key, result);
        return result;
      }
    }
  }

  cache.set(key, null);
  return null;
}

function makeResult(symbol) {
  return { symbol, mt5: toMT5Symbol(symbol) };
}

function getCacheStats() {
  return { size: cache.size, max: CACHE_MAX };
}

module.exports = { detectAsset, getCacheStats };
