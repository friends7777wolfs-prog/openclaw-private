require('dotenv').config();
const fs = require('fs');
const tg = require('./telegram');
const ai = require('./ai_brain');

const PLATFORMS = {
  shopify: { name: 'Shopify', domain: process.env.SHOPIFY_DOMAIN, token: process.env.SHOPIFY_ACCESS_TOKEN, active: true },
  shopify2: { name: 'Shopify תחפושות', domain: process.env.SHOPIFY_DOMAIN_2, token: process.env.SHOPIFY_ACCESS_TOKEN_2, active: true },
  ebay: { name: 'eBay', token: process.env.EBAY_TOKEN, active: false },
  amazon: { name: 'Amazon', token: process.env.AMAZON_TOKEN, active: false },
  tiktok: { name: 'TikTok Shop', token: process.env.TIKTOK_TOKEN, active: false }
};

async function shopifyCount(domain, token) {
  const res = await fetch('https://' + domain + '/admin/api/2024-01/orders.json?status=any&limit=50', {
    headers: { 'X-Shopify-Access-Token': token }
  });
  const data = await res.json();
  return {
    orders: data.orders.length,
    revenue: data.orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0).toFixed(2)
  };
}

async function dailyMultiReport() {
  let msg = 'דוח מרובה פלטפורמות\n\n';
  for (const [key, p] of Object.entries(PLATFORMS)) {
    if (!p.active) { msg += p.name + ': לא מחובר\n'; continue; }
    try {
      if (key === 'shopify' || key === 'shopify2') {
        const stats = await shopifyCount(p.domain, p.token);
        msg += p.name + ': ' + stats.orders + ' הזמנות | ₪' + stats.revenue + '\n';
      }
    } catch(e) { msg += p.name + ': שגיאה\n'; }
  }
  const inactive = Object.values(PLATFORMS).filter(p => !p.active).length;
  msg += '\n' + inactive + ' פלטפורמות ממתינות לחיבור';
  await tg.sendMessage(msg);
  console.log(msg);
}

async function syncProductToAll(product) {
  const results = [];
  for (const [key, p] of Object.entries(PLATFORMS)) {
    if (!p.active || key.startsWith('shopify')) continue;
    results.push(p.name + ': ממתין לחיבור');
  }
  return results;
}

const cron = require('node-cron');
cron.schedule('0 20 * * *', dailyMultiReport);
dailyMultiReport();
console.log('Multi-Platform Agent פעיל');
module.exports = { dailyMultiReport, syncProductToAll };
