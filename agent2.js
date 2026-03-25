require('dotenv').config({ path: '.env2' });
const cron = require('node-cron');
const ai = require('./ai_brain');
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

async function checkOrders() {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const data = await shopify('/orders.json?status=any&created_at_min=' + since);
  if (data.orders.length > 0) {
    for (const o of data.orders) {
      await tg.sendMessage('🎭 הזמנה בחנות תחפושות!\n' + o.name + '\n₪' + o.total_price);
    }
  } else {
    console.log('[Agent2] אין הזמנות | ' + new Date().toLocaleTimeString('he-IL'));
  }
}

async function dailySummary() {
  const [p, o] = await Promise.all([
    shopify('/products/count.json'),
    shopify('/orders.json?status=any&limit=250')
  ]);
  const revenue = o.orders.reduce((s, x) => s + parseFloat(x.total_price || 0), 0);
  await tg.sendMessage('🎭 חנות תחפושות\nמוצרים: ' + p.count + '\nהכנסה: ₪' + revenue.toFixed(2));
}

cron.schedule('0 * * * *', checkOrders);
cron.schedule('0 21 * * *', dailySummary);
checkOrders();
console.log('🎭 Agent חנות תחפושות פעיל');
