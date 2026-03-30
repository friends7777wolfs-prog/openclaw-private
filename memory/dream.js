/**
 * Dream Engine 🌙
 * רץ בסוף יום / סוף סשן
 * קורא: CLAUDE.md + dirt.json + git log
 * שולח ל-Claude Sonnet → מקבל CLAUDE.md נקי + מעודכן
 * כותב בחזרה לדיסק
 */
require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');

const ROOT = '/home/friends7777wolfs/OpenClawMaster';
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');
const DIRT_FILE = path.join(ROOT, 'memory/dirt.json');
const DREAM_LOG = path.join(ROOT, 'memory/dream-log.md');

async function dream() {
  console.log('🌙 Dream Engine starting...');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // קרא את כל החומרים
  const currentClaude = fs.readFileSync(CLAUDE_MD, 'utf8');
  const dirt = fs.existsSync(DIRT_FILE)
    ? JSON.parse(fs.readFileSync(DIRT_FILE, 'utf8'))
    : { errors: [], lessons: [], events: [] };

  // git context
  let gitLog = '';
  try {
    gitLog = execSync('cd ' + ROOT + ' && git log --oneline -10 2>/dev/null').toString();
  } catch { gitLog = 'no git history'; }

  // pm2 status snapshot
  let pm2Status = '';
  try {
    pm2Status = execSync('cd ' + ROOT + '/discord-bridge && ./node_modules/.bin/pm2 jlist 2>/dev/null').toString();
    const procs = JSON.parse(pm2Status);
    pm2Status = procs.map(p => `${p.pm_id} ${p.name}: ${p.pm2_env.status} | restarts: ${p.pm2_env.restart_time}`).join('\n');
  } catch { pm2Status = 'unavailable'; }

  // בנה prompt לחלום
  const dreamPrompt = `You are the memory consolidation engine for OpenClaw, an autonomous AI trading system.

Your job: rewrite CLAUDE.md to be clean, accurate, and useful for the next session.

## CURRENT CLAUDE.md:
${currentClaude}

## TODAY'S DIRT (errors, lessons, events):
${JSON.stringify(dirt, null, 2)}

## GIT LOG (last 10 commits):
${gitLog}

## PM2 PROCESS STATUS:
${pm2Status}

## YOUR TASK:
1. Remove outdated information that contradicts current reality
2. Add new lessons learned from today's dirt
3. Update "Known Open Issues" — mark resolved items, add new ones
4. Update Anti-Patterns if new ones were discovered
5. Keep the file under 150 lines — distill, don't accumulate
6. Update "Last consolidated" date to: ${new Date().toISOString().slice(0,16)}

Return ONLY the new CLAUDE.md content. No explanations. Start with: # 🦞 OpenClaw`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: dreamPrompt }]
  });

  const newClaudeMd = response.content[0].text;

  // גיבוי + כתיבה
  fs.copyFileSync(CLAUDE_MD, path.join(ROOT, 'memory/CLAUDE.md.bak'));
  fs.writeFileSync(CLAUDE_MD, newClaudeMd);

  // dream log
  const logEntry = `\n## Dream — ${new Date().toISOString().slice(0,16)}\n- Errors processed: ${dirt.errors.length}\n- Lessons absorbed: ${dirt.lessons.length}\n- Events: ${dirt.events.length}\n`;
  fs.appendFileSync(DREAM_LOG, logEntry);

  // נקה dirt לסשן חדש
  fs.writeFileSync(DIRT_FILE, JSON.stringify({
    session_start: new Date().toISOString(),
    errors: [], lessons: [], events: []
  }, null, 2));

  // push ל-GitHub
  try {
    execSync(`cd ${ROOT} && git add CLAUDE.md memory/dream-log.md && git commit -m "🌙 Dream consolidation ${new Date().toISOString().slice(0,10)}" && git push origin main 2>/dev/null`);
    console.log('📤 Pushed to GitHub');
  } catch(e) { console.log('⚠️ Git push skipped:', e.message); }

  console.log('✅ Dream complete. CLAUDE.md consolidated.');
  console.log(`📊 Processed: ${dirt.errors.length} errors, ${dirt.lessons.length} lessons`);
}

dream().catch(console.error);
