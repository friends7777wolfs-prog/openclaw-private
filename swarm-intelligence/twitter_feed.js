const fs = require('fs');
const path = require('path');
const CACHE = path.join(__dirname, 'twitter_cache.json');
function getRecentSignals() {
  let signals = [];
  const bridgeSigs = path.join(__dirname, '..', 'discord-bridge', 'signals_log.json');
  const intelSigs = path.join(__dirname, '..', 'intelligence', 'market_analysis.json');
  try { if (fs.existsSync(bridgeSigs)) { const d = JSON.parse(fs.readFileSync(bridgeSigs, 'utf8')); const r = (d.signals || d).filter(s => Date.now() - new Date(s.timestamp || s.time).getTime() < 30*60*1000); signals.push(...r.map(s => `[SIGNAL] ${s.asset||s.symbol}: ${s.direction||s.action} @ ${s.entry||s.price} | ${s.source||'discord/tg'}`)); } } catch(e) {}
  try { if (fs.existsSync(intelSigs)) { const d = JSON.parse(fs.readFileSync(intelSigs, 'utf8')); if (d.analysis) signals.push(`[INTEL] ${d.analysis.substring(0, 500)}`); } } catch(e) {}
  try { if (fs.existsSync(CACHE)) { const c = JSON.parse(fs.readFileSync(CACHE, 'utf8')); const r = (c.tweets||[]).filter(t => Date.now() - new Date(t.timestamp).getTime() < 30*60*1000); signals.push(...r.map(t => `[TWITTER] @${t.author}: ${t.text}`)); } } catch(e) {}
  return signals.length > 0 ? signals.join('\n') : 'No recent signals. Analyze based on general market conditions.';
}
function addTwitterSignal(author, text) {
  let c = { tweets: [] }; try { if (fs.existsSync(CACHE)) c = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch(e) {}
  c.tweets.push({ author, text, timestamp: new Date().toISOString() }); if (c.tweets.length > 200) c.tweets = c.tweets.slice(-200);
  fs.writeFileSync(CACHE, JSON.stringify(c, null, 2));
}
module.exports = { getRecentSignals, addTwitterSignal };
