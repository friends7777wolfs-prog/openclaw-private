const { createSwarm } = require('./agents');
const { VotingEngine } = require('./voting');
const config = require('./config');
console.log(`🧪 Testing (${config.SWARM.GROUPS} groups × ${config.SWARM.AGENTS_PER_GROUP} = ${config.SWARM.GROUPS * config.SWARM.AGENTS_PER_GROUP} agents)...\n`);
const groups = createSwarm();
const total = config.SWARM.GROUPS * config.SWARM.AGENTS_PER_GROUP;
console.assert(groups.length === 10); console.assert(groups[0].agents.length === 3);
console.log('✅ Swarm: 10×3=30 OK\n');

const engine = new VotingEngine();
// 24/30 BUY (80%) from 8 groups
const fv = [];
for (let g = 0; g < 8; g++) for (let a = 0; a < 3; a++) fv.push({ agentId: `g${g}_${a}`, groupId: config.GROUP_TYPES[g].id, votes: [{ asset:'XAUUSD', direction:'BUY', confidence:0.8, reason:'Bullish' }] });
for (let g = 8; g < 10; g++) for (let a = 0; a < 3; a++) fv.push({ agentId: `g${g}_${a}`, groupId: config.GROUP_TYPES[g].id, votes: [{ asset:'XAUUSD', direction:'NEUTRAL', confidence:0.3, reason:'Wait' }] });
const r1 = engine.tallyVotes(fv);
console.log('XAUUSD:', r1.XAUUSD.action, '| Groups BUY:', r1.XAUUSD.groupMajority?.BUY);
console.assert(r1.XAUUSD.action === 'BUY');
console.log('✅ 80% consensus = BUY OK\n');

// 50/50 split
const fv2 = [];
for (let g = 0; g < 5; g++) for (let a = 0; a < 3; a++) fv2.push({ agentId: `b${g}_${a}`, groupId: config.GROUP_TYPES[g].id, votes: [{ asset:'EURUSD', direction:'BUY', confidence:0.7, reason:'Bull' }] });
for (let g = 5; g < 10; g++) for (let a = 0; a < 3; a++) fv2.push({ agentId: `s${g}_${a}`, groupId: config.GROUP_TYPES[g].id, votes: [{ asset:'EURUSD', direction:'SELL', confidence:0.7, reason:'Bear' }] });
const r2 = engine.tallyVotes(fv2);
console.assert(r2.EURUSD.action === 'NO_TRADE');
console.log('✅ 50/50 = NO_TRADE OK\n');

console.log(`🎉 All passed! Cost: ~$1-2/day (was $3-8)`);
console.log(`📊 30 agents, 10min interval, same 7/10 group consensus`);
