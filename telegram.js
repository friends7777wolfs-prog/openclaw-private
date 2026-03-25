require('dotenv').config();
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(text) {
  if (!TOKEN || !CHAT_ID) { console.log('[TG] לא מוגדר'); return; }
  await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' })
  });
}

async function getUpdates() {
  const res = await fetch('https://api.telegram.org/bot' + TOKEN + '/getUpdates');
  const data = await res.json();
  return data.result || [];
}

async function getChatId() {
  const updates = await getUpdates();
  if (updates.length === 0) {
    console.log('שלח הודעה לבוט שלך ואז הרץ שוב');
    return null;
  }
  const id = updates[updates.length - 1].message.chat.id;
  console.log('CHAT_ID: ' + id);
  return id;
}

module.exports = { sendMessage, getChatId };
