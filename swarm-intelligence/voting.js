const config = require('./config');
class VotingEngine {
  constructor() { this.history = []; }
  tallyVotes(allVotes) {
    const results = {};
    for (const asset of config.ASSETS) {
      const assetVotes = { BUY: [], SELL: [], NEUTRAL: [] };
      let totalConf = { BUY: 0, SELL: 0, NEUTRAL: 0 };
      for (const ar of allVotes) {
        if (!ar.votes) continue;
        const v = ar.votes.find(x => x.asset === asset);
        if (!v) continue;
        if (v.confidence < config.SWARM.MIN_CONFIDENCE && v.direction !== 'NEUTRAL') v.direction = 'NEUTRAL';
        assetVotes[v.direction].push({ agentId: ar.agentId, groupId: ar.groupId, confidence: v.confidence, reason: v.reason });
        totalConf[v.direction] += v.confidence;
      }
      const bC = assetVotes.BUY.length, sC = assetVotes.SELL.length, nC = assetVotes.NEUTRAL.length, tot = bC + sC + nC;
      if (tot === 0) { results[asset] = { action: 'SKIP', reason: 'No votes', buyVotes:0, sellVotes:0, neutralVotes:0, totalVotes:0 }; continue; }
      const bR = bC / tot, sR = sC / tot;
      const avgBC = bC > 0 ? totalConf.BUY / bC : 0, avgSC = sC > 0 ? totalConf.SELL / sC : 0;
      const gc = this._groupConsensus(assetVotes);

      // With 3 agents/group: group "agrees" if majority (2/3) vote same direction
      // Then need 7/10 groups to agree for consensus
      const groupMajority = this._groupMajority(allVotes, asset);

      let action = 'NO_TRADE', confidence = 0, reasons = [];
      if (bR >= config.SWARM.CONSENSUS_THRESHOLD && groupMajority.BUY >= 7) {
        action = 'BUY'; confidence = avgBC;
        reasons = assetVotes.BUY.slice(0, 5).map(v => `[${v.groupId}] ${v.reason}`);
      } else if (sR >= config.SWARM.CONSENSUS_THRESHOLD && groupMajority.SELL >= 7) {
        action = 'SELL'; confidence = avgSC;
        reasons = assetVotes.SELL.slice(0, 5).map(v => `[${v.groupId}] ${v.reason}`);
      }
      results[asset] = { action, confidence: Math.round(confidence * 100) / 100, buyVotes: bC, sellVotes: sC, neutralVotes: nC, totalVotes: tot, buyRatio: Math.round(bR * 100), sellRatio: Math.round(sR * 100), groupConsensus: gc, groupMajority, reasons, timestamp: new Date().toISOString() };
    }
    this.history.push({ timestamp: new Date().toISOString(), results });
    if (this.history.length > 100) this.history.shift();
    return results;
  }

  // Count which groups have MAJORITY agreement (2/3 or 3/3 agents agree)
  _groupMajority(allVotes, asset) {
    const groupVotes = {}; // groupId -> {BUY:0, SELL:0, NEUTRAL:0}
    for (const ar of allVotes) {
      if (!ar.votes) continue;
      const v = ar.votes.find(x => x.asset === asset);
      if (!v) continue;
      if (!groupVotes[ar.groupId]) groupVotes[ar.groupId] = { BUY: 0, SELL: 0, NEUTRAL: 0 };
      const dir = (v.confidence < config.SWARM.MIN_CONFIDENCE && v.direction !== 'NEUTRAL') ? 'NEUTRAL' : v.direction;
      groupVotes[ar.groupId][dir]++;
    }
    const majority = { BUY: 0, SELL: 0, NEUTRAL: 0 };
    for (const [gid, counts] of Object.entries(groupVotes)) {
      const total = counts.BUY + counts.SELL + counts.NEUTRAL;
      const threshold = Math.ceil(total / 2); // majority = more than half
      if (counts.BUY >= threshold) majority.BUY++;
      else if (counts.SELL >= threshold) majority.SELL++;
      else majority.NEUTRAL++;
    }
    return majority;
  }

  _groupConsensus(av) {
    const gv = { BUY: new Set(), SELL: new Set(), NEUTRAL: new Set() };
    for (const d of ['BUY','SELL','NEUTRAL']) for (const v of av[d]) gv[d].add(v.groupId);
    return { BUY: gv.BUY.size, SELL: gv.SELL.size, NEUTRAL: gv.NEUTRAL.size };
  }
  getStats() { return { totalRounds: this.history.length, lastRound: this.history[this.history.length - 1] || null }; }
}
module.exports = { VotingEngine };
