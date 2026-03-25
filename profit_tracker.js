require('dotenv').config();
const fs = require('fs');
const tg = require('./telegram');

const SHOP = process.env.SHOPIFY_DOMAIN;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function trackProfit() {
  const orders = await fetch('https://' + SHOP + '/admin/api/2024-01/orders.json?status=any&limit=250', {
    headers: { 'X-Shopify-Access-Token': TOKEN }
  }).then(r => r.json());

  const mem = require('./memory');
  const products = mem.getProducts();
  let totalRevenue = 0, totalCost = 0, totalProfit = 0;

  for (const o of orders.orders) {
    const orderRevenue = parseFloat(o.total_price || 0);
    totalRevenue += orderRevenue;
    for (const item of o.line_items) {
      const product = products.find(p => p.title === item.title);
      const cost = product ? product.cost * item.quantity : orderRevenue * 0.35;
      totalCost += cost;
    }
  }
  totalProfit = totalRevenue - totalCost;

  const msg = 'מעקב רווח אמיתי:\n\nהכנסות: ₪' + totalRevenue.toFixed(2) + '\nעלות סחורה: ₪' + totalCost.toFixed(2) + '\nרווח גולמי: ₪' + totalProfit.toFixed(2) + '\nPayPal קפוא: ₪' + totalRevenue.toFixed(2) + '\n\nהזמנות: ' + orders.orders.length;
  console.log(msg);
  await tg.sendMessage(msg);
}

trackProfit().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
