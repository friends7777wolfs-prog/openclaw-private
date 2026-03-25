require('dotenv').config({ path: '.env2' });
const fs = require('fs');
const SHOP = process.env.SHOPIFY_DOMAIN;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const tg = require('./telegram');
async function backup() {
  const date = new Date().toISOString().split('T')[0];
  const dir = './backups';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const products = await fetch('https://' + SHOP + '/admin/api/2024-01/products.json?limit=250', { headers: { 'X-Shopify-Access-Token': TOKEN } }).then(r => r.json());
  const file = dir + '/backup2_' + date + '.json';
  fs.writeFileSync(file, JSON.stringify(products, null, 2));
  await tg.sendMessage('גיבוי חנות תחפושות\nמוצרים: ' + products.products.length + '\nתאריך: ' + date);
  console.log('גיבוי נשמר: ' + file);
}
backup().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
