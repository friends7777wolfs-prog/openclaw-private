const https = require('https');
const config = require('./config');
function callClaude(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: config.SWARM.MODEL, max_tokens: 500, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] });
    const req = https.request({ hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': config.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } }, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => {
        try { const p = JSON.parse(data); if (p.error) { reject(new Error(p.error.message)); return; } const t = p.content?.[0]?.text || ''; const m = t.match(/\{[\s\S]*\}/); if (m) resolve(JSON.parse(m[0])); else reject(new Error('No JSON')); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject); req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); }); req.write(body); req.end();
  });
}
async function runAgentBatch(agents, marketData, twitterSignals, batchSize) {
  const results = [];
  for (let i = 0; i < agents.length; i += batchSize) {
    const batch = agents.slice(i, i + batchSize);
    const br = await Promise.all(batch.map(async (agent) => {
      const p = agent.buildPrompt(marketData, twitterSignals);
      try { const r = await callClaude(p.system, p.user); return { agentId: agent.agentId, groupId: agent.groupId, votes: r.votes || [] }; }
      catch (err) { console.error(`  ❌ ${agent.agentId}: ${err.message}`); return { agentId: agent.agentId, groupId: agent.groupId, votes: [] }; }
    }));
    results.push(...br);
    if (i + batchSize < agents.length) await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}
module.exports = { callClaude, runAgentBatch };
