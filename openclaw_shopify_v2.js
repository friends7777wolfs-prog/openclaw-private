require('dotenv').config();
const fs = require('fs');

const SHOP = process.env.SHOPIFY_DOMAIN;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function shopifyRequest(endpoint, method = 'GET', body = null) {
  const res = await fetch('https://' + SHOP + '/admin/api/2024-01' + endpoint, {
    method: method,
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) throw new Error('Shopify error: ' + res.status);
  return res.json();
}

async function main() {
  console.log('[Shopify] מתחבר...');
  try {
    const shop = await shopifyRequest('/shop.json');
    console.log('✅ חנות: ' + shop.shop.name + ' | מטבע: ' + shop.shop.currency);
    const orders = await shopifyRequest('/orders.json?limit=5&status=any');
    console.log('📦 הזמנות אחרונות: ' + orders.orders.length);
    orders.orders.forEach(o => console.log('  ' + o.name + ' | $' + o.total_price + ' | ' + o.financial_status));
    const products = await shopifyRequest('/products.json?limit=5');
    console.log('🛍 מוצרים: ' + products.products.length);
    products.products.forEach(p => console.log('  ' + p.title + ' | $' + p.variants[0].price));
  } catch(e) {
    console.error('❌ שגיאה:', e.message);
  }
}

main();
