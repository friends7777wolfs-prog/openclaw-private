require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const cron    = require('node-cron');
const { analyzeSystem, db } = require('./analyzer');
const { applyFix, restartProcess } = require('./fixer');

const _tgSend = (text) => { try { require('https').get('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage?chat_id='+process.env.TELEGRAM_CHAT_ID+'&text='+encodeURIComponent(text)+'&parse_mode=Markdown').on('error',()=>{}); } catch(e){} };
const telegram = { api: { sendMessage: (cid, text, opts) => { _tgSend(text); return Promise.resolve(); } } };
const CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

// שמירת pending approvals
const pendingApprovals = new Map();

// עיבוד תוצאות ניתוח
async function processAnalysis() {
  const result = await analyzeSystem();
  if (!result) return;

  const { issues, summary } = result;
  if (!issues?.length) {
    console.log('✅ אין בעיות שנמצאו');
    return;
  }

  const autoIssues  = issues.filter(i => i.auto_apply && i.severity === 'small');
  const manualIssues = issues.filter(i => !i.auto_apply || i.severity === 'large');

  // החלת תיקונים אוטומטיים
  const autoResults = [];
  for (const issue of autoIssues) {
    // שליפה מה-DB לקבלת ה-id
    const dbIssue = db.prepare(
      'SELECT * FROM issues WHERE description=? AND status="pending" LIMIT 1'
    ).get(issue.description);

    if (!dbIssue) continue;

    console.log(`🔧 מתקן אוטומטית: ${issue.description}`);
    const result = applyFix({ ...issue, id: dbIssue.id });

    if (result.success) {
      restartProcess(issue.file);
      autoResults.push(`✅ ${issue.description}`);
    } else {
      autoResults.push(`❌ ${issue.description}: ${result.error}`);
    }
  }

  // בניית הודעת טלגרם
  let msg = `🧬 *OpenClaw Self-Improve Report*\n`;
  msg += `🕐 ${new Date().toLocaleTimeString('he-IL')}\n\n`;
  msg += `📋 *סיכום:* ${summary}\n\n`;

  if (autoResults.length) {
    msg += `⚡ *תיקונים אוטומטיים (${autoResults.length}):*\n`;
    msg += autoResults.map(r => `  ${r}`).join('\n') + '\n\n';
  }

  if (manualIssues.length) {
    msg += `🔔 *דורשים אישורך (${manualIssues.length}):*\n`;
    manualIssues.forEach((issue, i) => {
      const key = `approve_${Date.now()}_${i}`;
      pendingApprovals.set(key, issue);
      msg += `\n*${i+1}. ${issue.description}*\n`;
      msg += `📁 קובץ: \`${issue.file}\`\n`;
      msg += `⚠️ רמה: ${issue.severity}\n`;
      msg += `כדי לאשר שלח: \`/approve ${key}\`\n`;
      msg += `כדי לדחות שלח: \`/reject ${key}\`\n`;
    });
  }

  await telegram.api.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
}

// פקודות אישור/דחייה
// הצגת היסטוריית שיפורים
// הפעלה ידנית
// לוח זמנים
cron.schedule('0 * * * *', processAnalysis);    // כל שעה
cron.schedule('0 6 * * *', async () => {         // כל בוקר ב-06:00
  const logs = db.prepare(`
    SELECT COUNT(*) as total,
           SUM(success) as success,
           COUNT(*) - SUM(success) as failed
    FROM improve_log
    WHERE date(created_at) = date('now', '-1 day')
  `).get();

  const msg = `🌅 *דוח שיפורים יומי*\n` +
    `✅ הצליחו: ${logs?.success || 0}\n` +
    `❌ נכשלו: ${logs?.failed || 0}\n` +
    `📊 סה"כ: ${logs?.total || 0}`;

  await telegram.api.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' });
});

console.log('🧬 Self-Improve Engine פעיל');
console.log('🔍 סריקה כל שעה');
console.log('📱 פקודות: /approve, /reject, /scan, /improve_log');

// סריקה ראשונה
setTimeout(processAnalysis, 10000);
