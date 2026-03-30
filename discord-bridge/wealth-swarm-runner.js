require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const Anthropic = require('@anthropic-ai/sdk');
const Database = require('better-sqlite3');
const { WEALTH_AGENTS } = require('./agents-wealth');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const db = new Database('/home/friends7777wolfs/OpenClawMaster/discord-bridge/openclaw.db');

// יצירת טבלה לתוצאות סוכנים
db.exec(`
  CREATE TABLE IF NOT EXISTS wealth_agent_outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    input_context TEXT,
    output_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const saveOutput = db.prepare(`
  INSERT INTO wealth_agent_outputs (agent_id, agent_name, input_context, output_json)
  VALUES (?, ?, ?, ?)
`);

async function runWealthAgent(agent, context) {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Context from OpenClaw system:\n${JSON.stringify(context)}\n\nAnalyze and respond in JSON only.`
      }],
      system: agent.systemPrompt
    });

    const text = response.content[0]?.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { raw: text };
    }

    saveOutput.run(agent.id, agent.name, JSON.stringify(context).substring(0, 500), JSON.stringify(parsed));
    console.log(`[${agent.name}] ✅ Output saved`);
    return { agent_id: agent.id, output: parsed };
  } catch (err) {
    console.error(`[${agent.name}] ❌ Error:`, err.message);
    return { agent_id: agent.id, error: err.message };
  }
}

async function runAllWealthAgents() {
  console.log(`\n🧠 Wealth Intelligence Swarm — ${new Date().toISOString()}`);
  
  // קבלת קונטקסט אחרון מהDB
  let recentSignals = [];
  try {
    recentSignals = db.prepare(`
      SELECT source, content, asset, action, confidence, created_at
      FROM signals ORDER BY created_at DESC LIMIT 5
    `).all();
  } catch { /* טבלה לא קיימת עדיין */ }

  const context = {
    timestamp: new Date().toISOString(),
    system: 'OpenClaw autonomous trading + dropshipping',
    recent_signals: recentSignals,
    active_stores: ['neu8888tral.myshopify.com (baby/maternity)', 'pelegadolll.myshopify.com (costumes)'],
    monitored_channels: '51 Discord+Telegram + 86 Twitter accounts',
    demo_balance: 99972
  };

  const results = [];
  for (const agent of WEALTH_AGENTS) {
    const result = await runWealthAgent(agent, context);
    results.push(result);
    await new Promise(r => setTimeout(r, 500)); // מניעת rate limit
  }

  console.log(`\n✅ Wealth Swarm completed: ${results.filter(r => !r.error).length}/${WEALTH_AGENTS.length} agents succeeded`);
  
  // סיכום לlog
  const summary = results.map(r => `${r.agent_id}: ${r.error ? '❌' : '✅'}`).join('\n');
  console.log(summary);
}

runAllWealthAgents().catch(console.error);
