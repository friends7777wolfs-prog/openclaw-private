require('dotenv').config();
const ai = require('./ai_brain');
const tg = require('./telegram');
const fs = require('fs');

async function generateReels(topic, count) {
  const scripts = [];
  for (let i = 0; i < count; i++) {
    const raw = await ai.weeklyStrategy({
      task: 'create viral short video script',
      topic: topic,
      duration: '15-30 seconds',
      style: 'dopamine rush, fast cuts, Hebrew, hook in first 2 seconds',
      goal: 'drive traffic to store'
    });
    scripts.push(raw);
    await new Promise(r => setTimeout(r, 1000));
  }
  return scripts;
}

async function run() {
  console.log('יוצר תסריטי רילס...');
  const [baby, costume] = await Promise.all([
    generateReels('baby and maternity products Israel', 3),
    generateReels('funny costumes kids Israel Purim', 3)
  ]);
  const all = { baby_reels: baby, costume_reels: costume, created: new Date().toISOString() };
  fs.writeFileSync('./reels_scripts.json', JSON.stringify(all, null, 2));
  await tg.sendMessage('תסריטי רילס נוצרו!\nנשמר ב: reels_scripts.json\n\nהצג: cat ~/OpenClawMaster/reels_scripts.json');
  console.log('סיום!');
}

run().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
