const MT5_SYMBOLS = {
  // אינדקסים — נבדוק שמות מדויקים אחר כך
  'NAS100':  'COMP',
  'NASDAQ':  'COMP',
  'SP500':   'US500',
  'ES':      'US500',
  'US30':    'US30',
  'DOW':     'US30',

  // מתכות
  'XAUUSD':  'XAUUSD',
  'GOLD':    'XAUUSD',

  // פורקס — אלה בטוח עובדים
  'EURUSD':  'EURUSD',
  'GBPUSD':  'GBPUSD',
  'USDJPY':  'USDJPY',
  'USDCHF':  'USDCHF',
  'AUDUSD':  'AUDUSD',
  'NZDUSD':  'NZDUSD',
  'USDCAD':  'USDCAD',
  'EURGBP':  'EURGBP',
  'EURJPY':  'EURJPY',
  'GBPJPY':  'GBPJPY',

  // קריפטו
  'BTCUSD':  'BTCUSD',
  'BTC':     'BTCUSD',
  'ETHUSD':  'ETHUSD',
};

function toMT5Symbol(symbol) {
  return MT5_SYMBOLS[symbol?.toUpperCase()] || symbol;
}

module.exports = { toMT5Symbol };
