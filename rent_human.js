require('dotenv').config();
const tg = require('./telegram');
const fs = require('fs');

const BARRIERS = [
  { id: 'VIDEO_UPLOAD', task: 'העלאת סרטון ל-YouTube Shorts', cost: 2, roi: 50, when: 'יש תסריט מוכן' },
  { id: 'FIVERR_GIG', task: 'יצירת גיג Fiverr עם תמונות', cost: 5, roi: 200, when: 'פעם אחת' },
  { id: 'FB_POST', task: 'פרסום בקבוצות פייסבוק אמהות', cost: 3, roi: 100, when: 'פעם בשבוע' },
  { id: 'PRODUCT_PHOTOS', task: 'עריכת תמונות מוצר ב-Canva', cost: 4, roi: 80, when: 'לכל מוצר חדש' },
  { id: 'INFLUENCER', task: 'פנייה לאינפלואנסרית אמהות', cost: 10, roi: 500, when: 'מדי חודש' }
];

async function checkBarriers() {
  const videoScripts = fs.existsSync('./video_scripts') ? fs.readdirSync('./video_scripts').length : 0;
  const barriers = [];
  if (videoScripts > 0) barriers.push(BARRIERS[0]);
  if (!fs.existsSync('./fiverr_done.txt')) barriers.push(BARRIERS[1]);
  barriers.push(BARRIERS[2]);

  if (barriers.length > 0) {
    let msg = 'משימות לבני אדם (RentAHuman):\n\n';
    for (const b of barriers) {
      msg += 'משימה: ' + b.task + '\nעלות: $' + b.cost + ' | ROI: $' + b.roi + '\nמתי: ' + b.when + '\n\n';
    }
    msg += 'אתר: rentahuman.ai\nאו: fiverr.com/services/virtual-assistant';
    await tg.sendMessage(msg);
    console.log(msg);
  }
}

checkBarriers().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
