const MT5_SYMBOLS = {
  // אינדקסים
  'NAS100':  'NAS100',
  'NASDAQ':  'NAS100',
  'SP500':   'SP500',
  'US500':   'SP500',
  'US30':    'US30',
  'DOW':     'US30',
  // מתכות
  'XAUUSD':  'XAUUSD',
  'GOLD':    'XAUUSD',
  'XAGUSD':  'XAGUSD',
  'SILVER':  'XAGUSD',
  // פורקס
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
  'EURAUD':  'EURAUD',
  'GBPAUD':  'GBPAUD',
  'AUDJPY':  'AUDJPY',
  'CADJPY':  'CADJPY',
  'CHFJPY':  'CHFJPY',
  'GBPCAD':  'GBPCAD',
  'GBPCHF':  'GBPCHF',
  'GBPNZD':  'GBPNZD',
  'EURNZD':  'EURNZD',
  'AUDCAD':  'AUDCAD',
  'AUDCHF':  'AUDCHF',
  'AUDNZD':  'AUDNZD',
  'CADCHF':  'CADCHF',
  'NZDCAD':  'NZDCAD',
  'NZDCHF':  'NZDCHF',
  'NZDJPY':  'NZDJPY',
  // קריפטו
  'BTCUSD':  'BTCUSD',
  'BTC':     'BTCUSD',
  'ETHUSD':  'ETHUSD',
  'ETH':     'ETHUSD',
  // סחורות
  'USOIL':   'USOIL',
  'OIL':     'USOIL',
};

function toMT5Symbol(symbol) {
  return MT5_SYMBOLS[symbol?.toUpperCase()] || symbol;
}

module.exports = { toMT5Symbol };
