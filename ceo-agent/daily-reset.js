const Database = require('/home/friends7777wolfs/OpenClawMaster/discord-bridge/node_modules/better-sqlite3');
const db = new Database('/home/friends7777wolfs/OpenClawMaster/ceo-agent/ceo.db');
db.exec("UPDATE agent_scores SET is_powered_up=0");
console.log('[daily-reset] ✅ איפוס יומי — מוכן לאלוף חדש');
process.exit(0);
