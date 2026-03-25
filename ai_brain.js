require('dotenv').config();
const mem = require('./memory');

async function callClaude(prompt, smart) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: smart ? 'claude-sonnet-4-5' : 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!data.content) throw new Error('Claude error: ' + JSON.stringify(data));
  return data.content[0].text;
}

async function pricingDecision(title, cost, category) {
  const prompt = 'Price a dropshipping product. Reply JSON only, no markdown. Product: "' + title + '", category: ' + category + ', supplier cost: ' + cost + '. Format: {"price": 0, "compare_at": 0, "reason": ""}';
  const raw = await callClaude(prompt);
  try {
    const r = JSON.parse(raw);
    mem.logDecision('pricing', { title, cost }, r, 'pending');
    return r;
  } catch(e) {
    return { price: Math.round(cost * 2.8), compare_at: Math.round(cost * 3.5), reason: 'fallback' };
  }
}

async function writeDescription(title, category, features) {
  const prompt = 'Write a Shopify product description in Hebrew. Reply JSON only, no markdown. Product: "' + title + '", category: ' + category + ', features: ' + features + '. Format: {"title_he": "", "description_he": "", "tags": []}';
  const raw = await callClaude(prompt);
  try { return JSON.parse(raw); }
  catch(e) { return { title_he: title, description_he: features, tags: [category] }; }
}

async function weeklyStrategy(stats) {
  const prompt = 'Dropshipping store strategy. Reply JSON only, no markdown. Data: ' + JSON.stringify(stats) + '. Format: {"actions": [], "add_categories": [], "drop_categories": [], "pricing": ""}';
  const raw = await callClaude(prompt, true);
  try { return JSON.parse(raw); }
  catch(e) { return { actions: ['check manually'], add_categories: [], drop_categories: [], pricing: 'no change' }; }
}

module.exports = { pricingDecision, writeDescription, weeklyStrategy };
