const { detectAsset } = require('./asset_detector');

function parseSignal(content, channelName) {
  const c = content.replace(/\*\*/g, '').replace(/━+/g, '');

  // כיוון — strong buy/sell עם רווח
  const dirMatch = c.match(/\b(strong\s*buy|strong\s*sell|buy|sell|long|short|bullish|bearish)\b/i);
  if (!dirMatch) return null;
  const rawDir = dirMatch[1].toLowerCase().replace(/\s+/g, '');
  const isBuy = rawDir.includes('buy') || rawDir.includes('long') || rawDir.includes('bullish');

  // נכס
  const aMatch = c.match(/(?:asset|symbol)\s*:\s*([A-Z0-9][A-Z0-9!\/]+)/i);
  const assetHint = aMatch ? aMatch[1].trim() : null;
  const asset = detectAsset(assetHint ? ('Asset: ' + assetHint + '\n' + c) : c, channelName);
  if (!asset) return null;

  // מחיר כניסה — Entry: OR Entering price: OR Signal : (פורמט C)
  const eMatch = c.match(/(?:entering\s*price|entry|signal)\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!eMatch) return null;

  // SL
  const slMatch = c.match(/(?:stop[\s-]*loss(?:[\s-]*0?[12])?|stop)\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const sl = slMatch ? slMatch[1] : 'N/A';

  // TPs
  const tpAll = [...c.matchAll(/(?:take[\s-]*profit(?:[\s-]*0?[0-9])?|tp[0-9]?)\s*:?\s*([0-9]+(?:\.[0-9]+)?)/gi)];
  const tp1 = tpAll[0] ? tpAll[0][1] : 'N/A';
  const tp2 = tpAll[1] ? tpAll[1][1] : 'N/A';
  const tp3 = tpAll[2] ? tpAll[2][1] : 'N/A';

  return 'Asset: ' + asset.symbol + '\n' +
         'Buy or Sell: ' + (isBuy ? 'Buy' : 'Sell') + '\n' +
         'Entering price: ' + eMatch[1] + '\n' +
         'Stop loss: ' + sl + '\n' +
         'Take profit 1: ' + tp1 + '\n' +
         'Take profit 2: ' + tp2 + '\n' +
         'Take profit 3: ' + tp3;
}

module.exports = { parseSignal };
