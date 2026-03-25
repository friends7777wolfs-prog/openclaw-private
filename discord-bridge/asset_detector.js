// מיפוי מחירים לנכסים — אם Currency=USD נזהה לפי מחיר הכניסה
function detectAssetFromPrice(price, channelName, content) {
  if (!price) return null;
  const p = parseFloat(price);

  // זיהוי לפי טווח מחיר
  if (p > 20000 && p < 30000) return 'NAS100';   // MNQ/NQ
  if (p > 5000  && p < 7000)  return 'SP500';    // ES
  if (p > 1800  && p < 3500)  return 'XAUUSD';   // Gold
  if (p > 30000)              return 'BTCUSD';   // BTC
  if (p > 1000  && p < 5000)  return 'ETHUSD';   // ETH
  if (p > 0.5   && p < 2)     return 'EURUSD';   // Forex majors
  if (p > 70    && p < 200)   return 'USDJPY';   // JPY pairs
  if (p > 60    && p < 100)   return 'USOIL';    // Oil

  return null;
}

// זיהוי נכס מהקשר מלא
function smartDetectAsset(currency, entryPrice, channelName, content) {
  const EXPLICIT_MAP = {
    'MNQ':'NAS100','MNQ1':'NAS100','NQ':'NAS100','NQ1':'NAS100','NAS100':'NAS100','NASDAQ':'NAS100',
    'MGC':'XAUUSD','MGC1':'XAUUSD','GC':'XAUUSD','GOLD':'XAUUSD','XAUUSD':'XAUUSD','XAU':'XAUUSD',
    'ES':'SP500','ES1':'SP500','SP500':'SP500','SPX':'SP500',
    'BTC':'BTCUSD','BTCUSD':'BTCUSD','BITCOIN':'BTCUSD',
    'ETH':'ETHUSD','ETHUSD':'ETHUSD',
    'EURUSD':'EURUSD','GBPUSD':'GBPUSD','USDJPY':'USDJPY',
    'USDCHF':'USDCHF','AUDUSD':'AUDUSD','NZDUSD':'NZDUSD',
    'USDCAD':'USDCAD','XAGUSD':'XAGUSD','SILVER':'XAGUSD',
    'CL':'USOIL','OIL':'USOIL',
  };

  // 1. בדיקה ישירה
  const upper = (currency || '').toUpperCase().trim();
  if (EXPLICIT_MAP[upper]) return EXPLICIT_MAP[upper];

  // 2. חיפוש בתוכן ההודעה
  const fullText = ((content || '') + ' ' + (channelName || '')).toUpperCase();
  for (const [key, val] of Object.entries(EXPLICIT_MAP)) {
    if (fullText.includes(key)) return val;
  }

  // 3. זיהוי לפי מחיר (כשCurrency=USD או חסר)
  if (upper === 'USD' || upper === 'N/A' || !upper) {
    const byPrice = detectAssetFromPrice(entryPrice, channelName, content);
    if (byPrice) return byPrice;
  }

  // 4. זיהוי מהערוץ
  const ch = (channelName || '').toLowerCase();
  if (ch.includes('nasdaq') || ch.includes('mnq') || ch.includes('nq')) return 'NAS100';
  if (ch.includes('gold') || ch.includes('xau'))  return 'XAUUSD';
  if (ch.includes('forex') || ch.includes('fx'))  return 'EURUSD';
  if (ch.includes('btc') || ch.includes('crypto')) return 'BTCUSD';
  if (ch.includes('boss') || ch.includes('bos'))  return 'NAS100';

  return currency || 'UNKNOWN';
}

module.exports = { smartDetectAsset };
