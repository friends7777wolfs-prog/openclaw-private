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

module.exports = {
  // Gold Futures → XAUUSD (same correlation, prices ~identical)
  'MGC1!': 'XAUUSD', 'MGC1': 'XAUUSD', 'MGC': 'XAUUSD',
  'GC1!':  'XAUUSD', 'GC':   'XAUUSD',
  // Nasdaq Futures → NAS100 (same correlation, prices ~identical)
  'MNQ1!': 'NAS100', 'MNQ1': 'NAS100', 'MNQ': 'NAS100',
  'NQ1!':  'NAS100', 'NQ':   'NAS100',
  // SP500 Futures
  'ES1!':  'SP500',  'ES':   'SP500',
  'MES1!': 'SP500',  'MES':  'SP500', toMT5Symbol };
