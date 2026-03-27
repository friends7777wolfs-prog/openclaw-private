const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('./config');
async function sendSignalToTrader(signal) {
  const sf = path.join(__dirname, '..', 'discord-bridge', 'pending_signals.json');
  let pending = []; try { if (fs.existsSync(sf)) pending = JSON.parse(fs.readFileSync(sf, 'utf8')); } catch(e) { pending = []; }
  const ts = { id: `swarm_${Date.now()}`, asset: signal.asset, direction: signal.direction, source: 'swarm-intelligence', confidence: signal.confidence, channel_trust: Math.min(signal.confidence, 1.0), timestamp: new Date().toISOString(), metadata: signal.swarmData };
  pending.push(ts); if (pending.length > 50) pending = pending.slice(-50);
  fs.writeFileSync(sf, JSON.stringify(pending, null, 2));
  const hf = path.join(__dirname, 'signal_history.json');
  let hist = []; try { if (fs.existsSync(hf)) hist = JSON.parse(fs.readFileSync(hf, 'utf8')); } catch(e) { hist = []; }
  hist.push(ts); if (hist.length > 500) hist = hist.slice(-500);
  fs.writeFileSync(hf, JSON.stringify(hist, null, 2));
  console.log(`  📤 Signal: ${signal.asset} ${signal.direction}`);
}
async function sendTelegramAlert(asset, r) {
  const e = r.action === 'BUY' ? '🟢' : '🔴';
  const bar = (n, t) => '█'.repeat(Math.round(n/t*10)) + '░'.repeat(10-Math.round(n/t*10));
  const msg = `${e} *SWARM: ${r.action} ${asset}*\n\n🐝 *30 Agents:*\nBUY:  ${bar(r.buyVotes,r.totalVotes)} ${r.buyVotes} (${r.buyRatio}%)\nSELL: ${bar(r.sellVotes,r.totalVotes)} ${r.sellVotes} (${r.sellRatio}%)\nWAIT: ${bar(r.neutralVotes,r.totalVotes)} ${r.neutralVotes}\n\n📊 Groups: ${r.groupConsensus.BUY}/10 BUY, ${r.groupConsensus.SELL}/10 SELL\n🎯 Confidence: ${(r.confidence*100).toFixed(0)}%\n\n💡 ${r.reasons.slice(0,3).map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\n⏰ ${new Date().toLocaleTimeString('he-IL',{timeZone:'Asia/Jerusalem'})}\n🦞 _OpenClaw Swarm v1.0_`;
  return new Promise(resolve => {
    const body = JSON.stringify({ chat_id: config.TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown', disable_web_page_preview: true });
    const req = https.request({ hostname: 'api.telegram.org', path: `/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`, method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try { const p=JSON.parse(d); if(p.ok) console.log(`  📱 TG sent: ${asset}`); else console.error(`  ❌ TG: ${p.description}`); } catch(e){} resolve(); }); });
    req.on('error',()=>resolve()); req.setTimeout(10000,()=>{req.destroy();resolve();}); req.write(body); req.end();
  });
}
module.exports = { sendSignalToTrader, sendTelegramAlert };
