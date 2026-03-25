require('dotenv').config();

const SHOP = process.env.SHOPIFY_DOMAIN;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function shopifyRequest(endpoint, method = 'GET', body = null) {
  const res = await fetch('https://' + SHOP + '/admin/api/2024-01' + endpoint, {
    method: method,
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

// --- הוספת מוצר פיזי (דרופשיפינג) ---
async function addDropshipProduct({ title, description, price, comparePrice, imageUrl, supplier, supplierCost, supplierUrl }) {
  const margin = ((price - supplierCost) / price * 100).toFixed(0);
  const product = {
    product: {
      title: title,
      body_html: description,
      status: 'active',
      tags: 'dropship,auto-added,supplier-' + supplier,
      metafields: [
        { namespace: 'openclaw', key: 'supplier_url', value: supplierUrl || '', type: 'single_line_text_field' },
        { namespace: 'openclaw', key: 'supplier_cost', value: String(supplierCost), type: 'single_line_text_field' },
        { namespace: 'openclaw', key: 'margin', value: margin + '%', type: 'single_line_text_field' }
      ],
      variants: [{
        price: String(price),
        compare_at_price: String(comparePrice || price * 1.3),
        inventory_management: null,
        inventory_policy: 'continue',
        fulfillment_service: 'manual'
      }],
      images: imageUrl ? [{ src: imageUrl }] : []
    }
  };
  const result = await shopifyRequest('/products.json', 'POST', product);
  console.log('✅ מוצר נוסף: ' + result.product.title + ' | מחיר: ₪' + price + ' | מרווח: ' + margin + '%');
  return result.product;
}

// --- הוספת מוצר דיגיטלי (PDF/קובץ) ---
async function addDigitalProduct({ title, description, price, fileUrl, fileNote }) {
  const product = {
    product: {
      title: title,
      body_html: description + '<br><br><em>מוצר דיגיטלי - קובץ נשלח אוטומטית לאחר רכישה</em>',
      status: 'active',
      tags: 'digital,pdf,auto-delivery',
      product_type: 'Digital',
      variants: [{
        price: String(price),
        inventory_management: null,
        inventory_policy: 'continue',
        requires_shipping: false,
        taxable: true
      }]
    }
  };
  const result = await shopifyRequest('/products.json', 'POST', product);
  console.log('✅ מוצר דיגיטלי נוסף: ' + result.product.title + ' | מחיר: ₪' + price);
  console.log('   📎 קובץ לשליחה: ' + (fileUrl || fileNote || 'הגדר ידנית'));
  return result.product;
}

// --- תמחור דינמי לפי שוק ---
async function repriceProducts(marginMultiplier) {
  const data = await shopifyRequest('/products.json?limit=50');
  let updated = 0;
  for (const product of data.products) {
    const tags = product.tags || '';
    const costMeta = product.metafields ? product.metafields.find(m => m.key === 'supplier_cost') : null;
    const cost = parseFloat(costMeta.value);
    const newPrice = (cost * marginMultiplier).toFixed(2);
    await shopifyRequest('/products/' + product.id + '/variants/' + product.variants[0].id + '.json', 'PUT', {
      variant: { id: product.variants[0].id, price: newPrice }
    });
    updated++;
  }
  console.log('💰 עודכנו ' + updated + ' מחירים (x' + marginMultiplier + ')');
}

// --- התראות על הזמנות חדשות ---
async function checkNewOrders(lastChecked) {
  const since = lastChecked || new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const data = await shopifyRequest('/orders.json?status=any&created_at_min=' + since + '&limit=50');
  if (data.orders.length === 0) {
    console.log('[Shopify] אין הזמנות חדשות');
    return [];
  }
  data.orders.forEach(o => {
    console.log('🛒 הזמנה חדשה: ' + o.name + ' | ₪' + o.total_price + ' | ' + o.email);
    o.line_items.forEach(item => console.log('   - ' + item.name + ' x' + item.quantity));
  });
  return data.orders;
}

// --- סיכום חנות ---
async function storeSummary() {
  const [ordersData, productsData] = await Promise.all([
    shopifyRequest('/orders.json?status=any&limit=250'),
    shopifyRequest('/products/count.json')
  ]);
  const orders = ordersData.orders;
  const revenue = orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  console.log('\n📊 סיכום חנות:');
  console.log('   הזמנות: ' + orders.length + ' | הכנסה: ₪' + revenue.toFixed(2));
  console.log('   מוצרים: ' + productsData.count);
  console.log('   ממתינות לאספקה: ' + orders.filter(o => o.fulfillment_status !== 'fulfilled').length);
}

// --- דמו: הוסף מוצרי דוגמה ---
async function demo() {
  console.log('\n🚀 OpenClaw Shopify Manager - מוד דמו\n');
  await storeSummary();

  console.log('\n--- מוסיף מוצר דרופשיפינג לדוגמה ---');
  await addDropshipProduct({
    title: 'שעון חכם Sport X1',
    description: '<p>שעון חכם עמיד במים, דופק, GPS, סוללה 7 ימים.</p>',
    price: 299,
    comparePrice: 450,
    imageUrl: 'https://via.placeholder.com/800x800?text=Smart+Watch',
    supplier: 'AliExpress',
    supplierCost: 89,
    supplierUrl: 'https://aliexpress.com/item/example'
  });

  console.log('\n--- מוסיף מוצר דיגיטלי לדוגמה ---');
  await addDigitalProduct({
    title: 'מדריך: איך להרוויח מדרופשיפינג ב-2026',
    description: '<p>מדריך PDF מקיף 50 עמוד, כולל רשימת ספקים מומלצים.</p>',
    price: 49,
    fileNote: 'העלה PDF ל-Shopify Files ושלח לינק ללקוח'
  });

  console.log('\n--- בודק הזמנות ---');
  await checkNewOrders(null);
}

demo().catch(console.error);
