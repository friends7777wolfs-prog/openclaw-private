require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { db } = require('./analyzer');

const BASE = '/home/friends7777wolfs/OpenClawMaster';

// בדיקת תקינות קוד לפני החלה
function validateCode(code, filename) {
  try {
    // כתיבה לקובץ זמני
    const tmpFile = `/tmp/openclaw_test_${Date.now()}.js`;
    fs.writeFileSync(tmpFile, code);

    // בדיקת syntax
    execSync(`node --check ${tmpFile}`, { timeout: 5000 });
    fs.unlinkSync(tmpFile);
    return { valid: true };
  } catch(e) {
    return { valid: false, error: e.message };
  }
}

// גיבוי קובץ לפני שינוי
function backupFile(filePath) {
  const backupDir = `${BASE}/self-improve/backups`;
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${backupDir}/${path.basename(filePath)}.${timestamp}.bak`;

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 גיבוי: ${backupPath}`);
  }
  return backupPath;
}

// החלת תיקון
function applyFix(issue) {
  const filePath = `${BASE}/${issue.file}`;

  // גיבוי
  const backup = backupFile(filePath);
  const before = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

  try {
    if (issue.fix_type === 'new_file') {
      // קובץ חדש
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, issue.fix_code);
      console.log(`📝 קובץ חדש: ${filePath}`);
    } else if (issue.fix_type === 'patch' && issue.fix_location) {
      // החלת patch על פונקציה ספציפית
      const newContent = before.includes(issue.fix_location)
        ? before.replace(
            new RegExp(`(${escapeRegex(issue.fix_location)}[\\s\\S]*?\\n\\})`),
            issue.fix_code
          )
        : before + '\n\n' + issue.fix_code;
      fs.writeFileSync(filePath, newContent);
    } else {
      // החלפת הקובץ כולו
      const validation = validateCode(issue.fix_code, filePath);
      if (!validation.valid) {
        throw new Error(`Syntax error: ${validation.error}`);
      }
      fs.writeFileSync(filePath, issue.fix_code);
    }

    // שמירת לוג
    db.prepare(`
      INSERT INTO improve_log (action, file, before, after, success)
      VALUES (?, ?, ?, ?, 1)
    `).run(issue.description, issue.file, before.slice(0,500), issue.fix_code.slice(0,500));

    // עדכון סטטוס
    db.prepare(`
      UPDATE issues SET status='applied', applied_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(issue.id);

    return { success: true, backup };

  } catch(e) {
    // שחזור מגיבוי
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, filePath);
      console.log(`♻️ שוחזר מגיבוי`);
    }

    db.prepare(`
      UPDATE issues SET status='failed', result=? WHERE id=?
    `).run(e.message, issue.id);

    return { success: false, error: e.message };
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// restart process אחרי תיקון
function restartProcess(file) {
  const processMap = {
    'discord-bridge/bridge.js':      'discord-bridge',
    'discord-bridge/trader.js':      'discord-bridge',
    'discord-bridge/macd_monitor.js':'discord-bridge',
    'discord-bridge/risk_manager.js':'discord-bridge',
    'intelligence/engine.js':        'intelligence',
    'intelligence/analyst.js':       'intelligence',
  };

  const processName = processMap[file];
  if (processName) {
    try {
      const pm2 = `${BASE}/discord-bridge/node_modules/.bin/pm2`;
      execSync(`${pm2} restart ${processName}`, { timeout: 10000 });
      console.log(`🔄 Restarted: ${processName}`);
      return true;
    } catch(e) {
      console.error(`❌ Restart נכשל: ${e.message}`);
      return false;
    }
  }
  return false;
}

module.exports = { applyFix, validateCode, restartProcess };
