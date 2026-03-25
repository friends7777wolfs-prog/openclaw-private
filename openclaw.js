require('dotenv').config();
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');

// ==========================================
// הגדרות
// ==========================================
const MEMORY_FILE = './memory.json';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.BOT_EMAIL,
    pass: process.env.BOT_EMAIL_PASSWORD
  }
});

// ==========================================
// זיכרון
// ==========================================
function getMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    return { pulseCount: 0, shopifyToken: null, tokenExpiry: null, startTime: new Date().toISOString() };
  }
  return JSON.parse(fs.readFileSync(MEMORY_FILE));
}

function saveMemory(mem) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
}

// ==========================================
// Shopify Token (מתחדש כל 23 שעות)
// ==========================================
async function getShopifyToken() {
  const mem = getMemory();
  const now = Date.now();

  if (mem.shopifyToken && mem.tokenExpiry && now < mem.tokenExpiry) {
    return mem.shopifyToken;
  }

  console.log('מחדש Shopify token...');
  const res = await axios.post(
    `https://${process.env.SHOPIFY_STORE}/admin/oauth/access_token`,
    new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  mem.shopifyToken = res.data.access_token;
  mem.tokenExpiry = now + (23 * 60 * 60 * 1000);
  saveMemory(mem);
  console.log('Token חודש בהצלחה');
  return mem.shopifyToken;
}

// ==========================================
// שליפת נתוני Shopify
// ==========================================
async function getShopifyData() {
  try {
    const token = await getShopifyToken();
    const headers = { 'X-Shopify-Access-Token': token };
    const base = `https://${process.env.SHOPIFY_STORE}/admin/api/2025-01`;

    const [ordersRes, productsRes] = await Promise.all([
      axios.get(`${base}/orders.json?status=any&limit=5`, { headers }),
      axios.get(`${base}/products.json?limit=5`, { headers })
    ]);

    return {
      orders: ordersRes.data.orders,
      products: productsRes.data.products
    };
  } catch (err) {
    console.error('שגיאת Shopify:', err.message);
    return null;
  }
}

// ==========================================
// שליחת מייל
// ==========================================
async function sendEmail(subject, html) {
  await transporter.sendMail({
    from: `"OpenClaw AI" <${process.env.BOT_EMAIL}>`,
    to: process.env.ADMIN_EMAIL,
    subject,
    html
  });
  console.log('מייל נשלח:', subject);
}

// ==========================================
// דוח ראשי
// ==========================================
async function sendReport() {
  const mem = getMemory();
  mem.pulseCount++;
  saveMemory(mem);

  const data = await getShopifyData();

  let shopifyHtml = '';
  if (data) {
    const ordersHtml = data.orders.map(o => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #30363d;">#${o.order_number}</td>
        <td style="padding:8px;border-bottom:1px solid #30363d;">${o.email || 'אורח'}</td>
        <td style="padding:8px;border-bottom:1px solid #30363d;">$${o.total_price}</td>
        <td style="padding:8px;border-bottom:1px solid #30363d;">${o.financial_status}</td>
      </tr>
    `).join('');

    const productsHtml = data.products.map(p => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #30363d;">${p.title}</td>
        <td style="padding:8px;border-bottom:1px solid #30363d;">$${p.variants[0]?.price || '?'}</td>
        <td style="padding:8px;border-bottom:1px solid #30363d;">${p.status}</td>
      </tr>
    `).join('');

    shopifyHtml = `
      <h3 style="color:#58a6ff;">🛒 הזמנות אחרונות</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="color:#8b949e;">
          <th style="text-align:right;padding:8px;">#</th>
          <th style="text-align:right;padding:8px;">לקוח</th>
          <th style="text-align:right;padding:8px;">סכום</th>
          <th style="text-align:right;padding:8px;">סטטוס</th>
        </tr>
        ${ordersHtml}
      </table>
      <h3 style="color:#58a6ff;margin-top:20px;">📦 מוצרים</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="color:#8b949e;">
          <th style="text-align:right;padding:8px;">שם</th>
          <th style="text-align:right;padding:8px;">מחיר</th>
          <th style="text-align:right;padding:8px;">סטטוס</th>
        </tr>
        ${productsHtml}
      </table>
    `;
  } else {
    shopifyHtml = '<p style="color:#ff7b72;">⚠️ לא ניתן להתחבר ל-Shopify</p>';
  }

  const html = `
    <div dir="rtl" style="background:#0d1117;color:#c9d1d9;font-family:'Courier New',monospace;padding:30px;max-width:650px;margin:auto;border:1px solid #30363d;">
      <h1 style="color:#58a6ff;border-bottom:1px solid #30363d;padding-bottom:10px;">
        ⚡ OpenClaw Terminal — פעימה #${mem.pulseCount}
      </h1>
      ${shopifyHtml}
      <div style="margin-top:25px;padding:15px;background:#161b22;border:1px solid #30363d;border-radius:4px;">
        <h4 style="color:#3fb950;margin:0 0 10px 0;">🎮 פקודות זמינות</h4>
        <p style="font-size:13px;color:#8b949e;margin:0 0 10px 0;">השב למייל זה עם אחת מהפקודות:</p>
        <code style="color:#f0f6fc;display:block;line-height:2;">
          STATUS — קבל דוח מיידי<br>
          PRODUCTS — רשימת כל המוצרים<br>
          ORDERS — כל ההזמנות<br>
          HELP — רשימת כל הפקודות
        </code>
      </div>
      <p style="color:#484f58;font-size:11px;margin-top:20px;text-align:center;">
        OpenClaw AI System • ${new Date().toLocaleString('he-IL')}
      </p>
    </div>
  `;

  await sendEmail(`⚡ OpenClaw #${mem.pulseCount} | ${data ? '✅ Shopify מחובר' : '❌ שגיאת חיבור'}`, html);
}

// ==========================================
// הפעלה
// ==========================================
console.log('🚀 OpenClaw מתחיל...');
cron.schedule('*/10 * * * *', sendReport);
sendReport();
