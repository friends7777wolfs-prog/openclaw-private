const config = require('./config');
const { createSwarm } = require('./agents');
const { VotingEngine } = require('./voting');
const { runAgentBatch } = require('./api_caller');
const { getRecentSignals } = require('./twitter_feed');
const { sendSignalToTrader, sendTelegramAlert } = require('./bridge');
const votingEngine = new VotingEngine();
let swarmGroups = null, isRunning = false, roundCount = 0;
function getSession() { const h = new Date().getUTCHours(); if (h < 7) return 'Asian'; if (h < 12) return 'London'; if (h < 17) return 'NY Overlap'; if (h < 21) return 'NY PM'; return 'Off-hours'; }
async function runSwarmRound() {
  if (isRunning) { console.log('⏳ Skipping, prev round running'); return; }
  isRunning = true; roundCount++;
  const start = Date.now();
  console.log(`\n${'═'.repeat(50)}\n🐝 ROUND #${roundCount} — ${new Date().toISOString()}\n${'═'.repeat(50)}`);
  try {
    const sigs = getRecentSignals();
    const mkt = `Time: ${new Date().toISOString()}\nSession: ${getSession()}`;
    console.log(`📡 Signals: ${sigs.split('\n').length} items`);
    const allAgents = swarmGroups.flatMap(g => g.agents);
    console.log(`🤖 Running ${allAgents.length} agents...`);
    const allVotes = await runAgentBatch(allAgents, mkt, sigs, config.SWARM.MAX_CONCURRENT_API);
    const ok = allVotes.filter(v => v.votes.length > 0).length;
    console.log(`✅ ${ok}/${allAgents.length} responded`);
    const consensus = votingEngine.tallyVotes(allVotes);
    for (const [asset, r] of Object.entries(consensus)) {
      const e = r.action === 'BUY' ? '🟢' : r.action === 'SELL' ? '🔴' : '⚪';
      console.log(`${e} ${asset}: ${r.action} | B:${r.buyVotes} S:${r.sellVotes} N:${r.neutralVotes} | Conf:${r.confidence}`);
      if (r.action === 'BUY' || r.action === 'SELL') {
        console.log(`  🎯 CONSENSUS! Sending to trader...`);
        await sendSignalToTrader({ asset, direction: r.action, confidence: r.confidence, source: 'swarm-intelligence', swarmData: { buyVotes: r.buyVotes, sellVotes: r.sellVotes, neutralVotes: r.neutralVotes, groupConsensus: r.groupConsensus, topReasons: r.reasons } });
        await sendTelegramAlert(asset, r);
      }
    }
    console.log(`⏱️ Round #${roundCount} done in ${((Date.now()-start)/1000).toFixed(1)}s`);
  } catch (err) { console.error(`❌ Round error:`, err.message); }
  finally { isRunning = false; }
}
console.log('🦞 OpenClaw Swarm Intelligence v1.0');
console.log(`📊 ${config.ASSETS.join(', ')} | 🐝 ${config.SWARM.GROUPS}×${config.SWARM.AGENTS_PER_GROUP}=${config.SWARM.GROUPS*config.SWARM.AGENTS_PER_GROUP} | ⏰ ${config.SWARM.VOTE_INTERVAL_MS/1000}s | 🎯 ${config.SWARM.CONSENSUS_THRESHOLD*100}%+7/10 groups`);
swarmGroups = createSwarm();
runSwarmRound();
setInterval(runSwarmRound, config.SWARM.VOTE_INTERVAL_MS);
process.on('SIGINT', () => { console.log(`\n🛑 Shutdown. ${roundCount} rounds done.`); process.exit(0); });
