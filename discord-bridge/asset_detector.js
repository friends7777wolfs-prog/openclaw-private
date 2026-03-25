function smartDetectAsset(currency, entryPrice, channelName, rawContent) {
  const text = ((currency || '') + ' ' + (channelName || '') + ' ' + (rawContent || '')).toUpperCase();

  // זיהוי מפורש מהטקסט
  if (text.includes('MICRO GOLD') || text.includes('MGC') || text.includes('GOLD') || text.includes('XAU')) return 'XAUUSD';
  if (text.includes('MICRO NASDAQ') || text.includes('MNQ') || text.includes('NASDAQ') || text.includes('NAS100')) return 'NAS100';
  if (text.includes('MICRO S&P') || text.includes('MES') || text.includes('S&P')) return 'SP500';
  if (text.includes('MICRO DOW') || text.includes('MYM')) return 'US30';
  if (text.includes('EURUSD')) return 'EURUSD';
  if (text.includes('GBPUSD')) return 'GBPUSD';
  if (text.includes('USDJPY')) return 'USDJPY';
  if (text.includes('BTC') || text.includes('BITCOIN')) return 'BTCUSD';
  if (text.includes('ETH')) return 'ETHUSD';

  // זיהוי לפי טווח מחיר
  const price = parseFloat(entryPrice) || 0;
  if (price > 1800 && price < 3500)  return 'XAUUSD';   // Gold
  if (price > 15000 && price < 25000) return 'NAS100';  // Nasdaq
  if (price > 4000  && price < 7000)  return 'SP500';   // S&P500
  if (price > 30000 && price < 50000) return 'US30';    // Dow
  if (price > 0.5   && price < 2)     return 'EURUSD';  // Forex

  // ברירת מחדל לפי שם ערוץ
  const ch = (channelName || '').toLowerCase();
  if (ch.includes('gold') || ch.includes('xau')) return 'XAUUSD';
  if (ch.includes('nasdaq') || ch.includes('nas')) return 'NAS100';
  if (ch.includes('forex') || ch.includes('fx'))  return 'EURUSD';

  return currency || 'XAUUSD';
}

module.exports = { smartDetectAsset };
