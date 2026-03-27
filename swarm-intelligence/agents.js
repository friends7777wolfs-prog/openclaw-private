const config = require('./config');
class SwarmAgent {
  constructor(groupType, agentIndex) {
    this.groupId = groupType.id;
    this.groupName = groupType.name;
    this.agentIndex = agentIndex;
    this.agentId = `${groupType.id}_${agentIndex}`;
    this.systemPrompt = groupType.prompt;
  }
  buildPrompt(marketData, twitterSignals) {
    return {
      system: `${this.systemPrompt}\nYou are agent #${this.agentIndex} in "${this.groupName}" group.\nRESPOND IN STRICT JSON ONLY:\n{"votes":[{"asset":"SYMBOL","direction":"BUY"|"SELL"|"NEUTRAL","confidence":0.0-1.0,"reason":"one line"}]}\nVote NEUTRAL if unsure. Be honest.`,
      user: `TIMESTAMP: ${new Date().toISOString()}\n\nTWITTER SIGNALS (last 30 min):\n${twitterSignals || 'No signals'}\n\nMARKET CONTEXT:\n${marketData || 'Awaiting data'}\n\nAnalyze: ${config.ASSETS.join(', ')}\nReturn ONLY valid JSON.`
    };
  }
}
class SwarmGroup {
  constructor(groupType) {
    this.type = groupType;
    this.agents = [];
    for (let i = 0; i < config.SWARM.AGENTS_PER_GROUP; i++) this.agents.push(new SwarmAgent(groupType, i));
  }
}
function createSwarm() {
  const groups = config.GROUP_TYPES.map(gt => new SwarmGroup(gt));
  console.log(`🐝 Swarm: ${groups.length} groups × ${config.SWARM.AGENTS_PER_GROUP} = ${groups.length * config.SWARM.AGENTS_PER_GROUP} agents`);
  return groups;
}
module.exports = { SwarmAgent, SwarmGroup, createSwarm };
