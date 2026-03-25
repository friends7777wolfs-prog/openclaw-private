require('dotenv').config();
const fs = require('fs');
const SHOP = process.env.SHOPIFY_DOMAIN;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const tg = require('./telegram');

async function backup() {
  const date = new Date().toISOString().split('T')[0];
  const dir = './backups';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const [products, orders, collections] = await Promise.all([
    fetch('https://' + SHOP + '/admin/api/2024-01/products.json?limit=250', { headers: { 'X-Shopify-Access-Token': TOKEN } }).then(r => r.json()),
    fetch('https://' + SHOP + '/admin/api/2024-01/orders.json?limit=250&status=any', { headers: { 'X-Shopify-Access-Token': TOKEN } }).then(r => r.json()),
    fetch('https://' + SHOP + '/admin/api/2024-01/smart_collections.json', { headers: { 'X-Shopify-Access-Token': TOKEN } }).then(r => r.json())
  ]);
  const backup = { date, products: products.products, orders: orders.orders, collections: collections.smart_collections };
  const file = dir + '/backup_' + date + '.json';
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  const size = (fs.statSync(file).size / 1024).toFixed(1);
  const msg = 'גיבוי יומי\nתאריך: ' + date + '\nמוצרים: ' + products.products.length + '\nהזמנות: ' + orders.orders.length + '\nגודל: ' + size + 'KB\nנשמר: ' + file;
  console.log(msg);
  await tg.sendMessage(msg);
}

backup().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
