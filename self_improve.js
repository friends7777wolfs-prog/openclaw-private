require('dotenv').config();
const fs = require('fs');
const cron = require('node-cron');
const tg = require('./telegram');

const SHOP = process.env.SHOPIFY_DOMAIN;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function shopify(endpoint, method, body) {
  const res = await fetch('https://' + SHOP + '/admin/api/2024-01' + endpoint, {
    method: method || 'GET',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) throw new Error('Shopify ' + res.status);
  return res.json();
}

async function callClaude(prompt, smart) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: smart ? 'claude-sonnet-4-5' : 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!data.content) throw new Error('Claude: ' + JSON.stringify(data));
  return data.content[0].text;
}

// Router: האם צריך AI בכלל?
function needsAI(obs, lastCycle) {
  if (!lastCycle) return true;
  const minsSinceLast = (Date.now() - new Date(lastCycle).getTime()) / 60000;
  if (obs.todayOrders > 0) return true; // תמיד AI אם יש הזמנות
  if (obs.products < 50) return minsSinceLast > 120; // כל 2 שעות אם מעט מוצרים
  return minsSinceLast > 360; // כל 6 שעות אחרת
}

// ReWOO: תכנן הכל מראש, בצע במקביל
async function reWOO(obs) {
  const plan = await callClaude(
    'Shopify store AI. Plan ALL actions at once. JSON only.\nState: products=' + obs.products + ', orders=' + obs.orders + ', revenue=' + obs.revenue + '\nReturn: {"actions": [{"type": "add_product|reprice|nothing", "data": {}}], "reason": ""}',
    false
  );
  try { return JSON.parse(plan); }
  catch { return { actions: [{ type: 'nothing' }], reason: 'parse error' }; }
}

async function addProduct(data) {
  const title = data.title || 'Baby Essential Product';
  const cost = data.cost || 30;
  const [pricingRaw, descRaw] = await Promise.all([
    callClaude('Price dropshipping product. JSON: {"price":0,"compare_at":0}. Product: "' + title + '", cost: ' + cost, false),
    callClaude('Hebrew Shopify desc. JSON: {"title_he":"","description_he":"","tags":[]}. Product: "' + title + '"', false)
  ]);
  let pricing = { price: Math.round(cost * 2.8), compare_at: Math.round(cost * 3.5) };
  let desc = { title_he: title, description_he: title, tags: ['baby'] };
  try { pricing = JSON.parse(pricingRaw); } catch {}
  try { desc = JSON.parse(descRaw); } catch {}
  const result = await fetch('https://' + SHOP + '/admin/api/2024-01/products.json', {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: {
      title: desc.title_he || title,
      body_html: desc.description_he,
      status: 'active',
      tags: ['dropship'].concat(desc.tags || []).join(','),
      variants: [{ price: String(pricing.price), compare_at_price: String(pricing.compare_at), inventory_management: null, inventory_policy: 'continue' }]
    }})
  }).then(r => r.json());
  return (result.product ? result.product.title : 'error') + ' ₪' + pricing.price;
}

async function mainLoop() {
  const memFile = './react_memory.json';
  const memory = fs.existsSync(memFile) ? JSON.parse(fs.readFileSync(memFile)) : { cycles: 0, lastAI: null, lastAction: null };

  try {
    const [productsData, ordersData] = await Promise.all([
      shopify('/products/count.json'),
      shopify('/orders.json?status=any&limit=50')
    ]);
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = ordersData.orders.filter(o => o.created_at.startsWith(today));
    const obs = {
      products: productsData.count,
      orders: ordersData.orders.length,
      todayOrders: todayOrders.length,
      revenue: ordersData.orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0).toFixed(2)
    };

    // הזמנות חדשות — תמיד מדווח
    if (todayOrders.length > 0 && memory.lastOrderCount !== todayOrders.length) {
      for (const o of todayOrders) {
        await tg.sendMessage('🛒 הזמנה!\n' + o.name + '\n₪' + o.total_price);
      }
      memory.lastOrderCount = todayOrders.length;
    }

    // Router — האם להפעיל AI?
    if (!needsAI(obs, memory.lastAI)) {
      console.log('[Loop] דילוג על AI | מוצרים:' + obs.products + ' הזמנות:' + obs.todayOrders);
      memory.cycles++;
      fs.writeFileSync(memFile, JSON.stringify(memory, null, 2));
      return;
    }

    // ReWOO — תכנן במקביל, בצע
    const plan = await reWOO(obs);
    console.log('[ReWOO] תכנית:', plan.reason);
    const results = [];

    // בצע פעולות במקביל
    const tasks = plan.actions
      .filter(a => a.type !== 'nothing')
      .slice(0, 3)
      .map(a => {
        if (a.type === 'add_product') return addProduct(a.data || { title: 'Baby Essential', cost: 35 });
        return Promise.resolve('skip');
      });

    const done = await Promise.all(tasks);
    results.push(...done.filter(r => r !== 'skip'));

    memory.lastAI = new Date().toISOString();
    memory.lastAction = plan.reason;
    memory.cycles++;
    fs.writeFileSync(memFile, JSON.stringify(memory, null, 2));

    if (results.length > 0) {
      await tg.sendMessage('מחזור #' + memory.cycles + '\n' + plan.reason + '\nתוצאות: ' + results.join(', '));
    }

  } catch(e) {
    console.error('[Error]', e.message);
  }
}

cron.schedule('*/30 * * * *', mainLoop);
mainLoop();
console.log('ReWOO Agent - כל 30 דקות, AI רק כשצריך');
