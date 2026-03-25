require('dotenv').config();
const cron = require('node-cron');
const ai = require('./ai_brain');
const tg = require('./telegram');
const fs = require('fs');

const SHOP1 = { domain: process.env.SHOPIFY_DOMAIN, token: process.env.SHOPIFY_ACCESS_TOKEN };

async function shopify(endpoint, method, body) {
  const res = await fetch('https://' + SHOP1.domain + '/admin/api/2024-01' + endpoint, {
    method: method || 'GET',
    headers: { 'X-Shopify-Access-Token': SHOP1.token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) throw new Error('Shopify ' + res.status);
  return res.json();
}

const productQueue = [
  { title: 'Baby Swing Portable Electric', category: 'baby', supplierCost: 85, features: 'bluetooth 5 speeds timer foldable' },
  { title: 'Maternity Dress Photoshoot', category: 'maternity', supplierCost: 35, features: 'flowy chiffon elegant photography' },
  { title: 'Baby Food Processor Mini', category: 'baby', supplierCost: 45, features: 'steam blend 4oz BPA free portable' },
  { title: 'Postpartum Underwear Disposable', category: 'maternity', supplierCost: 12, features: 'mesh hospital grade 20 pack' },
  { title: 'Baby Lounger Newborn', category: 'baby', supplierCost: 55, features: 'portable snuggle nest breathable' },
  { title: 'Nipple Shield Breastfeeding', category: 'maternity', supplierCost: 8, features: 'thin silicone size 20mm 24mm' },
  { title: 'Baby Towel Hooded Organic', category: 'baby', supplierCost: 18, features: 'bamboo ultra soft 2 pack animals' },
  { title: 'Fertility Prenatal Tea', category: 'fertility', supplierCost: 14, features: 'red raspberry leaf organic 30 bags' },
  { title: 'Baby Gym Play Mat Foldable', category: 'baby', supplierCost: 38, features: 'arch toys mirror waterproof padded' },
  { title: 'Wrist Blood Pressure Monitor', category: 'maternity', supplierCost: 28, features: 'pregnancy safe irregular heartbeat' }
];

let productIndex = 0;

async function addNextProduct() {
  if (productIndex >= productQueue.length) { productIndex = 0; return; }
  const p = productQueue[productIndex++];
  try {
    const pricing = await ai.pricingDecision(p.title, p.supplierCost, p.category);
    const content = await ai.writeDescription(p.title, p.category, p.features);
    const result = await shopify('/products.json', 'POST', {
      product: {
        title: content.title_he || p.title,
        body_html: content.description_he,
        status: 'active',
        tags: ['dropship', p.category].concat(content.tags || []).join(','),
        variants: [{ price: String(pricing.price), compare_at_price: String(pricing.compare_at), inventory_management: null, inventory_policy: 'continue' }]
      }
    });
    console.log('מוצר נוסף: ' + result.product.title + ' | ₪' + pricing.price);
  } catch(e) {
    console.error('שגיאה: ' + e.message);
  }
}

async function checkAndReport() {
  try {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const orders = await shopify('/orders.json?status=any&created_at_min=' + since);
    if (orders.orders.length > 0) {
      for (const o of orders.orders) {
        await tg.sendMessage('🛒 הזמנה חדשה!\n' + o.name + '\n₪' + o.total_price + '\n' + (o.email || ''));
      }
    }
  } catch(e) { console.error('שגיאת בדיקה: ' + e.message); }
}

async function dailyReport() {
  try {
    const [products, orders] = await Promise.all([
      shopify('/products/count.json'),
      shopify('/orders.json?status=any&limit=250')
    ]);
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.orders.filter(o => o.created_at.startsWith(today));
    const totalRevenue = orders.orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
    const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
    const msg = 'דוח יומי\nמוצרים: ' + products.count + '\nהזמנות היום: ' + todayOrders.length + '\nהכנסה היום: ₪' + todayRevenue.toFixed(2) + '\nסה"כ הכנסה: ₪' + totalRevenue.toFixed(2);
    await tg.sendMessage(msg);
    console.log(msg);
  } catch(e) { console.error('שגיאת דוח: ' + e.message); }
}

cron.schedule('*/15 * * * *', checkAndReport);
cron.schedule('0 */2 * * *', addNextProduct);
cron.schedule('0 20 * * *', dailyReport);

checkAndReport();
addNextProduct();
console.log('מנהל אוטומטי פעיל - כל 15 דקות');
