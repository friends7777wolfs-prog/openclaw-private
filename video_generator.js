require('dotenv').config();
const fs = require('fs');
const tg = require('./telegram');
const ai = require('./ai_brain');

async function generateVideoScript(product, style) {
  const raw = await ai.weeklyStrategy({
    task: 'viral short video script',
    product: product,
    duration: '15-30 seconds',
    style: style || 'emotional mother baby bonding',
    hook: 'first 3 seconds grab attention',
    cta: 'link in bio',
    language: 'Hebrew'
  });
  return raw;
}

async function createVideoPrompt(product) {
  const script = await generateVideoScript(product, 'warm emotional Israeli mother');
  const prompt = {
    product: product,
    script: script,
    kling_prompt: 'Warm cinematic video of Israeli mother with baby, soft lighting, emotional, product: ' + product,
    caption: 'לכל אמא שרוצה הכי טוב לתינוק שלה 🍼\nקישור בביו\n#אמא #תינוק #הריון',
    channel: '@COCOHAVANNA',
    created: new Date().toISOString()
  };
  const dir = './video_scripts';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = dir + '/video_' + Date.now() + '.json';
  fs.writeFileSync(file, JSON.stringify(prompt, null, 2));
  await tg.sendMessage('תסריט וידאו מוכן!\nמוצר: ' + product + '\n\nPrompt לKling:\n' + prompt.kling_prompt + '\n\nכיתוב:\n' + prompt.caption + '\n\nכנס ל: klingai.com → Create → הדבק את ה-prompt');
  console.log('נשמר: ' + file);
  return prompt;
}

async function weeklyVideoSchedule() {
  const products = [
    'Baby Monitor WiFi',
    'Electric Breast Pump',
    'Modest Maternity Dress',
    'Baby Carrier Ergonomic',
    'Pregnancy Support Belt',
    'Baby Sleep White Noise Machine',
    'Nursing Pillow'
  ];
  for (const p of products) {
    await createVideoPrompt(p);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('7 תסריטי וידאו נוצרו לשבוע!');
}

weeklyVideoSchedule().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
