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
    const sym = assetField ? assetField[1] : null;
    if (!sym) continue;
    if (ASSET_MAP[sym]) {
      const result = makeResult(ASSET_MAP[sym]);
      cache.set(key, result);
      return result;
    }
  }

  // חפש לפי מילות מפתח — רק סימבולים של 4+ תווים (למנוע ES/MNQ/CL בטקסט)
  for (const [sym, asset] of Object.entries(ASSET_MAP)) {
    if (sym.length < 4) continue; // דלג על קיצורים קצרים שעלולים להופיע בטקסט רגיל
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

const ASSET_META = {
  'NAS100': { type:'index',     pointValue:2,      defaultATR:50   },
  'SP500':  { type:'index',     pointValue:50,     defaultATR:20   },
  'US30':   { type:'index',     pointValue:5,      defaultATR:150  },
  'XAUUSD': { type:'metal',     pointValue:100,    defaultATR:15   },
  'XAGUSD': { type:'metal',     pointValue:5000,   defaultATR:0.3  },
  'BTCUSD': { type:'crypto',    pointValue:1,      defaultATR:1000 },
  'ETHUSD': { type:'crypto',    pointValue:1,      defaultATR:50   },
  'USOIL':  { type:'commodity', pointValue:1000,   defaultATR:1    },
};
const FOREX_ATR = { JPY:0.5, default:0.0010 };

function makeResult(symbol) {
  const mt5  = toMT5Symbol(symbol);
  const meta = ASSET_META[mt5];
  if (meta) return { symbol, mt5, ...meta };
  // forex
  const atr = (mt5.includes('JPY') || mt5.includes('XAU')) ? FOREX_ATR.JPY : FOREX_ATR.default;
  return { symbol, mt5, type:'forex', pointValue:100000, defaultATR:atr };
}

function getCacheStats() {
  return { size: cache.size, max: CACHE_MAX };
}

module.exports = { detectAsset, getCacheStats };
