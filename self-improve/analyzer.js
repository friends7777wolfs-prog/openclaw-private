require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const fs        = require('fs');
const path      = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const Database  = require('better-sqlite3');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const db        = new Database('/home/friends7777wolfs/OpenClawMaster/self-improve/improvements.db');

// אתחול DB
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    severity TEXT,
    file TEXT,
    description TEXT,
    fix_code TEXT,
    status TEXT DEFAULT 'pending',
    auto_apply INTEGER DEFAULT 0,
    applied_at DATETIME,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS improve_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    file TEXT,
    before TEXT,
    after TEXT,
    success INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const BASE = '/home/friends7777wolfs/OpenClawMaster';

// קריאת לוגים
function readLogs() {
  const logs = {};
  const logFiles = [
    `${BASE}/discord-bridge/bridge.log`,
    `${BASE}/discord-bridge/bridge-error.log`,
  ];
  for (const f of logFiles) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      // רק 200 שורות אחרונות
      logs[path.basename(f)] = content.split('\n').slice(-200).join('\n');
    } catch(e) {}
  }
  return logs;
}

// קריאת PM2 לוגים
function readPM2Logs() {
  const pm2Dir = '/home/friends7777wolfs/.pm2/logs';
  const logs   = {};
  try {
    const files = fs.readdirSync(pm2Dir).filter(f => f.endsWith('.log'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(pm2Dir, f), 'utf8');
      logs[f] = content.split('\n').slice(-100).join('\n');
    }
  } catch(e) {}
  return logs;
}

// קריאת קבצי קוד רלוונטיים
function readCodeFiles() {
  const files = [
    'discord-bridge/bridge.js',
    'discord-bridge/trader.js',
    'discord-bridge/macd_monitor.js',
    'discord-bridge/risk_manager.js',
    'discord-bridge/asset_detector.js',
    'intelligence/analyst.js',
  ];
  const code = {};
  for (const f of files) {
    try {
      code[f] = fs.readFileSync(`${BASE}/${f}`, 'utf8');
    } catch(e) {}
  }
  return code;
}

// קריאת DB סטטיסטיקות
function readDBStats() {
  try {
    const signalDB = new Database(`${BASE}/signal-tracker/signals.db`);
    const stats = {
      totalSignals:   signalDB.prepare('SELECT COUNT(*) as c FROM signals').get()?.c || 0,
      pendingSignals: signalDB.prepare("SELECT COUNT(*) as c FROM signals WHERE status='pending'").get()?.c || 0,
      failedTrades:   signalDB.prepare("SELECT COUNT(*) as c FROM signals WHERE status='failed'").get()?.c || 0,
      channelStats:   signalDB.prepare('SELECT * FROM channel_stats ORDER BY total_signals DESC LIMIT 10').all(),
      recentErrors:   signalDB.prepare("SELECT * FROM signals WHERE result='error' ORDER BY created_at DESC LIMIT 5").all(),
    };
    return stats;
  } catch(e) { return {}; }
}

async function analyzeSystem() {
  console.log('🔍 סורק מערכת...');

  const logs    = readLogs();
  const pm2logs = readPM2Logs();
  const code    = readCodeFiles();
  const dbStats = readDBStats();

  const prompt = `אתה מהנדס תוכנה בכיר שמנתח מערכת מסחר אוטומטית (OpenClaw).

## לוגים:
${Object.entries(logs).map(([f,c]) => `### ${f}:\n${c}`).join('\n\n')}

## PM2 לוגים:
${Object.entries(pm2logs).map(([f,c]) => `### ${f}:\n${c}`).join('\n\n')}

## סטטיסטיקות DB:
${JSON.stringify(dbStats, null, 2)}

## קוד נוכחי (קטעים רלוונטיים):
${Object.entries(code).map(([f,c]) => `### ${f}:\n${c.slice(0,2000)}`).join('\n\n')}

## משימה:
זהה בעיות ותן תיקונים. לכל בעיה ענה בפורמט JSON מדויק:

{
  "issues": [
    {
      "type": "error|signal|trade|weight|performance",
      "severity": "small|large",
      "file": "שם הקובץ הרלוונטי",
      "description": "תיאור הבעיה",
      "auto_apply": true/false,
      "fix_type": "patch|new_file|config",
      "fix_code": "הקוד המלא לתיקון",
      "fix_location": "שם הפונקציה או הקטע להחלפה"
    }
  ],
  "summary": "סיכום קצר של מצב המערכת"
}

חוקים:
- small + auto_apply=true: שינויים קטנים (תיקון bug, עדכון mapping, פרמטר)
- large + auto_apply=false: שינויים גדולים (לוגיקה חדשה, קובץ חדש)
- fix_code חייב להיות קוד Node.js תקין מלא
- התמקד בבעיות אמיתיות מהלוגים`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;

  // חילוץ JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('⚠️ לא נמצא JSON בתשובה');
    return null;
  }

  try {
    const result = JSON.parse(jsonMatch[0]);

    // שמירת בעיות ב-DB
    for (const issue of result.issues || []) {
      db.prepare(`
        INSERT INTO issues (type, severity, file, description, fix_code, auto_apply)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        issue.type,
        issue.severity,
        issue.file,
        issue.description,
        issue.fix_code || '',
        issue.auto_apply ? 1 : 0
      );
    }

    console.log(`✅ נמצאו ${result.issues?.length || 0} בעיות`);
    return result;
  } catch(e) {
    console.error('❌ שגיאת JSON:', e.message);
    return null;
  }
}

module.exports = { analyzeSystem, db };
