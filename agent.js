require('dotenv').config();
const cron = require('node-cron');
const mem = require('./memory');
const ai = require('./ai_brain');
const tg = require('./telegram');

const SHOP = process.env.SHOPIFY_DOMAIN;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function shopify(endpoint, method, body) {
  method = method || 'GET';
  const res = await fetch('https://' + SHOP + '/admin/api/2024-01' + endpoint, {
    method: method,
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) throw new Error('Shopify ' + res.status + ' ' + await res.text());
  return res.json();
}

async function addProduct(opts) {
  const title = opts.title;
  const category = opts.category;
  const supplierCost = opts.supplierCost;
  const imageUrl = opts.imageUrl;
  const features = opts.features;
  const pricing = await ai.pricingDecision(title, supplierCost, category);
  const content = await ai.writeDescription(title, category, features);
  const result = await shopify('/products.json', 'POST', {
    product: {
      title: content.title_he || title,
      body_html: content.description_he,
      status: 'active',
      tags: ['dropship', category].concat(content.tags || []).join(','),
      variants: [{
        price: String(pricing.price),
        compare_at_price: String(pricing.compare_at),
        inventory_management: null,
        inventory_policy: 'continue',
        requires_shipping: true
      }],
      images: imageUrl ? [{ src: imageUrl }] : []
    }
  });
  const p = result.product;
  mem.saveProduct(String(p.id), title, supplierCost, pricing.price);
  mem.logPrice(String(p.id), pricing.price);
  const msg = '✅ מוצר חדש נוסף!\n' + (content.title_he || title) + '\nמחיר: ₪' + pricing.price + ' (עלות: ₪' + supplierCost + ')';
  console.log(msg);
  await tg.sendMessage(msg);
  return p;
}

async function checkOrders() {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const data = await shopify('/orders.json?status=any&created_at_min=' + since);
  if (data.orders.length > 0) {
    for (const o of data.orders) {
      const msg = '🛒 הזמנה חדשה!\n' + o.name + '\nסכום: ₪' + o.total_price + '\nאימייל: ' + o.email;
      console.log(msg);
      await tg.sendMessage(msg);
    }
  } else {
    console.log('[Agent] אין הזמנות | ' + new Date().toLocaleTimeString('he-IL'));
  }
  return data.orders;
}

async function dailySummary() {
  const data = await shopify('/orders.json?status=any&limit=250');
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = data.orders.filter(o => o.created_at.startsWith(today));
  const revenue = todayOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const products = await shopify('/products/count.json');
  const msg = '📊 סיכום יומי\nהזמנות היום: ' + todayOrders.length + '\nהכנסה: ₪' + revenue.toFixed(2) + '\nמוצרים בחנות: ' + products.count;
  await tg.sendMessage(msg);
  console.log(msg);
}

cron.schedule('0 * * * *', checkOrders);
cron.schedule('0 20 * * *', dailySummary);

checkOrders();
tg.sendMessage('🤖 OpenClaw Agent הופעל!\nחנות: ' + SHOP);
console.log('🤖 OpenClaw Agent פעיל');

module.exports = { addProduct, checkOrders, dailySummary };
