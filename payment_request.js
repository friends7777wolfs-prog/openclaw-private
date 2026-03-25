require('dotenv').config();
const tg = require('./telegram');
const fs = require('fs');

async function requestPayment(amount, purpose, url) {
  const request = {
    id: Date.now(),
    amount,
    purpose,
    url,
    status: 'pending',
    created: new Date().toISOString()
  };
  const file = './payment_requests.json';
  const requests = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
  requests.unshift(request);
  fs.writeFileSync(file, JSON.stringify(requests, null, 2));
  await tg.sendMessage('בקשת תשלום #' + request.id + '\nסכום: $' + amount + '\nמטרה: ' + purpose + '\nקישור: ' + url + '\n\nענה: אשר / דחה');
  console.log('בקשה נשלחה: ' + purpose);
}

requestPayment(10, 'Kling AI - יצירת סרטוני מוצר לחודש', 'https://klingai.com/pricing');
requestPayment(5, 'Canva Pro - עיצוב תמונות מוצר', 'https://canva.com/pricing');
