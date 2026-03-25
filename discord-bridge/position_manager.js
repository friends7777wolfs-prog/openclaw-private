require('./load_env');

// מיפוי סימבולים מדיסקורד לMT5
const SYMBOL_MAP = {
  // Futures → CFD
  'MNQ':   { mt5: 'NAS100',   type: 'index',  pointValue: 2,      defaultATR: 50  },
  'MNQ1':  { mt5: 'NAS100',   type: 'index',  pointValue: 2,      defaultATR: 50  },
  'NQ':    { mt5: 'NAS100',   type: 'index',  pointValue: 20,     defaultATR: 50  },
  'NQ1':   { mt5: 'NAS100',   type: 'index',  pointValue: 20,     defaultATR: 50  },
  'ES':    { mt5: 'SP500',    type: 'index',  pointValue: 50,     defaultATR: 20  },
  'ES1':   { mt5: 'SP500',    type: 'index',  pointValue: 50,     defaultATR: 20  },
  'MGC':   { mt5: 'XAUUSD',   type: 'metal',  pointValue: 10,     defaultATR: 15  },
  'MGC1':  { mt5: 'XAUUSD',   type: 'metal',  pointValue: 10,     defaultATR: 15  },
  'GC':    { mt5: 'XAUUSD',   type: 'metal',  pointValue: 100,    defaultATR: 15  },
  'CL':    { mt5: 'USOIL',    type: 'commodity', pointValue: 1000, defaultATR: 1  },
  // Forex
  'EURUSD':{ mt5: 'EURUSD',   type: 'forex',  pointValue: 100000, defaultATR: 0.0010 },
  'GBPUSD':{ mt5: 'GBPUSD',   type: 'forex',  pointValue: 100000, defaultATR: 0.0015 },
  // Crypto
  'BTC':   { mt5: 'BTCUSD',   type: 'crypto', pointValue: 1,      defaultATR: 1000 },
  'BTCUSD':{ mt5: 'BTCUSD',   type: 'crypto', pointValue: 1,      defaultATR: 1000 },
  'ETH':   { mt5: 'ETHUSD',   type: 'crypto', pointValue: 1,      defaultATR: 50  },
};

// זיהוי נכס מתוכן
function detectAsset(content, channelName) {
  const upper = content.toUpperCase() + ' ' + channelName.toUpperCase();

  for (const [sym, info] of Object.entries(SYMBOL_MAP)) {
    if (upper.includes(sym.toUpperCase())) return { symbol: sym, ...info };
  }

  // ברירת מחדל לפי שם ערוץ
  if (channelName.toLowerCase().includes('nasdaq')) return { symbol: 'MNQ', mt5: 'NAS100', type: 'index', pointValue: 2, defaultATR: 50 };
  if (channelName.toLowerCase().includes('gold'))   return { symbol: 'MGC', mt5: 'XAUUSD', type: 'metal', pointValue: 10, defaultATR: 15 };
  if (channelName.toLowerCase().includes('crypto')) return { symbol: 'BTC', mt5: 'BTCUSD', type: 'crypto', pointValue: 1, defaultATR: 1000 };

  return { symbol: 'NAS100', mt5: 'NAS100', type: 'index', pointValue: 2, defaultATR: 50 };
}

// חישוב SL אוטומטי לפי ATR (1.5x ATR)
function calcAutoSL(entryPrice, direction, asset) {
  const atr    = asset.defaultATR;
  const slDist = atr * 1.5;
  return direction === 'buy'
    ? entryPrice - slDist
    : entryPrice + slDist;
}

// חישוב גודל פוזיציה לפי % סיכון
function calcPositionSize(accountBalance, riskPercent, entryPrice, slPrice, asset) {
  const riskAmount = accountBalance * (riskPercent / 100);
  const slDistance = Math.abs(entryPrice - slPrice);

  if (slDistance === 0) return 0.01;

  let lots;
  if (asset.type === 'forex') {
    // Forex: lot = riskAmount / (slPips * pipValue)
    lots = riskAmount / (slDistance * 100000);
  } else if (asset.type === 'index') {
    // Index CFD: lot = riskAmount / slDistance
    lots = riskAmount / slDistance;
  } else if (asset.type === 'metal') {
    // Gold: lot = riskAmount / (slDistance * 100)
    lots = riskAmount / (slDistance * 100);
  } else {
    // Crypto/other
    lots = riskAmount / slDistance;
  }

  // עיגול ל-0.01
  lots = Math.round(lots * 100) / 100;

  // מינימום ומקסימום
  return Math.max(0.01, Math.min(lots, 10));
}

module.exports = { detectAsset, calcAutoSL, calcPositionSize };

// Forex pairs נוספים
const FOREX_PAIRS = [
  'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD',
  'NZDUSD','USDCAD','EURGBP','EURJPY','GBPJPY',
  'XAUUSD','XAGUSD'
];

// זיהוי forex מתוכן
function isForexSignal(content) {
  return FOREX_PAIRS.some(p => content.toUpperCase().includes(p));
}

function getForexAsset(content) {
  const pair = FOREX_PAIRS.find(p => content.toUpperCase().includes(p));
  if (!pair) return null;
  return {
    symbol: pair,
    mt5: pair,
    type: 'forex',
    pointValue: 100000,
    defaultATR: pair.includes('JPY') ? 0.5 : 0.0010
  };
}

module.exports.isForexSignal  = isForexSignal;
module.exports.getForexAsset  = getForexAsset;
module.exports.FOREX_PAIRS    = FOREX_PAIRS;
